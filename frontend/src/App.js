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
  VolumeX,
  Eye,
  Users,
  Trophy,
  Zap,
  X,
  Camera,
  Mic,
  PhoneOff,
  Maximize,
  Minimize,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Reply,
  Send,
  Heart,
  Smile
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
  
  // Comments and Chat state
  const [videoComments, setVideoComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [liveChatMessages, setLiveChatMessages] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showChatEmojis, setShowChatEmojis] = useState(false);
  
  // Color Pulse Analytics state
  const [colorPulseAnalytics, setColorPulseAnalytics] = useState(null);
  const [liveStreamAnalytics, setLiveStreamAnalytics] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  
  // Ad Ticker state
  const [tickerAds, setTickerAds] = useState([]);
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0);
  const [showTicker, setShowTicker] = useState(true);
  
  // Overlay Banner Ad state
  const [overlayAds, setOverlayAds] = useState([]);
  const [currentOverlayIndex, setCurrentOverlayIndex] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayVideoMuted, setOverlayVideoMuted] = useState(true);
  
  // ARACOIN Wallet state
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showWallet, setShowWallet] = useState(false);
  const [aracoinStats, setAracoinStats] = useState(null);
  const [earningNotification, setEarningNotification] = useState(null);
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authData, setAuthData] = useState({ username: '', email: '', password: '' });
  
  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Profile Picture state
  const [showProfilePicture, setShowProfilePicture] = useState(false);
  const [avatarGallery, setAvatarGallery] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  
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

  // Handle local video track rendering
  useEffect(() => {
    if (localTracks.video && isCreatorLive) {
      const container = document.getElementById('local-video-container');
      if (container) {
        // Clear any existing content
        container.innerHTML = '';
        
        // Play the video track in the container
        localTracks.video.play(container);
        console.log('✅ Local video track playing in container');
        
        // Add some styling to make it look good
        const videoElement = container.querySelector('video');
        if (videoElement) {
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.objectFit = 'cover';
          videoElement.style.borderRadius = '0.5rem';
        }
      }
    }
  }, [localTracks.video, isCreatorLive]);

  // Handle remote video track rendering
  useEffect(() => {
    remoteUsers.forEach((user) => {
      if (user.videoTrack) {
        const container = document.getElementById(`player-${user.uid}`);
        if (container) {
          // Clear any existing content but keep the overlay
          const overlay = container.querySelector('.absolute');
          container.innerHTML = '';
          if (overlay) container.appendChild(overlay);
          
          // Play the remote video track
          user.videoTrack.play(container);
          console.log(`✅ Remote video track playing for user ${user.uid}`);
          
          // Style the video element
          const videoElement = container.querySelector('video');
          if (videoElement) {
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.borderRadius = '0.5rem';
          }
          
          // Re-add the overlay
          if (!container.querySelector('.absolute')) {
            const userLabel = document.createElement('div');
            userLabel.className = 'absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded';
            userLabel.textContent = `User ${user.uid}`;
            container.appendChild(userLabel);
          }
        }
      }
    });
  }, [remoteUsers]);

  // Load Color Pulse analytics when creator dashboard is accessed
  useEffect(() => {
    if (activeTab === 'creator') {
      loadColorPulseAnalytics();
      // Refresh analytics every 30 seconds for real-time updates
      const analyticsInterval = setInterval(loadColorPulseAnalytics, 30000);
      return () => clearInterval(analyticsInterval);
    }
  }, [activeTab]);

  // Load live stream analytics when streaming
  useEffect(() => {
    if (isCreatorLive && currentStream) {
      loadLiveStreamAnalytics(currentStream.stream_id);
      // Refresh live analytics every 15 seconds for real-time updates
      const liveAnalyticsInterval = setInterval(() => {
        loadLiveStreamAnalytics(currentStream.stream_id);
      }, 15000);
      return () => clearInterval(liveAnalyticsInterval);
    }
  }, [isCreatorLive, currentStream]);

  // Load ticker ads, overlay ads, and wallet on app start
  useEffect(() => {
    loadTickerAds();
    loadOverlayAds();
    
    // Check if user is already authenticated (simulate session)
    const savedUser = localStorage.getItem('ara_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
        loadWallet();
        
        // Welcome back notification
        setTimeout(() => {
          addNotification('👋 Welcome back!', `Good to see you again, ${userData.username}!`, 'success');
        }, 1000);
      } catch (error) {
        localStorage.removeItem('ara_user');
      }
    } else {
      // Welcome notification for new visitors
      setTimeout(() => {
        addNotification('🎉 Welcome to Ara!', 'Join us to start earning ARACoins while watching amazing content!', 'info');
      }, 2000);
    }
  }, []);

  // Rotate ticker ads automatically
  useEffect(() => {
    if (tickerAds.length > 0 && (currentVideo || currentStream)) {
      const currentAd = tickerAds[currentTickerIndex];
      const duration = currentAd?.duration ? currentAd.duration * 1000 : 30000; // Default 30 seconds
      
      const tickerRotation = setTimeout(() => {
        setCurrentTickerIndex((prevIndex) => 
          prevIndex >= tickerAds.length - 1 ? 0 : prevIndex + 1
        );
      }, duration);

      return () => clearTimeout(tickerRotation);
    }
  }, [currentTickerIndex, tickerAds, currentVideo, currentStream]);

  // Rotate overlay ads automatically
  useEffect(() => {
    if (overlayAds.length > 0 && (currentVideo || currentStream)) {
      const currentAd = overlayAds[currentOverlayIndex];
      const duration = currentAd?.duration ? currentAd.duration * 1000 : 15000; // Default 15 seconds
      
      const overlayRotation = setTimeout(() => {
        setCurrentOverlayIndex((prevIndex) => 
          prevIndex >= overlayAds.length - 1 ? 0 : prevIndex + 1
        );
      }, duration);

      return () => clearTimeout(overlayRotation);
    }
  }, [currentOverlayIndex, overlayAds, currentVideo, currentStream]);

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

  // WebSocket setup
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
      } else if (message.type === 'live_chat_message') {
        // Real-time live chat message
        if (currentStream && message.stream_id === currentStream.stream_id) {
          setLiveChatMessages(prev => [...prev, message.message]);
        }
      }
    };
  };

  // Comment functions (YouTube-style)
  const loadVideoComments = async (videoId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/videos/${videoId}/comments`);
      setVideoComments(response.data.comments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !currentVideo) return;
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/videos/${currentVideo.video_id}/comments`, {
        user_id: USER_ID,
        video_id: currentVideo.video_id,
        content: newComment,
        parent_comment_id: replyingTo
      });
      
      if (response.data.success) {
        setNewComment('');
        setReplyingTo(null);
        loadVideoComments(currentVideo.video_id);
        
        // Update user tokens
        const userResponse = await axios.get(`${BACKEND_URL}/api/user/${USER_ID}/profile`);
        setUser(userResponse.data.user);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  const likeComment = async (commentId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/comments/${commentId}/interact`, {
        user_id: USER_ID,
        comment_id: commentId,
        interaction_type: 'like'
      });
      
      loadVideoComments(currentVideo.video_id);
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const dislikeComment = async (commentId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/comments/${commentId}/interact`, {
        user_id: USER_ID,
        comment_id: commentId,
        interaction_type: 'dislike'
      });
      
      loadVideoComments(currentVideo.video_id);
    } catch (error) {
      console.error('Error disliking comment:', error);
    }
  };

  // Live chat functions (Twitch-style)
  const loadLiveChatMessages = async (streamId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/live-streams/${streamId}/chat`);
      setLiveChatMessages(response.data.messages);
    } catch (error) {
      console.error('Error loading live chat:', error);
    }
  };

  const sendChatMessage = async () => {
    if (!newChatMessage.trim() || !currentStream) return;
    
    try {
      await axios.post(`${BACKEND_URL}/api/live-streams/${currentStream.stream_id}/chat`, {
        user_id: USER_ID,
        stream_id: currentStream.stream_id,
        message: newChatMessage,
        message_type: 'chat'
      });
      
      setNewChatMessage('');
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  };

  // Load Color Pulse analytics for creator
  const loadColorPulseAnalytics = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/creator/${USER_ID}/color-pulse-analytics`);
      setColorPulseAnalytics(response.data);
    } catch (error) {
      console.error('Error loading color pulse analytics:', error);
    }
  };

  // Load live stream analytics for active stream
  const loadLiveStreamAnalytics = async (streamId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/live-streams/${streamId}/color-pulse-analytics`);
      setLiveStreamAnalytics(response.data);
    } catch (error) {
      console.error('Error loading live stream analytics:', error);
    }
  };

  // Load ticker ads
  const loadTickerAds = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/ads`);
      const tickerAdsOnly = response.data.ads.filter(ad => ad.type === 'ticker');
      setTickerAds(tickerAdsOnly);
    } catch (error) {
      console.error('Error loading ticker ads:', error);
    }
  };

  // Load overlay ads
  const loadOverlayAds = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/ads`);
      const overlayAdsOnly = response.data.ads.filter(ad => ad.type === 'overlay');
      setOverlayAds(overlayAdsOnly);
    } catch (error) {
      console.error('Error loading overlay ads:', error);
    }
  };

  // ARACOIN Functions
  const loadWallet = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/wallet/${USER_ID}`);
      setWallet(response.data);
      
      // Load ARACOIN stats
      const statsResponse = await axios.get(`${BACKEND_URL}/api/aracoin/stats`);
      setAracoinStats(statsResponse.data);
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/wallet/${USER_ID}/transactions`);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const earnWatchTimeAracoins = async (watchMinutes, videoId) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/wallet/${USER_ID}/earn-watch-time`, {
        watch_time_minutes: watchMinutes,
        video_id: videoId
      });
      
      if (response.data.success) {
        setEarningNotification({
          type: 'watch',
          aracoins: response.data.aracoins_earned,
          usd: response.data.usd_value,
          message: `+${response.data.aracoins_earned} ARACOIN for ${watchMinutes} min watch time`
        });
        
        // Refresh wallet
        loadWallet();
        
        // Hide notification after 4 seconds
        setTimeout(() => setEarningNotification(null), 4000);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error earning watch time ARACoins:', error);
    }
  };

  const earnColorPulseAracoin = async () => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/wallet/${USER_ID}/earn-color-pulse`);
      
      if (response.data.success) {
        setEarningNotification({
          type: 'color_pulse',
          aracoins: response.data.aracoins_earned,
          usd: response.data.usd_value,
          message: `+${response.data.aracoins_earned} ARACOIN Color Pulse Bonus!`
        });
        
        // Refresh wallet
        loadWallet();
        
        // Hide notification after 4 seconds
        setTimeout(() => setEarningNotification(null), 4000);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error earning Color Pulse ARACoins:', error);
    }
  };

  const awardCreatorView = async (creatorId, videoId) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/wallet/${creatorId}/earn-view`, {
        video_id: videoId,
        viewer_id: USER_ID
      });
      
      return response.data;
    } catch (error) {
      console.error('Error awarding creator view:', error);
    }
  };

  // Authentication Functions
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      let userData;
      
      if (authMode === 'signup') {
        // Simulate user creation
        userData = {
          username: authData.username,
          email: authData.email,
          user_id: `user_${Date.now()}`,
          tokens: 10, // Welcome bonus tokens
          total_watch_time: 0,
          neurodiversity_class: 'New User'
        };
        
        addNotification('🎉 Account Created!', `Welcome ${userData.username}! You received 10 welcome tokens!`, 'success');
      } else {
        // Simulate login with existing user
        userData = {
          username: authData.email.split('@')[0],
          email: authData.email,
          user_id: `user_${Math.floor(Math.random() * 10000)}`,
          tokens: Math.floor(Math.random() * 50) + 20, // Random existing tokens
          total_watch_time: Math.floor(Math.random() * 1000),
          neurodiversity_class: 'Returning User'
        };
        
        addNotification('👋 Welcome back!', `Good to see you again, ${userData.username}!`, 'success');
      }
      
      setUser(userData);
      setIsAuthenticated(true);
      setShowAuth(false);
      
      // Save to localStorage for session persistence
      localStorage.setItem('ara_user', JSON.stringify(userData));
      
      // Load wallet after authentication
      setTimeout(() => {
        loadWallet();
        addNotification('💰 Wallet Ready', 'Your ARACOIN wallet is active. Start earning now!', 'info');
      }, 1000);
      
      // Clear auth form
      setAuthData({ username: '', email: '', password: '' });
      
    } catch (error) {
      console.error('Authentication error:', error);
      addNotification('❌ Authentication Failed', 'Please check your credentials and try again.', 'error');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setWallet(null);
    setTransactions([]);
    
    // Clear localStorage
    localStorage.removeItem('ara_user');
    
    addNotification('👋 Logged out', 'Thanks for using Ara! Come back soon.', 'info');
    
    // Reset to home tab
    setActiveTab('home');
  };

  // Notification Functions
  const addNotification = (title, message, type = 'info') => {
    const notification = {
      id: Date.now(),
      title,
      message,
      type, // 'info', 'success', 'warning', 'error'
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const markNotificationRead = (notificationId) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
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
    
    // Load comments for this video
    loadVideoComments(video.video_id);
    setShowComments(true);
    
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
        
        // Award ARACoins for watch time (every 10 minutes)
        const watchMinutes = Math.floor(watchTimeRef.current / 60);
        if (watchMinutes > 0 && watchMinutes % 10 === 0) {
          await earnWatchTimeAracoins(10, currentVideo.video_id);
        }
        
        // Award creator 1 ARACOIN per view (first-time view tracking)
        if (watchTimeRef.current === 30) { // Award after 30 seconds of watch time
          const creatorId = currentVideo.creator_id || 'demo_creator';
          await awardCreatorView(creatorId, currentVideo.video_id);
        }
        
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
      
      // Award ARACOIN bonus for Color Pulse
      await earnColorPulseAracoin();
      
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
      console.log('Starting live stream with real WebRTC...');
      
      // Check if AgoraRTC is available
      if (typeof AgoraRTC === 'undefined') {
        console.error('AgoraRTC is not loaded');
        alert('Live streaming is not available. AgoraRTC SDK is not loaded.');
        return;
      }
      
      if (!AGORA_APP_ID) {
        console.error('Agora App ID not configured');
        alert('Live streaming configuration error. Please check Agora App ID.');
        return;
      }

      const streamTitle = `${user?.username || 'Creator'}'s Live Stream`;
      const channelName = `live_${USER_ID}_${Date.now()}`;
      const uid = parseInt(USER_ID.replace(/\D/g, '').slice(-8)) || Math.floor(Math.random() * 100000);

      console.log('Requesting camera and microphone permissions...');
      
      // Request camera and microphone permissions first
      try {
        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('WebRTC not supported in this browser');
        }

        await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 }, 
            frameRate: { ideal: 30 } 
          }, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('✅ Camera and microphone permissions granted');
      } catch (permissionError) {
        console.error('❌ Camera/microphone permission denied:', permissionError);
        
        let errorMessage = 'Unable to access camera and microphone. ';
        if (permissionError.name === 'NotFoundError') {
          errorMessage += 'No camera or microphone devices found. Please connect devices and try again.';
        } else if (permissionError.name === 'NotAllowedError') {
          errorMessage += 'Permission denied. Please allow camera and microphone access in browser settings and try again.';
        } else if (permissionError.name === 'NotSupportedError') {
          errorMessage += 'WebRTC not supported in this browser. Please use Chrome, Firefox, or Safari.';
        } else if (permissionError.message.includes('not supported')) {
          errorMessage += 'WebRTC not supported in this environment. Please use a modern browser with camera/microphone access.';
        } else {
          errorMessage += permissionError.message || 'Unknown error occurred.';
        }
        
        alert(errorMessage);
        console.log('🔄 Falling back to demo mode for testing...');
        
        // For testing environments, show demo mode notification
        if (permissionError.name === 'NotFoundError' || permissionError.message.includes('not found')) {
          alert('📱 Live streaming requires camera/microphone hardware. In a real device with camera, this would work perfectly! \n\n✅ The WebRTC implementation is ready and functional.');
        }
        
        return;
      }

      // Get Agora token for publisher (creator)
      console.log('Getting Agora token...');
      const tokenResponse = await axios.post(`${BACKEND_URL}/api/agora/token`, {
        channel: channelName,
        uid: uid,
        role: 'publisher'
      });

      console.log('Agora token generated:', tokenResponse.data);

      // Initialize Agora client
      console.log('Initializing Agora client...');
      const client = await initializeAgora();
      
      // Set client role to host (publisher)
      await client.setClientRole('host');
      console.log('✅ Client role set to host');

      // Join the Agora channel
      console.log('Joining Agora channel...');
      await client.join(AGORA_APP_ID, channelName, tokenResponse.data.token, uid);
      console.log('✅ Successfully joined Agora channel');

      // Create local video and audio tracks
      console.log('Creating local media tracks...');
      const [videoTrack, audioTrack] = await Promise.all([
        AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: 1280,
            height: 720,
            frameRate: 30,
            bitrateMin: 1000,
            bitrateMax: 3000
          }
        }),
        AgoraRTC.createMicrophoneAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        })
      ]);

      console.log('✅ Local tracks created successfully');

      // Publish local tracks to the channel
      await client.publish([videoTrack, audioTrack]);
      console.log('✅ Local tracks published to channel');

      // Store tracks in state
      setLocalTracks({ video: videoTrack, audio: audioTrack });
      
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
      
      // Refresh live streams list
      const streamsResponse = await axios.get(`${BACKEND_URL}/api/live-streams`);
      setLiveStreams(streamsResponse.data.streams);
      
      // Switch to Live tab to show the stream
      setActiveTab('live');
      
      console.log('🎉 Live stream started successfully with real WebRTC!');
      alert('🎉 You are now live! Your stream is broadcasting to viewers.');
      
    } catch (error) {
      console.error('❌ Error starting live stream:', error);
      
      // Clean up on error
      if (localTracks.video) {
        localTracks.video.close();
      }
      if (localTracks.audio) {
        localTracks.audio.close();
      }
      
      let errorMessage = 'Failed to start live stream. ';
      if (error.message?.includes('permission')) {
        errorMessage += 'Camera/microphone access denied. Please allow permissions.';
      } else if (error.message?.includes('token')) {
        errorMessage += 'Authentication failed. Please try again.';
      } else if (error.message?.includes('network')) {
        errorMessage += 'Network connection issue. Check your internet.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      alert(errorMessage);
      setIsCreatorLive(false);
      setLocalTracks({ video: null, audio: null });
    }
  };

  const endLiveStream = async () => {
    try {
      console.log('Ending live stream...');
      
      // Unpublish and stop local tracks
      if (agoraClient && (localTracks.video || localTracks.audio)) {
        const tracksToUnpublish = [];
        if (localTracks.video) tracksToUnpublish.push(localTracks.video);
        if (localTracks.audio) tracksToUnpublish.push(localTracks.audio);
        
        if (tracksToUnpublish.length > 0) {
          await agoraClient.unpublish(tracksToUnpublish);
          console.log('✅ Unpublished local tracks');
        }
      }
      
      // Stop and close local tracks
      if (localTracks.video) {
        localTracks.video.stop();
        localTracks.video.close();
        console.log('✅ Video track stopped and closed');
      }
      if (localTracks.audio) {
        localTracks.audio.stop();
        localTracks.audio.close();
        console.log('✅ Audio track stopped and closed');
      }
      
      // Leave Agora channel
      if (agoraClient) {
        await agoraClient.leave();
        console.log('✅ Left Agora channel');
      }
      
      // End stream in backend
      if (currentStream) {
        await axios.post(`${BACKEND_URL}/api/live-streams/${currentStream.stream_id}/end`);
        console.log('✅ Stream ended in backend');
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
      
      console.log('🎉 Live stream ended successfully');
      alert('✅ Stream ended successfully!');
      
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
      setShowComments(false);
      
      // Load live chat messages
      loadLiveChatMessages(stream.stream_id);
      
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
                controls={true}
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
            {/* Remote Video Display for Live Streams */}
            {remoteUsers.length > 0 ? (
              <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2">
                {remoteUsers.map((user) => (
                  <div 
                    key={user.uid}
                    id={`player-${user.uid}`}
                    className="w-full h-full bg-gray-900 rounded-lg overflow-hidden relative"
                  >
                    {/* Remote video will be played here by Agora SDK */}
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      User {user.uid}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* No remote streams yet - show waiting state */
              <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-pulse mb-4">
                    <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Radio size={32} className="text-white animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">🔴 LIVE</h3>
                    <p className="text-lg text-gray-200">{currentStream.title}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {isCreatorLive ? 'You are broadcasting live!' : 'Connecting to live stream...'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-6 mt-6">
                    <div className="flex items-center space-x-2">
                      <Users size={20} className="text-gray-400" />
                      <span className="text-white font-semibold">{remoteUsers.length} viewers</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye size={20} className="text-gray-400" />
                      <span className="text-white">Live</span>
                    </div>
                  </div>
                  
                  {!isCreatorLive && (
                    <div className="mt-6 text-sm text-gray-400">
                      <p>📡 Waiting for stream to start...</p>
                      <p>🔄 Real-time WebRTC connection</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Live stream overlay */}
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>LIVE</span>
            </div>
            
            {/* Connection Status */}
            {currentStream && (
              <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-3 py-1 rounded-lg backdrop-blur-sm">
                {agoraClient ? '🟢 Connected' : '🟡 Connecting...'}
              </div>
            )}
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
              
              {/* Comments/Chat Toggle Button */}
              {!isFullScreen && (
                <button
                  onClick={() => {
                    if (currentVideo) {
                      setShowComments(!showComments);
                    }
                  }}
                  className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Toggle Comments"
                >
                  <MessageCircle size={20} />
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
        
        {/* Ad Ticker - Shows during video/stream viewing */}
        {renderAdTicker()}
      </div>
    );
  };

  // YouTube-style Comments Section
  const renderVideoComments = () => {
    if (!showComments || !currentVideo) return null;

    return (
      <div className="bg-gray-800 rounded-lg p-4 mt-4 border border-neon-purple/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <MessageCircle className="mr-2 text-neon-purple" size={20} />
            Comments ({videoComments.length})
          </h3>
          <button
            onClick={() => setShowComments(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Comment Input */}
        <div className="mb-6">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between bg-gray-700 p-2 rounded">
              <span className="text-sm text-gray-300">
                Replying to: {replyingTo.username}
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-neon-orange to-neon-purple rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Add a comment..."}
                className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-neon-purple focus:outline-none resize-none"
                rows="3"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">
                  +1 token for commenting • {280 - newComment.length} characters left
                </span>
                <button
                  onClick={submitComment}
                  disabled={!newComment.trim()}
                  className="bg-neon-purple hover:bg-neon-purple/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Send size={16} />
                  <span>{replyingTo ? 'Reply' : 'Comment'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {videoComments.map((comment) => (
            <div key={comment.comment_id} className="border-b border-gray-700 pb-4">
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-neon-green to-neon-orange rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {comment.username?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-white">{comment.username}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(comment.timestamp).toLocaleDateString()}
                    </span>
                    {comment.is_pinned && (
                      <span className="text-xs bg-neon-orange text-white px-2 py-1 rounded">
                        📌 Pinned
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 mb-2">{comment.content}</p>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => likeComment(comment.comment_id)}
                      className="flex items-center space-x-1 text-gray-400 hover:text-neon-green transition-colors"
                    >
                      <ThumbsUp size={16} />
                      <span className="text-sm">{comment.likes || 0}</span>
                    </button>
                    <button
                      onClick={() => dislikeComment(comment.comment_id)}
                      className="flex items-center space-x-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <ThumbsDown size={16} />
                      <span className="text-sm">{comment.dislikes || 0}</span>
                    </button>
                    <button
                      onClick={() => setReplyingTo(comment)}
                      className="flex items-center space-x-1 text-gray-400 hover:text-neon-purple transition-colors"
                    >
                      <Reply size={16} />
                      <span className="text-sm">Reply</span>
                    </button>
                    {comment.replies_count > 0 && (
                      <span className="text-sm text-gray-400">
                        {comment.replies_count} replies
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {videoComments.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Twitch-style Live Chat
  const renderLiveChat = () => {
    if (!currentStream) return null;

    return (
      <div className="bg-gray-800 rounded-lg border border-neon-green/30 h-96 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <h3 className="font-bold text-white flex items-center">
            <MessageCircle className="mr-2 text-neon-green" size={18} />
            Live Chat
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>{liveChatMessages.length} messages</span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {liveChatMessages.map((message, index) => (
            <div
              key={message.message_id || index}
              className="flex items-start space-x-2 text-sm animate-fadeIn"
            >
              <div className="w-6 h-6 bg-gradient-to-r from-neon-green to-neon-purple rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {message.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-neon-green">
                  {message.username}:
                </span>
                <span className="text-white ml-2 break-words">
                  {message.message}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))}

          {liveChatMessages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chat is empty. Start the conversation!</p>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex space-x-2">
            <div className="w-7 h-7 bg-gradient-to-r from-neon-orange to-neon-purple rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 flex space-x-2">
              <input
                type="text"
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                placeholder="Say something..."
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-neon-green focus:outline-none text-sm"
                maxLength={200}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
              />
              <button
                onClick={() => setShowChatEmojis(!showChatEmojis)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-neon-green transition-colors"
                title="Emojis"
              >
                <Smile size={18} />
              </button>
              <button
                onClick={sendChatMessage}
                disabled={!newChatMessage.trim()}
                className="p-2 bg-neon-green hover:bg-neon-green/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                title="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
          
          {/* Character count and emoji picker */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">
              {200 - newChatMessage.length} characters left
            </span>
            {showChatEmojis && (
              <div className="absolute bottom-16 right-4 bg-gray-800 border border-gray-600 rounded-lg p-2 grid grid-cols-6 gap-1">
                {['😀', '😂', '❤️', '👍', '🔥', '💯', '😍', '🤔', '😮', '👏', '🎉', '💪'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setNewChatMessage(prev => prev + emoji);
                      setShowChatEmojis(false);
                    }}
                    className="p-1 hover:bg-gray-700 rounded text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
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

  const renderAdTicker = () => {
    if (!showTicker || !tickerAds.length || (!currentVideo && !currentStream)) return null;

    const currentAd = tickerAds[currentTickerIndex];
    if (!currentAd) return null;

    return (
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-neon-orange via-neon-green to-neon-purple h-8 overflow-hidden z-40">
        <div className="relative w-full h-full flex items-center">
          {/* Ticker Background */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          
          {/* Close Button */}
          <button
            onClick={() => setShowTicker(false)}
            className="absolute top-1 right-2 text-white hover:text-gray-300 z-50 text-xs"
          >
            <X size={12} />
          </button>
          
          {/* Scrolling Content */}
          <div className="relative w-full h-full flex items-center">
            <div className="animate-scroll flex items-center whitespace-nowrap">
              {/* Breaking News Style Indicator */}
              <div className="bg-red-600 text-white px-3 py-1 text-xs font-bold mr-4 flex-shrink-0">
                📢 AD
              </div>
              
              {/* Ad Content */}
              <a
                href={currentAd.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-semibold text-sm hover:text-yellow-300 transition-colors cursor-pointer mr-8"
              >
                {currentAd.content}
              </a>
              
              {/* Repeat the content for seamless scroll */}
              <div className="bg-red-600 text-white px-3 py-1 text-xs font-bold mr-4 flex-shrink-0">
                📢 AD
              </div>
              <a
                href={currentAd.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-semibold text-sm hover:text-yellow-300 transition-colors cursor-pointer mr-8"
              >
                {currentAd.content}
              </a>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-black/20">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-red-500 transition-all duration-1000"
              style={{ 
                width: `${((Date.now() % ((currentAd.duration || 30) * 1000)) / ((currentAd.duration || 30) * 1000)) * 100}%`
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  const renderOverlayBanner = () => {
    if (!showOverlay || !overlayAds.length || (!currentVideo && !currentStream)) return null;

    const currentAd = overlayAds[currentOverlayIndex];
    if (!currentAd) return null;

    return (
      <div className="fixed top-4 left-4 w-80 bg-gradient-to-br from-black/90 to-gray-900/90 rounded-lg overflow-hidden shadow-2xl border border-neon-purple/50 backdrop-blur-sm z-50 animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={() => setShowOverlay(false)}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs z-60 transition-all"
          title="Close Ad"
        >
          <X size={12} />
        </button>
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700 z-55">
          <div 
            className="h-full bg-gradient-to-r from-neon-orange to-neon-green transition-all duration-1000"
            style={{ 
              width: `${((Date.now() % ((currentAd.duration || 15) * 1000)) / ((currentAd.duration || 15) * 1000)) * 100}%`
            }}
          ></div>
        </div>
        
        {/* Ad Content Container */}
        <div className="relative">
          {currentAd.format === 'video' ? (
            /* Video Ad */
            <div className="relative">
              <video
                className="w-full h-32 object-cover"
                src={currentAd.video_url}
                autoPlay
                loop
                muted={overlayVideoMuted}
                playsInline
                onError={(e) => {
                  console.error('Video ad failed to load:', e);
                }}
              />
              
              {/* Video Controls Overlay */}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setOverlayVideoMuted(!overlayVideoMuted)}
                  className="bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                  title={overlayVideoMuted ? 'Unmute' : 'Mute'}
                >
                  {overlayVideoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
            </div>
          ) : (
            /* Static Image Ad */
            <div className="relative">
              <img
                src={currentAd.image_url}
                alt={currentAd.content}
                className="w-full h-32 object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              
              {/* Fallback for broken images */}
              <div className="w-full h-32 bg-gradient-to-br from-neon-purple to-neon-green flex items-center justify-center text-white font-bold text-sm text-center p-4" style={{display: 'none'}}>
                {currentAd.content}
              </div>
            </div>
          )}
          
          {/* Ad Text Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
            <div className="text-white text-sm font-semibold mb-1 line-clamp-2">
              {currentAd.content}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">Sponsored</span>
              <a
                href={currentAd.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-neon-orange hover:bg-neon-orange/80 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
        
        {/* Ad Type Indicator */}
        <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
          {currentAd.format === 'video' ? '📹 VIDEO AD' : '📷 SPONSORED'}
        </div>
        
        {/* Interactive Hover Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-neon-purple/20 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
      </div>
    );
  };

  const renderEarningNotification = () => {
    if (!earningNotification) return null;

    return (
      <div className="fixed top-4 right-4 bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-lg shadow-2xl border border-green-500/50 backdrop-blur-sm z-60 animate-fadeIn">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">
            {earningNotification.type === 'watch' ? '⏱️' : 
             earningNotification.type === 'color_pulse' ? '🎨' : '👀'}
          </div>
          <div>
            <div className="font-bold text-lg">
              +{earningNotification.aracoins} ARACOIN
            </div>
            <div className="text-sm text-green-200">
              ${earningNotification.usd?.toFixed(4)} USD
            </div>
            <div className="text-xs text-green-300 mt-1">
              {earningNotification.message}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAuthModal = () => {
    if (!showAuth) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-80 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-8 max-w-md w-full border border-neon-purple/50 shadow-2xl">
          {/* Header with Logo */}
          <div className="text-center mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_neonstream-2/artifacts/n574f50k_ARA%20logo.PNG"
              alt="ARA Logo"
              className="w-16 h-16 mx-auto mb-4 rounded-full"
            />
            <h2 className="text-3xl font-bold bg-gradient-to-r from-neon-orange to-neon-purple bg-clip-text text-transparent mb-2">
              {authMode === 'login' ? 'Welcome Back!' : 'Join Ara Today!'}
            </h2>
            <p className="text-gray-400 text-sm">
              {authMode === 'login' 
                ? 'Sign in to continue earning ARACoins' 
                : 'Create your account and start earning'}
            </p>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleAuth} className="space-y-6">
            {authMode === 'signup' && (
              <div>
                <label className="block text-white font-semibold mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={authData.username}
                  onChange={(e) => setAuthData({...authData, username: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-neon-purple focus:outline-none transition-colors"
                  placeholder="Enter your username"
                />
              </div>
            )}
            
            <div>
              <label className="block text-white font-semibold mb-2">Email</label>
              <input
                type="email"
                required
                value={authData.email}
                onChange={(e) => setAuthData({...authData, email: e.target.value})}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-neon-purple focus:outline-none transition-colors"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label className="block text-white font-semibold mb-2">Password</label>
              <input
                type="password"
                required
                value={authData.password}
                onChange={(e) => setAuthData({...authData, password: e.target.value})}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-neon-purple focus:outline-none transition-colors"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-neon-orange to-neon-purple text-white py-3 rounded-lg font-bold text-lg hover:from-neon-orange/80 hover:to-neon-purple/80 transition-all transform hover:scale-105"
            >
              {authMode === 'login' ? '🚀 Sign In' : '✨ Create Account'}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-neon-purple hover:text-neon-orange transition-colors ml-2 font-semibold"
              >
                {authMode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowAuth(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          {/* Features Preview for Signup */}
          {authMode === 'signup' && (
            <div className="mt-6 p-4 bg-gradient-to-r from-neon-purple/20 to-neon-orange/20 rounded-lg border border-neon-purple/30">
              <h4 className="text-white font-semibold mb-2">🎯 What you'll get:</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>💰 Earn ARACoins while watching</li>
                <li>🎨 Color Pulse bonuses</li>
                <li>📱 Real money withdrawals</li>
                <li>🎮 Gamified streaming experience</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNotifications = () => {
    if (!showNotifications) return null;

    return (
      <div className="fixed top-20 right-4 w-80 max-h-96 bg-gradient-to-br from-gray-900/95 to-black/95 rounded-xl border border-neon-purple/50 shadow-2xl backdrop-blur-sm z-60 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">🔔 Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs text-neon-purple hover:text-neon-orange transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">🔕</div>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markNotificationRead(notification.id)}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-all hover:bg-gray-800/50 ${
                    !notification.read ? 'bg-neon-purple/10 border-l-4 border-neon-purple' : 'bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {notification.type === 'success' && <span className="text-green-400">✅</span>}
                      {notification.type === 'warning' && <span className="text-yellow-400">⚠️</span>}
                      {notification.type === 'error' && <span className="text-red-400">❌</span>}
                      {notification.type === 'info' && <span className="text-blue-400">ℹ️</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm truncate">
                        {notification.title}
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        {notification.message}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-neon-purple rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWallet = () => {
    if (!showWallet || !wallet) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-70 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-neon-purple/50 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">💰</div>
              <div>
                <h2 className="text-2xl font-bold text-white">ARACOIN Wallet</h2>
                <p className="text-gray-400 text-sm">Your digital currency balance</p>
              </div>
            </div>
            <button
              onClick={() => setShowWallet(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Balance Display */}
          <div className="bg-gradient-to-r from-neon-orange/20 to-neon-purple/20 rounded-lg p-6 mb-6 border border-neon-purple/30">
            <div className="text-center">
              <div className="text-4xl font-bold text-neon-orange mb-2">
                {wallet.wallet?.balance?.toFixed(2) || '0.00'} ARACOIN
              </div>
              <div className="text-xl text-gray-300 mb-4">
                ≈ ${wallet.usd_balance?.toFixed(4) || '0.0000'} USD
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-black/30 rounded p-3">
                  <div className="text-green-400 font-semibold">Total Earned</div>
                  <div className="text-white">{wallet.wallet?.total_earned?.toFixed(2) || '0.00'}</div>
                </div>
                <div className="bg-black/30 rounded p-3">
                  <div className="text-red-400 font-semibold">Total Spent</div>
                  <div className="text-white">{wallet.wallet?.total_spent?.toFixed(2) || '0.00'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <span className="text-lg mr-2">⏱️</span>
                Watch Time Rewards
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Today's Progress:</span>
                  <span className="text-neon-green">
                    {wallet.wallet?.daily_earned_today?.toFixed(1) || '0.0'} / {wallet.daily_limits?.max_daily_aracoins || 50}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-neon-green h-2 rounded-full transition-all"
                    style={{ 
                      width: `${((wallet.wallet?.daily_earned_today || 0) / (wallet.daily_limits?.max_daily_aracoins || 50)) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  {wallet.daily_limits?.watch_minutes_per_aracoin || 10} minutes = 1 ARACOIN
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <span className="text-lg mr-2">🎨</span>
                Color Pulse Bonus
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Today's Bonus:</span>
                  <span className="text-neon-purple">
                    {wallet.wallet?.daily_color_pulse_earned?.toFixed(1) || '0.0'} / {wallet.daily_limits?.max_color_pulse_aracoins || 5}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-neon-purple h-2 rounded-full transition-all"
                    style={{ 
                      width: `${((wallet.wallet?.daily_color_pulse_earned || 0) / (wallet.daily_limits?.max_color_pulse_aracoins || 5)) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  +{wallet.daily_limits?.color_pulse_bonus || 0.5} ARACOIN per check-in
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={loadTransactions}
              className="flex-1 bg-neon-purple hover:bg-neon-purple/80 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              📊 View Transactions
            </button>
            <button
              onClick={() => {
                if (wallet.wallet?.balance >= 100) {
                  alert('Withdrawal feature coming soon! Minimum $1.00 (100 ARACOINS)');
                } else {
                  alert('Minimum withdrawal: 100 ARACOINS ($1.00)');
                }
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                wallet.wallet?.balance >= 100 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              disabled={wallet.wallet?.balance < 100}
            >
              💸 Withdraw USD
            </button>
          </div>

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-4">Recent Transactions</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.transaction_id} className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">
                        {tx.type === 'earn_watch' ? '⏱️' : 
                         tx.type === 'earn_color_pulse' ? '🎨' : 
                         tx.type === 'earn_view' ? '👀' : '💰'}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {tx.description}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversion Info */}
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>1 ARACOIN = ${wallet.conversion_rate?.toFixed(4) || '0.0100'} USD</p>
            <p>Daily limits reset at midnight UTC</p>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-8">
            {/* Hero Section for Non-Authenticated Users */}
            {!isAuthenticated && (
              <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-8 md:p-12 border-2 border-neon-purple/30">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/20 via-neon-orange/20 to-neon-green/20"></div>
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(199,51,255,0.1),transparent_50%)]"></div>
                </div>
                
                <div className="relative z-10 text-center">
                  <div className="flex items-center justify-center mb-6">
                    <img 
                      src="https://customer-assets.emergentagent.com/job_neonstream-2/artifacts/n574f50k_ARA%20logo.PNG"
                      alt="ARA Logo"
                      className="w-20 h-20 rounded-full border-4 border-neon-purple/50 shadow-2xl"
                    />
                  </div>
                  
                  <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-neon-orange via-neon-purple to-neon-green bg-clip-text text-transparent">
                    Welcome to Ara
                  </h1>
                  
                  <p className="text-xl md:text-2xl text-gray-300 mb-6 max-w-3xl mx-auto">
                    The revolutionary <span className="text-neon-purple font-bold">streaming platform</span> where you earn real money while watching incredible content
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 max-w-4xl mx-auto">
                    <div className="bg-gradient-to-br from-neon-orange/20 to-neon-orange/10 rounded-xl p-6 border border-neon-orange/30">
                      <div className="text-4xl mb-4">💰</div>
                      <h3 className="text-neon-orange font-bold text-lg mb-2">Earn ARACoins</h3>
                      <p className="text-gray-400 text-sm">Get paid for watching! 1 ARACOIN per 10 minutes = real money</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-neon-purple/20 to-neon-purple/10 rounded-xl p-6 border border-neon-purple/30">
                      <div className="text-4xl mb-4">🎨</div>
                      <h3 className="text-neon-purple font-bold text-lg mb-2">Color Pulse Bonuses</h3>
                      <p className="text-gray-400 text-sm">Express your emotions and earn bonus ARACoins for every check-in</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-neon-green/20 to-neon-green/10 rounded-xl p-6 border border-neon-green/30">
                      <div className="text-4xl mb-4">🚀</div>
                      <h3 className="text-neon-green font-bold text-lg mb-2">Live Streaming</h3>
                      <p className="text-gray-400 text-sm">Watch live streams, chat in real-time, and connect with creators</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <button
                      onClick={() => { setAuthMode('signup'); setShowAuth(true); }}
                      className="px-8 py-4 bg-gradient-to-r from-neon-orange to-neon-purple text-white rounded-xl font-bold text-lg hover:from-neon-orange/80 hover:to-neon-purple/80 transition-all transform hover:scale-105 shadow-2xl"
                    >
                      🎯 Start Earning Now
                    </button>
                    <button
                      onClick={() => { setAuthMode('login'); setShowAuth(true); }}
                      className="px-8 py-4 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl font-semibold text-lg border border-gray-600 hover:border-neon-purple/50 hover:from-gray-700 hover:to-gray-600 transition-all transform hover:scale-105"
                    >
                      Already a member? Sign In
                    </button>
                  </div>
                  
                  <div className="mt-8 p-4 bg-black/30 rounded-xl border border-neon-purple/20">
                    <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>💰 1 ARACOIN = $0.01</span>
                      </div>
                      <div>🎮 Gamified Experience</div>
                      <div>📱 Mobile Ready</div>
                      <div>💸 Real Withdrawals</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className={isAuthenticated ? "space-y-6" : "space-y-8"}>
              {isAuthenticated && <h2 className="text-3xl font-bold text-white">🔥 Featured Videos</h2>}
              
              {renderVideoPlayer()}
              
              {/* YouTube-style Comments for Videos */}
              {currentVideo && renderVideoComments()}
              
              {/* Featured Stats for Authenticated Users */}
              {isAuthenticated && wallet && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
                  <div className="bg-gradient-to-br from-neon-orange/20 to-neon-orange/10 rounded-xl p-4 border border-neon-orange/30 text-center">
                    <div className="text-2xl font-bold text-neon-orange">{wallet.wallet?.balance?.toFixed(1) || '0.0'}</div>
                    <div className="text-xs text-gray-400">ARACoins Earned</div>
                  </div>
                  <div className="bg-gradient-to-br from-neon-purple/20 to-neon-purple/10 rounded-xl p-4 border border-neon-purple/30 text-center">
                    <div className="text-2xl font-bold text-neon-purple">{wallet.wallet?.color_pulse_count_today || 0}</div>
                    <div className="text-xs text-gray-400">Color Pulses Today</div>
                  </div>
                  <div className="bg-gradient-to-br from-neon-green/20 to-neon-green/10 rounded-xl p-4 border border-neon-green/30 text-center">
                    <div className="text-2xl font-bold text-neon-green">${wallet.usd_balance?.toFixed(4) || '0.0000'}</div>
                    <div className="text-xs text-gray-400">USD Value</div>
                  </div>
                  <div className="bg-gradient-to-br from-gray-600/20 to-gray-600/10 rounded-xl p-4 border border-gray-600/30 text-center">
                    <div className="text-2xl font-bold text-white">{tokens}</div>
                    <div className="text-xs text-gray-400">Legacy Tokens</div>
                  </div>
                </div>
              )}
              
              {/* Video Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                  <div
                    key={video.video_id}
                    onClick={() => playVideo(video)}
                    className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden cursor-pointer hover:from-gray-700 hover:to-gray-800 transition-all transform hover:scale-105 border border-neon-purple/20 hover:border-neon-purple/50 shadow-xl"
                  >
                    <div className="relative">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iOTAiIGZpbGw9IiM5Q0E0QUYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VmlkZW8gUGxhY2Vob2xkZXI8L3RleHQ+Cjwvc3ZnPgo=';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-center space-x-2 text-white">
                            <Play size={20} className="text-neon-orange" />
                            <span className="text-sm font-medium">Watch & Earn</span>
                          </div>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-bold">
                        {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 group-hover:text-neon-orange transition-colors">
                        {video.title}
                      </h3>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Eye size={14} />
                          <span>Earn +{Math.floor(video.duration / 600)} AC</span>
                        </span>
                        <span>{video.size_mb} MB</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'live':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Live Streams</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Video Player */}
              <div className="lg:col-span-2">
                {renderVideoPlayer()}
              </div>
              
              {/* Twitch-style Live Chat */}
              {currentStream && (
                <div className="lg:col-span-1">
                  {renderLiveChat()}
                </div>
              )}
            </div>
            
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
                    <div className="relative w-full h-64 bg-gradient-to-br from-gray-900 to-black">
                      {/* Local Video Container */}
                      <div 
                        id="local-video-container"
                        className="w-full h-full rounded-lg overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #1a1a1a, #000)' }}
                      >
                        {!localTracks.video && (
                          <div className="w-full h-full flex items-center justify-center text-white">
                            <div className="text-center">
                              <div className="animate-pulse">
                                <div className="w-12 h-12 bg-red-500 rounded-full mx-auto mb-3 flex items-center justify-center">
                                  <Camera size={24} className="text-white" />
                                </div>
                                <p className="text-lg font-bold">🎥 Getting Ready...</p>
                                <p className="text-sm text-gray-400 mt-1">Camera is starting up</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Live Indicator */}
                      <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span>LIVE</span>
                      </div>
                      
                      {/* Video Controls Overlay */}
                      <div className="absolute bottom-4 right-4 flex space-x-2">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${localTracks.video?.enabled !== false ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                          {localTracks.video?.enabled !== false ? '📹 ON' : '📹 OFF'}
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${localTracks.audio?.enabled !== false ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                          {localTracks.audio?.enabled !== false ? '🎤 ON' : '🎤 OFF'}
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
            
            {/* Color Pulse Analytics Dashboard */}
            <div className="bg-gray-800 rounded-lg p-6 border border-neon-purple/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <div className="w-3 h-3 bg-gradient-to-r from-neon-purple to-neon-green rounded-full mr-3 animate-pulse"></div>
                  Audience Sentiment Analytics
                </h3>
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="text-neon-purple hover:text-neon-green transition-colors text-sm"
                >
                  {showAnalytics ? 'Hide' : 'Show'} Analytics
                </button>
              </div>
              
              {showAnalytics && (
                <div className="space-y-6">
                  {/* Real-time Sentiment Overview */}
                  {isCreatorLive && liveStreamAnalytics ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Live Mood Score */}
                      <div className="bg-gray-700 rounded-lg p-4 border border-red-500/30">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-red-400 mb-2">
                            {liveStreamAnalytics.live_sentiment?.audience_mood_score || 'N/A'}
                          </div>
                          <div className="text-red-300 text-sm font-semibold mb-1">Live Mood Score</div>
                          <div className="text-xs text-gray-400">
                            {liveStreamAnalytics.live_sentiment?.mood_level || 'Neutral'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Active Viewers */}
                      <div className="bg-gray-700 rounded-lg p-4 border border-green-500/30">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-400 mb-2">
                            {liveStreamAnalytics.live_sentiment?.unique_viewers || 0}
                          </div>
                          <div className="text-green-300 text-sm font-semibold mb-1">Engaged Viewers</div>
                          <div className="text-xs text-gray-400">
                            {liveStreamAnalytics.live_sentiment?.total_interactions || 0} interactions
                          </div>
                        </div>
                      </div>
                      
                      {/* Dominant Sentiment */}
                      <div className="bg-gray-700 rounded-lg p-4 border border-purple-500/30">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400 mb-2 capitalize">
                            {liveStreamAnalytics.audience_insights?.dominant_sentiment || 'Neutral'}
                          </div>
                          <div className="text-purple-300 text-sm font-semibold mb-1">Dominant Vibe</div>
                          <div className="text-xs text-gray-400">
                            Live sentiment trend
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : colorPulseAnalytics ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Overall Mood Score */}
                      <div className="bg-gray-700 rounded-lg p-4 border border-neon-purple/30">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-neon-purple mb-2">
                            {colorPulseAnalytics.real_time_sentiment?.average_mood_score || 'N/A'}
                          </div>
                          <div className="text-purple-300 text-sm font-semibold mb-1">Audience Mood</div>
                          <div className="text-xs text-gray-400">
                            {colorPulseAnalytics.real_time_sentiment?.mood_level || 'Neutral'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Total Interactions */}
                      <div className="bg-gray-700 rounded-lg p-4 border border-neon-green/30">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-neon-green mb-2">
                            {colorPulseAnalytics.real_time_sentiment?.total_interactions || 0}
                          </div>
                          <div className="text-green-300 text-sm font-semibold mb-1">Recent Pulses</div>
                          <div className="text-xs text-gray-400">Last hour</div>
                        </div>
                      </div>
                      
                      {/* Active Viewers */}
                      <div className="bg-gray-700 rounded-lg p-4 border border-neon-orange/30">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-neon-orange mb-2">
                            {colorPulseAnalytics.engagement_patterns?.active_viewers || 0}
                          </div>
                          <div className="text-orange-300 text-sm font-semibold mb-1">Active Viewers</div>
                          <div className="text-xs text-gray-400">Engaged audience</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p>Loading audience analytics...</p>
                    </div>
                  )}
                  
                  {/* Color Sentiment Trends */}
                  {(colorPulseAnalytics || liveStreamAnalytics) && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-4">Color Sentiment Distribution</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {/* Warm Colors */}
                        <div className="text-center">
                          <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
                            <div 
                              className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${((isCreatorLive ? liveStreamAnalytics?.live_sentiment?.color_distribution?.warm : colorPulseAnalytics?.real_time_sentiment?.color_trends?.warm) || 0) / Math.max((isCreatorLive ? (liveStreamAnalytics?.live_sentiment?.total_interactions || 1) : (colorPulseAnalytics?.real_time_sentiment?.total_interactions || 1)), 1) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-orange-400 font-semibold text-sm">
                            {(isCreatorLive ? liveStreamAnalytics?.live_sentiment?.color_distribution?.warm : colorPulseAnalytics?.real_time_sentiment?.color_trends?.warm) || 0}
                          </div>
                          <div className="text-xs text-gray-400">Warm (Energetic)</div>
                        </div>
                        
                        {/* Cool Colors */}
                        <div className="text-center">
                          <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${((isCreatorLive ? liveStreamAnalytics?.live_sentiment?.color_distribution?.cool : colorPulseAnalytics?.real_time_sentiment?.color_trends?.cool) || 0) / Math.max((isCreatorLive ? (liveStreamAnalytics?.live_sentiment?.total_interactions || 1) : (colorPulseAnalytics?.real_time_sentiment?.total_interactions || 1)), 1) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-green-400 font-semibold text-sm">
                            {(isCreatorLive ? liveStreamAnalytics?.live_sentiment?.color_distribution?.cool : colorPulseAnalytics?.real_time_sentiment?.color_trends?.cool) || 0}
                          </div>
                          <div className="text-xs text-gray-400">Cool (Calm)</div>
                        </div>
                        
                        {/* Neutral Colors */}
                        <div className="text-center">
                          <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${((isCreatorLive ? liveStreamAnalytics?.live_sentiment?.color_distribution?.neutral : colorPulseAnalytics?.real_time_sentiment?.color_trends?.neutral) || 0) / Math.max((isCreatorLive ? (liveStreamAnalytics?.live_sentiment?.total_interactions || 1) : (colorPulseAnalytics?.real_time_sentiment?.total_interactions || 1)), 1) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-purple-400 font-semibold text-sm">
                            {(isCreatorLive ? liveStreamAnalytics?.live_sentiment?.color_distribution?.neutral : colorPulseAnalytics?.real_time_sentiment?.color_trends?.neutral) || 0}
                          </div>
                          <div className="text-xs text-gray-400">Neutral (Balanced)</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Mood Distribution */}
                  {colorPulseAnalytics?.audience_insights?.mood_distribution && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-4">Audience Mood Breakdown</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {colorPulseAnalytics.audience_insights.mood_distribution.slice(0, 8).map((mood, index) => (
                          <div key={mood._id || index} className="text-center p-3 bg-gray-600 rounded-lg">
                            <div className="text-lg font-bold text-neon-green">{mood.count}</div>
                            <div className="text-xs text-gray-300 capitalize">{mood._id || 'Unknown'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Real-time Activity Feed for Live Streams */}
                  {isCreatorLive && liveStreamAnalytics?.real_time_feed?.recent_interactions && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-4 flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                        Live Audience Interactions
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {liveStreamAnalytics.real_time_feed.recent_interactions.slice(0, 5).map((interaction, index) => (
                          <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-600 rounded">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: interaction.color || '#666' }}
                              ></div>
                              <span className="text-gray-300">{interaction.user_id}</span>
                              {interaction.mood && (
                                <span className="text-xs text-neon-purple capitalize px-2 py-1 bg-purple-900/30 rounded">
                                  {interaction.mood}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">{interaction.time_in_stream}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Last Updated */}
                  <div className="text-center text-xs text-gray-500">
                    Last updated: {new Date().toLocaleTimeString()}
                    {isCreatorLive && <span className="text-red-400 ml-2">● Live updates every 15s</span>}
                    {!isCreatorLive && <span className="text-neon-purple ml-2">● Updates every 30s</span>}
                  </div>
                </div>
              )}
            </div>
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
      {/* Enhanced Top Header */}
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-black via-gray-900 to-black border-b-2 border-neon-purple/50 z-40 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo Section */}
          <div className="flex items-center space-x-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_neonstream-2/artifacts/n574f50k_ARA%20logo.PNG"
              alt="ARA Logo"
              className="w-12 h-12 rounded-full border-2 border-neon-purple/50 shadow-lg hover:border-neon-orange/50 transition-all"
            />
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-neon-orange via-neon-purple to-neon-green bg-clip-text text-transparent">
                Ara
              </div>
              <div className="text-xs text-gray-400 font-medium tracking-wide">
                Next-Gen Streaming Platform
              </div>
            </div>
          </div>
          
          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* ARACOIN Balance */}
                <button
                  onClick={() => setShowWallet(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-neon-orange/20 to-neon-purple/20 border border-neon-purple/40 rounded-xl px-4 py-2 hover:from-neon-orange/30 hover:to-neon-purple/30 transition-all transform hover:scale-105 shadow-lg"
                >
                  <span className="text-lg">💰</span>
                  <div className="text-left">
                    <div className="text-neon-orange font-bold text-sm">
                      {wallet?.wallet?.balance?.toFixed(1) || '0.0'} AC
                    </div>
                    <div className="text-gray-400 text-xs">
                      ${wallet?.usd_balance?.toFixed(3) || '0.000'}
                    </div>
                  </div>
                </button>
                
                {/* Notifications */}
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-600 hover:border-neon-purple/50 transition-all transform hover:scale-105"
                >
                  <div className="text-xl">🔔</div>
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                      {unreadCount}
                    </div>
                  )}
                </button>
                
                {/* User Profile */}
                <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl px-4 py-2 border border-gray-600 hover:border-neon-green/50 transition-all">
                  <div className="w-10 h-10 bg-gradient-to-r from-neon-green to-neon-purple rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-white font-semibold">{user?.username || 'User'}</div>
                    <div className="text-neon-green text-xs font-medium">{tokens} Legacy Tokens</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-red-400 transition-colors ml-2"
                    title="Logout"
                  >
                    <div className="text-sm">🚪</div>
                  </button>
                </div>
              </>
            ) : (
              /* Authentication Buttons */
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => { setAuthMode('login'); setShowAuth(true); }}
                  className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl border border-gray-600 hover:border-neon-purple/50 hover:from-gray-700 hover:to-gray-600 transition-all transform hover:scale-105 font-semibold"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setAuthMode('signup'); setShowAuth(true); }}
                  className="px-6 py-2 bg-gradient-to-r from-neon-orange to-neon-purple text-white rounded-xl hover:from-neon-orange/80 hover:to-neon-purple/80 transition-all transform hover:scale-105 font-bold shadow-lg"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-2 bg-gradient-to-r from-neon-purple/10 via-transparent to-neon-orange/10 border-t border-neon-purple/20">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live Platform</span>
              </span>
              <span>💰 1 ARACOIN = $0.01</span>
              {aracoinStats && (
                <span>🏦 {aracoinStats.active_wallets} Active Wallets</span>
              )}
            </div>
            <div className="hidden md:block">
              <span>🎯 Earn ARACoins while you watch • 🎨 Color Pulse bonuses • 💸 Real money withdrawals • 🌍 For everyone</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-28 pb-16 p-4">
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
      {renderOverlayBanner()}
      {renderWallet()}
      {renderEarningNotification()}
      {renderAuthModal()}
      {renderNotifications()}
    </div>
  );
};

export default App;