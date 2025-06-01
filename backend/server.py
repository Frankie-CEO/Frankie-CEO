from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import os
import time
import json
import uuid
import asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from agora_token_builder import RtcTokenBuilder
from b2sdk.v1 import B2Api, InMemoryAccountInfo
from bson import ObjectId
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def serialize_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        serialized = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                serialized[key] = str(value)
            elif isinstance(value, dict):
                serialized[key] = serialize_doc(value)
            elif isinstance(value, list):
                serialized[key] = serialize_doc(value)
            else:
                serialized[key] = value
        return serialized
    return doc

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB setup
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "test_database")

# Agora.io setup
AGORA_APP_ID = os.getenv("AGORA_APP_ID")
AGORA_APP_CERTIFICATE = os.getenv("AGORA_APP_CERTIFICATE")

# Debug logging
logger.info(f"AGORA_APP_ID loaded: {'***' + AGORA_APP_ID[-4:] if AGORA_APP_ID else 'None'}")
logger.info(f"AGORA_APP_CERTIFICATE loaded: {'***' + AGORA_APP_CERTIFICATE[-4:] if AGORA_APP_CERTIFICATE else 'None'}")

# Backblaze B2 setup
B2_APPLICATION_KEY_ID = os.getenv("B2_APPLICATION_KEY_ID")
B2_APPLICATION_KEY = os.getenv("B2_APPLICATION_KEY")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME")

# Global variables
mongo_client = None
db = None
b2_api = None
connected_clients: Dict[str, WebSocket] = {}
live_streams: Dict[str, Dict] = {}

# Pydantic models
class User(BaseModel):
    user_id: str
    username: str
    tokens: int = 0
    total_watch_time: int = 0
    color_choices: List[str] = []
    neurodiversity_class: str = "Unclassified"

class VideoWatch(BaseModel):
    user_id: str
    video_id: str
    watch_time: int
    completed: bool = False

class ColorPulse(BaseModel):
    user_id: str
    video_id: str
    color_choice: str
    mood: Optional[str] = None
    weather: Optional[str] = None
    favorite_memory: Optional[str] = None
    timestamp: str
    is_baseline: bool = False

class VideoComment(BaseModel):
    user_id: str
    video_id: str
    content: str
    parent_comment_id: Optional[str] = None  # For threading/replies
    timestamp: Optional[str] = None

class LiveChatMessage(BaseModel):
    user_id: str
    stream_id: str
    message: str
    message_type: str = "chat"  # chat, emoji, system
    timestamp: Optional[str] = None

class CommentInteraction(BaseModel):
    user_id: str
    comment_id: str
    interaction_type: str  # like, dislike, report
    timestamp: Optional[str] = None

class LiveStream(BaseModel):
    stream_id: str
    creator_id: str
    title: str
    viewer_count: int = 0
    is_active: bool = True
    start_time: str
    end_time: Optional[str] = None

class TokenRequest(BaseModel):
    channel: str
    uid: int
    role: str = "publisher"

@app.on_event("startup")
async def startup_event():
    global mongo_client, db, b2_api
    try:
        # Initialize MongoDB
        mongo_client = AsyncIOMotorClient(MONGO_URL)
        db = mongo_client[DB_NAME]
        logger.info("Connected to MongoDB")
        
        # Initialize B2 (skip if credentials not available)
        try:
            if B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY:
                info = InMemoryAccountInfo()
                b2_api = B2Api(info)
                b2_api.authorize_account("production", B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY)
                logger.info("Connected to Backblaze B2")
            else:
                logger.warning("B2 credentials not provided, skipping B2 initialization")
        except Exception as b2_error:
            logger.warning(f"B2 initialization failed: {b2_error}. Continuing without B2.")
        
        # Initialize collections with sample data
        await initialize_sample_data()
        
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    if mongo_client:
        mongo_client.close()

