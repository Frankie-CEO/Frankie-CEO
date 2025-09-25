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
  Smile,
  Sparkles
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
  
  // Waitlist state
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  
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

  // Load avatar gallery when profile picture modal opens
  useEffect(() => {
    if (showProfilePicture && avatarGallery.length === 0) {
      loadAvatarGallery();
    }
  }, [showProfilePicture]);

  // Waitlist modal timing logic
  useEffect(() => {
    // Don't show if user is authenticated
    if (isAuthenticated) return;
    
    // Don't show if already submitted
    if (localStorage.getItem('ara_waitlist_submitted')) return;
    
    // Don't show if user declined
    if (localStorage.getItem('ara_waitlist_declined')) return;
    
    // Don't show if recently dismissed (within 24 hours)
    const dismissedTime = localStorage.getItem('ara_waitlist_dismissed');
    if (dismissedTime) {
      const daysSinceDismissal = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 1) return;
    }
    
    // Show waitlist modal after 15 seconds on the site
    const waitlistTimer = setTimeout(() => {
      setShowWaitlist(true);
    }, 15000);
    
    return () => clearTimeout(waitlistTimer);
  }, [isAuthenticated]);

  // Keyboard escape functionality for waitlist modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showWaitlist) {
        dismissWaitlist();
      }
    };

    if (showWaitlist) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showWaitlist]);

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

      case 'quickies':
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-neon-orange via-neon-purple to-neon-green bg-clip-text text-transparent mb-4">
                ✨ Quickies
              </h2>
              <p className="text-xl text-gray-300 mb-2">
                Lightning-fast entertainment is coming soon!
              </p>
              <p className="text-gray-400 text-sm">
                Get ready for bite-sized content that packs a punch
              </p>
            </div>

            {/* Coming Soon Feature Card */}
            <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-8 border-2 border-neon-purple/30 relative overflow-hidden">
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 via-neon-orange/10 to-neon-green/10"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(199,51,255,0.1),transparent_50%)]"></div>
              
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6">🚀</div>
                <h3 className="text-3xl font-bold text-white mb-4">Coming Soon</h3>
                <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
                  We're crafting the perfect short-form video experience that will revolutionize how you consume content. 
                  Think TikTok meets earning rewards - but better!
                </p>
                
                {/* Feature Preview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                  <div className="bg-gradient-to-br from-neon-orange/20 to-neon-orange/10 rounded-xl p-6 border border-neon-orange/30">
                    <div className="text-3xl mb-3">⚡</div>
                    <h4 className="text-neon-orange font-bold mb-2">15-60 Second Videos</h4>
                    <p className="text-gray-400 text-sm">Quick, engaging content optimized for mobile viewing</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-purple/20 to-neon-purple/10 rounded-xl p-6 border border-neon-purple/30">
                    <div className="text-3xl mb-3">💰</div>
                    <h4 className="text-neon-purple font-bold mb-2">Enhanced Earning</h4>
                    <p className="text-gray-400 text-sm">Earn more ARACoins with our new quick-watch bonus system</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-green/20 to-neon-green/10 rounded-xl p-6 border border-neon-green/30">
                    <div className="text-3xl mb-3">🎨</div>
                    <h4 className="text-neon-green font-bold mb-2">Creative Tools</h4>
                    <p className="text-gray-400 text-sm">Easy-to-use video creation tools for all creators</p>
                  </div>
                </div>

                {/* Notification Signup */}
                <div className="bg-black/30 rounded-xl p-6 border border-neon-purple/20 max-w-md mx-auto">
                  <h4 className="text-white font-semibold mb-4 flex items-center justify-center">
                    <Sparkles className="mr-2" size={18} />
                    Get Notified First
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Be among the first to experience Quickies when it launches!
                  </p>
                  <button 
                    onClick={() => setShowWaitlist(true)}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-orange text-white py-3 rounded-lg font-semibold hover:from-neon-purple/80 hover:to-neon-orange/80 transition-all transform hover:scale-105"
                  >
                    🔔 Notify Me
                  </button>
                </div>

                {/* Progress Indicator */}
                <div className="mt-8">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 mb-2">
                    <span>Development Progress</span>
                  </div>
                  <div className="w-full max-w-sm mx-auto bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-neon-purple to-neon-orange h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">75% Complete - Launch Expected Q1 2026</p>
                </div>
              </div>
            </div>

            {/* Preview Mockups */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white text-center">Sneak Peek</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: "Quick Gaming", category: "Gaming" },
                  { title: "Mini Cooking", category: "Food" },
                  { title: "Fast Fashion", category: "Style" },
                  { title: "Tech Tips", category: "Tech" }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg aspect-[9/16] flex flex-col items-center justify-center border border-gray-600 hover:border-neon-purple/50 transition-all">
                    <div className="text-3xl mb-2">📱</div>
                    <span className="text-white font-semibold text-sm text-center px-2">{item.title}</span>
                    <span className="text-gray-400 text-xs mt-1">{item.category}</span>
                    <div className="text-xs text-gray-500 mt-2">Coming Soon</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'profile':        );

      case 'quickies':
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-neon-orange via-neon-purple to-neon-green bg-clip-text text-transparent mb-4">
                ✨ Quickies
              </h2>
              <p className="text-xl text-gray-300 mb-2">
                Lightning-fast entertainment is coming soon!
              </p>
              <p className="text-gray-400 text-sm">
                Get ready for bite-sized content that packs a punch
              </p>
            </div>

            {/* Coming Soon Feature Card */}
            <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-8 border-2 border-neon-purple/30 relative overflow-hidden">
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 via-neon-orange/10 to-neon-green/10"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(199,51,255,0.1),transparent_50%)]"></div>
              
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6">🚀</div>
                <h3 className="text-3xl font-bold text-white mb-4">Coming Soon</h3>
                <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
                  We're crafting the perfect short-form video experience that will revolutionize how you consume content. 
                  Think TikTok meets earning rewards - but better!
                </p>
                
                {/* Feature Preview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                  <div className="bg-gradient-to-br from-neon-orange/20 to-neon-orange/10 rounded-xl p-6 border border-neon-orange/30">
                    <div className="text-3xl mb-3">⚡</div>
                    <h4 className="text-neon-orange font-bold mb-2">15-60 Second Videos</h4>
                    <p className="text-gray-400 text-sm">Quick, engaging content optimized for mobile viewing</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-purple/20 to-neon-purple/10 rounded-xl p-6 border border-neon-purple/30">
                    <div className="text-3xl mb-3">💰</div>
                    <h4 className="text-neon-purple font-bold mb-2">Enhanced Earning</h4>
                    <p className="text-gray-400 text-sm">Earn more ARACoins with our new quick-watch bonus system</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-green/20 to-neon-green/10 rounded-xl p-6 border border-neon-green/30">
                    <div className="text-3xl mb-3">🎨</div>
                    <h4 className="text-neon-green font-bold mb-2">Creative Tools</h4>
                    <p className="text-gray-400 text-sm">Easy-to-use video creation tools for all creators</p>
                  </div>
                </div>

                {/* Notification Signup */}
                <div className="bg-black/30 rounded-xl p-6 border border-neon-purple/20 max-w-md mx-auto">
                  <h4 className="text-white font-semibold mb-4 flex items-center justify-center">
                    <Sparkles className="mr-2" size={18} />
                    Get Notified First
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Be among the first to experience Quickies when it launches!
                  </p>
                  <button 
                    onClick={() => setShowWaitlist(true)}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-orange text-white py-3 rounded-lg font-semibold hover:from-neon-purple/80 hover:to-neon-orange/80 transition-all transform hover:scale-105"
                  >
                    🔔 Notify Me
                  </button>
                </div>

                {/* Progress Indicator */}
                <div className="mt-8">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 mb-2">
                    <span>Development Progress</span>
                  </div>
                  <div className="w-full max-w-sm mx-auto bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-neon-purple to-neon-orange h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">75% Complete - Launch Expected Q1 2026</p>
                </div>
              </div>
            </div>

            {/* Preview Mockups */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white text-center">Sneak Peek</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: "Quick Gaming", category: "Gaming" },
                  { title: "Mini Cooking", category: "Food" },
                  { title: "Fast Fashion", category: "Style" },
                  { title: "Tech Tips", category: "Tech" }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg aspect-[9/16] flex flex-col items-center justify-center border border-gray-600 hover:border-neon-purple/50 transition-all">
                    <div className="text-3xl mb-2">📱</div>
                    <span className="text-white font-semibold text-sm text-center px-2">{item.title}</span>
                    <span className="text-gray-400 text-xs mt-1">{item.category}</span>
                    <div className="text-xs text-gray-500 mt-2">Coming Soon</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'profile':        );

      case 'quickies':
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-neon-orange via-neon-purple to-neon-green bg-clip-text text-transparent mb-4">
                ✨ Quickies
              </h2>
              <p className="text-xl text-gray-300 mb-2">
                Lightning-fast entertainment is coming soon!
              </p>
              <p className="text-gray-400 text-sm">
                Get ready for bite-sized content that packs a punch
              </p>
            </div>

            {/* Coming Soon Feature Card */}
            <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-8 border-2 border-neon-purple/30 relative overflow-hidden">
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 via-neon-orange/10 to-neon-green/10"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(199,51,255,0.1),transparent_50%)]"></div>
              
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6">🚀</div>
                <h3 className="text-3xl font-bold text-white mb-4">Coming Soon</h3>
                <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
                  We're crafting the perfect short-form video experience that will revolutionize how you consume content. 
                  Think TikTok meets earning rewards - but better!
                </p>
                
                {/* Feature Preview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                  <div className="bg-gradient-to-br from-neon-orange/20 to-neon-orange/10 rounded-xl p-6 border border-neon-orange/30">
                    <div className="text-3xl mb-3">⚡</div>
                    <h4 className="text-neon-orange font-bold mb-2">15-60 Second Videos</h4>
                    <p className="text-gray-400 text-sm">Quick, engaging content optimized for mobile viewing</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-purple/20 to-neon-purple/10 rounded-xl p-6 border border-neon-purple/30">
                    <div className="text-3xl mb-3">💰</div>
                    <h4 className="text-neon-purple font-bold mb-2">Enhanced Earning</h4>
                    <p className="text-gray-400 text-sm">Earn more ARACoins with our new quick-watch bonus system</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-green/20 to-neon-green/10 rounded-xl p-6 border border-neon-green/30">
                    <div className="text-3xl mb-3">🎨</div>
                    <h4 className="text-neon-green font-bold mb-2">Creative Tools</h4>
                    <p className="text-gray-400 text-sm">Easy-to-use video creation tools for all creators</p>
                  </div>
                </div>

                {/* Notification Signup */}
                <div className="bg-black/30 rounded-xl p-6 border border-neon-purple/20 max-w-md mx-auto">
                  <h4 className="text-white font-semibold mb-4 flex items-center justify-center">
                    <Sparkles className="mr-2" size={18} />
                    Get Notified First
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Be among the first to experience Quickies when it launches!
                  </p>
                  <button 
                    onClick={() => setShowWaitlist(true)}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-orange text-white py-3 rounded-lg font-semibold hover:from-neon-purple/80 hover:to-neon-orange/80 transition-all transform hover:scale-105"
                  >
                    🔔 Notify Me
                  </button>
                </div>

                {/* Progress Indicator */}
                <div className="mt-8">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 mb-2">
                    <span>Development Progress</span>
                  </div>
                  <div className="w-full max-w-sm mx-auto bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-neon-purple to-neon-orange h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">75% Complete - Launch Expected Q1 2026</p>
                </div>
              </div>
            </div>

            {/* Preview Mockups */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white text-center">Sneak Peek</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: "Quick Gaming", category: "Gaming" },
                  { title: "Mini Cooking", category: "Food" },
                  { title: "Fast Fashion", category: "Style" },
                  { title: "Tech Tips", category: "Tech" }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg aspect-[9/16] flex flex-col items-center justify-center border border-gray-600 hover:border-neon-purple/50 transition-all">
                    <div className="text-3xl mb-2">📱</div>
                    <span className="text-white font-semibold text-sm text-center px-2">{item.title}</span>
                    <span className="text-gray-400 text-xs mt-1">{item.category}</span>
                    <div className="text-xs text-gray-500 mt-2">Coming Soon</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'profile':        );

      case 'quickies':
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-neon-orange via-neon-purple to-neon-green bg-clip-text text-transparent mb-4">
                ✨ Quickies
              </h2>
              <p className="text-xl text-gray-300 mb-2">
                Lightning-fast entertainment is coming soon!
              </p>
              <p className="text-gray-400 text-sm">
                Get ready for bite-sized content that packs a punch
              </p>
            </div>

            {/* Coming Soon Feature Card */}
            <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-8 border-2 border-neon-purple/30 relative overflow-hidden">
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 via-neon-orange/10 to-neon-green/10"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(199,51,255,0.1),transparent_50%)]"></div>
              
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6">🚀</div>
                <h3 className="text-3xl font-bold text-white mb-4">Coming Soon</h3>
                <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
                  We're crafting the perfect short-form video experience that will revolutionize how you consume content. 
                  Think TikTok meets earning rewards - but better!
                </p>
                
                {/* Feature Preview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                  <div className="bg-gradient-to-br from-neon-orange/20 to-neon-orange/10 rounded-xl p-6 border border-neon-orange/30">
                    <div className="text-3xl mb-3">⚡</div>
                    <h4 className="text-neon-orange font-bold mb-2">15-60 Second Videos</h4>
                    <p className="text-gray-400 text-sm">Quick, engaging content optimized for mobile viewing</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-purple/20 to-neon-purple/10 rounded-xl p-6 border border-neon-purple/30">
                    <div className="text-3xl mb-3">💰</div>
                    <h4 className="text-neon-purple font-bold mb-2">Enhanced Earning</h4>
                    <p className="text-gray-400 text-sm">Earn more ARACoins with our new quick-watch bonus system</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-green/20 to-neon-green/10 rounded-xl p-6 border border-neon-green/30">
                    <div className="text-3xl mb-3">🎨</div>
                    <h4 className="text-neon-green font-bold mb-2">Creative Tools</h4>
                    <p className="text-gray-400 text-sm">Easy-to-use video creation tools for all creators</p>
                  </div>
                </div>

                {/* Notification Signup */}
                <div className="bg-black/30 rounded-xl p-6 border border-neon-purple/20 max-w-md mx-auto">
                  <h4 className="text-white font-semibold mb-4 flex items-center justify-center">
                    <Sparkles className="mr-2" size={18} />
                    Get Notified First
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Be among the first to experience Quickies when it launches!
                  </p>
                  <button 
                    onClick={() => setShowWaitlist(true)}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-orange text-white py-3 rounded-lg font-semibold hover:from-neon-purple/80 hover:to-neon-orange/80 transition-all transform hover:scale-105"
                  >
                    🔔 Notify Me
                  </button>
                </div>

                {/* Progress Indicator */}
                <div className="mt-8">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 mb-2">
                    <span>Development Progress</span>
                  </div>
                  <div className="w-full max-w-sm mx-auto bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-neon-purple to-neon-orange h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">75% Complete - Launch Expected Q1 2026</p>
                </div>
              </div>
            </div>

            {/* Preview Mockups */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white text-center">Sneak Peek</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: "Quick Gaming", category: "Gaming" },
                  { title: "Mini Cooking", category: "Food" },
                  { title: "Fast Fashion", category: "Style" },
                  { title: "Tech Tips", category: "Tech" }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg aspect-[9/16] flex flex-col items-center justify-center border border-gray-600 hover:border-neon-purple/50 transition-all">
                    <div className="text-3xl mb-2">📱</div>
                    <span className="text-white font-semibold text-sm text-center px-2">{item.title}</span>
                    <span className="text-gray-400 text-xs mt-1">{item.category}</span>
                    <div className="text-xs text-gray-500 mt-2">Coming Soon</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'profile':        );

      case 'quickies':
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-neon-orange via-neon-purple to-neon-green bg-clip-text text-transparent mb-4">
                ✨ Quickies
              </h2>
              <p className="text-xl text-gray-300 mb-2">
                Lightning-fast entertainment is coming soon!
              </p>
              <p className="text-gray-400 text-sm">
                Get ready for bite-sized content that packs a punch
              </p>
            </div>

            {/* Coming Soon Feature Card */}
            <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-8 border-2 border-neon-purple/30 relative overflow-hidden">
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 via-neon-orange/10 to-neon-green/10"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(199,51,255,0.1),transparent_50%)]"></div>
              
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6">🚀</div>
                <h3 className="text-3xl font-bold text-white mb-4">Coming Soon</h3>
                <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
                  We're crafting the perfect short-form video experience that will revolutionize how you consume content. 
                  Think TikTok meets earning rewards - but better!
                </p>
                
                {/* Feature Preview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                  <div className="bg-gradient-to-br from-neon-orange/20 to-neon-orange/10 rounded-xl p-6 border border-neon-orange/30">
                    <div className="text-3xl mb-3">⚡</div>
                    <h4 className="text-neon-orange font-bold mb-2">15-60 Second Videos</h4>
                    <p className="text-gray-400 text-sm">Quick, engaging content optimized for mobile viewing</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-purple/20 to-neon-purple/10 rounded-xl p-6 border border-neon-purple/30">
                    <div className="text-3xl mb-3">💰</div>
                    <h4 className="text-neon-purple font-bold mb-2">Enhanced Earning</h4>
                    <p className="text-gray-400 text-sm">Earn more ARACoins with our new quick-watch bonus system</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-green/20 to-neon-green/10 rounded-xl p-6 border border-neon-green/30">
                    <div className="text-3xl mb-3">🎨</div>
                    <h4 className="text-neon-green font-bold mb-2">Creative Tools</h4>
                    <p className="text-gray-400 text-sm">Easy-to-use video creation tools for all creators</p>
                  </div>
                </div>

                {/* Notification Signup */}
                <div className="bg-black/30 rounded-xl p-6 border border-neon-purple/20 max-w-md mx-auto">
                  <h4 className="text-white font-semibold mb-4 flex items-center justify-center">
                    <Sparkles className="mr-2" size={18} />
                    Get Notified First
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Be among the first to experience Quickies when it launches!
                  </p>
                  <button 
                    onClick={() => setShowWaitlist(true)}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-orange text-white py-3 rounded-lg font-semibold hover:from-neon-purple/80 hover:to-neon-orange/80 transition-all transform hover:scale-105"
                  >
                    🔔 Notify Me
                  </button>
                </div>

                {/* Progress Indicator */}
                <div className="mt-8">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 mb-2">
                    <span>Development Progress</span>
                  </div>
                  <div className="w-full max-w-sm mx-auto bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-neon-purple to-neon-orange h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">75% Complete - Launch Expected Q1 2026</p>
                </div>
              </div>
            </div>

            {/* Preview Mockups */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white text-center">Sneak Peek</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: "Quick Gaming", category: "Gaming" },
                  { title: "Mini Cooking", category: "Food" },
                  { title: "Fast Fashion", category: "Style" },
                  { title: "Tech Tips", category: "Tech" }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg aspect-[9/16] flex flex-col items-center justify-center border border-gray-600 hover:border-neon-purple/50 transition-all">
                    <div className="text-3xl mb-2">📱</div>
                    <span className="text-white font-semibold text-sm text-center px-2">{item.title}</span>
                    <span className="text-gray-400 text-xs mt-1">{item.category}</span>
                    <div className="text-xs text-gray-500 mt-2">Coming Soon</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'profile':        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Profile</h2>
            
            {user && (
              <div className="bg-gray-800 rounded-lg p-6 border border-neon-orange/30">
                {/* Profile Header */}
                <div className="text-center mb-6">
                  <div className="relative inline-block mb-4">
                    <button
                      onClick={() => setShowProfilePicture(true)}
                      className="relative group"
                      title="Change Profile Picture"
                    >
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-neon-orange/50 hover:border-neon-purple/50 transition-all shadow-xl">
                        {getProfilePictureUrl() ? (
                          <img 
                            src={getProfilePictureUrl()} 
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-neon-green to-neon-purple flex items-center justify-center text-white font-bold text-2xl">
                            {getInitials(user?.username)}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-neon-orange text-white rounded-full w-8 h-8 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        📷
                      </div>
                    </button>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{user.username}</h3>
                  <p className="text-gray-400 text-sm">{user.email}</p>
                </div>

                {/* Profile Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-4 text-center border border-neon-orange/30">
                    <div className="text-2xl font-bold text-neon-orange">{user.tokens}</div>
                    <div className="text-gray-400 text-sm">Legacy Tokens</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 text-center border border-neon-green/30">
                    <div className="text-2xl font-bold text-neon-green">{Math.floor(user.total_watch_time / 60)}</div>
                    <div className="text-gray-400 text-sm">Minutes Watched</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 text-center border border-neon-purple/30">
                    <div className="text-2xl font-bold text-neon-purple">{wallet?.wallet?.balance?.toFixed(1) || '0.0'}</div>
                    <div className="text-gray-400 text-sm">ARACoins</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4 text-center border border-yellow-500/30">
                    <div className="text-2xl font-bold text-yellow-500">${wallet?.usd_balance?.toFixed(3) || '0.000'}</div>
                    <div className="text-gray-400 text-sm">USD Value</div>
                  </div>
                </div>
                
                {/* Profile Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-700 rounded-lg p-4 border border-neon-purple/30">
                    <h4 className="text-white font-semibold mb-3 flex items-center">
                      <span className="text-lg mr-2">🧠</span>
                      Neurodiversity Profile
                    </h4>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-neon-purple">{user.neurodiversity_class}</div>
                      <div className="text-gray-400 text-sm">Classification</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4 border border-neon-green/30">
                    <h4 className="text-white font-semibold mb-3 flex items-center">
                      <span className="text-lg mr-2">🎨</span>
                      Color Pulse Activity
                    </h4>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-neon-green">{wallet?.wallet?.color_pulse_count_today || 0}</div>
                      <div className="text-gray-400 text-sm">Today's Pulses</div>
                    </div>
                  </div>
                </div>

                {/* Profile Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <button
                    onClick={() => setShowProfilePicture(true)}
                    className="bg-gradient-to-r from-neon-orange to-neon-purple text-white py-3 rounded-lg font-semibold hover:from-neon-orange/80 hover:to-neon-purple/80 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>🖼️</span>
                    <span>Change Profile Picture</span>
                  </button>
                  <button
                    onClick={() => setShowWallet(true)}
                    className="bg-gradient-to-r from-neon-green to-neon-purple text-white py-3 rounded-lg font-semibold hover:from-neon-green/80 hover:to-neon-purple/80 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>💰</span>
                    <span>View ARACOIN Wallet</span>
                  </button>
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

      case 'quickies':
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-neon-orange via-neon-purple to-neon-green bg-clip-text text-transparent mb-4">
                ✨ Quickies
              </h2>
              <p className="text-xl text-gray-300 mb-2">
                Lightning-fast entertainment is coming soon!
              </p>
              <p className="text-gray-400 text-sm">
                Get ready for bite-sized content that packs a punch
              </p>
            </div>

            {/* Coming Soon Feature Card */}
            <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-8 border-2 border-neon-purple/30 relative overflow-hidden">
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 via-neon-orange/10 to-neon-green/10"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(199,51,255,0.1),transparent_50%)]"></div>
              
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6">🚀</div>
                <h3 className="text-3xl font-bold text-white mb-4">Coming Soon</h3>
                <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
                  We're crafting the perfect short-form video experience that will revolutionize how you consume content. 
                  Think TikTok meets earning rewards - but better!
                </p>
                
                {/* Feature Preview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                  <div className="bg-gradient-to-br from-neon-orange/20 to-neon-orange/10 rounded-xl p-6 border border-neon-orange/30">
                    <div className="text-3xl mb-3">⚡</div>
                    <h4 className="text-neon-orange font-bold mb-2">15-60 Second Videos</h4>
                    <p className="text-gray-400 text-sm">Quick, engaging content optimized for mobile viewing</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-purple/20 to-neon-purple/10 rounded-xl p-6 border border-neon-purple/30">
                    <div className="text-3xl mb-3">💰</div>
                    <h4 className="text-neon-purple font-bold mb-2">Enhanced Earning</h4>
                    <p className="text-gray-400 text-sm">Earn more ARACoins with our new quick-watch bonus system</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-green/20 to-neon-green/10 rounded-xl p-6 border border-neon-green/30">
                    <div className="text-3xl mb-3">🎨</div>
                    <h4 className="text-neon-green font-bold mb-2">Creative Tools</h4>
                    <p className="text-gray-400 text-sm">Easy-to-use video creation tools for all creators</p>
                  </div>
                </div>

                {/* Notification Signup */}
                <div className="bg-black/30 rounded-xl p-6 border border-neon-purple/20 max-w-md mx-auto">
                  <h4 className="text-white font-semibold mb-4 flex items-center justify-center">
                    <Sparkles className="mr-2" size={18} />
                    Get Notified First
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Be among the first to experience Quickies when it launches!
                  </p>
                  <button 
                    onClick={() => setShowWaitlist(true)}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-orange text-white py-3 rounded-lg font-semibold hover:from-neon-purple/80 hover:to-neon-orange/80 transition-all transform hover:scale-105"
                  >
                    🔔 Notify Me
                  </button>
                </div>

                {/* Progress Indicator */}
                <div className="mt-8">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 mb-2">
                    <span>Development Progress</span>
                  </div>
                  <div className="w-full max-w-sm mx-auto bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-neon-purple to-neon-orange h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">75% Complete - Launch Expected Q1 2026</p>
                </div>
              </div>
            </div>

            {/* Preview Mockups */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white text-center">Sneak Peek</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: "Quick Gaming", category: "Gaming" },
                  { title: "Mini Cooking", category: "Food" },
                  { title: "Fast Fashion", category: "Style" },
                  { title: "Tech Tips", category: "Tech" }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg aspect-[9/16] flex flex-col items-center justify-center border border-gray-600 hover:border-neon-purple/50 transition-all">
                    <div className="text-3xl mb-2">📱</div>
                    <span className="text-white font-semibold text-sm text-center px-2">{item.title}</span>
                    <span className="text-gray-400 text-xs mt-1">{item.category}</span>
                    <div className="text-xs text-gray-500 mt-2">Coming Soon</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'profile':        );

      case 'quickies':
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-neon-orange via-neon-purple to-neon-green bg-clip-text text-transparent mb-4">
                ✨ Quickies
              </h2>
              <p className="text-xl text-gray-300 mb-2">
                Lightning-fast entertainment is coming soon!
              </p>
              <p className="text-gray-400 text-sm">
                Get ready for bite-sized content that packs a punch
              </p>
            </div>

            {/* Coming Soon Feature Card */}
            <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl p-8 border-2 border-neon-purple/30 relative overflow-hidden">
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/10 via-neon-orange/10 to-neon-green/10"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(199,51,255,0.1),transparent_50%)]"></div>
              
              <div className="relative z-10 text-center">
                <div className="text-6xl mb-6">🚀</div>
                <h3 className="text-3xl font-bold text-white mb-4">Coming Soon</h3>
                <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
                  We're crafting the perfect short-form video experience that will revolutionize how you consume content. 
                  Think TikTok meets earning rewards - but better!
                </p>
                
                {/* Feature Preview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                  <div className="bg-gradient-to-br from-neon-orange/20 to-neon-orange/10 rounded-xl p-6 border border-neon-orange/30">
                    <div className="text-3xl mb-3">⚡</div>
                    <h4 className="text-neon-orange font-bold mb-2">15-60 Second Videos</h4>
                    <p className="text-gray-400 text-sm">Quick, engaging content optimized for mobile viewing</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-purple/20 to-neon-purple/10 rounded-xl p-6 border border-neon-purple/30">
                    <div className="text-3xl mb-3">💰</div>
                    <h4 className="text-neon-purple font-bold mb-2">Enhanced Earning</h4>
                    <p className="text-gray-400 text-sm">Earn more ARACoins with our new quick-watch bonus system</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-neon-green/20 to-neon-green/10 rounded-xl p-6 border border-neon-green/30">
                    <div className="text-3xl mb-3">🎨</div>
                    <h4 className="text-neon-green font-bold mb-2">Creative Tools</h4>
                    <p className="text-gray-400 text-sm">Easy-to-use video creation tools for all creators</p>
                  </div>
                </div>

                {/* Notification Signup */}
                <div className="bg-black/30 rounded-xl p-6 border border-neon-purple/20 max-w-md mx-auto">
                  <h4 className="text-white font-semibold mb-4 flex items-center justify-center">
                    <Sparkles className="mr-2" size={18} />
                    Get Notified First
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Be among the first to experience Quickies when it launches!
                  </p>
                  <button 
                    onClick={() => setShowWaitlist(true)}
                    className="w-full bg-gradient-to-r from-neon-purple to-neon-orange text-white py-3 rounded-lg font-semibold hover:from-neon-purple/80 hover:to-neon-orange/80 transition-all transform hover:scale-105"
                  >
                    🔔 Notify Me
                  </button>
                </div>

                {/* Progress Indicator */}
                <div className="mt-8">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 mb-2">
                    <span>Development Progress</span>
                  </div>
                  <div className="w-full max-w-sm mx-auto bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-neon-purple to-neon-orange h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">75% Complete - Launch Expected Q1 2026</p>
                </div>
              </div>
            </div>

            {/* Preview Mockups */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white text-center">Sneak Peek</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: "Quick Gaming", category: "Gaming" },
                  { title: "Mini Cooking", category: "Food" },
                  { title: "Fast Fashion", category: "Style" },
                  { title: "Tech Tips", category: "Tech" }
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg aspect-[9/16] flex flex-col items-center justify-center border border-gray-600 hover:border-neon-purple/50 transition-all">
                    <div className="text-3xl mb-2">📱</div>
                    <span className="text-white font-semibold text-sm text-center px-2">{item.title}</span>
                    <span className="text-gray-400 text-xs mt-1">{item.category}</span>
                    <div className="text-xs text-gray-500 mt-2">Coming Soon</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'profile':