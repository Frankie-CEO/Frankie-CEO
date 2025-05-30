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
  PhoneOff
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
  const [showSideAd, setShowSideAd] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isCreatorLive, setIsCreatorLive] = useState(false);
  const [localTracks, setLocalTracks] = useState({ video: null, audio: null });
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [agoraClient, setAgoraClient] = useState(null);
  const [creatorStats, setCreatorStats] = useState(null);
  
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const watchTimeRef = useRef(0);
  const intervalRef = useRef(null);  // Separate ref for interval
  const colorPulseIntervalRef = useRef(null);

  // Color options for Color Pulse
  const colorOptions = [
    { color: '#FF5733', name: 'Vibrant Orange' },
    { color: '#33FF57', name: 'Electric Green' },
    { color: '#C733FF', name: 'Neon Purple' }
  ];

  // Mood, memory, and context options
  const moodOptions = ['Happy', 'Excited', 'Calm', 'Focused', 'Creative'];
  const memoryOptions = ['Strong', 'Moderate', 'Weak', 'Nostalgic', 'Fresh'];
  const contextOptions = ['Work', 'Leisure', 'Learning', 'Social', 'Personal'];

  // Initialize app
  useEffect(() => {
    initializeApp();
    setupWebSocket();
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
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

  // Video playback functions
  const playVideo = (video) => {
    setCurrentVideo(video);
    setCurrentStream(null);
    setIsPlaying(true);
    watchTimeRef.current = 0;
    setWatchTime(0);
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
    // Show Color Pulse prompt every 30 seconds for testing (normally 9 minutes)
    colorPulseIntervalRef.current = setInterval(() => {
      if (isPlaying) {
        setShowColorPulse(true);
      }
    }, 30000); // 30 seconds for testing - change to 540000 for production
  };

  const submitColorPulse = async (color, mood, memory, context) => {
    try {
      await axios.post(`${BACKEND_URL}/api/color-pulse`, {
        user_id: USER_ID,
        video_id: currentVideo?.video_id || currentStream?.stream_id || 'unknown',
        color_choice: color,
        mood,
        memory,
        context,
        timestamp: new Date().toISOString()
      });
      
      setShowColorPulse(false);
      
      // Refresh user data
      const userResponse = await axios.get(`${BACKEND_URL}/api/user/${USER_ID}/profile`);
      setUser(userResponse.data.user);
      
    } catch (error) {
      console.error('Error submitting color pulse:', error);
    }
  };

  // Live streaming functions
  const initializeAgora = async () => {
    const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
    
    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
      }
      
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    });

    client.on('user-unpublished', (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    setAgoraClient(client);
    return client;
  };

  const startLiveStream = async () => {
    try {
      // Get Agora token
      const tokenResponse = await axios.post(`${BACKEND_URL}/api/agora/token`, {
        channel: `channel_${USER_ID}`,
        uid: parseInt(USER_ID.replace(/\D/g, '').slice(0, 8)) || 12345,
        role: 'publisher'
      });

      const client = await initializeAgora();
      
      // Join channel
      await client.join(AGORA_APP_ID, tokenResponse.data.channel, tokenResponse.data.token);
      
      // Create local tracks
      const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      
      setLocalTracks({ video: cameraTrack, audio: microphoneTrack });
      
      // Publish tracks
      await client.publish([microphoneTrack, cameraTrack]);
      
      // Start live stream session
      await axios.post(`${BACKEND_URL}/api/live-streams/start`, {
        creator_id: USER_ID,
        title: `${user?.username || 'Creator'}'s Live Stream`,
        channel: tokenResponse.data.channel
      });
      
      setIsCreatorLive(true);
      
    } catch (error) {
      console.error('Error starting live stream:', error);
    }
  };

  const endLiveStream = async () => {
    try {
      if (localTracks.video) localTracks.video.close();
      if (localTracks.audio) localTracks.audio.close();
      if (agoraClient) await agoraClient.leave();
      
      setLocalTracks({ video: null, audio: null });
      setIsCreatorLive(false);
      setRemoteUsers([]);
      
    } catch (error) {
      console.error('Error ending live stream:', error);
    }
  };

  const joinLiveStream = async (stream) => {
    try {
      // Get viewer token
      const tokenResponse = await axios.post(`${BACKEND_URL}/api/agora/token`, {
        channel: `channel_${stream.creator_id}`,
        uid: parseInt(USER_ID.replace(/\D/g, '').slice(0, 8)) || 12345,
        role: 'subscriber'
      });

      const client = await initializeAgora();
      await client.join(AGORA_APP_ID, tokenResponse.data.channel, tokenResponse.data.token);
      
      setCurrentStream(stream);
      setCurrentVideo(null);
      
    } catch (error) {
      console.error('Error joining live stream:', error);
    }
  };

  // Render components
  const renderVideoPlayer = () => {
    if (!currentVideo && !currentStream) return null;

    return (
      <div className="relative bg-black rounded-lg overflow-hidden">
        {currentVideo && (
          <video
            ref={videoRef}
            src={currentVideo.url}
            className="w-full h-64 object-cover"
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
        
        {currentStream && localTracks.video && (
          <div className="w-full h-64 bg-black flex items-center justify-center">
            <div ref={(ref) => {
              if (ref && localTracks.video) {
                localTracks.video.play(ref);
              }
            }} className="w-full h-full" />
          </div>
        )}
        
        {/* Video info overlay */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
          <h3 className="text-white font-bold text-lg">
            {currentVideo ? currentVideo.title : currentStream?.title}
          </h3>
          {user && (
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <Zap className="text-yellow-500" size={16} />
                <span className="text-yellow-500 font-semibold">{user.tokens} tokens</span>
              </div>
              <div className="text-neon-purple text-sm">
                {user.neurodiversity_class}
              </div>
            </div>
          )}
        </div>
        
        {/* Video controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <button
                onClick={isPlaying ? pauseVideo : () => playVideo(currentVideo)}
                className="p-2 rounded-full bg-neon-orange hover:bg-neon-orange/80 transition-colors"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <div className="flex items-center space-x-2">
                <Volume2 size={16} />
                <span className="text-sm">{Math.floor(watchTime / 60)}:{String(watchTime % 60).padStart(2, '0')}</span>
              </div>
            </div>
            
            {currentStream && (
              <div className="flex items-center space-x-2">
                <Eye size={16} />
                <span className="text-sm">{currentStream.viewer_count || 0}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderColorPulse = () => {
    if (!showColorPulse) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-neon-purple">
          <h3 className="text-xl font-bold text-white mb-4 text-center">Color Pulse</h3>
          <p className="text-gray-300 text-center mb-6">Choose a color that resonates with you right now:</p>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            {colorOptions.map((option) => (
              <button
                key={option.color}
                onClick={() => {
                  // Simple implementation - just submit the color
                  submitColorPulse(option.color, 'Happy', 'Strong', 'Leisure');
                }}
                className="p-4 rounded-lg border-2 border-transparent hover:border-white transition-all"
                style={{ backgroundColor: option.color }}
              >
                <div className="text-white font-semibold text-sm">{option.name}</div>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowColorPulse(false)}
            className="w-full py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Skip
          </button>
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
            
            <div className="flex justify-center">
              {!isCreatorLive ? (
                <button
                  onClick={startLiveStream}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 flex items-center space-x-2"
                >
                  <Camera size={24} />
                  <span>Go Live</span>
                </button>
              ) : (
                <button
                  onClick={endLiveStream}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-gray-700 hover:to-gray-800 transition-all flex items-center space-x-2"
                >
                  <PhoneOff size={24} />
                  <span>End Stream</span>
                </button>
              )}
            </div>
            
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