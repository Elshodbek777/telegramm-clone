import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getProfile } from '../api/profile.api';
import { searchUsers } from '../api/search.api';
import { getMyChats, createChat, getMessages, sendMessage, sendImage, sendVideo, sendVoice, sendFile, markMessagesAsRead } from '../api/chat.api';
import { logout as logoutApi } from '../api/auth.api';
import { useSocket } from '../hooks/useSocket';
import type { UserProfile } from '../api/profile.api';
import type { SearchUser } from '../api/search.api';
import type { Chat, Message } from '../api/chat.api';

export default function MainPage() {
  const { user, sessionToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState<string>(''); // For group typing indicator
  const [showMobileChat, setShowMobileChat] = useState(false); // For mobile view
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [sendingVideo, setSendingVideo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sendingFile, setSendingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Socket connection
  const { socket } = useSocket(sessionToken);

  // Load profile function
  const loadProfile = async () => {
    if (sessionToken) {
      try {
        const data = await getProfile(sessionToken);
        setProfile(data);
        // Also update auth store with latest profile data
        if (user) {
          useAuthStore.getState().setAuth({
            ...user,
            displayName: data.displayName,
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username,
            bio: data.bio,
          }, sessionToken);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    }
  };

  // Load chats function
  const loadChats = async () => {
    if (sessionToken) {
      setLoadingChats(true);
      try {
        const data = await getMyChats(sessionToken);
        setChats(data);
      } catch (error) {
        console.error('Failed to load chats:', error);
      } finally {
        setLoadingChats(false);
      }
    }
  };

  // Handle chat creation
  const handleStartChat = async (participantId: string) => {
    if (!sessionToken) return;
    
    try {
      console.log('Creating chat with participant:', participantId);
      const chat = await createChat(sessionToken, participantId);
      console.log('Chat created:', chat);
      setSearchQuery(''); // Clear search
      await loadChats(); // Reload chats
      setSelectedChat(chat); // Open the chat
      loadChatMessages(chat.chatId); // Load messages
    } catch (error: any) {
      console.error('Failed to create chat:', error);
      alert(`Failed to create chat: ${error.message}`);
    }
  };

  // Load chat messages
  const loadChatMessages = async (chatId: string) => {
    if (!sessionToken) return;
    
    setLoadingMessages(true);
    try {
      const data = await getMessages(sessionToken, chatId);
      setMessages(data);
      // Mark messages as read
      await markMessagesAsRead(sessionToken, chatId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Handle chat selection
  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setShowMobileChat(true); // Show chat on mobile
    loadChatMessages(chat.chatId);
    
    // Reset unread count for this chat immediately
    setChats((prevChats) =>
      prevChats.map((c) => {
        if (c.chatId === chat.chatId) {
          return { ...c, unreadCount: 0 };
        }
        return c;
      })
    );
  };

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedChat || !messageText.trim() || sending) return;

    // Stop typing indicator
    if (socket && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit('typing:stop', { chatId: selectedChat.chatId });
    }

    setSending(true);
    try {
      const message = await sendMessage(sessionToken, selectedChat.chatId, messageText);
      setMessages([...messages, message]);
      setMessageText('');
      await loadChats(); // Reload chats to update last message
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Handle media selection (image or video)
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (file.type.startsWith('image/')) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } 
    // Check if it's a video
    else if (file.type.startsWith('video/')) {
      // Validate file size (100MB)
      if (file.size > 100 * 1024 * 1024) {
        alert('Video size must be less than 100MB');
        return;
      }

      setSelectedVideo(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select an image or video file');
    }
  };

  // Handle send image
  const handleSendImage = async () => {
    if (!sessionToken || !selectedChat || !selectedImage || sendingImage) return;

    setSendingImage(true);
    try {
      const message = await sendImage(sessionToken, selectedChat.chatId, selectedImage);
      setMessages([...messages, message]);
      setSelectedImage(null);
      setImagePreview(null);
      await loadChats(); // Reload chats to update last message
    } catch (error) {
      console.error('Failed to send image:', error);
      alert('Failed to send image');
    } finally {
      setSendingImage(false);
    }
  };

  // Handle send video
  const handleSendVideo = async () => {
    if (!sessionToken || !selectedChat || !selectedVideo || sendingVideo) return;

    setSendingVideo(true);
    try {
      const message = await sendVideo(sessionToken, selectedChat.chatId, selectedVideo);
      setMessages([...messages, message]);
      setSelectedVideo(null);
      setVideoPreview(null);
      await loadChats(); // Reload chats to update last message
    } catch (error) {
      console.error('Failed to send video:', error);
      alert('Failed to send video');
    } finally {
      setSendingVideo(false);
    }
  };

  // Cancel media selection
  const handleCancelMedia = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedVideo(null);
    setVideoPreview(null);
    if (mediaInputRef.current) {
      mediaInputRef.current.value = '';
    }
  };

  // Handle emoji selection
  const handleEmojiClick = (emoji: string) => {
    setMessageText(messageText + emoji);
    setShowEmojiPicker(false);
  };

  // Handle voice recording
  const handleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setAudioChunks(chunks);
          setAudioPreview(audioUrl);
          
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Microphone access denied or not available');
      }
    }
  };

  // Handle send voice
  const handleSendVoice = async () => {
    if (!sessionToken || !selectedChat || !audioChunks.length || sendingVoice) return;

    setSendingVoice(true);
    try {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const message = await sendVoice(sessionToken, selectedChat.chatId, audioBlob);
      setMessages([...messages, message]);
      setAudioChunks([]);
      setAudioPreview(null);
      await loadChats(); // Reload chats to update last message
    } catch (error) {
      console.error('Failed to send voice:', error);
      alert('Failed to send voice message');
    } finally {
      setSendingVoice(false);
    }
  };

  // Cancel voice recording
  const handleCancelVoice = () => {
    setAudioChunks([]);
    setAudioPreview(null);
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    // Check file type
    const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|7z|tar|gz)$/i;
    if (!allowedTypes.test(file.name)) {
      alert('File type not allowed. Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR, 7Z, TAR, GZ');
      return;
    }

    setSelectedFile(file);
  };

  // Handle send file
  const handleSendFile = async () => {
    if (!sessionToken || !selectedChat || !selectedFile || sendingFile) return;

    setSendingFile(true);
    try {
      const message = await sendFile(sessionToken, selectedChat.chatId, selectedFile);
      setMessages([...messages, message]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadChats(); // Reload chats to update last message
    } catch (error) {
      console.error('Failed to send file:', error);
      alert('Failed to send file');
    } finally {
      setSendingFile(false);
    }
  };

  // Cancel file selection
  const handleCancelFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    if (['ppt', 'pptx'].includes(ext || '')) return '📽️';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return '🗜️';
    return '📎';
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on('message:new', (message: Message) => {
      // Only add if it's for the current chat
      if (selectedChat && message.chatId === selectedChat.chatId) {
        setMessages((prev) => [...prev, message]);
        
        // If message is from other user and chat is open, mark as read immediately
        if (message.senderId !== user?.userId && sessionToken) {
          markMessagesAsRead(sessionToken, message.chatId).catch((error) => {
            console.error('Failed to mark message as read:', error);
          });
        }
      } else {
        // Message is for a different chat - update unread count
        if (message.senderId !== user?.userId) {
          setChats((prevChats) => {
            const updatedChats = prevChats.map((chat) => {
              if (chat.chatId === message.chatId) {
                return {
                  ...chat,
                  unreadCount: (chat.unreadCount || 0) + 1,
                  lastMessage: {
                    text: message.text || (message.messageType === 'image' ? '📷 Photo' : message.messageType === 'video' ? '🎥 Video' : message.messageType === 'voice' ? '🎤 Voice' : message.messageType === 'file' ? `📎 ${message.fileName}` : ''),
                    timestamp: message.timestamp,
                  },
                  updatedAt: message.timestamp,
                };
              }
              return chat;
            });
            // Sort by updatedAt (newest first)
            return updatedChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          });
        }
      }
    });

    // Listen for user status changes (only for private chats)
    socket.on('user:status', ({ userId, isOnline, lastSeen }) => {
      // Update chat list
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.type === 'private' && chat.participant?.userId === userId && chat.participant) {
            return {
              ...chat,
              participant: {
                userId: chat.participant.userId,
                displayName: chat.participant.displayName,
                firstName: chat.participant.firstName,
                lastName: chat.participant.lastName,
                username: chat.participant.username,
                profilePhotoUrl: chat.participant.profilePhotoUrl,
                bio: chat.participant.bio,
                isOnline,
                lastSeen,
              },
            };
          }
          return chat;
        })
      );

      // Update selected chat if it's the same user
      if (selectedChat && selectedChat.type === 'private' && selectedChat.participant?.userId === userId && selectedChat.participant) {
        setSelectedChat({
          ...selectedChat,
          participant: {
            userId: selectedChat.participant.userId,
            displayName: selectedChat.participant.displayName,
            firstName: selectedChat.participant.firstName,
            lastName: selectedChat.participant.lastName,
            username: selectedChat.participant.username,
            profilePhotoUrl: selectedChat.participant.profilePhotoUrl,
            bio: selectedChat.participant.bio,
            isOnline,
            lastSeen,
          },
        });
      }
    });

    // Listen for typing events
    socket.on('typing:start', ({ chatId, userId, userName }) => {
      if (selectedChat && chatId === selectedChat.chatId) {
        if (selectedChat.type === 'private' && userId === selectedChat.participant?.userId) {
          setIsTyping(true);
        } else if (selectedChat.type === 'group' && userId !== user?.userId) {
          setTypingUserName(userName || 'Someone');
          setIsTyping(true);
        }
      }
    });

    socket.on('typing:stop', ({ chatId, userId }) => {
      if (selectedChat && chatId === selectedChat.chatId) {
        if (selectedChat.type === 'private' && userId === selectedChat.participant?.userId) {
          setIsTyping(false);
        } else if (selectedChat.type === 'group' && userId !== user?.userId) {
          setIsTyping(false);
          setTypingUserName('');
        }
      }
    });

    // Listen for message read events
    socket.on('message:read', ({ messageId, chatId }) => {
      // Update message in current chat
      if (selectedChat && chatId === selectedChat.chatId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.messageId === messageId ? { ...msg, isRead: true } : msg
          )
        );
      }
    });

    // Listen for unread count reset events
    socket.on('unread:reset', ({ chatId }) => {
      // Reset unread count for this chat
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.chatId === chatId) {
            return { ...chat, unreadCount: 0 };
          }
          return chat;
        })
      );
    });

    return () => {
      socket.off('message:new');
      socket.off('user:status');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('message:read');
      socket.off('unread:reset');
    };
  }, [socket, selectedChat]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket || !selectedChat) return;

    // Emit typing start
    socket.emit('typing:start', { chatId: selectedChat.chatId });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to emit typing stop after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { chatId: selectedChat.chatId });
    }, 2000);
  };

  useEffect(() => {
    loadProfile();
    loadChats();
  }, [sessionToken]);

  // Reload profile when menu opens
  useEffect(() => {
    if (showMenu && sessionToken) {
      loadProfile();
    }
  }, [showMenu]);

  useEffect(() => {
    const performSearch = async () => {
      if (!sessionToken || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const results = await searchUsers(sessionToken, searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, sessionToken]);

  const getInitials = (displayName: string, firstName?: string, lastName?: string) => {
    const first = firstName || displayName || '';
    const last = lastName || '';
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    } else if (first) {
      return first.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Format date for message separator
  const formatMessageDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    messageDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const dateStr = new Date(date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric'
    });
    
    if (diffDays === 0) {
      return `Today, ${dateStr}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${dateStr}`;
    } else if (diffDays < 7) {
      const weekday = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      return `${weekday}, ${dateStr}`;
    } else {
      return new Date(date).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  };

  // Check if we need to show date separator
  const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.timestamp);
    const previousDate = new Date(previousMessage.timestamp);
    
    currentDate.setHours(0, 0, 0, 0);
    previousDate.setHours(0, 0, 0, 0);
    
    return currentDate.getTime() !== previousDate.getTime();
  };

  // Format last seen time
  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'last seen just now';
    } else if (diffMins < 60) {
      return `last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return `last seen yesterday at ${lastSeenDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } else if (diffDays < 7) {
      const weekday = lastSeenDate.toLocaleDateString('en-US', { weekday: 'long' });
      return `last seen ${weekday} at ${lastSeenDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } else {
      return `last seen ${lastSeenDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} at ${lastSeenDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar - Hidden on mobile when chat is open */}
      <div className={`${showMobileChat ? 'hidden' : 'flex'} md:flex w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute left-0 top-12 w-64 bg-gray-800 text-white rounded-lg shadow-xl z-50 overflow-hidden">
                  {/* Profile Header */}
                  <div className="px-4 py-4 bg-gray-900 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-telegram-blue flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                        {profile?.profilePhotoUrl || user?.profilePhotoUrl ? (
                          <img 
                            src={profile?.profilePhotoUrl || user?.profilePhotoUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          user?.displayName?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-white truncate">
                          {profile?.displayName || user?.displayName || 'User'}
                        </p>
                        {(profile?.firstName || profile?.lastName) && (
                          <p className="text-xs text-gray-400 truncate">
                            {[profile?.firstName, profile?.lastName].filter(Boolean).join(' ')}
                          </p>
                        )}
                        {profile?.username && (
                          <p className="text-xs text-gray-400 truncate">@{profile.username}</p>
                        )}
                        {profile?.bio && (
                          <p className="text-xs text-gray-500 truncate mt-0.5 italic">{profile.bio}</p>
                        )}
                        <p className="text-xs text-gray-600 truncate mt-1">{profile?.phoneNumber || user?.phoneNumber || ''}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/profile');
                    }}
                    className="w-full px-4 py-3 hover:bg-gray-700 transition-colors flex items-center gap-3 text-left"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-lg">My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/new-group');
                    }}
                    className="w-full px-4 py-3 hover:bg-gray-700 transition-colors flex items-center gap-3 text-left"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-lg">New Group</span>
                  </button>

                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 hover:bg-gray-700 transition-colors flex items-center gap-3 text-left"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="text-lg">Notifications</span>
                  </button>

                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 hover:bg-gray-700 transition-colors flex items-center gap-3 text-left"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span className="text-lg">Dark Mode</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/settings');
                    }}
                    className="w-full px-4 py-3 hover:bg-gray-700 transition-colors flex items-center gap-3 text-left"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-lg">Settings</span>
                  </button>

                  <button
                    onClick={async () => {
                      setShowMenu(false);
                      try {
                        if (sessionToken) {
                          await logoutApi(sessionToken);
                        }
                      } catch (error) {
                        console.error('Logout error:', error);
                      } finally {
                        logout();
                      }
                    }}
                    className="w-full px-4 py-3 hover:bg-red-600 transition-colors flex items-center gap-3 text-left text-red-400 hover:text-white border-t border-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-lg font-semibold">Log Out</span>
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button 
                onClick={() => navigate('/profile')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-blue"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searching && (
              <div className="absolute right-3 top-2.5">
                <div className="w-5 h-5 border-2 border-telegram-blue border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {/* Chat List / Search Results */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.length >= 2 ? (
            // Search Results
            searchResults.length > 0 ? (
              <div>
                {searchResults.map((searchUser) => (
                  <button
                    key={searchUser.userId}
                    onClick={() => handleStartChat(searchUser.userId)}
                    className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100"
                  >
                    <div className="relative w-12 h-12 rounded-full bg-telegram-blue flex items-center justify-center text-white font-bold flex-shrink-0">
                      {searchUser.profilePhotoUrl ? (
                        <img 
                          src={searchUser.profilePhotoUrl} 
                          alt={searchUser.displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(searchUser.displayName, searchUser.firstName, searchUser.lastName)
                      )}
                      {/* Online status indicator */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="font-semibold text-gray-900 truncate">{searchUser.displayName}</p>
                      {searchUser.username && (
                        <p className="text-sm text-gray-500 truncate">@{searchUser.username}</p>
                      )}
                      {searchUser.bio && (
                        <p className="text-xs text-gray-400 truncate">{searchUser.bio}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <p className="text-gray-500">No users found</p>
              </div>
            )
          ) : (
            // Chat List
            loadingChats ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-telegram-blue"></div>
              </div>
            ) : chats.length > 0 ? (
              <div>
                {chats.map((chat) => (
                  <button
                    key={chat.chatId}
                    onClick={() => handleSelectChat(chat)}
                    className={`w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 ${
                      selectedChat?.chatId === chat.chatId ? 'bg-telegram-blue-light' : ''
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-full bg-telegram-blue flex items-center justify-center text-white font-bold flex-shrink-0">
                      {chat.type === 'group' ? (
                        // Group avatar
                        chat.groupPhotoUrl ? (
                          <img 
                            src={chat.groupPhotoUrl} 
                            alt={chat.groupName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                          </svg>
                        )
                      ) : (
                        // Private chat avatar
                        <>
                          {chat.participant?.profilePhotoUrl ? (
                            <img 
                              src={chat.participant.profilePhotoUrl} 
                              alt={chat.participant.displayName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            getInitials(chat.participant?.displayName || '', chat.participant?.firstName, chat.participant?.lastName)
                          )}
                          {/* Online status indicator - only for private chats */}
                          {chat.participant?.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900 truncate">
                          {chat.type === 'group' ? chat.groupName : chat.participant?.displayName}
                        </p>
                        <div className="flex items-center gap-2">
                          {chat.lastMessage && (
                            <span className="text-xs text-gray-400">
                              {new Date(chat.lastMessage.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                          )}
                          {chat.unreadCount && chat.unreadCount > 0 && (
                            <span className="min-w-[20px] h-5 px-1.5 bg-telegram-blue text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      {chat.lastMessage ? (
                        <p className="text-sm text-gray-500 truncate">{chat.lastMessage.text}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No messages yet</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              // Empty State
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No chats yet</h3>
                <p className="text-sm text-gray-500">
                  Start messaging by searching for contacts
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Main Content - Show on desktop always, on mobile only when chat is selected */}
      <div className={`${!showMobileChat && selectedChat ? 'hidden' : 'flex'} md:flex flex-1 flex-col`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Back button for mobile */}
                <button
                  onClick={() => {
                    setSelectedChat(null);
                    setShowMobileChat(false);
                  }}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="relative w-10 h-10 rounded-full bg-telegram-blue flex items-center justify-center text-white font-bold">
                  {selectedChat.type === 'group' ? (
                    // Group avatar
                    selectedChat.groupPhotoUrl ? (
                      <img 
                        src={selectedChat.groupPhotoUrl} 
                        alt={selectedChat.groupName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                    )
                  ) : (
                    // Private chat avatar
                    <>
                      {selectedChat.participant?.profilePhotoUrl ? (
                        <img 
                          src={selectedChat.participant.profilePhotoUrl} 
                          alt={selectedChat.participant.displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(selectedChat.participant?.displayName || '', selectedChat.participant?.firstName, selectedChat.participant?.lastName)
                      )}
                      {selectedChat.participant?.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm md:text-base">
                    {selectedChat.type === 'group' ? selectedChat.groupName : selectedChat.participant?.displayName}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-500">
                    {selectedChat.type === 'group' ? (
                      // Group info - show typing or member count
                      isTyping && typingUserName ? (
                        <span className="flex items-center gap-1 text-telegram-blue">
                          <span>{typingUserName} is typing</span>
                          <span className="flex gap-0.5">
                            <span className="w-1 h-1 bg-telegram-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1 h-1 bg-telegram-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1 h-1 bg-telegram-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </span>
                        </span>
                      ) : (
                        <span>{selectedChat.memberCount} members</span>
                      )
                    ) : (
                      // Private chat status
                      isTyping ? (
                        <span className="flex items-center gap-1">
                          <span>typing</span>
                          <span className="flex gap-0.5">
                            <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </span>
                        </span>
                      ) : selectedChat.participant?.isOnline ? (
                        <span className="text-telegram-blue font-medium">online</span>
                      ) : (
                        <span>{formatLastSeen(selectedChat.participant?.lastSeen || new Date())}</span>
                      )
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedChat(null);
                  setShowMobileChat(false);
                }}
                className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-3 md:p-6">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-telegram-blue"></div>
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isMine = message.senderId === user?.userId;
                    const previousMessage = index > 0 ? messages[index - 1] : undefined;
                    const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
                    
                    return (
                      <div key={message.messageId}>
                        {/* Date Separator */}
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                              {formatMessageDate(message.timestamp)}
                            </div>
                          </div>
                        )}
                        
                        {/* Message */}
                        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-md ${(message.messageType === 'image' || message.messageType === 'video') ? 'p-1' : (message.messageType === 'voice' ? 'px-2 py-2' : 'px-4 py-2')} rounded-2xl ${
                              isMine
                                ? 'bg-telegram-blue text-white rounded-br-none'
                                : 'bg-white text-gray-900 rounded-bl-none'
                            }`}
                          >
                            {/* Image message */}
                            {message.messageType === 'image' && message.imageUrl && (
                              <img 
                                src={message.imageUrl} 
                                alt="Sent image" 
                                className="max-w-full rounded-xl cursor-pointer hover:opacity-90"
                                onClick={() => window.open(message.imageUrl, '_blank')}
                              />
                            )}

                            {/* Video message */}
                            {message.messageType === 'video' && message.videoUrl && (
                              <video 
                                src={message.videoUrl} 
                                controls
                                className="max-w-full rounded-xl"
                                style={{ maxHeight: '400px' }}
                              />
                            )}

                            {/* Voice message */}
                            {message.messageType === 'voice' && message.voiceUrl && (
                              <div className="flex items-center gap-2 min-w-[200px]">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMine ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                  <svg className={`w-5 h-5 ${isMine ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                  </svg>
                                </div>
                                <audio 
                                  src={message.voiceUrl} 
                                  controls
                                  className="flex-1"
                                  style={{ height: '32px' }}
                                />
                              </div>
                            )}

                            {/* File message */}
                            {message.messageType === 'file' && message.fileUrl && (
                              <div className={`flex items-center gap-3 min-w-[250px] p-2 rounded-lg ${isMine ? 'bg-blue-600' : 'bg-gray-100'}`}>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl ${isMine ? 'bg-blue-700' : 'bg-white'}`}>
                                  {getFileIcon(message.fileName || '')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${isMine ? 'text-white' : 'text-gray-900'}`}>
                                    {message.fileName}
                                  </p>
                                  <p className={`text-xs ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                                    {formatFileSize(message.fileSize || 0)}
                                  </p>
                                </div>
                                <a
                                  href={message.fileUrl}
                                  download={message.fileName}
                                  className={`p-2 rounded-lg transition-colors ${isMine ? 'hover:bg-blue-700' : 'hover:bg-gray-200'}`}
                                  title="Download"
                                >
                                  <svg className={`w-5 h-5 ${isMine ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </a>
                              </div>
                            )}
                            
                            {/* Text message */}
                            {message.messageType !== 'image' && message.messageType !== 'video' && message.messageType !== 'voice' && message.messageType !== 'file' && message.text && (
                              <p className="break-words">{message.text}</p>
                            )}
                            
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-blue-100' : 'text-gray-400'} ${(message.messageType === 'image' || message.messageType === 'video' || message.messageType === 'voice') ? 'px-2 pb-1' : ''}`}>
                              <span className="text-xs">
                                {new Date(message.timestamp).toLocaleTimeString('en-GB', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: false
                                })}
                              </span>
                              {isMine && (
                                <span className="text-xs">
                                  {message.isRead ? (
                                    // Double check mark for read messages
                                    <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M0.41,13.41L6,19L7.41,17.58L1.83,12M22.24,5.58L11.66,16.17L7.5,12L6.07,13.41L11.66,19L23.66,7M18,7L16.59,5.58L10.24,11.93L11.66,13.34L18,7Z" />
                                    </svg>
                                  ) : (
                                    // Single check mark for sent but not read
                                    <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                    </svg>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-3 md:p-4">
              {/* Audio Preview */}
              {audioPreview && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <audio 
                      src={audioPreview} 
                      controls
                      className="flex-1"
                    />
                    <button
                      onClick={handleCancelVoice}
                      className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    onClick={handleSendVoice}
                    disabled={sendingVoice}
                    className="mt-2 w-full bg-telegram-blue text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {sendingVoice ? 'Sending...' : 'Send Voice'}
                  </button>
                </div>
              )}

              {/* File Preview */}
              {selectedFile && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-telegram-blue rounded-lg flex items-center justify-center text-2xl">
                      {getFileIcon(selectedFile.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      onClick={handleCancelFile}
                      className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    onClick={handleSendFile}
                    disabled={sendingFile}
                    className="mt-2 w-full bg-telegram-blue text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {sendingFile ? 'Sending...' : 'Send File'}
                  </button>
                </div>
              )}

              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-w-xs max-h-40 rounded-lg"
                  />
                  <button
                    onClick={handleCancelMedia}
                    className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70"
                  >
                    ×
                  </button>
                  <button
                    onClick={handleSendImage}
                    disabled={sendingImage}
                    className="mt-2 w-full bg-telegram-blue text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {sendingImage ? 'Sending...' : 'Send Image'}
                  </button>
                </div>
              )}

              {/* Video Preview */}
              {videoPreview && (
                <div className="mb-3 relative inline-block">
                  <video 
                    src={videoPreview} 
                    controls
                    className="max-w-xs max-h-40 rounded-lg"
                  />
                  <button
                    onClick={handleCancelMedia}
                    className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70"
                  >
                    ×
                  </button>
                  <button
                    onClick={handleSendVideo}
                    disabled={sendingVideo}
                    className="mt-2 w-full bg-telegram-blue text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {sendingVideo ? 'Sending...' : 'Send Video'}
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-3">
                {/* Emoji button with picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-10 h-10 text-gray-600 hover:text-telegram-blue rounded-full flex items-center justify-center transition-colors"
                    title="Emoji"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  {/* Enhanced Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 w-80 max-h-96 overflow-hidden">
                      {/* Search bar */}
                      <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Qidiruv"
                            className="w-full pl-9 pr-3 py-2 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-telegram-blue border border-gray-200"
                          />
                          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>

                      {/* Emoji grid */}
                      <div className="p-3 overflow-y-auto max-h-80">
                        {/* Smileys & Emotion */}
                        <div className="mb-4">
                          <h3 className="text-xs font-semibold text-gray-500 mb-2 px-1">Smileys & Emotion</h3>
                          <div className="grid grid-cols-8 gap-1">
                            {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleEmojiClick(emoji)}
                                className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Hearts & Symbols */}
                        <div className="mb-4">
                          <h3 className="text-xs font-semibold text-gray-500 mb-2 px-1">Hearts & Symbols</h3>
                          <div className="grid grid-cols-8 gap-1">
                            {['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleEmojiClick(emoji)}
                                className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Gestures */}
                        <div className="mb-4">
                          <h3 className="text-xs font-semibold text-gray-500 mb-2 px-1">Gestures</h3>
                          <div className="grid grid-cols-8 gap-1">
                            {['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleEmojiClick(emoji)}
                                className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Objects & Symbols */}
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 mb-2 px-1">Objects & Symbols</h3>
                          <div className="grid grid-cols-8 gap-1">
                            {['🔥', '✨', '💫', '⭐', '🌟', '💥', '💢', '💦', '💨', '🕊️', '🦋', '🐝', '🌸', '💐', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🎮', '🎯', '🎲', '🎰', '🎳', '🎵', '🎶', '🎤', '🎧', '📻', '🎷', '🎸', '🎹', '🎺', '🎻', '🥁', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '📷', '📸', '📹', '🎥', '📽️', '🎬', '📺', '📡'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleEmojiClick(emoji)}
                                className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice message button */}
                <button
                  type="button"
                  onClick={handleVoiceRecord}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'text-gray-600 hover:text-telegram-blue'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Voice Message'}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                {/* Media picker button (image or video) */}
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className="w-10 h-10 text-gray-600 hover:text-telegram-blue rounded-full flex items-center justify-center transition-colors"
                  title="Photo or Video"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                {/* File picker button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.tar,.gz"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 text-gray-600 hover:text-telegram-blue rounded-full flex items-center justify-center transition-colors"
                  title="Send File"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-telegram-blue disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="w-12 h-12 bg-telegram-blue text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          // Welcome Screen
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-telegram-blue-light to-telegram-blue">
            <div className="text-center text-white p-8">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-white bg-opacity-20 rounded-full mb-6">
                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </div>
              <h1 className="text-4xl font-bold mb-4">Welcome, {user?.displayName || 'User'}!</h1>
              <p className="text-xl mb-8 opacity-90">
                Select a chat to start messaging
              </p>
              <div className="space-y-2 text-sm opacity-75">
                <p>📱 Phone: {user?.phoneNumber}</p>
                <p>🆔 User ID: {user?.userId?.slice(0, 8)}...</p>
              </div>
              <button
                onClick={logout}
                className="mt-8 px-6 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
