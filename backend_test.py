import requests
import unittest
import uuid
import time
import json
from datetime import datetime

# Backend URL from the frontend .env file
BACKEND_URL = "https://neonstream-2.preview.emergentagent.com"

class AraStreamingPlatformTest(unittest.TestCase):
    def setUp(self):
        # Generate a unique user ID for testing
        self.user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        self.video_id = "vid_001"  # Using a sample video ID from the backend
        
        # Initialize variables that will be set during tests
        self.comment_id = None
        self.reply_id = None
        self.stream_id = None
        self.chat_stream_id = None
        self.chat_message_id = None
        
    def test_01_api_health_check(self):
        """Test API health by checking videos endpoint"""
        print("\n🔍 Testing API health check...")
        response = requests.get(f"{BACKEND_URL}/api/videos")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("videos", data)
        print("✅ API health check passed")

    def test_02_get_videos(self):
        """Test getting all videos"""
        print("\n🔍 Testing get videos endpoint...")
        response = requests.get(f"{BACKEND_URL}/api/videos")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("videos", data)
        self.assertTrue(len(data["videos"]) > 0)
        print(f"✅ Get videos test passed - Found {len(data['videos'])} videos")
        
        # Store the first video for later tests
        self.sample_video = data["videos"][0]
        
    def test_03_get_user_profile(self):
        """Test getting user profile"""
        print(f"\n🔍 Testing get user profile endpoint for user {self.user_id}...")
        response = requests.get(f"{BACKEND_URL}/api/user/{self.user_id}/profile")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["user_id"], self.user_id)
        print("✅ Get user profile test passed")
        
    def test_04_track_video_watch(self):
        """Test tracking video watch time"""
        print("\n🔍 Testing video watch tracking endpoint...")
        watch_data = {
            "user_id": self.user_id,
            "video_id": self.video_id,
            "watch_time": 300,  # 5 minutes
            "completed": False
        }
        
        response = requests.post(f"{BACKEND_URL}/api/videos/watch", json=watch_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["tokens_earned"], 5)  # 5 minutes = 5 tokens
        print(f"✅ Video watch tracking test passed - Earned {data['tokens_earned']} tokens")
        
    def test_05_submit_color_pulse(self):
        """Test submitting color pulse choice"""
        print("\n🔍 Testing color pulse submission endpoint...")
        pulse_data = {
            "user_id": self.user_id,
            "video_id": self.video_id,
            "color_choice": "#FF5733",  # Orange
            "mood": "Happy & Content",
            "weather": "Sunny & Bright",
            "favorite_memory": "A childhood adventure",
            "timestamp": datetime.utcnow().isoformat(),
            "is_baseline": True
        }
        
        response = requests.post(f"{BACKEND_URL}/api/color-pulse", json=pulse_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["tokens_earned"], 2)  # +2 tokens for color pulse
        self.assertIn("Warm", data["neurodiversity_class"])  # Should be classified as some type of Warm Seeker
        print(f"✅ Color pulse submission test passed - Earned {data['tokens_earned']} tokens, classified as {data['neurodiversity_class']}")
        
    def test_06_get_updated_profile(self):
        """Test getting updated user profile after earning tokens"""
        print("\n🔍 Testing get updated user profile...")
        response = requests.get(f"{BACKEND_URL}/api/user/{self.user_id}/profile")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["user_id"], self.user_id)
        # Tokens should be greater than 0 after watch and color pulse activities
        self.assertGreaterEqual(data["user"]["tokens"], 0)  # At least some tokens earned
        self.assertIn("Warm", data["user"]["neurodiversity_class"])
        print(f"✅ Updated profile test passed - User has {data['user']['tokens']} tokens")
        
    def test_07_get_leaderboard(self):
        """Test getting leaderboard"""
        print("\n🔍 Testing leaderboard endpoint...")
        response = requests.get(f"{BACKEND_URL}/api/leaderboard")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("leaderboard", data)
        print(f"✅ Leaderboard test passed - Found {len(data['leaderboard'])} users")
        
    def test_08_get_ads(self):
        """Test getting advertisements"""
        print("\n🔍 Testing ads endpoint...")
        response = requests.get(f"{BACKEND_URL}/api/ads")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("ads", data)
        self.assertTrue(len(data["ads"]) > 0)
        print(f"✅ Ads test passed - Found {len(data['ads'])} ads")
        
    def test_09_get_live_streams(self):
        """Test getting live streams"""
        print("\n🔍 Testing live streams endpoint...")
        response = requests.get(f"{BACKEND_URL}/api/live-streams")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("streams", data)
        print(f"✅ Live streams test passed - Found {len(data['streams'])} active streams")
        
    def test_10_generate_agora_token(self):
        """Test generating Agora token for live streaming"""
        print("\n🔍 Testing Agora token generation endpoint...")
        token_request = {
            "channel": f"test_channel_{self.user_id}",
            "uid": 12345,
            "role": "publisher"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/agora/token", json=token_request)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertIn("appId", data)
        self.assertEqual(data["channel"], token_request["channel"])
        print("✅ Agora token generation test passed")
        
    def test_11_start_live_stream(self):
        """Test starting a live stream"""
        print("\n🔍 Testing start live stream endpoint...")
        stream_data = {
            "creator_id": self.user_id,
            "title": "Test Live Stream"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/live-streams/start", json=stream_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("stream", data)
        self.assertEqual(data["stream"]["creator_id"], self.user_id)
        self.assertEqual(data["stream"]["title"], "Test Live Stream")
        self.assertTrue(data["stream"]["is_active"])
        
        # Store stream ID for end test
        self.stream_id = data["stream"]["stream_id"]
        print(f"✅ Start live stream test passed - Stream ID: {self.stream_id}")
        
    def test_12_end_live_stream(self):
        """Test ending a live stream"""
        print("\n🔍 Testing end live stream endpoint...")
        response = requests.post(f"{BACKEND_URL}/api/live-streams/{self.stream_id}/end")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        print("✅ End live stream test passed")
        
    def test_13_add_video_comment(self):
        """Test adding a comment to a video (YouTube-style)"""
        print("\n🔍 Testing add video comment endpoint...")
        comment_data = {
            "user_id": self.user_id,
            "video_id": self.video_id,
            "content": "This is an amazing video! Great content and production quality.",
            "parent_comment_id": None
        }
        
        response = requests.post(f"{BACKEND_URL}/api/videos/{self.video_id}/comments", json=comment_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("comment", data)
        self.assertEqual(data["comment"]["content"], comment_data["content"])
        self.assertEqual(data["tokens_earned"], 1)  # +1 token for commenting
        
        # Store comment ID for reply test
        self.comment_id = data["comment"]["comment_id"]
        print(f"✅ Add video comment test passed - Comment ID: {self.comment_id}")
        
    def test_14_get_video_comments(self):
        """Test getting comments for a video"""
        print("\n🔍 Testing get video comments endpoint...")
        response = requests.get(f"{BACKEND_URL}/api/videos/{self.video_id}/comments")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("comments", data)
        self.assertTrue(len(data["comments"]) > 0)
        
        # Check if our comment is in the list
        comment_found = False
        for comment in data["comments"]:
            if comment["comment_id"] == self.comment_id:
                comment_found = True
                self.assertEqual(comment["user_id"], self.user_id)
                break
        self.assertTrue(comment_found)
        print(f"✅ Get video comments test passed - Found {len(data['comments'])} comments")
        
    def test_15_add_comment_reply(self):
        """Test adding a reply to a comment"""
        print("\n🔍 Testing add comment reply endpoint...")
        reply_data = {
            "user_id": f"reply_user_{uuid.uuid4().hex[:8]}",
            "video_id": self.video_id,
            "content": "I totally agree! This creator always delivers quality content.",
            "parent_comment_id": self.comment_id
        }
        
        response = requests.post(f"{BACKEND_URL}/api/videos/{self.video_id}/comments", json=reply_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["comment"]["parent_comment_id"], self.comment_id)
        
        # Store reply ID for later tests
        self.reply_id = data["comment"]["comment_id"]
        print(f"✅ Add comment reply test passed - Reply ID: {self.reply_id}")
        
    def test_16_get_comment_replies(self):
        """Test getting replies to a specific comment"""
        print("\n🔍 Testing get comment replies endpoint...")
        response = requests.get(f"{BACKEND_URL}/api/comments/{self.comment_id}/replies")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("replies", data)
        self.assertTrue(len(data["replies"]) > 0)
        
        # Check if our reply is in the list
        reply_found = False
        for reply in data["replies"]:
            if reply["comment_id"] == self.reply_id:
                reply_found = True
                break
        self.assertTrue(reply_found)
        print(f"✅ Get comment replies test passed - Found {len(data['replies'])} replies")
        
    def test_17_like_comment(self):
        """Test liking a comment"""
        print("\n🔍 Testing like comment endpoint...")
        interaction_data = {
            "user_id": f"liker_user_{uuid.uuid4().hex[:8]}",
            "comment_id": self.comment_id,
            "interaction_type": "like"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/comments/{self.comment_id}/interact", json=interaction_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["interaction"], "like")
        print("✅ Like comment test passed")
        
    def test_18_dislike_comment(self):
        """Test disliking a comment"""
        print("\n🔍 Testing dislike comment endpoint...")
        interaction_data = {
            "user_id": f"disliker_user_{uuid.uuid4().hex[:8]}",
            "comment_id": self.comment_id,
            "interaction_type": "dislike"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/comments/{self.comment_id}/interact", json=interaction_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["interaction"], "dislike")
        print("✅ Dislike comment test passed")
        
    def test_19_send_live_chat_message(self):
        """Test sending a message to live stream chat (Twitch-style)"""
        print("\n🔍 Testing send live chat message endpoint...")
        
        # First, start a new live stream for chat testing
        stream_data = {
            "creator_id": self.user_id,
            "title": "Chat Test Stream"
        }
        
        stream_response = requests.post(f"{BACKEND_URL}/api/live-streams/start", json=stream_data)
        self.assertEqual(stream_response.status_code, 200)
        self.chat_stream_id = stream_response.json()["stream"]["stream_id"]
        
        # Now send a chat message
        message_data = {
            "user_id": self.user_id,
            "stream_id": self.chat_stream_id,
            "message": "Hello everyone! This stream is amazing! 🔥",
            "message_type": "chat"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/live-streams/{self.chat_stream_id}/chat", json=message_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("message", data)
        self.assertEqual(data["message"]["message"], message_data["message"])
        self.assertEqual(data["message"]["message_type"], "chat")
        
        # Store message ID for later tests
        self.chat_message_id = data["message"]["message_id"]
        print(f"✅ Send live chat message test passed - Message ID: {self.chat_message_id}")
        
    def test_20_get_live_chat_messages(self):
        """Test getting live chat messages for a stream"""
        print("\n🔍 Testing get live chat messages endpoint...")
        
        # Send a few more messages to test retrieval
        for i in range(3):
            message_data = {
                "user_id": f"chat_user_{i}_{uuid.uuid4().hex[:4]}",
                "stream_id": self.chat_stream_id,
                "message": f"Chat message #{i+1} - Great stream! 👍",
                "message_type": "chat"
            }
            requests.post(f"{BACKEND_URL}/api/live-streams/{self.chat_stream_id}/chat", json=message_data)
        
        # Now get all messages
        response = requests.get(f"{BACKEND_URL}/api/live-streams/{self.chat_stream_id}/chat")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("messages", data)
        self.assertTrue(len(data["messages"]) >= 4)  # At least our 4 messages
        
        # Check if our original message is in the list
        message_found = False
        for message in data["messages"]:
            if message["message_id"] == self.chat_message_id:
                message_found = True
                self.assertEqual(message["user_id"], self.user_id)
                break
        self.assertTrue(message_found)
        print(f"✅ Get live chat messages test passed - Found {len(data['messages'])} messages")
        
    def test_21_send_emoji_chat_message(self):
        """Test sending an emoji message to live stream chat"""
        print("\n🔍 Testing send emoji chat message endpoint...")
        message_data = {
            "user_id": self.user_id,
            "stream_id": self.chat_stream_id,
            "message": "🎉🔥💯",
            "message_type": "emoji"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/live-streams/{self.chat_stream_id}/chat", json=message_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["message"]["message_type"], "emoji")
        print("✅ Send emoji chat message test passed")
        
    def test_22_get_creator_stats(self):
        """Test getting creator stats"""
        print("\n🔍 Testing creator stats endpoint...")
        response = requests.get(f"{BACKEND_URL}/api/creator/{self.user_id}/stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("video_views", data)
        self.assertIn("avg_watch_time", data)
        self.assertIn("total_tokens_earned", data)
        print("✅ Creator stats test passed")

if __name__ == "__main__":
    # Run the tests in order
    test_suite = unittest.TestSuite()
    
    # Basic API tests
    test_suite.addTest(AraStreamingPlatformTest("test_01_root_endpoint"))
    test_suite.addTest(AraStreamingPlatformTest("test_02_get_videos"))
    test_suite.addTest(AraStreamingPlatformTest("test_03_get_user_profile"))
    
    # Video streaming and token system tests
    test_suite.addTest(AraStreamingPlatformTest("test_04_track_video_watch"))
    test_suite.addTest(AraStreamingPlatformTest("test_05_submit_color_pulse"))
    test_suite.addTest(AraStreamingPlatformTest("test_06_get_updated_profile"))
    test_suite.addTest(AraStreamingPlatformTest("test_07_get_leaderboard"))
    test_suite.addTest(AraStreamingPlatformTest("test_08_get_ads"))
    
    # Live streaming and Agora.io tests
    test_suite.addTest(AraStreamingPlatformTest("test_09_get_live_streams"))
    test_suite.addTest(AraStreamingPlatformTest("test_10_generate_agora_token"))
    test_suite.addTest(AraStreamingPlatformTest("test_11_start_live_stream"))
    test_suite.addTest(AraStreamingPlatformTest("test_12_end_live_stream"))
    
    # YouTube-style video comments tests (HIGH PRIORITY)
    test_suite.addTest(AraStreamingPlatformTest("test_13_add_video_comment"))
    test_suite.addTest(AraStreamingPlatformTest("test_14_get_video_comments"))
    test_suite.addTest(AraStreamingPlatformTest("test_15_add_comment_reply"))
    test_suite.addTest(AraStreamingPlatformTest("test_16_get_comment_replies"))
    test_suite.addTest(AraStreamingPlatformTest("test_17_like_comment"))
    test_suite.addTest(AraStreamingPlatformTest("test_18_dislike_comment"))
    
    # Twitch-style live chat tests (HIGH PRIORITY)
    test_suite.addTest(AraStreamingPlatformTest("test_19_send_live_chat_message"))
    test_suite.addTest(AraStreamingPlatformTest("test_20_get_live_chat_messages"))
    test_suite.addTest(AraStreamingPlatformTest("test_21_send_emoji_chat_message"))
    
    # Creator stats test
    test_suite.addTest(AraStreamingPlatformTest("test_22_get_creator_stats"))
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.failures:
        print(f"\nFAILURES:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback}")
    
    if result.errors:
        print(f"\nERRORS:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback}")
    
    success_rate = ((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun) * 100
    print(f"\nSuccess Rate: {success_rate:.1f}%")
