import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { 
  Home, 
  Radio, 
  Compass, 
  User, 
  BarChart3,
  Play,
  Pause,
  Volume2,
  Eye,
  Users,
  Trophy,
  Zap,
  X,
  Camera,
  Mic,
  PhoneOff,
  Maximize,
  Minimize
} from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const AGORA_APP_ID = process.env.REACT_APP_AGORA_APP_ID;

// Generate user ID
const USER_ID = `user_${Math.random().toString(36).substr(2, 9)}`;

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [ads, setAds] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [currentStream, setCurrentStream] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const [showColorPulse, setShowColorPulse] = useState(false);
  const [colorPulseStep, setColorPulseStep] = useState('baseline'); // 'baseline', 'colors'
  const [baselineData, setBaselineData] = useState({
    mood: '',
    weather: '',
    favoriteMemory: ''
  });
  const [hasCompletedBaseline, setHasCompletedBaseline] = useState(false);
  const [showSideAd, setShowSideAd] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isCreatorLive, setIsCreatorLive] = useState(false);
  const [localTracks, setLocalTracks] = useState({ video: null, audio: null });
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [agoraClient, setAgoraClient] = useState(null);
  const [creatorStats, setCreatorStats] = useState(null);
  const [demoMode, setDemoMode] = useState(false); // Disable demo mode to test real videos
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const wsRef = useRef(null);
  const watchTimeRef = useRef(0);
  const intervalRef = useRef(null);  // Separate ref for interval
  const colorPulseIntervalRef = useRef(null);

  // Dynamic color generation for infinite Color Pulse variations
  const generateInfiniteColors = () => {
    const colorCategories = {
      warm: {
        base: ['#FF5733', '#FF6B47', '#FF4500', '#FF7F50', '#FFB347', '#FFA500', '#FF8C69', '#FF6347'],
        variations: () => {
          const hue = Math.random() * 60; // 0-60 degrees (reds, oranges, yellows)
          const saturation = 70 + Math.random() * 30; // 70-100% saturation
          const lightness = 45 + Math.random() * 30; // 45-75% lightness
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }
      },
      cool: {
        base: ['#33FF57', '#00FF7F', '#40E0D0', '#00CED1', '#1E90FF', '#6495ED', '#7FFFD4', '#98FB98'],
        variations: () => {
          const hue = 120 + Math.random() * 120; // 120-240 degrees (greens, cyans, blues)
          const saturation = 60 + Math.random() * 40; // 60-100% saturation
          const lightness = 40 + Math.random() * 35; // 40-75% lightness
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }
      },
      neutral: {
        base: ['#C733FF', '#9966CC', '#8A2BE2', '#DA70D6', '#DDA0DD', '#EE82EE', '#FF69B4', '#FFB6C1'],
        variations: () => {
          const hue = 270 + Math.random() * 60; // 270-330 degrees (purples, magentas)
          const saturation = 50 + Math.random() * 50; // 50-100% saturation
          const lightness = 35 + Math.random() * 40; // 35-75% lightness
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }
      }
    };

    const categories = Object.keys(colorCategories);
    const colors = [];

    for (let i = 0; i < 3; i++) {
      const category = categories[i];
      const categoryData = colorCategories[category];
      
      // 50% chance to use base color, 50% chance to generate variation
      const useVariation = Math.random() > 0.5;
      let color, colorName;
      
      if (useVariation) {
        color = categoryData.variations();
        colorName = `Dynamic ${category.charAt(0).toUpperCase() + category.slice(1)}`;
      } else {
        const baseColors = categoryData.base;
        color = baseColors[Math.floor(Math.random() * baseColors.length)];
        colorName = getColorName(color, category);
      }
      
      colors.push({
        color: color,
        name: colorName,
        category: category,
        gradient: generateGradient(color),
        energy: Math.floor(Math.random() * 100) + 1
      });
    }

    return colors;
  };

  const getColorName = (color, category) => {
    const colorNames = {
      warm: ['Solar Flare', 'Sunset Burst', 'Flame Dancer', 'Golden Hour', 'Fire Bloom', 'Amber Wave', 'Coral Dream', 'Phoenix Glow'],
      cool: ['Ocean Depth', 'Mint Breeze', 'Cyber Teal', 'Aurora Green', 'Electric Blue', 'Crystal Lake', 'Neon Rain', 'Cosmic Blue'],
      neutral: ['Mystic Purple', 'Galaxy Violet', 'Dream Magenta', 'Royal Orchid', 'Cosmic Pink', 'Nebula Purple', 'Electric Plum', 'Stellar Rose']
    };
    
    const names = colorNames[category];
    return names[Math.floor(Math.random() * names.length)];
  };

  const generateGradient = (baseColor) => {
    // Create a beautiful gradient based on the base color
    const variations = [];
    for (let i = 0; i < 3; i++) {
      // Create slight variations in hue, saturation, and lightness
      const hueShift = (Math.random() - 0.5) * 30;
      const satShift = (Math.random() - 0.5) * 20;
      const lightShift = (Math.random() - 0.5) * 20;
      
      // Convert hex to HSL for manipulation (simplified)
      variations.push(baseColor);
    }
    return `linear-gradient(135deg, ${baseColor}, ${baseColor}aa, ${baseColor}88)`;
  };

  const [colorOptions, setColorOptions] = useState(generateInfiniteColors());

  // Baseline assessment options
  const moodOptions = [
    'Energetic & Excited', 'Happy & Content', 'Calm & Peaceful', 'Focused & Determined', 
    'Creative & Inspired', 'Tired & Relaxed', 'Curious & Wondering', 'Nostalgic & Reflective',
    'Anxious & Worried', 'Sad & Melancholy', 'Angry & Frustrated', 'Neutral & Balanced'
  ];
  
  const weatherOptions = [
    'Sunny & Bright', 'Partly Cloudy', 'Overcast & Gray', 'Rainy & Wet', 
    'Stormy & Windy', 'Snowy & Cold', 'Foggy & Misty', 'Hot & Humid',
    'Cool & Crisp', 'Warm & Pleasant', 'Dry & Arid', 'Don\'t Know/Indoor'
  ];
  
  const memoryOptions = [
    'A childhood adventure', 'Time with family', 'Achievement or success', 'First love or friendship',
    'Travel or new place', 'Learning something new', 'Creative moment', 'Peaceful quiet time',
    'Helping someone else', 'Overcoming a challenge', 'Celebration or party', 'Nature experience',
    'Musical or artistic moment', 'Sports or physical activity', 'Random happy moment', 'Prefer not to share'
  ];

  // Initialize app
  useEffect(() => {
    initializeApp();
    setupWebSocket();
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    
    // Keyboard shortcuts for full screen
    const handleKeyPress = (event) => {
      // F key or F11 for full screen toggle
      if ((event.key === 'f' || event.key === 'F' || event.key === 'F11') && (currentVideo || currentStream)) {
        event.preventDefault();
        toggleFullScreen();
      }
      // Escape key to exit full screen
      if (event.key === 'Escape' && isFullScreen) {
        toggleFullScreen();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    // Full screen event listeners
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (colorPulseIntervalRef.current) {
        clearInterval(colorPulseIntervalRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Load user profile
      const userResponse = await axios.get(`${BACKEND_URL}/api/user/${USER_ID}/profile`);
      setUser(userResponse.data.user);

      // Load videos
      const videosResponse = await axios.get(`${BACKEND_URL}/api/videos`);
      setVideos(videosResponse.data.videos);

      // Load live streams
      const streamsResponse = await axios.get(`${BACKEND_URL}/api/live-streams`);
      setLiveStreams(streamsResponse.data.streams);

      // Load leaderboard
      const leaderboardResponse = await axios.get(`${BACKEND_URL}/api/leaderboard`);
      setLeaderboard(leaderboardResponse.data.leaderboard);

      // Load ads
      const adsResponse = await axios.get(`${BACKEND_URL}/api/ads`);
      setAds(adsResponse.data.ads);

      // Load creator stats
      const statsResponse = await axios.get(`${BACKEND_URL}/api/creator/${USER_ID}/stats`);
      setCreatorStats(statsResponse.data);

    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  const setupWebSocket = () => {
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    wsRef.current = new WebSocket(`${wsUrl}/ws/${USER_ID}`);
    
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'color_pulse_prompt') {
        setShowColorPulse(true);
      } else if (message.type === 'viewer_count_update') {
        setLiveStreams(prev => prev.map(stream => 
          stream.stream_id === message.stream_id 
            ? { ...stream, viewer_count: message.count }
            : stream
        ));
      }
    };
  };

  const checkOrientation = () => {
    setIsLandscape(window.innerWidth > window.innerHeight);
  };

  // Full screen functionality
  const toggleFullScreen = () => {
    if (!videoContainerRef.current) return;

    if (!document.fullscreenElement) {
      // Enter full screen
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      } else if (videoContainerRef.current.webkitRequestFullscreen) {
        videoContainerRef.current.webkitRequestFullscreen();
      } else if (videoContainerRef.current.mozRequestFullScreen) {
        videoContainerRef.current.mozRequestFullScreen();
      } else if (videoContainerRef.current.msRequestFullscreen) {
        videoContainerRef.current.msRequestFullscreen();
      }
    } else {
      // Exit full screen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Video playback functions
  const playVideo = (video) => {
    setCurrentVideo(video);
    setCurrentStream(null);
    watchTimeRef.current = 0;
    setWatchTime(0);
    setHasCompletedBaseline(false);
    
    // Reset baseline data and show mandatory Color Pulse assessment
    setBaselineData({
      mood: '',
      weather: '',
      favoriteMemory: ''
    });
    setColorPulseStep('baseline');
    setShowColorPulse(true);
    
    // Don't start playing until baseline is completed
    setIsPlaying(false);
  };

  const startVideoAfterBaseline = () => {
    setIsPlaying(true);
    startWatchTimer();
    startColorPulseTimer();
  };

  const pauseVideo = () => {
    setIsPlaying(false);
    stopWatchTimer();
  };

  const startWatchTimer = () => {
    const interval = setInterval(() => {
      if (isPlaying) {
        watchTimeRef.current += 1;
        setWatchTime(watchTimeRef.current);
        
        // Submit watch time every 10 seconds to ensure token tracking
        if (watchTimeRef.current % 10 === 0) {
          submitWatchTime();
        }
      }
    }, 1000);
    
    // Store interval for cleanup in separate ref
    intervalRef.current = interval;
  };

  const stopWatchTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    submitWatchTime();
  };

  const submitWatchTime = async () => {
    if (watchTimeRef.current > 0 && currentVideo) {
      try {
        await axios.post(`${BACKEND_URL}/api/videos/watch`, {
          user_id: USER_ID,
          video_id: currentVideo.video_id,
          watch_time: watchTimeRef.current,
          completed: watchTimeRef.current >= currentVideo.duration * 0.8
        });
        
        // Refresh user data
        const userResponse = await axios.get(`${BACKEND_URL}/api/user/${USER_ID}/profile`);
        setUser(userResponse.data.user);
        
      } catch (error) {
        console.error('Error tracking watch time:', error);
      }
    }
  };

  const startColorPulseTimer = () => {
    // Show Color Pulse prompt every 9 minutes (540 seconds) after baseline
    colorPulseIntervalRef.current = setInterval(() => {
      if (isPlaying && hasCompletedBaseline) {
        // Generate new infinite colors each time
        setColorOptions(generateInfiniteColors());
        setColorPulseStep('colors');
        setShowColorPulse(true);
      }
    }, 540000); // 9 minutes = 540,000 milliseconds
  };

  const submitColorPulse = async (color) => {
    try {
      await axios.post(`${BACKEND_URL}/api/color-pulse`, {
        user_id: USER_ID,
        video_id: currentVideo?.video_id || currentStream?.stream_id || 'unknown',
        color_choice: color,
        mood: baselineData.mood,
        weather: baselineData.weather,
        favorite_memory: baselineData.favoriteMemory,
        timestamp: new Date().toISOString(),
        is_baseline: !hasCompletedBaseline
      });
      
      setShowColorPulse(false);
      
      if (!hasCompletedBaseline) {
        setHasCompletedBaseline(true);
        startVideoAfterBaseline();
      }
      
      // Refresh user data
      const userResponse = await axios.get(`${BACKEND_URL}/api/user/${USER_ID}/profile`);
      setUser(userResponse.data.user);
      
    } catch (error) {
      console.error('Error submitting color pulse:', error);
    }
  };

  // Live streaming functions
  const initializeAgora = async () => {
    try {
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        
        if (mediaType === 'video') {
          setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
          
          // Play remote video
          const remoteVideoTrack = user.videoTrack;
          const playerContainer = document.getElementById(`player-${user.uid}`);
          if (playerContainer && remoteVideoTrack) {
            remoteVideoTrack.play(playerContainer);
          }
        }
        
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      client.on('user-left', (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      setAgoraClient(client);
      return client;
    } catch (error) {
      console.error('Error initializing Agora:', error);
      throw error;
    }
  };

  const startLiveStream = async () => {
    try {
      console.log('Starting live stream...');
      
      // Check if AgoraRTC is available
      if (typeof AgoraRTC === 'undefined') {
        console.error('AgoraRTC is not loaded');
        alert('Live streaming is not available. AgoraRTC SDK is not loaded.');
        return;
      }
      
      const streamTitle = `${user?.username || 'Creator'}'s Live Stream`;
      const channelName = `live_${USER_ID}_${Date.now()}`;
      const uid = parseInt(USER_ID.replace(/\D/g, '').slice(-8)) || Math.floor(Math.random() * 100000);

      // Get Agora token for publisher (creator)
      console.log('Getting Agora token...');
      const tokenResponse = await axios.post(`${BACKEND_URL}/api/agora/token`, {
        channel: channelName,
        uid: uid,
        role: 'publisher'
      });

      console.log('Agora token generated:', tokenResponse.data);

      // For now, simulate live streaming since AgoraRTC might not be available
      console.log('Simulating live stream creation...');
      
      // Create live stream session in backend
      const streamResponse = await axios.post(`${BACKEND_URL}/api/live-streams/start`, {
        creator_id: USER_ID,
        title: streamTitle,
        channel: channelName,
        agora_uid: uid
      });
      
      console.log('Live stream created:', streamResponse.data);
      
      setCurrentStream(streamResponse.data.stream);
      setIsCreatorLive(true);
      
      // Simulate local tracks for demo
      setLocalTracks({ 
        video: { enabled: true, setEnabled: (enabled) => console.log('Video:', enabled) }, 
        audio: { enabled: true, setEnabled: (enabled) => console.log('Audio:', enabled) }
      });
      
      // Refresh live streams list
      const streamsResponse = await axios.get(`${BACKEND_URL}/api/live-streams`);
      setLiveStreams(streamsResponse.data.streams);
      
      // Switch to Live tab to show the stream
      setActiveTab('live');
      
      console.log('Live stream started successfully!');
      
    } catch (error) {
      console.error('Error starting live stream:', error);
      alert(`Failed to start live stream: ${error.message || 'Unknown error'}`);
      setIsCreatorLive(false);
      setLocalTracks({ video: null, audio: null });
    }
  };

  const endLiveStream = async () => {
    try {
      // Stop local tracks
      if (localTracks.video) {
        localTracks.video.stop();
        localTracks.video.close();
      }
      if (localTracks.audio) {
        localTracks.audio.stop();
        localTracks.audio.close();
      }
      
      // Leave Agora channel
      if (agoraClient) {
        await agoraClient.leave();
      }
      
      // End stream in backend
      if (currentStream) {
        await axios.post(`${BACKEND_URL}/api/live-streams/${currentStream.stream_id}/end`);
      }
      
      // Reset state
      setLocalTracks({ video: null, audio: null });
      setIsCreatorLive(false);
      setRemoteUsers([]);
      setCurrentStream(null);
      setAgoraClient(null);
      
      // Refresh live streams list
      const streamsResponse = await axios.get(`${BACKEND_URL}/api/live-streams`);
      setLiveStreams(streamsResponse.data.streams);
      
      console.log('Live stream ended successfully');
      
    } catch (error) {
      console.error('Error ending live stream:', error);
    }
  };

  const joinLiveStream = async (stream) => {
    try {
      const uid = parseInt(USER_ID.replace(/\D/g, '').slice(-8)) || Math.floor(Math.random() * 100000);
      
      // Get viewer token
      const tokenResponse = await axios.post(`${BACKEND_URL}/api/agora/token`, {
        channel: stream.channel || `live_${stream.creator_id}_${Date.now()}`,
        uid: uid,
        role: 'subscriber'
      });

      // Initialize Agora client
      const client = await initializeAgora();
      
      // Set client role to audience (viewer)
      await client.setClientRole('audience');
      
      // Join channel as viewer
      await client.join(AGORA_APP_ID, tokenResponse.data.channel, tokenResponse.data.token, uid);
      
      setCurrentStream(stream);
      setCurrentVideo(null);
      
      console.log('Joined live stream as viewer:', stream.title);
      
    } catch (error) {
      console.error('Error joining live stream:', error);
      alert(`Failed to join live stream: ${error.message}`);
    }
  };

  // Render components
  const renderVideoPlayer = () => {
    if (!currentVideo && !currentStream) return null;

    return (
      <div 
        ref={videoContainerRef}
        className={`relative bg-black rounded-lg overflow-hidden ${
          isFullScreen ? 'fixed inset-0 z-50 rounded-none' : ''
        }`}
      >
        {currentVideo && demoMode && (
          <div className={`w-full ${isFullScreen ? 'h-full' : 'h-64'} bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center`}>
            <div className="text-center mb-4">
              <h3 className={`text-white ${isFullScreen ? 'text-4xl' : 'text-xl'} font-bold mb-2`}>{currentVideo.title}</h3>
              <p className={`text-gray-300 ${isFullScreen ? 'text-lg' : 'text-sm'} mb-4`}>🎬 Demo Mode - Simulating Video Playback</p>
              <div className="flex items-center justify-center space-x-4">
                <div className={`${isFullScreen ? 'w-6 h-6' : 'w-4 h-4'} rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className={`text-white ${isFullScreen ? 'text-xl' : ''}`}>{isPlaying ? 'Playing' : 'Paused'}</span>
              </div>
            </div>
            <div className={`${isFullScreen ? 'w-1/2' : 'w-full max-w-md'} bg-gray-700 rounded-full ${isFullScreen ? 'h-4' : 'h-2'}`}>
              <div 
                className={`bg-gradient-to-r from-neon-orange to-neon-green ${isFullScreen ? 'h-4' : 'h-2'} rounded-full transition-all duration-1000`}
                style={{ width: `${Math.min((watchTime / currentVideo.duration) * 100, 100)}%` }}
              ></div>
            </div>
            <p className={`text-gray-400 ${isFullScreen ? 'text-base' : 'text-xs'} mt-2`}>
              Token Earning Demo: +1 token every 10 seconds
            </p>
          </div>
        )}
        
        {currentVideo && !demoMode && (
          <>
            {currentVideo.url.includes('drive.google.com') ? (
              // Google Drive video using iframe
              <iframe
                src={currentVideo.url}
                className={`w-full ${isFullScreen ? 'h-full' : 'h-64'} border-0`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={currentVideo.title}
                onLoad={() => {
                  setIsPlaying(true);
                  startWatchTimer();
                }}
              />
            ) : (
              // Regular video element
              <video
                ref={videoRef}
                src={currentVideo.url}
                className={`w-full ${isFullScreen ? 'h-full' : 'h-64'} object-cover`}
                controls={false}
                muted={true}
                autoPlay={isPlaying}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => {
                  const currentTime = Math.floor(e.target.currentTime);
                  if (currentTime !== watchTimeRef.current) {
                    watchTimeRef.current = currentTime;
                    setWatchTime(currentTime);
                  }
                }}
              />
            )}
          </>
        )}
        
        {currentStream && (
          <div className={`w-full ${isFullScreen ? 'h-full' : 'h-64'} bg-black flex items-center justify-center relative`}>
            {/* Simulated live stream */}
            <div className="w-full h-full bg-gradient-to-br from-red-900 via-red-700 to-red-900 flex flex-col items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-pulse mb-4">
                  <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Radio size={32} className="text-white animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">🔴 LIVE</h3>
                  <p className="text-lg text-red-200">{currentStream.title}</p>
                  <p className="text-sm text-red-300 mt-2">
                    {isCreatorLive ? 'You are broadcasting live!' : 'Live stream in progress...'}
                  </p>
                </div>
                
                <div className="flex items-center justify-center space-x-6 mt-6">
                  <div className="flex items-center space-x-2">
                    <Users size={20} className="text-red-300" />
                    <span className="text-white font-semibold">{currentStream.viewer_count || 0} viewers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye size={20} className="text-red-300" />
                    <span className="text-white">Live</span>
                  </div>
                </div>
                
                {isCreatorLive && (
                  <div className="mt-6 text-sm text-red-200">
                    <p>📹 Camera simulation active</p>
                    <p>🎤 Audio simulation active</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Live stream overlay */}
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold animate-pulse">
              ● LIVE
            </div>
          </div>
        )}
        
        {/* Video info overlay */}
        <div className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent ${isFullScreen ? 'p-8' : 'p-4'}`}>
          <h3 className={`text-white font-bold ${isFullScreen ? 'text-3xl' : 'text-lg'}`}>
            {currentVideo ? currentVideo.title : currentStream?.title}
          </h3>
          {user && (
            <div className={`flex items-center space-x-4 mt-2`}>
              <div className="flex items-center space-x-2">
                <Zap className={`text-yellow-500 ${isFullScreen ? 'w-6 h-6' : 'w-4 h-4'}`} />
                <span className={`text-yellow-500 font-semibold ${isFullScreen ? 'text-xl' : ''}`}>{user.tokens} tokens</span>
              </div>
              <div className={`text-neon-purple ${isFullScreen ? 'text-lg' : 'text-sm'}`}>
                {user.neurodiversity_class}
              </div>
            </div>
          )}
          {demoMode && (
            <div className={`text-green-400 ${isFullScreen ? 'text-sm' : 'text-xs'} mt-1 flex items-center`}>
              <div className={`${isFullScreen ? 'w-3 h-3' : 'w-2 h-2'} bg-green-400 rounded-full mr-2 animate-pulse`}></div>
              Demo Mode Active
            </div>
          )}
          
          {/* Full screen keyboard hint */}
          {isFullScreen && (
            <div className="absolute top-4 right-4 text-white/60 text-sm bg-black/50 px-3 py-1 rounded-lg backdrop-blur-sm">
              Press <kbd className="bg-white/20 px-1 rounded">F</kbd> or <kbd className="bg-white/20 px-1 rounded">ESC</kbd> to exit
            </div>
          )}
        </div>
        
        {/* Video controls */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent ${isFullScreen ? 'p-8' : 'p-4'}`}>
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <button
                onClick={isPlaying ? pauseVideo : () => {
                  if (currentVideo && hasCompletedBaseline) {
                    setIsPlaying(true);
                    startWatchTimer();
                  } else if (currentVideo) {
                    playVideo(currentVideo);
                  }
                }}
                className={`${isFullScreen ? 'p-4' : 'p-2'} rounded-full bg-neon-orange hover:bg-neon-orange/80 transition-colors`}
              >
                {isPlaying ? <Pause size={isFullScreen ? 32 : 20} /> : <Play size={isFullScreen ? 32 : 20} />}
              </button>
              <div className="flex items-center space-x-2">
                <Volume2 size={isFullScreen ? 24 : 16} />
                <span className={`${isFullScreen ? 'text-lg' : 'text-sm'}`}>
                  {Math.floor(watchTime / 60)}:{String(watchTime % 60).padStart(2, '0')}
                </span>
              </div>
              {demoMode && (
                <button
                  onClick={() => setDemoMode(false)}
                  className={`${isFullScreen ? 'text-sm' : 'text-xs'} bg-blue-600 hover:bg-blue-700 ${isFullScreen ? 'px-4 py-2' : 'px-2 py-1'} rounded`}
                >
                  Try Real Video
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {currentStream && (
                <div className="flex items-center space-x-2">
                  <Eye size={isFullScreen ? 24 : 16} />
                  <span className={`${isFullScreen ? 'text-lg' : 'text-sm'}`}>{currentStream.viewer_count || 0}</span>
                </div>
              )}
              
              {/* Full Screen Toggle Button */}
              <button
                onClick={toggleFullScreen}
                className={`${isFullScreen ? 'p-4' : 'p-2'} rounded-full bg-gray-700 hover:bg-gray-600 transition-colors`}
                title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
              >
                {isFullScreen ? <Minimize size={isFullScreen ? 24 : 20} /> : <Maximize size={isFullScreen ? 24 : 20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderColorPulse = () => {
    if (!showColorPulse) return null;

    const isBaseline = colorPulseStep === 'baseline';
    const isComplete = baselineData.mood && baselineData.weather && baselineData.favoriteMemory;

    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full border-2 border-neon-purple shadow-2xl max-h-[90vh] overflow-y-auto">
          
          {isBaseline ? (
            // Baseline Assessment Questions
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-neon-orange to-neon-purple bg-clip-text text-transparent">
                🧠 Welcome to Your Viewing Experience
              </h2>
              <p className="text-gray-300 text-sm mb-6">
                Before we begin, help us understand your current state for better personalization
              </p>

              {/* Step Progress */}
              <div className="flex justify-center mb-8">
                <div className="flex space-x-2">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`w-3 h-3 rounded-full ${
                        (step === 1 && baselineData.mood) ||
                        (step === 2 && baselineData.weather) ||
                        (step === 3 && baselineData.favoriteMemory)
                          ? 'bg-neon-green'
                          : 'bg-gray-600'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Question 1: Mood */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center justify-center">
                  <span className="mr-2">😊</span> How are you feeling right now?
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => setBaselineData(prev => ({ ...prev, mood }))}
                      className={`p-3 rounded-lg border-2 transition-all text-sm ${
                        baselineData.mood === mood
                          ? 'border-neon-green bg-neon-green/20 text-white'
                          : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-neon-green/50'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Weather */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center justify-center">
                  <span className="mr-2">🌤️</span> What's the weather like around you?
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {weatherOptions.map((weather) => (
                    <button
                      key={weather}
                      onClick={() => setBaselineData(prev => ({ ...prev, weather }))}
                      className={`p-3 rounded-lg border-2 transition-all text-sm ${
                        baselineData.weather === weather
                          ? 'border-neon-green bg-neon-green/20 text-white'
                          : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-neon-green/50'
                      }`}
                    >
                      {weather}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Favorite Memory */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center justify-center">
                  <span className="mr-2">💭</span> What type of memory makes you happiest?
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {memoryOptions.map((memory) => (
                    <button
                      key={memory}
                      onClick={() => setBaselineData(prev => ({ ...prev, favoriteMemory: memory }))}
                      className={`p-3 rounded-lg border-2 transition-all text-sm ${
                        baselineData.favoriteMemory === memory
                          ? 'border-neon-green bg-neon-green/20 text-white'
                          : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-neon-green/50'
                      }`}
                    >
                      {memory}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proceed Button */}
              {isComplete && (
                <button
                  onClick={() => {
                    setColorOptions(generateInfiniteColors());
                    setColorPulseStep('colors');
                  }}
                  className="w-full py-4 bg-gradient-to-r from-neon-green to-neon-purple text-white rounded-lg font-bold text-lg hover:from-neon-purple hover:to-neon-orange transition-all duration-300 transform hover:scale-[1.02]"
                >
                  Continue to Color Selection ✨
                </button>
              )}

              <p className="text-gray-500 text-xs mt-4">
                📊 This data helps us personalize your experience and contributes to neurodiversity research
              </p>
            </div>
          ) : (
            // Color Selection (after baseline)
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-neon-orange to-neon-purple bg-clip-text text-transparent">
                ✨ Color Pulse {hasCompletedBaseline ? '' : '- Baseline'} ✨
              </h3>
              <p className="text-gray-300 text-sm mb-6">
                {hasCompletedBaseline 
                  ? 'Feel the energy of these infinite colors and choose what resonates with your soul right now'
                  : 'Now, choose a color that represents your current state based on your answers'
                }
              </p>
              
              <div className="grid grid-cols-1 gap-4 mb-6">
                {colorOptions.map((option, index) => (
                  <button
                    key={`${option.color}-${index}`}
                    onClick={() => submitColorPulse(option.color)}
                    className="group relative overflow-hidden rounded-xl border-2 border-transparent hover:border-white/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl"
                    style={{ 
                      background: option.gradient || option.color,
                      minHeight: '80px'
                    }}
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300"></div>
                    <div className="relative p-4 text-center">
                      <div className="text-white font-bold text-lg mb-1 drop-shadow-lg">
                        {option.name}
                      </div>
                      <div className="text-white/80 text-sm drop-shadow-md">
                        {option.category} energy • {option.energy}% intensity
                      </div>
                      <div className="absolute top-2 right-2 text-white/60 text-xs">
                        +2 tokens
                      </div>
                    </div>
                    
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  </button>
                ))}
              </div>
              
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setColorOptions(generateInfiniteColors());
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-neon-green to-neon-purple text-white rounded-lg hover:from-neon-purple hover:to-neon-orange transition-all duration-300 text-sm font-semibold"
                >
                  🔄 Refresh Colors
                </button>
                
                {hasCompletedBaseline && (
                  <button
                    onClick={() => setShowColorPulse(false)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    Skip for now
                  </button>
                )}
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-gray-500 text-xs">
                  🌈 Each color is unique and generated just for you • Infinite possibilities
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBottomAd = () => {
    const bottomAd = ads.find(ad => ad.type === 'bottom_bar');
    if (!bottomAd) return null;

    return (
      <div className="fixed bottom-16 left-0 right-0 h-12 bg-gradient-to-r from-neon-orange to-neon-green flex items-center justify-center z-40">
        <a 
          href={bottomAd.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-white text-sm font-semibold hover:underline"
        >
          {bottomAd.content}
        </a>
      </div>
    );
  };

  const renderSideAd = () => {
    const sideAd = ads.find(ad => ad.type === 'side_bar');
    if (!sideAd || !isLandscape || !showSideAd) return null;

    return (
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 w-40 h-96 bg-gradient-to-b from-neon-purple to-neon-green rounded-lg p-4 z-30">
        <button
          onClick={() => setShowSideAd(false)}
          className="absolute top-2 right-2 text-white hover:text-gray-300"
        >
          <X size={16} />
        </button>
        <a 
          href={sideAd.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white text-xs font-semibold hover:underline h-full flex items-center justify-center text-center"
        >
          {sideAd.content}
        </a>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Featured Videos</h2>
            {renderVideoPlayer()}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video) => (
                <div
                  key={video.video_id}
                  onClick={() => playVideo(video)}
                  className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors border border-neon-purple/30"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-32 object-cover rounded mb-3"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iOTAiIGZpbGw9IiM5Q0E0QUYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VmlkZW8gUGxhY2Vob2xkZXI8L3RleHQ+Cjwvc3ZnPgo=';
                    }}
                  />
                  <h3 className="text-white font-semibold mb-2">{video.title}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{Math.floor(video.duration / 60)} min</span>
                    <span>{video.size_mb} MB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'live':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Live Streams</h2>
            {renderVideoPlayer()}
            
            {isCreatorLive && (
              <div className="bg-red-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <span className="text-white font-semibold">You're Live!</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white">
                    <Users size={16} />
                    <span>{remoteUsers.length}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveStreams.map((stream) => (
                <div
                  key={stream.stream_id}
                  onClick={() => joinLiveStream(stream)}
                  className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors border border-neon-green/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-500 text-sm font-semibold">LIVE</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Eye size={14} />
                      <span className="text-sm">{stream.viewer_count || 0}</span>
                    </div>
                  </div>
                  <h3 className="text-white font-semibold mb-2">{stream.title}</h3>
                  <p className="text-gray-400 text-sm">by {stream.creator_id}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'explore':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Explore</h2>
            
            <div className="bg-gray-800 rounded-lg p-6 border border-neon-purple/30">
              <h3 className="text-xl font-bold text-white mb-4">Quickies</h3>
              <p className="text-gray-400 mb-4">Short-form videos coming in Series A expansion!</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-700 rounded-lg h-32 flex items-center justify-center">
                    <span className="text-gray-500">Coming Soon</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Profile</h2>
            
            {user && (
              <div className="bg-gray-800 rounded-lg p-6 border border-neon-orange/30">
                <h3 className="text-xl font-bold text-white mb-4">{user.username}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-neon-orange">{user.tokens}</div>
                    <div className="text-gray-400">Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-neon-green">{Math.floor(user.total_watch_time / 60)}</div>
                    <div className="text-gray-400">Minutes Watched</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-neon-purple">{user.neurodiversity_class}</div>
                  <div className="text-gray-400">Neurodiversity Class</div>
                </div>
              </div>
            )}
            
            <div className="bg-gray-800 rounded-lg p-6 border border-neon-green/30">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Trophy className="mr-2 text-yellow-500" size={24} />
                Leaderboard
              </h3>
              <div className="space-y-3">
                {leaderboard.slice(0, 10).map((player, index) => (
                  <div key={player.user_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-400 w-6">{index + 1}</span>
                      <span className="text-white">{player.username}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="text-yellow-500" size={16} />
                      <span className="text-yellow-500 font-semibold">{player.tokens}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'creator':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Creator Dashboard</h2>
            
            {/* Live Stream Controls */}
            <div className="bg-gray-800 rounded-lg p-6 border border-neon-purple/30">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Radio className="mr-2 text-red-500" size={24} />
                Live Streaming
              </h3>
              
              {isCreatorLive ? (
                <div className="space-y-4">
                  {/* Live Stream Status */}
                  <div className="bg-red-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        <span className="text-white font-semibold">You're Live!</span>
                        <span className="text-red-200 text-sm">
                          {currentStream?.title || 'Live Stream'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-white">
                        <div className="flex items-center space-x-2">
                          <Users size={16} />
                          <span>{currentStream?.viewer_count || 0}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Eye size={16} />
                          <span>Live</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Live Video Preview */}
                  <div className="bg-black rounded-lg overflow-hidden">
                    <div className="w-full h-48 bg-gradient-to-br from-red-900 via-red-700 to-red-900 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="animate-pulse">
                          <div className="w-12 h-12 bg-red-500 rounded-full mx-auto mb-3 flex items-center justify-center">
                            <Camera size={24} className="text-white" />
                          </div>
                          <p className="text-lg font-bold">📹 Live Preview</p>
                          <p className="text-sm text-red-200 mt-1">Your stream is broadcasting</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Live Stream Controls */}
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          if (localTracks.audio) {
                            const enabled = localTracks.audio.enabled;
                            localTracks.audio.setEnabled(!enabled);
                          }
                        }}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                      >
                        <Mic size={20} />
                      </button>
                      <button
                        onClick={() => {
                          if (localTracks.video) {
                            const enabled = localTracks.video.enabled;
                            localTracks.video.setEnabled(!enabled);
                          }
                        }}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                      >
                        <Camera size={20} />
                      </button>
                    </div>
                    
                    <button
                      onClick={endLiveStream}
                      className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg font-bold hover:from-red-700 hover:to-red-800 transition-all flex items-center space-x-2"
                    >
                      <PhoneOff size={20} />
                      <span>End Stream</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-gray-300 mb-4">
                    Start your live stream and connect with your audience in real-time!
                  </p>
                  <button
                    onClick={startLiveStream}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 flex items-center space-x-2 mx-auto"
                  >
                    <Camera size={24} />
                    <span>Go Live</span>
                  </button>
                  <div className="text-sm text-gray-400">
                    <p>✓ HD 720p streaming</p>
                    <p>✓ Real-time audience interaction</p>
                    <p>✓ Token earnings from viewers</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Creator Stats */}
            {creatorStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 border border-neon-orange/30">
                  <div className="text-2xl font-bold text-neon-orange">{creatorStats.video_views}</div>
                  <div className="text-gray-400">Total Views</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-neon-green/30">
                  <div className="text-2xl font-bold text-neon-green">{Math.floor(creatorStats.avg_watch_time / 60)}</div>
                  <div className="text-gray-400">Avg Watch Time (min)</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-neon-purple/30">
                  <div className="text-2xl font-bold text-neon-purple">{creatorStats.total_tokens_earned}</div>
                  <div className="text-gray-400">Tokens Earned</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-yellow-500/30">
                  <div className="text-2xl font-bold text-yellow-500">${creatorStats.ad_revenue_share?.toFixed(2) || '0.00'}</div>
                  <div className="text-gray-400">Ad Revenue</div>
                </div>
              </div>
            )}
            
            {/* Recent Streams */}
            {liveStreams.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-neon-green/30">
                <h3 className="text-xl font-bold text-white mb-4">Your Recent Streams</h3>
                <div className="space-y-3">
                  {liveStreams.filter(stream => stream.creator_id === USER_ID).slice(0, 3).map((stream) => (
                    <div key={stream.stream_id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <div className="text-white font-semibold">{stream.title}</div>
                        <div className="text-gray-400 text-sm">
                          {new Date(stream.start_time).toLocaleDateString()} • 
                          {stream.is_active ? (
                            <span className="text-red-500 ml-1">● Live</span>
                          ) : (
                            <span className="text-gray-500 ml-1">Ended</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-neon-green font-semibold">{stream.viewer_count || 0} viewers</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Re-show side ad after 5 minutes
  useEffect(() => {
    if (!showSideAd) {
      const timer = setTimeout(() => {
        setShowSideAd(true);
      }, 300000); // 5 minutes
      
      return () => clearTimeout(timer);
    }
  }, [showSideAd]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Main Content */}
      <div className="pb-16 p-4">
        {renderTabContent()}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-around items-center h-16">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'live', icon: Radio, label: 'Live' },
            { id: 'explore', icon: Compass, label: 'Explore' },
            { id: 'profile', icon: User, label: 'Profile' },
            { id: 'creator', icon: BarChart3, label: 'Creator' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-colors ${
                activeTab === id
                  ? 'text-neon-orange bg-neon-orange/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Overlays */}
      {renderColorPulse()}
      {renderBottomAd()}
      {renderSideAd()}
    </div>
  );
};

export default App;