async def initialize_sample_data():
    """Initialize sample videos and users"""
    try:
        # Sample videos with your custom video and working URLs
        sample_videos = [
            {
                "video_id": "vid_001",
                "title": "Your Custom Video - Quality Test",
                "duration": 1800,  # 30 minutes - adjust based on actual duration
                "url": "https://drive.google.com/file/d/1cGcWb3fPZXN2Q0p-O-kSgV2RwFW2dDEB/preview",
                "thumbnail": "https://drive.google.com/thumbnail?id=1cGcWb3fPZXN2Q0p-O-kSgV2RwFW2dDEB&sz=w1920-h1080",
                "size_mb": 30
            },
            {
                "video_id": "vid_002", 
                "title": "Tech Innovation 2025",
                "duration": 1200,  # 20 minutes
                "url": "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4",
                "thumbnail": "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.jpg",
                "size_mb": 28
            },
            {
                "video_id": "vid_003",
                "title": "Creative Art Showcase", 
                "duration": 900,   # 15 minutes
                "url": "https://file-examples.com/storage/fe9c56149bae29351b144c3/2017/10/file_example_MP4_1920_18MG.mp4",
                "thumbnail": "https://file-examples.com/storage/fe9c56149bae29351b144c3/2017/10/file_example_JPG_500kB.jpg",
                "size_mb": 25
            }
        ]
        
        for video in sample_videos:
            await db.videos.update_one(
                {"video_id": video["video_id"]},
                {"$set": video},
                upsert=True
            )
        
        # Sample ads
        sample_ads = [
            {
                "ad_id": "ad_001",
                "type": "bottom_bar",
                "content": "Discover Amazing Products! 🌟",
                "url": "https://example.com/products",
                "dimensions": "320x50"
            },
            {
                "ad_id": "ad_002", 
                "type": "side_bar",
                "content": "Level Up Your Game! 🎮",
                "url": "https://example.com/gaming",
                "dimensions": "160x600"
            }
        ]
        
        for ad in sample_ads:
            await db.ads.update_one(
                {"ad_id": ad["ad_id"]},
                {"$set": ad},
                upsert=True
            )
            
        logger.info("Sample data initialized")
        
    except Exception as e:
        logger.error(f"Error initializing sample data: {e}")

def calculate_neurodiversity_class(color_choices: List[str]) -> str:
    """Calculate neurodiversity classification based on color choices with infinite color support"""
    if not color_choices:
        return "Unclassified"
    
    # Define color categories with expanded ranges
    def categorize_color(color):
        # Handle HSL colors
        if color.startswith('hsl'):
            # Extract hue from HSL
            hue_match = color.split('(')[1].split(',')[0]
            try:
                hue = float(hue_match)
                if 0 <= hue <= 60 or 300 <= hue <= 360:  # Reds, oranges, yellows
                    return "warm"
                elif 60 < hue <= 180:  # Yellows, greens, cyans  
                    return "cool"
                elif 180 < hue < 300:  # Blues, purples, magentas
                    return "neutral"
            except:
                pass
        
        # Handle hex colors - convert to RGB and determine category
        if color.startswith('#'):
            try:
                # Remove # and convert to RGB
                hex_color = color.lstrip('#')
                r = int(hex_color[0:2], 16)
                g = int(hex_color[2:4], 16) 
                b = int(hex_color[4:6], 16)
                
                # Simple RGB to HSL approximation for categorization
                max_val = max(r, g, b)
                min_val = min(r, g, b)
                
                if r > g and r > b:  # Red dominant
                    return "warm"
                elif g > r and g > b:  # Green dominant
                    return "cool"
                elif b > r and b > g:  # Blue dominant
                    return "neutral"
                else:
                    # Mixed colors - categorize based on intensity
                    if r + g > b * 1.5:  # Warm tendency
                        return "warm"
                    elif g + b > r * 1.5:  # Cool tendency
                        return "cool"
                    else:
                        return "neutral"
            except:
                pass
        
        # Fallback categorization for known colors
        warm_colors = ['#FF5733', '#FF6B47', '#FF4500', '#FF7F50', '#FFB347', '#FFA500', '#FF8C69', '#FF6347']
        cool_colors = ['#33FF57', '#00FF7F', '#40E0D0', '#00CED1', '#1E90FF', '#6495ED', '#7FFFD4', '#98FB98']
        neutral_colors = ['#C733FF', '#9966CC', '#8A2BE2', '#DA70D6', '#DDA0DD', '#EE82EE', '#FF69B4', '#FFB6C1']
        
        if color in warm_colors:
            return "warm"
        elif color in cool_colors:
            return "cool"
        elif color in neutral_colors:
            return "neutral"
        
        return "neutral"  # Default fallback
    
    # Categorize all color choices
    categories = {"warm": 0, "cool": 0, "neutral": 0}
    
    for color in color_choices:
        category = categorize_color(color)
        categories[category] += 1
    
    total = len(color_choices)
    if total == 0:
        return "Unclassified"
    
    warm_pct = categories["warm"] / total
    cool_pct = categories["cool"] / total
    neutral_pct = categories["neutral"] / total
    
    # Enhanced classification with more nuanced categories
    if warm_pct > 0.7:
        return "Intense Warm Seeker"
    elif warm_pct > 0.5:
        return "Warm Seeker"
    elif cool_pct > 0.7:
        return "Deep Cool Lover"
    elif cool_pct > 0.5:
        return "Cool Lover"
    elif neutral_pct > 0.6:
        return "Mystical Mind"
    elif neutral_pct > 0.4:
        return "Balanced Mind"
    elif abs(warm_pct - cool_pct) < 0.2 and abs(warm_pct - neutral_pct) < 0.2:
        return "Rainbow Spirit"
    elif warm_pct > 0.3 and cool_pct > 0.3:
        return "Dynamic Explorer"
    else:
        return "Eclectic Thinker"

