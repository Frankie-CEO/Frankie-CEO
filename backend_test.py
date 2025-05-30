import requests
import unittest
import uuid
import time
import json
from datetime import datetime

# Backend URL from the frontend .env file
BACKEND_URL = "https://42a62d33-9a9f-4e84-a249-803099275fcb.preview.emergentagent.com"

class AraStreamingPlatformTest(unittest.TestCase):
    def setUp(self):
        # Generate a unique user ID for testing
        self.user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        self.video_id = "vid_001"  # Using a sample video ID from the backend
        
    def test_01_root_endpoint(self):
        """Test the root endpoint"""
        print("\n🔍 Testing root endpoint...")
        response = requests.get(f"{BACKEND_URL}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Ara Streaming Platform API")
        self.assertEqual(data["status"], "active")
        print("✅ Root endpoint test passed")

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
            "mood": "Happy",
            "memory": "Strong",
            "context": "Leisure",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        response = requests.post(f"{BACKEND_URL}/api/color-pulse", json=pulse_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["tokens_earned"], 2)  # +2 tokens for color pulse
        self.assertEqual(data["neurodiversity_class"], "Warm Seeker")  # Should be classified as Warm Seeker
        print(f"✅ Color pulse submission test passed - Earned {data['tokens_earned']} tokens, classified as {data['neurodiversity_class']}")
        
    def test_06_get_updated_profile(self):
        """Test getting updated user profile after earning tokens"""
        print("\n🔍 Testing get updated user profile...")
        response = requests.get(f"{BACKEND_URL}/api/user/{self.user_id}/profile")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["user_id"], self.user_id)
        self.assertEqual(data["user"]["tokens"], 7)  # 5 from watch + 2 from color pulse
        self.assertEqual(data["user"]["neurodiversity_class"], "Warm Seeker")
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
        
    def test_13_get_creator_stats(self):
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
    test_suite.addTest(AraStreamingPlatformTest("test_01_root_endpoint"))
    test_suite.addTest(AraStreamingPlatformTest("test_02_get_videos"))
    test_suite.addTest(AraStreamingPlatformTest("test_03_get_user_profile"))
    test_suite.addTest(AraStreamingPlatformTest("test_04_track_video_watch"))
    test_suite.addTest(AraStreamingPlatformTest("test_05_submit_color_pulse"))
    test_suite.addTest(AraStreamingPlatformTest("test_06_get_updated_profile"))
    test_suite.addTest(AraStreamingPlatformTest("test_07_get_leaderboard"))
    test_suite.addTest(AraStreamingPlatformTest("test_08_get_ads"))
    test_suite.addTest(AraStreamingPlatformTest("test_09_get_live_streams"))
    test_suite.addTest(AraStreamingPlatformTest("test_10_generate_agora_token"))
    test_suite.addTest(AraStreamingPlatformTest("test_11_start_live_stream"))
    test_suite.addTest(AraStreamingPlatformTest("test_12_end_live_stream"))
    test_suite.addTest(AraStreamingPlatformTest("test_13_get_creator_stats"))
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(test_suite)
