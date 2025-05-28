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
    memory: Optional[str] = None
    context: Optional[str] = None
    timestamp: str

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
        # Sample videos
        sample_videos = [
            {
                "video_id": "vid_001",
                "title": "Amazing Nature Documentary",
                "duration": 1800,  # 30 minutes
                "url": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
                "thumbnail": "https://sample-videos.com/image/nature1.jpg",
                "size_mb": 30
            },
            {
                "video_id": "vid_002", 
                "title": "Tech Innovation 2025",
                "duration": 1200,  # 20 minutes
                "url": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
                "thumbnail": "https://sample-videos.com/image/tech1.jpg",
                "size_mb": 28
            },
            {
                "video_id": "vid_003",
                "title": "Creative Art Showcase", 
                "duration": 900,   # 15 minutes
                "url": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_3mb.mp4",
                "thumbnail": "https://sample-videos.com/image/art1.jpg",
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
    """Calculate neurodiversity classification based on color choices"""
    if not color_choices:
        return "Unclassified"
    
    warm_colors = ["#FF5733"]  # Orange
    cool_colors = ["#33FF57"]  # Green  
    neutral_colors = ["#C733FF"]  # Purple
    
    total = len(color_choices)
    warm_count = sum(1 for color in color_choices if color in warm_colors)
    cool_count = sum(1 for color in color_choices if color in cool_colors)
    neutral_count = sum(1 for color in color_choices if color in neutral_colors)
    
    warm_pct = warm_count / total
    cool_pct = cool_count / total
    neutral_pct = neutral_count / total
    
    if warm_pct > 0.6:
        return "Warm Seeker"
    elif cool_pct > 0.6:
        return "Cool Lover"
    elif neutral_pct > 0.4:
        return "Balanced Mind"
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
        # Convert ObjectId to string for JSON serialization
        for video in videos:
            if '_id' in video:
                video['_id'] = str(video['_id'])
        return {"videos": videos}
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
    """Submit Color Pulse choice and award tokens"""
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
        
        # Store Color Pulse data
        await db.color_pulses.insert_one({
            **pulse_data.dict(),
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {
            "success": True,
            "tokens_earned": 2,
            "neurodiversity_class": new_class if user else "Unclassified"
        }
        
    except Exception as e:
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
        
        return {"user": user}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leaderboard")
async def get_leaderboard():
    """Get top users by tokens"""
    try:
        users = await db.users.find({}).sort("tokens", -1).limit(10).to_list(length=None)
        return {"leaderboard": users}
    except Exception as e:
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
            "viewer_count": 0,
            "is_active": True,
            "start_time": datetime.utcnow().isoformat(),
            "end_time": None
        }
        
        await db.live_streams.insert_one(stream)
        live_streams[stream_id] = stream
        
        return {"success": True, "stream": stream}
        
    except Exception as e:
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
        return {"streams": streams}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ads")
async def get_ads():
    """Get advertisement content"""
    try:
        ads = await db.ads.find({}).to_list(length=None)
        return {"ads": ads}
    except Exception as e:
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