# API Endpoints

@app.get("/")
async def root():
    return {"message": "Ara Streaming Platform API", "status": "active"}

@app.get("/api/videos")
async def get_videos():
    """Get all available videos"""
    try:
        videos = await db.videos.find({}).to_list(length=None)
        return {"videos": serialize_doc(videos)}
    except Exception as e:
        logger.error(f"Error getting videos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/videos/watch")
async def track_video_watch(watch_data: VideoWatch):
    """Track video watch time and award tokens"""
    try:
        # Calculate tokens: +1 per minute, capped at +10
        tokens_earned = min(watch_data.watch_time // 60, 10)
        
        # Update user tokens and watch time
        user_update = {
            "$inc": {
                "tokens": tokens_earned,
                "total_watch_time": watch_data.watch_time
            }
        }
        
        await db.users.update_one(
            {"user_id": watch_data.user_id},
            user_update,
            upsert=True
        )
        
        # Track watch session
        await db.watch_sessions.insert_one({
            "user_id": watch_data.user_id,
            "video_id": watch_data.video_id,
            "watch_time": watch_data.watch_time,
            "tokens_earned": tokens_earned,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {
            "success": True,
            "tokens_earned": tokens_earned,
            "total_watch_time": watch_data.watch_time
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/color-pulse")
async def submit_color_pulse(pulse_data: ColorPulse):
    """Submit Color Pulse choice with baseline assessment data"""
    try:
        # Award +2 tokens for Color Pulse choice
        await db.users.update_one(
            {"user_id": pulse_data.user_id},
            {
                "$inc": {"tokens": 2},
                "$push": {"color_choices": pulse_data.color_choice}
            },
            upsert=True
        )
        
        # Get updated user to recalculate neurodiversity class
        user = await db.users.find_one({"user_id": pulse_data.user_id})
        if user:
            new_class = calculate_neurodiversity_class(user.get("color_choices", []))
            await db.users.update_one(
                {"user_id": pulse_data.user_id},
                {"$set": {"neurodiversity_class": new_class}}
            )
        
        # Store comprehensive Color Pulse data including baseline assessment
        pulse_record = {
            **pulse_data.dict(),
            "timestamp": datetime.utcnow().isoformat(),
            "session_type": "baseline_assessment" if pulse_data.is_baseline else "periodic_pulse"
        }
        
        await db.color_pulses.insert_one(pulse_record)
        
        # If this is a baseline assessment, also store it separately for research
        if pulse_data.is_baseline:
            baseline_record = {
                "user_id": pulse_data.user_id,
                "video_id": pulse_data.video_id,
                "mood": pulse_data.mood,
                "weather": pulse_data.weather,
                "favorite_memory": pulse_data.favorite_memory,
                "initial_color_choice": pulse_data.color_choice,
                "timestamp": datetime.utcnow().isoformat(),
                "session_start": True
            }
            await db.baseline_assessments.insert_one(baseline_record)
        
        return {
            "success": True,
            "tokens_earned": 2,
            "neurodiversity_class": new_class if user else "Unclassified",
            "assessment_type": "baseline" if pulse_data.is_baseline else "periodic",
            "baseline_data": {
                "mood": pulse_data.mood,
                "weather": pulse_data.weather,
                "favorite_memory": pulse_data.favorite_memory
            } if pulse_data.is_baseline else None
        }
        
    except Exception as e:
        logger.error(f"Error submitting color pulse: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/{user_id}/profile")
async def get_user_profile(user_id: str):
    """Get user profile with stats"""
    try:
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            # Create new user
            user = {
                "user_id": user_id,
                "username": f"User_{user_id[:8]}",
                "tokens": 0,
                "total_watch_time": 0,
                "color_choices": [],
                "neurodiversity_class": "Unclassified"
            }
            await db.users.insert_one(user)
        
        return {"user": serialize_doc(user)}
        
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leaderboard")
async def get_leaderboard():
    """Get top users by tokens"""
    try:
        users = await db.users.find({}).sort("tokens", -1).limit(10).to_list(length=None)
        return {"leaderboard": serialize_doc(users)}
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agora/token")
async def generate_agora_token(token_request: TokenRequest):
    """Generate Agora RTC token for live streaming"""
    try:
        if not AGORA_APP_ID or not AGORA_APP_CERTIFICATE:
            raise HTTPException(status_code=500, detail="Agora credentials not configured")
        
        # Token expires in 1 hour
        privilege_expiry = int(time.time()) + 3600
        
        # Role: 1 = publisher (streamer), 2 = subscriber (viewer)
        role = 1 if token_request.role == "publisher" else 2
        
        token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            AGORA_APP_CERTIFICATE,
            token_request.channel,
            token_request.uid,
            role,
            privilege_expiry
        )
        
        return {
            "token": token,
            "uid": token_request.uid,
            "channel": token_request.channel,
            "appId": AGORA_APP_ID,
            "role": token_request.role
        }
        
    except Exception as e:
        logger.error(f"Error generating Agora token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/live-streams/start")
async def start_live_stream(stream_data: dict):
    """Start a new live stream"""
    try:
        stream_id = str(uuid.uuid4())
        
        stream = {
            "stream_id": stream_id,
            "creator_id": stream_data["creator_id"],
            "title": stream_data["title"],
            "channel": stream_data.get("channel", f"live_{stream_data['creator_id']}_{int(time.time())}"),
            "agora_uid": stream_data.get("agora_uid"),
            "viewer_count": 0,
            "is_active": True,
            "start_time": datetime.utcnow().isoformat(),
            "end_time": None
        }
        
        await db.live_streams.insert_one(stream)
        live_streams[stream_id] = stream
        
        logger.info(f"Live stream started: {stream_id} by {stream_data['creator_id']}")
        
        return {"success": True, "stream": serialize_doc(stream)}
        
    except Exception as e:
        logger.error(f"Error starting live stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/live-streams/{stream_id}/end")
async def end_live_stream(stream_id: str):
    """End a live stream"""
    try:
        end_time = datetime.utcnow().isoformat()
        
        await db.live_streams.update_one(
            {"stream_id": stream_id},
            {
                "$set": {
                    "is_active": False,
                    "end_time": end_time
                }
            }
        )
        
        if stream_id in live_streams:
            live_streams[stream_id]["is_active"] = False
            live_streams[stream_id]["end_time"] = end_time
        
        return {"success": True, "message": "Stream ended"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/live-streams")
async def get_live_streams():
    """Get all active live streams"""
    try:
        streams = await db.live_streams.find({"is_active": True}).to_list(length=None)
        return {"streams": serialize_doc(streams)}
    except Exception as e:
        logger.error(f"Error getting live streams: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ads")
async def get_ads():
    """Get advertisement content"""
    try:
        ads = await db.ads.find({}).to_list(length=None)
        return {"ads": serialize_doc(ads)}
    except Exception as e:
        logger.error(f"Error getting ads: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/creator/{creator_id}/stats")
async def get_creator_stats(creator_id: str):
    """Get creator dashboard statistics"""
    try:
        # Get video views
        video_views = await db.watch_sessions.count_documents({"video_id": {"$regex": creator_id}})
        
        # Get average watch time
        avg_watch_time_pipeline = [
            {"$match": {"video_id": {"$regex": creator_id}}},
            {"$group": {"_id": None, "avg_watch_time": {"$avg": "$watch_time"}}}
        ]
        avg_result = await db.watch_sessions.aggregate(avg_watch_time_pipeline).to_list(length=1)
        avg_watch_time = avg_result[0]["avg_watch_time"] if avg_result else 0
        
        # Get color choice distribution
        color_distribution = await db.color_pulses.aggregate([
            {"$match": {"user_id": creator_id}},
            {"$group": {"_id": "$color_choice", "count": {"$sum": 1}}}
        ]).to_list(length=None)
        
        # Get total tokens earned by users watching creator's content
        total_tokens = await db.watch_sessions.aggregate([
            {"$match": {"video_id": {"$regex": creator_id}}},
            {"$group": {"_id": None, "total_tokens": {"$sum": "$tokens_earned"}}}
        ]).to_list(length=1)
        
        tokens_earned = total_tokens[0]["total_tokens"] if total_tokens else 0
        
        return {
            "video_views": video_views,
            "avg_watch_time": avg_watch_time,
            "color_distribution": color_distribution,
            "total_tokens_earned": tokens_earned,
            "ad_revenue_share": tokens_earned * 0.5  # 50% revenue share
        }
        
    except Exception as e:
        logger.error(f"Error getting creator stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# YouTube-style Video Comments API

@app.post("/api/videos/{video_id}/comments")
async def add_video_comment(video_id: str, comment_data: VideoComment):
    """Add a comment to a video (YouTube-style)"""
    try:
        comment_id = str(uuid.uuid4())
        
        comment = {
            "comment_id": comment_id,
            "user_id": comment_data.user_id,
            "video_id": video_id,
            "content": comment_data.content,
            "parent_comment_id": comment_data.parent_comment_id,
            "timestamp": datetime.utcnow().isoformat(),
            "likes": 0,
            "dislikes": 0,
            "replies_count": 0,
            "is_edited": False,
            "is_pinned": False
        }
        
        await db.video_comments.insert_one(comment)
        
        # If this is a reply, increment parent's reply count
        if comment_data.parent_comment_id:
            await db.video_comments.update_one(
                {"comment_id": comment_data.parent_comment_id},
                {"$inc": {"replies_count": 1}}
            )
        
        # Award +1 token for commenting (engagement reward)
        await db.users.update_one(
            {"user_id": comment_data.user_id},
            {"$inc": {"tokens": 1}},
            upsert=True
        )
        
        return {
            "success": True,
            "comment": serialize_doc(comment),
            "tokens_earned": 1
        }
        
    except Exception as e:
        logger.error(f"Error adding video comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/videos/{video_id}/comments")
async def get_video_comments(video_id: str, parent_only: bool = True):
    """Get comments for a video (YouTube-style threading)"""
    try:
        if parent_only:
            # Get only top-level comments (no replies)
            comments = await db.video_comments.find({
                "video_id": video_id,
                "parent_comment_id": None
            }).sort("timestamp", -1).to_list(length=50)
        else:
            # Get all comments including replies
            comments = await db.video_comments.find({
                "video_id": video_id
            }).sort("timestamp", 1).to_list(length=200)
        
        # Enrich comments with user data
        for comment in comments:
            user = await db.users.find_one({"user_id": comment["user_id"]})
            comment["username"] = user.get("username", f"User_{comment['user_id'][:8]}") if user else "Anonymous"
        
        return {"comments": serialize_doc(comments)}
        
    except Exception as e:
        logger.error(f"Error getting video comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/comments/{comment_id}/replies")
async def get_comment_replies(comment_id: str):
    """Get replies to a specific comment"""
    try:
        replies = await db.video_comments.find({
            "parent_comment_id": comment_id
        }).sort("timestamp", 1).to_list(length=50)
        
        # Enrich replies with user data
        for reply in replies:
            user = await db.users.find_one({"user_id": reply["user_id"]})
            reply["username"] = user.get("username", f"User_{reply['user_id'][:8]}") if user else "Anonymous"
        
        return {"replies": serialize_doc(replies)}
        
    except Exception as e:
        logger.error(f"Error getting comment replies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/comments/{comment_id}/interact")
async def interact_with_comment(comment_id: str, interaction_data: CommentInteraction):
    """Like, dislike, or report a comment"""
    try:
        # Check if user already interacted with this comment
        existing_interaction = await db.comment_interactions.find_one({
            "user_id": interaction_data.user_id,
            "comment_id": comment_id
        })
        
        if existing_interaction:
            # Update existing interaction
            old_type = existing_interaction["interaction_type"]
            await db.comment_interactions.update_one(
                {"user_id": interaction_data.user_id, "comment_id": comment_id},
                {"$set": {
                    "interaction_type": interaction_data.interaction_type,
                    "timestamp": datetime.utcnow().isoformat()
                }}
            )
            
            # Update comment counts
            if old_type == "like":
                await db.video_comments.update_one(
                    {"comment_id": comment_id},
                    {"$inc": {"likes": -1}}
                )
            elif old_type == "dislike":
                await db.video_comments.update_one(
                    {"comment_id": comment_id},
                    {"$inc": {"dislikes": -1}}
                )
        else:
            # Create new interaction
            await db.comment_interactions.insert_one({
                "user_id": interaction_data.user_id,
                "comment_id": comment_id,
                "interaction_type": interaction_data.interaction_type,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Update comment counts
        if interaction_data.interaction_type == "like":
            await db.video_comments.update_one(
                {"comment_id": comment_id},
                {"$inc": {"likes": 1}}
            )
        elif interaction_data.interaction_type == "dislike":
            await db.video_comments.update_one(
                {"comment_id": comment_id},
                {"$inc": {"dislikes": 1}}
            )
        
        return {"success": True, "interaction": interaction_data.interaction_type}
        
    except Exception as e:
        logger.error(f"Error interacting with comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Twitch-style Live Chat API

@app.post("/api/live-streams/{stream_id}/chat")
async def send_live_chat_message(stream_id: str, message_data: LiveChatMessage):
    """Send a message to live stream chat (Twitch-style)"""
    try:
        message_id = str(uuid.uuid4())
        
        message = {
            "message_id": message_id,
            "user_id": message_data.user_id,
            "stream_id": stream_id,
            "message": message_data.message,
            "message_type": message_data.message_type,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await db.live_chat.insert_one(message)
        
        # Get user data for real-time broadcast
        user = await db.users.find_one({"user_id": message_data.user_id})
        username = user.get("username", f"User_{message_data.user_id[:8]}") if user else "Anonymous"
        
        message["username"] = username
        
        # Broadcast to all connected clients via WebSocket
        websocket_message = {
            "type": "live_chat_message",
            "stream_id": stream_id,
            "message": serialize_doc(message)
        }
        
        # Send to all connected clients
        for client_id, client_ws in connected_clients.items():
            try:
                await client_ws.send_text(json.dumps(websocket_message))
            except:
                pass
        
        return {
            "success": True,
            "message": serialize_doc(message)
        }
        
    except Exception as e:
        logger.error(f"Error sending live chat message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/live-streams/{stream_id}/chat")
async def get_live_chat_messages(stream_id: str, limit: int = 50):
    """Get recent live chat messages for a stream"""
    try:
        messages = await db.live_chat.find({
            "stream_id": stream_id
        }).sort("timestamp", -1).limit(limit).to_list(length=limit)
        
        # Reverse to show chronological order (oldest first)
        messages.reverse()
        
        # Enrich messages with user data
        for message in messages:
            user = await db.users.find_one({"user_id": message["user_id"]})
            message["username"] = user.get("username", f"User_{message['user_id'][:8]}") if user else "Anonymous"
        
        return {"messages": serialize_doc(messages)}
        
    except Exception as e:
        logger.error(f"Error getting live chat messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket for real-time features
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    connected_clients[user_id] = websocket
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message["type"] == "color_pulse_prompt":
                # Broadcast Color Pulse prompt to user
                await websocket.send_text(json.dumps({
                    "type": "color_pulse_prompt",
                    "colors": ["#FF5733", "#33FF57", "#C733FF"],
                    "timestamp": datetime.utcnow().isoformat()
                }))
            
            elif message["type"] == "viewer_count_update":
                # Update live stream viewer count
                stream_id = message.get("stream_id")
                if stream_id in live_streams:
                    live_streams[stream_id]["viewer_count"] = message.get("count", 0)
                    
                    # Broadcast to all connected clients
                    for client_id, client_ws in connected_clients.items():
                        try:
                            await client_ws.send_text(json.dumps({
                                "type": "viewer_count_update",
                                "stream_id": stream_id,
                                "count": live_streams[stream_id]["viewer_count"]
                            }))
                        except:
                            pass
            
    except WebSocketDisconnect:
        if user_id in connected_clients:
            del connected_clients[user_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
