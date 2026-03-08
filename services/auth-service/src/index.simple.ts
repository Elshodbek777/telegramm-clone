import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 4000;

// File-based persistence
const DATA_FILE = path.join(__dirname, '../../data.json');

// Load data from file
const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      // Convert arrays back to Maps
      if (data.users) {
        data.users.forEach((user: any) => users.set(user.userId, user));
      }
      if (data.chats) {
        data.chats.forEach((chat: any) => chats.set(chat.chatId, chat));
      }
      if (data.groups) {
        data.groups.forEach((group: any) => groups.set(group.groupId, group));
      }
      if (data.messages) {
        data.messages.forEach((msg: any) => messages.set(msg.messageId, msg));
      }
      console.log(`✅ Loaded ${users.size} users, ${chats.size} chats, ${groups.size} groups, ${messages.size} messages from file`);
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
};

// Save data to file
const saveData = () => {
  try {
    const data = {
      users: Array.from(users.values()),
      chats: Array.from(chats.values()),
      groups: Array.from(groups.values()),
      messages: Array.from(messages.values()),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
};

// In-memory storage
const verificationSessions = new Map();
const users = new Map();
const chats = new Map(); // chatId -> { chatId, participants: [userId1, userId2], createdAt, updatedAt, lastMessage }
const groups = new Map(); // groupId -> { groupId, name, description, photoUrl, createdBy, admins: [userId], members: [userId], createdAt, updatedAt, lastMessage }
const messages = new Map(); // messageId -> { messageId, chatId, senderId, text, timestamp, isRead }
const userSockets = new Map(); // userId -> socketId mapping
const typingUsers = new Map(); // chatId -> Set of userIds currently typing

// Load data on startup
loadData();

// Create demo users for testing (only if no users exist)
const createDemoUsers = () => {
  if (users.size > 0) {
    console.log('✅ Users already exist, skipping demo user creation');
    return;
  }
  
  const demoUsers = [
    {
      userId: 'demo-user-1',
      phoneNumber: '+998901234567',
      displayName: 'Elshod Yusupov',
      firstName: 'Elshod',
      lastName: 'Yusupov',
      username: 'elshod',
      bio: 'Software Developer',
      profilePhotoUrl: '',
      isOnline: true,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        theme: 'light',
        notifications: {
          messageNotifications: true,
          soundEnabled: true,
          desktopNotifications: true,
        },
        privacy: {
          lastSeenVisibility: 'everyone',
          profilePhotoVisibility: 'everyone',
          readReceipts: true,
        },
      },
    },
    {
      userId: 'demo-user-2',
      phoneNumber: '+998901234568',
      displayName: 'Aziza Karimova',
      firstName: 'Aziza',
      lastName: 'Karimova',
      username: 'aziza',
      bio: 'Designer',
      profilePhotoUrl: '',
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        theme: 'light',
        notifications: {
          messageNotifications: true,
          soundEnabled: true,
          desktopNotifications: true,
        },
        privacy: {
          lastSeenVisibility: 'everyone',
          profilePhotoVisibility: 'everyone',
          readReceipts: true,
        },
      },
    },
    {
      userId: 'demo-user-3',
      phoneNumber: '+998901234569',
      displayName: 'Bobur Aliyev',
      firstName: 'Bobur',
      lastName: 'Aliyev',
      username: 'bobur',
      bio: 'Product Manager',
      profilePhotoUrl: '',
      isOnline: true,
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        theme: 'light',
        notifications: {
          messageNotifications: true,
          soundEnabled: true,
          desktopNotifications: true,
        },
        privacy: {
          lastSeenVisibility: 'everyone',
          profilePhotoVisibility: 'everyone',
          readReceipts: true,
        },
      },
    },
  ];

  demoUsers.forEach(user => {
    users.set(user.userId, user);
  });

  console.log('✅ Created 3 demo users for testing');
};

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for images
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Separate multer config for videos (larger size limit)
const videoUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('video/');
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Multer config for audio files
const audioUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for audio
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|ogg|webm|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('audio/');
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Multer config for general files (documents, archives, etc.)
const fileUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for files
  fileFilter: (req, file, cb) => {
    // Allow common document and archive types
    const allowedTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|7z|tar|gz/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Middleware
app.use(cors({ origin: '*' })); // Barcha originlardan ruxsat
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Auth middleware
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'No token provided', timestamp: Date.now() }
    });
  }

  const token = authHeader.substring(7);
  try {
    const decoded: any = jwt.verify(token, 'telegram-clone-secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid token', timestamp: Date.now() }
    });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: 'simple' });
});

// Register endpoint
app.post('/api/v1/auth/register', (req, res) => {
  try {
    const { phoneNumber, deviceId } = req.body;
    
    if (!phoneNumber || !phoneNumber.startsWith('+998')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PHONE',
          message: 'Invalid phone number format',
          timestamp: Date.now(),
        }
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationId = uuidv4();
    const expiresAt = Date.now() + 300000;

    verificationSessions.set(verificationId, {
      phoneNumber,
      code,
      expiresAt,
      attempts: 0,
    });

    console.log(`\n📱 SMS to ${phoneNumber}: Your verification code is ${code}\n`);

    res.json({ verificationId, expiresAt });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to send verification code',
        timestamp: Date.now(),
      }
    });
  }
});

// Verify endpoint
app.post('/api/v1/auth/verify', (req, res) => {
  try {
    const { verificationId, code, deviceId } = req.body;

    const session = verificationSessions.get(verificationId);
    if (!session) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CODE',
          message: 'Verification code expired or invalid',
          timestamp: Date.now(),
        }
      });
    }

    if (Date.now() > session.expiresAt) {
      verificationSessions.delete(verificationId);
      return res.status(401).json({
        error: {
          code: 'EXPIRED_CODE',
          message: 'Verification code expired',
          timestamp: Date.now(),
        }
      });
    }

    if (session.code !== code) {
      session.attempts++;
      if (session.attempts >= 3) {
        verificationSessions.delete(verificationId);
        return res.status(429).json({
          error: {
            code: 'MAX_ATTEMPTS',
            message: 'Maximum attempts exceeded',
            timestamp: Date.now(),
          }
        });
      }
      return res.status(401).json({
        error: {
          code: 'WRONG_CODE',
          message: `Invalid code. ${3 - session.attempts} attempts remaining`,
          timestamp: Date.now(),
        }
      });
    }

    verificationSessions.delete(verificationId);

    let user = Array.from(users.values()).find(u => u.phoneNumber === session.phoneNumber);
    let isNewUser = false;

    if (!user) {
      const userId = uuidv4();
      user = {
        userId,
        phoneNumber: session.phoneNumber,
        displayName: '',
        firstName: '',
        lastName: '',
        username: '',
        bio: '',
        profilePhotoUrl: '',
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          theme: 'light',
          notifications: {
            messageNotifications: true,
            soundEnabled: true,
            desktopNotifications: true,
          },
          privacy: {
            lastSeenVisibility: 'everyone',
            profilePhotoVisibility: 'everyone',
            readReceipts: true,
          },
        },
      };
      users.set(userId, user);
      isNewUser = true;
      saveData(); // Save to file
    } else {
      // Set user online on login
      user.isOnline = true;
      user.lastSeen = new Date();
      users.set(user.userId, user);
      saveData(); // Save to file
    }

    const sessionToken = jwt.sign(
      { userId: user.userId },
      'telegram-clone-secret',
      { expiresIn: '30d' }
    );

    res.json({
      userId: user.userId,
      sessionToken,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      isNewUser,
      user,
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Verification failed',
        timestamp: Date.now(),
      }
    });
  }
});

// POST /api/v1/auth/logout - Logout user
app.post('/api/v1/auth/logout', authenticate, (req: any, res) => {
  try {
    const user = users.get(req.userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      users.set(req.userId, user);
      saveData(); // Save to file
      console.log(`👋 User ${user.phoneNumber} logged out`);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Logout failed', timestamp: Date.now() }
    });
  }
});

// GET /api/v1/users/me - Get current user profile
app.get('/api/v1/users/me', authenticate, (req: any, res) => {
  try {
    const user = users.get(req.userId);
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', timestamp: Date.now() }
      });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to get profile', timestamp: Date.now() }
    });
  }
});

// PUT /api/v1/users/me/update - Update user profile
app.put('/api/v1/users/me/update', authenticate, (req: any, res) => {
  try {
    const user = users.get(req.userId);
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', timestamp: Date.now() }
      });
    }

    const { displayName, firstName, lastName, username, bio } = req.body;

    if (displayName !== undefined) {
      if (displayName.length < 1 || displayName.length > 64) {
        return res.status(400).json({
          error: { code: 'INVALID_NAME', message: 'Name must be 1-64 characters', timestamp: Date.now() }
        });
      }
      user.displayName = displayName;
    }

    if (firstName !== undefined) user.firstName = firstName.slice(0, 64);
    if (lastName !== undefined) user.lastName = lastName.slice(0, 64);
    if (username !== undefined) user.username = username.slice(0, 32);
    if (bio !== undefined) user.bio = bio.slice(0, 140);

    user.updatedAt = new Date();
    users.set(req.userId, user);
    saveData(); // Save to file

    console.log(`✏️ User ${user.phoneNumber} updated profile`);

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to update profile', timestamp: Date.now() }
    });
  }
});

// PUT /api/v1/users/me/photo - Upload profile photo
app.put('/api/v1/users/me/photo', authenticate, upload.single('photo'), (req: any, res) => {
  try {
    const user = users.get(req.userId);
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', timestamp: Date.now() }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'NO_FILE', message: 'No file uploaded', timestamp: Date.now() }
      });
    }

    user.profilePhotoUrl = `http://localhost:4000/uploads/${req.file.filename}`;
    user.updatedAt = new Date();
    users.set(req.userId, user);
    saveData(); // Save to file

    console.log(`📸 User ${user.phoneNumber} uploaded profile photo`);

    res.json(user);
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to upload photo', timestamp: Date.now() }
    });
  }
});

// GET /api/v1/users/me/settings - Get user settings
app.get('/api/v1/users/me/settings', authenticate, (req: any, res) => {
  try {
    const user = users.get(req.userId);
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', timestamp: Date.now() }
      });
    }

    // Initialize settings if not exists
    if (!user.settings) {
      user.settings = {
        theme: 'light',
        notifications: {
          messageNotifications: true,
          soundEnabled: true,
          desktopNotifications: true,
        },
        privacy: {
          lastSeenVisibility: 'everyone',
          profilePhotoVisibility: 'everyone',
          readReceipts: true,
        },
      };
      users.set(req.userId, user);
      saveData();
    }

    res.json(user.settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to get settings', timestamp: Date.now() }
    });
  }
});

// PUT /api/v1/users/me/settings - Update user settings
app.put('/api/v1/users/me/settings', authenticate, (req: any, res) => {
  try {
    const user = users.get(req.userId);
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', timestamp: Date.now() }
      });
    }

    // Initialize settings if not exists
    if (!user.settings) {
      user.settings = {
        theme: 'light',
        notifications: {
          messageNotifications: true,
          soundEnabled: true,
          desktopNotifications: true,
        },
        privacy: {
          lastSeenVisibility: 'everyone',
          profilePhotoVisibility: 'everyone',
          readReceipts: true,
        },
      };
    }

    const { theme, notifications, privacy } = req.body;

    // Update theme
    if (theme !== undefined) {
      if (['light', 'dark'].includes(theme)) {
        user.settings.theme = theme;
      }
    }

    // Update notifications
    if (notifications !== undefined) {
      if (notifications.messageNotifications !== undefined) {
        user.settings.notifications.messageNotifications = notifications.messageNotifications;
      }
      if (notifications.soundEnabled !== undefined) {
        user.settings.notifications.soundEnabled = notifications.soundEnabled;
      }
      if (notifications.desktopNotifications !== undefined) {
        user.settings.notifications.desktopNotifications = notifications.desktopNotifications;
      }
    }

    // Update privacy
    if (privacy !== undefined) {
      if (privacy.lastSeenVisibility !== undefined) {
        if (['everyone', 'contacts', 'nobody'].includes(privacy.lastSeenVisibility)) {
          user.settings.privacy.lastSeenVisibility = privacy.lastSeenVisibility;
        }
      }
      if (privacy.profilePhotoVisibility !== undefined) {
        if (['everyone', 'contacts', 'nobody'].includes(privacy.profilePhotoVisibility)) {
          user.settings.privacy.profilePhotoVisibility = privacy.profilePhotoVisibility;
        }
      }
      if (privacy.readReceipts !== undefined) {
        user.settings.privacy.readReceipts = privacy.readReceipts;
      }
    }

    user.updatedAt = new Date();
    users.set(req.userId, user);
    saveData(); // Save to file

    console.log(`⚙️ User ${user.phoneNumber} updated settings`);

    res.json(user.settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to update settings', timestamp: Date.now() }
    });
  }
});

// GET /api/v1/users/search - Search users
app.get('/api/v1/users/search', authenticate, (req: any, res) => {
  try {
    const query = req.query.query?.toString().toLowerCase() || '';
    
    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    const currentUserId = req.userId;
    const results = [];

    for (const [userId, user] of users.entries()) {
      const displayName = user.displayName?.toLowerCase() || '';
      const firstName = user.firstName?.toLowerCase() || '';
      const lastName = user.lastName?.toLowerCase() || '';
      const username = user.username?.toLowerCase() || '';
      const phoneNumber = user.phoneNumber?.toLowerCase() || '';

      if (
        displayName.includes(query) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        username.includes(query) ||
        phoneNumber.includes(query)
      ) {
        results.push({
          userId: user.userId,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phoneNumber: user.phoneNumber,
          profilePhotoUrl: user.profilePhotoUrl,
          bio: user.bio,
        });
      }

      if (results.length >= 20) break; // Limit to 20 results
    }

    console.log(`🔍 Search query "${query}" returned ${results.length} results`);

    res.json({ users: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Search failed', timestamp: Date.now() }
    });
  }
});

// POST /api/v1/chats/create - Create or get existing chat
app.post('/api/v1/chats/create', authenticate, (req: any, res) => {
  try {
    const { participantId } = req.body;
    const currentUserId = req.userId;

    if (!participantId) {
      return res.status(400).json({
        error: { code: 'MISSING_PARTICIPANT', message: 'Participant ID required', timestamp: Date.now() }
      });
    }

    if (participantId === currentUserId) {
      return res.status(400).json({
        error: { code: 'INVALID_PARTICIPANT', message: 'Cannot chat with yourself', timestamp: Date.now() }
      });
    }

    const participant = users.get(participantId);
    if (!participant) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Participant not found', timestamp: Date.now() }
      });
    }

    // Check if chat already exists
    let existingChat = null;
    for (const [chatId, chat] of chats.entries()) {
      if (
        chat.participants.includes(currentUserId) &&
        chat.participants.includes(participantId)
      ) {
        existingChat = {
          chatId,
          participant: {
            userId: participant.userId,
            displayName: participant.displayName,
            firstName: participant.firstName,
            lastName: participant.lastName,
            username: participant.username,
            profilePhotoUrl: participant.profilePhotoUrl,
            bio: participant.bio,
            isOnline: participant.isOnline,
            lastSeen: participant.lastSeen,
          },
          lastMessage: chat.lastMessage,
          updatedAt: chat.updatedAt,
        };
        break;
      }
    }

    if (existingChat) {
      console.log(`💬 Existing chat found: ${existingChat.chatId}`);
      return res.json(existingChat);
    }

    // Create new chat
    const chatId = uuidv4();
    const newChat = {
      chatId,
      participants: [currentUserId, participantId],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: null,
    };

    chats.set(chatId, newChat);
    saveData(); // Save to file
    console.log(`💬 New chat created: ${chatId} between ${currentUserId} and ${participantId}`);

    res.json({
      chatId,
      participant: {
        userId: participant.userId,
        displayName: participant.displayName,
        firstName: participant.firstName,
        lastName: participant.lastName,
        username: participant.username,
        profilePhotoUrl: participant.profilePhotoUrl,
        bio: participant.bio,
        isOnline: participant.isOnline,
        lastSeen: participant.lastSeen,
      },
      lastMessage: null,
      updatedAt: newChat.updatedAt,
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to create chat', timestamp: Date.now() }
    });
  }
});

// GET /api/v1/chats/my - Get user's chats
app.get('/api/v1/chats/my', authenticate, (req: any, res) => {
  try {
    const currentUserId = req.userId;
    const userChats = [];

    for (const [chatId, chat] of chats.entries()) {
      if (chat.participants.includes(currentUserId)) {
        // Get other participant info
        const otherUserId = chat.participants.find((id: string) => id !== currentUserId);
        const otherUser = users.get(otherUserId);

        if (otherUser) {
          // Count unread messages
          let unreadCount = 0;
          for (const [messageId, message] of messages.entries()) {
            if (message.chatId === chatId && message.senderId !== currentUserId && !message.isRead) {
              unreadCount++;
            }
          }

          userChats.push({
            chatId,
            type: 'private',
            participant: {
              userId: otherUser.userId,
              displayName: otherUser.displayName,
              firstName: otherUser.firstName,
              lastName: otherUser.lastName,
              username: otherUser.username,
              profilePhotoUrl: otherUser.profilePhotoUrl,
              bio: otherUser.bio,
              isOnline: otherUser.isOnline,
              lastSeen: otherUser.lastSeen,
            },
            lastMessage: chat.lastMessage,
            updatedAt: chat.updatedAt,
            unreadCount,
          });
        }
      }
    }

    // Add groups
    for (const [groupId, group] of groups.entries()) {
      if (group.members.includes(currentUserId)) {
        // Count unread messages
        let unreadCount = 0;
        for (const [messageId, message] of messages.entries()) {
          if (message.chatId === groupId && message.senderId !== currentUserId && !message.isRead) {
            unreadCount++;
          }
        }

        userChats.push({
          chatId: groupId,
          type: 'group',
          groupName: group.name,
          groupDescription: group.description,
          groupPhotoUrl: group.photoUrl,
          memberCount: group.members.length,
          isAdmin: group.admins.includes(currentUserId),
          lastMessage: group.lastMessage,
          updatedAt: group.updatedAt,
          unreadCount,
        });
      }
    }

    // Sort by updatedAt (newest first)
    userChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    console.log(`💬 User ${currentUserId} has ${userChats.length} chats (${chats.size} private, ${groups.size} groups)`);

    res.json({ chats: userChats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to get chats', timestamp: Date.now() }
    });
  }
});

// POST /api/v1/groups/create - Create group
app.post('/api/v1/groups/create', authenticate, (req: any, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const creatorId = req.userId;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_NAME', message: 'Group name is required', timestamp: Date.now() }
      });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_MEMBERS', message: 'At least one member is required', timestamp: Date.now() }
      });
    }

    const groupId = uuidv4();
    const members = [creatorId, ...memberIds.filter((id: string) => id !== creatorId)];
    
    const newGroup = {
      groupId,
      name: name.trim(),
      description: description?.trim() || '',
      photoUrl: '',
      createdBy: creatorId,
      admins: [creatorId],
      members,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: null,
    };

    groups.set(groupId, newGroup);
    saveData();

    console.log(`👥 Group created: ${groupId} by ${creatorId} with ${members.length} members`);

    res.json({
      groupId,
      name: newGroup.name,
      description: newGroup.description,
      photoUrl: newGroup.photoUrl,
      memberCount: members.length,
      isAdmin: true,
      createdAt: newGroup.createdAt,
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to create group', timestamp: Date.now() }
    });
  }
});

// GET /api/v1/groups/:groupId - Get group details
app.get('/api/v1/groups/:groupId', authenticate, (req: any, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.userId;

    const group = groups.get(groupId);
    if (!group) {
      return res.status(404).json({
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found', timestamp: Date.now() }
      });
    }

    if (!group.members.includes(currentUserId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a member of this group', timestamp: Date.now() }
      });
    }

    // Get member details
    const memberDetails = group.members.map((memberId: string) => {
      const user = users.get(memberId);
      return user ? {
        userId: user.userId,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        profilePhotoUrl: user.profilePhotoUrl,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        isAdmin: group.admins.includes(memberId),
      } : null;
    }).filter(Boolean);

    res.json({
      groupId: group.groupId,
      name: group.name,
      description: group.description,
      photoUrl: group.photoUrl,
      createdBy: group.createdBy,
      members: memberDetails,
      isAdmin: group.admins.includes(currentUserId),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to get group', timestamp: Date.now() }
    });
  }
});

// POST /api/v1/groups/:groupId/members/add - Add members to group
app.post('/api/v1/groups/:groupId/members/add', authenticate, (req: any, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const currentUserId = req.userId;

    const group = groups.get(groupId);
    if (!group) {
      return res.status(404).json({
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found', timestamp: Date.now() }
      });
    }

    if (!group.admins.includes(currentUserId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only admins can add members', timestamp: Date.now() }
      });
    }

    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({
        error: { code: 'INVALID_MEMBERS', message: 'Member IDs required', timestamp: Date.now() }
      });
    }

    // Add new members
    memberIds.forEach((memberId: string) => {
      if (!group.members.includes(memberId)) {
        group.members.push(memberId);
      }
    });

    group.updatedAt = new Date();
    groups.set(groupId, group);
    saveData();

    console.log(`👥 Added ${memberIds.length} members to group ${groupId}`);

    res.json({ success: true, memberCount: group.members.length });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to add members', timestamp: Date.now() }
    });
  }
});

// POST /api/v1/messages/send - Send message (supports both private chats and groups)
app.post('/api/v1/messages/send', authenticate, (req: any, res) => {
  try {
    const { chatId, text } = req.body;
    const senderId = req.userId;

    if (!chatId || !text) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Chat ID and text required', timestamp: Date.now() }
      });
    }

    // Check if it's a private chat or group
    const chat = chats.get(chatId);
    const group = groups.get(chatId);

    if (!chat && !group) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat or group not found', timestamp: Date.now() }
      });
    }

    // Verify user is participant/member
    if (chat && !chat.participants.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a participant of this chat', timestamp: Date.now() }
      });
    }

    if (group && !group.members.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a member of this group', timestamp: Date.now() }
      });
    }

    const messageId = uuidv4();
    const timestamp = new Date();
    const message = {
      messageId,
      chatId,
      senderId,
      messageType: 'text',
      text: text.trim(),
      timestamp,
      isRead: false,
    };

    messages.set(messageId, message);

    // Update last message
    const lastMessageData = {
      text: text.trim(),
      timestamp,
    };

    if (chat) {
      // Private chat
      chat.lastMessage = lastMessageData;
      chat.updatedAt = timestamp;
      chats.set(chatId, chat);

      // Send real-time message to other participant via socket
      const otherUserId = chat.participants.find((id: string) => id !== senderId);
      const otherSocketId = userSockets.get(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit('message:new', message);
      }
    } else if (group) {
      // Group chat
      group.lastMessage = lastMessageData;
      group.updatedAt = timestamp;
      groups.set(chatId, group);

      // Send real-time message to all group members except sender
      group.members.forEach((memberId: string) => {
        if (memberId !== senderId) {
          const memberSocketId = userSockets.get(memberId);
          if (memberSocketId) {
            io.to(memberSocketId).emit('message:new', message);
          }
        }
      });
    }

    saveData(); // Save to file

    console.log(`📨 Message sent in ${group ? 'group' : 'chat'} ${chatId}: "${text.substring(0, 30)}..."`);

    res.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to send message', timestamp: Date.now() }
    });
  }
});

// POST /api/v1/messages/send-image - Send image message (supports both private chats and groups)
app.post('/api/v1/messages/send-image', authenticate, upload.single('image'), (req: any, res) => {
  try {
    const { chatId } = req.body;
    const senderId = req.userId;

    if (!chatId) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Chat ID required', timestamp: Date.now() }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'NO_FILE', message: 'No image uploaded', timestamp: Date.now() }
      });
    }

    // Check if it's a private chat or group
    const chat = chats.get(chatId);
    const group = groups.get(chatId);

    if (!chat && !group) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat or group not found', timestamp: Date.now() }
      });
    }

    // Verify user is participant/member
    if (chat && !chat.participants.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a participant of this chat', timestamp: Date.now() }
      });
    }

    if (group && !group.members.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a member of this group', timestamp: Date.now() }
      });
    }

    const messageId = uuidv4();
    const timestamp = new Date();
    const imageUrl = `http://localhost:4000/uploads/${req.file.filename}`;
    
    const message = {
      messageId,
      chatId,
      senderId,
      messageType: 'image',
      text: '', // Empty for image messages
      imageUrl,
      timestamp,
      isRead: false,
    };

    messages.set(messageId, message);

    // Update last message
    const lastMessageData = {
      text: '📷 Photo',
      timestamp,
    };

    if (chat) {
      // Private chat
      chat.lastMessage = lastMessageData;
      chat.updatedAt = timestamp;
      chats.set(chatId, chat);

      // Send real-time message to other participant via socket
      const otherUserId = chat.participants.find((id: string) => id !== senderId);
      const otherSocketId = userSockets.get(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit('message:new', message);
      }
    } else if (group) {
      // Group chat
      group.lastMessage = lastMessageData;
      group.updatedAt = timestamp;
      groups.set(chatId, group);

      // Send real-time message to all group members except sender
      group.members.forEach((memberId: string) => {
        if (memberId !== senderId) {
          const memberSocketId = userSockets.get(memberId);
          if (memberSocketId) {
            io.to(memberSocketId).emit('message:new', message);
          }
        }
      });
    }

    saveData(); // Save to file

    console.log(`📷 Image sent in ${group ? 'group' : 'chat'} ${chatId}`);

    res.json(message);
  } catch (error) {
    console.error('Send image error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to send image', timestamp: Date.now() }
    });
  }
});

// POST /api/v1/messages/send-video - Send video message (supports both private chats and groups)
app.post('/api/v1/messages/send-video', authenticate, videoUpload.single('video'), (req: any, res) => {
  try {
    const { chatId } = req.body;
    const senderId = req.userId;

    if (!chatId) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Chat ID required', timestamp: Date.now() }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'NO_FILE', message: 'No video uploaded', timestamp: Date.now() }
      });
    }

    // Check if it's a private chat or group
    const chat = chats.get(chatId);
    const group = groups.get(chatId);

    if (!chat && !group) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat or group not found', timestamp: Date.now() }
      });
    }

    // Verify user is participant/member
    if (chat && !chat.participants.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a participant of this chat', timestamp: Date.now() }
      });
    }

    if (group && !group.members.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a member of this group', timestamp: Date.now() }
      });
    }

    const messageId = uuidv4();
    const timestamp = new Date();
    const videoUrl = `http://localhost:4000/uploads/${req.file.filename}`;
    
    const message = {
      messageId,
      chatId,
      senderId,
      messageType: 'video',
      text: '', // Empty for video messages
      videoUrl,
      timestamp,
      isRead: false,
    };

    messages.set(messageId, message);

    // Update last message
    const lastMessageData = {
      text: '🎥 Video',
      timestamp,
    };

    if (chat) {
      // Private chat
      chat.lastMessage = lastMessageData;
      chat.updatedAt = timestamp;
      chats.set(chatId, chat);

      // Send real-time message to other participant via socket
      const otherUserId = chat.participants.find((id: string) => id !== senderId);
      const otherSocketId = userSockets.get(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit('message:new', message);
      }
    } else if (group) {
      // Group chat
      group.lastMessage = lastMessageData;
      group.updatedAt = timestamp;
      groups.set(chatId, group);

      // Send real-time message to all group members except sender
      group.members.forEach((memberId: string) => {
        if (memberId !== senderId) {
          const memberSocketId = userSockets.get(memberId);
          if (memberSocketId) {
            io.to(memberSocketId).emit('message:new', message);
          }
        }
      });
    }

    saveData(); // Save to file

    console.log(`🎥 Video sent in ${group ? 'group' : 'chat'} ${chatId}`);

    res.json(message);
  } catch (error) {
    console.error('Send video error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to send video', timestamp: Date.now() }
    });
  }
});

// POST /api/v1/messages/send-voice - Send voice message (supports both private chats and groups)
app.post('/api/v1/messages/send-voice', authenticate, audioUpload.single('voice'), (req: any, res) => {
  try {
    const { chatId } = req.body;
    const senderId = req.userId;

    if (!chatId) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Chat ID required', timestamp: Date.now() }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'NO_FILE', message: 'No voice file uploaded', timestamp: Date.now() }
      });
    }

    // Check if it's a private chat or group
    const chat = chats.get(chatId);
    const group = groups.get(chatId);

    if (!chat && !group) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat or group not found', timestamp: Date.now() }
      });
    }

    // Verify user is participant/member
    if (chat && !chat.participants.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a participant of this chat', timestamp: Date.now() }
      });
    }

    if (group && !group.members.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a member of this group', timestamp: Date.now() }
      });
    }

    const messageId = uuidv4();
    const timestamp = new Date();
    const voiceUrl = `http://localhost:4000/uploads/${req.file.filename}`;
    
    const message = {
      messageId,
      chatId,
      senderId,
      messageType: 'voice',
      text: '', // Empty for voice messages
      voiceUrl,
      timestamp,
      isRead: false,
    };

    messages.set(messageId, message);

    // Update last message
    const lastMessageData = {
      text: '🎤 Voice',
      timestamp,
    };

    if (chat) {
      // Private chat
      chat.lastMessage = lastMessageData;
      chat.updatedAt = timestamp;
      chats.set(chatId, chat);

      // Send real-time message to other participant via socket
      const otherUserId = chat.participants.find((id: string) => id !== senderId);
      const otherSocketId = userSockets.get(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit('message:new', message);
      }
    } else if (group) {
      // Group chat
      group.lastMessage = lastMessageData;
      group.updatedAt = timestamp;
      groups.set(chatId, group);

      // Send real-time message to all group members except sender
      group.members.forEach((memberId: string) => {
        if (memberId !== senderId) {
          const memberSocketId = userSockets.get(memberId);
          if (memberSocketId) {
            io.to(memberSocketId).emit('message:new', message);
          }
        }
      });
    }

    saveData(); // Save to file

    console.log(`🎤 Voice message sent in ${group ? 'group' : 'chat'} ${chatId}`);

    res.json(message);
  } catch (error) {
    console.error('Send voice error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to send voice message', timestamp: Date.now() }
    });
  }
});

// POST /api/v1/messages/send-file - Send file message (supports both private chats and groups)
app.post('/api/v1/messages/send-file', authenticate, fileUpload.single('file'), (req: any, res) => {
  try {
    const { chatId } = req.body;
    const senderId = req.userId;

    if (!chatId) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Chat ID required', timestamp: Date.now() }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'NO_FILE', message: 'No file uploaded', timestamp: Date.now() }
      });
    }

    // Check if it's a private chat or group
    const chat = chats.get(chatId);
    const group = groups.get(chatId);

    if (!chat && !group) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat or group not found', timestamp: Date.now() }
      });
    }

    // Verify user is participant/member
    if (chat && !chat.participants.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a participant of this chat', timestamp: Date.now() }
      });
    }

    if (group && !group.members.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a member of this group', timestamp: Date.now() }
      });
    }

    const messageId = uuidv4();
    const timestamp = new Date();
    const fileUrl = `http://localhost:4000/uploads/${req.file.filename}`;
    
    const message = {
      messageId,
      chatId,
      senderId,
      messageType: 'file',
      text: '', // Empty for file messages
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      timestamp,
      isRead: false,
    };

    messages.set(messageId, message);

    // Update last message
    const lastMessageData = {
      text: `📎 ${req.file.originalname}`,
      timestamp,
    };

    if (chat) {
      // Private chat
      chat.lastMessage = lastMessageData;
      chat.updatedAt = timestamp;
      chats.set(chatId, chat);

      // Send real-time message to other participant via socket
      const otherUserId = chat.participants.find((id: string) => id !== senderId);
      const otherSocketId = userSockets.get(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit('message:new', message);
      }
    } else if (group) {
      // Group chat
      group.lastMessage = lastMessageData;
      group.updatedAt = timestamp;
      groups.set(chatId, group);

      // Send real-time message to all group members except sender
      group.members.forEach((memberId: string) => {
        if (memberId !== senderId) {
          const memberSocketId = userSockets.get(memberId);
          if (memberSocketId) {
            io.to(memberSocketId).emit('message:new', message);
          }
        }
      });
    }

    saveData(); // Save to file

    console.log(`📎 File sent in ${group ? 'group' : 'chat'} ${chatId}: ${req.file.originalname}`);

    res.json(message);
  } catch (error) {
    console.error('Send file error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to send file', timestamp: Date.now() }
    });
  }
});

// GET /api/v1/messages/:chatId - Get messages for a chat or group
app.get('/api/v1/messages/:chatId', authenticate, (req: any, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.userId;

    // Check if it's a private chat or group
    const chat = chats.get(chatId);
    const group = groups.get(chatId);

    if (!chat && !group) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat or group not found', timestamp: Date.now() }
      });
    }

    // Verify user is participant/member
    if (chat && !chat.participants.includes(currentUserId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a participant of this chat', timestamp: Date.now() }
      });
    }

    if (group && !group.members.includes(currentUserId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a member of this group', timestamp: Date.now() }
      });
    }

    const chatMessages = [];
    for (const [messageId, message] of messages.entries()) {
      if (message.chatId === chatId) {
        chatMessages.push(message);
      }
    }

    // Sort by timestamp (oldest first)
    chatMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Mark messages as read (messages sent by other users)
    let markedAsRead = 0;
    const readMessageIds: string[] = [];
    for (const [messageId, message] of messages.entries()) {
      if (message.chatId === chatId && message.senderId !== currentUserId && !message.isRead) {
        message.isRead = true;
        messages.set(messageId, message);
        readMessageIds.push(messageId);
        markedAsRead++;
      }
    }
    
    if (markedAsRead > 0) {
      saveData();
      
      if (chat) {
        // Private chat - notify the other user
        const otherUserId = chat.participants.find((id: string) => id !== currentUserId);
        const senderSocketId = userSockets.get(otherUserId);
        if (senderSocketId) {
          readMessageIds.forEach((messageId) => {
            io.to(senderSocketId).emit('message:read', { messageId, chatId });
          });
          // Notify sender that unread count should be reset
          io.to(senderSocketId).emit('unread:reset', { chatId });
        }
      } else if (group) {
        // Group chat - notify all members except current user
        group.members.forEach((memberId: string) => {
          if (memberId !== currentUserId) {
            const memberSocketId = userSockets.get(memberId);
            if (memberSocketId) {
              readMessageIds.forEach((messageId) => {
                io.to(memberSocketId).emit('message:read', { messageId, chatId });
              });
              // Notify member that unread count should be reset
              io.to(memberSocketId).emit('unread:reset', { chatId });
            }
          }
        });
      }
      
      console.log(`✓✓ Marked ${markedAsRead} messages as read in ${group ? 'group' : 'chat'} ${chatId}`);
    }

    console.log(`📬 Retrieved ${chatMessages.length} messages for ${group ? 'group' : 'chat'} ${chatId}`);

    res.json({ messages: chatMessages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to get messages', timestamp: Date.now() }
    });
  }
});

// PUT /api/v1/messages/:chatId/mark-read - Mark all messages in chat as read
app.put('/api/v1/messages/:chatId/mark-read', authenticate, (req: any, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.userId;

    // Check if it's a private chat or group
    const chat = chats.get(chatId);
    const group = groups.get(chatId);

    if (!chat && !group) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat or group not found', timestamp: Date.now() }
      });
    }

    // Verify user is participant/member
    if (chat && !chat.participants.includes(currentUserId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a participant of this chat', timestamp: Date.now() }
      });
    }

    if (group && !group.members.includes(currentUserId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a member of this group', timestamp: Date.now() }
      });
    }

    // Mark all messages from other users as read
    let markedAsRead = 0;
    const readMessageIds: string[] = [];
    for (const [messageId, message] of messages.entries()) {
      if (message.chatId === chatId && message.senderId !== currentUserId && !message.isRead) {
        message.isRead = true;
        messages.set(messageId, message);
        readMessageIds.push(messageId);
        markedAsRead++;
      }
    }

    if (markedAsRead > 0) {
      saveData();
      
      if (chat) {
        // Private chat - notify the other user
        const otherUserId = chat.participants.find((id: string) => id !== currentUserId);
        const senderSocketId = userSockets.get(otherUserId);
        if (senderSocketId) {
          readMessageIds.forEach((messageId) => {
            io.to(senderSocketId).emit('message:read', { messageId, chatId });
          });
          // Notify sender that unread count should be reset
          io.to(senderSocketId).emit('unread:reset', { chatId });
          console.log(`✓✓ Notified user ${otherUserId} about ${markedAsRead} read messages`);
        }
      } else if (group) {
        // Group chat - notify all members except current user
        group.members.forEach((memberId: string) => {
          if (memberId !== currentUserId) {
            const memberSocketId = userSockets.get(memberId);
            if (memberSocketId) {
              readMessageIds.forEach((messageId) => {
                io.to(memberSocketId).emit('message:read', { messageId, chatId });
              });
              // Notify member that unread count should be reset
              io.to(memberSocketId).emit('unread:reset', { chatId });
            }
          }
        });
        console.log(`✓✓ Notified group members about ${markedAsRead} read messages`);
      }
    }

    res.json({ success: true, markedAsRead });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to mark messages as read', timestamp: Date.now() }
    });
  }
});

// Start server
httpServer.listen(PORT, () => {
  console.log('\n🚀 Simple Auth Service Started!');
  console.log(`📍 http://localhost:${PORT}`);
  console.log('✅ No database required');
  console.log('📝 Verification codes will be logged here');
  console.log('📁 Profile photos will be saved to uploads/');
  console.log('🔌 Socket.IO server ready\n');
  
  // Create demo users
  createDemoUsers();
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Authenticate socket connection
  socket.on('authenticate', (token: string) => {
    try {
      const decoded: any = jwt.verify(token, 'telegram-clone-secret');
      const userId = decoded.userId;
      
      // Store socket mapping
      userSockets.set(userId, socket.id);
      socket.data.userId = userId;
      
      // Set user online
      const user = users.get(userId);
      if (user) {
        user.isOnline = true;
        user.lastSeen = new Date();
        users.set(userId, user);
        saveData();
        
        // Notify all user's chat participants about online status
        notifyUserStatus(userId, true);
      }
      
      console.log(`✅ Socket authenticated for user: ${userId}`);
      socket.emit('authenticated', { success: true });
    } catch (error) {
      console.error('Socket authentication failed:', error);
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
      socket.disconnect();
    }
  });

  // User typing event
  socket.on('typing:start', ({ chatId }) => {
    const userId = socket.data.userId;
    if (!userId || !chatId) return;

    // Get user info
    const user = users.get(userId);
    const userName = user?.displayName || user?.firstName || 'Someone';

    // Add user to typing set for this chat
    if (!typingUsers.has(chatId)) {
      typingUsers.set(chatId, new Set());
    }
    typingUsers.get(chatId).add(userId);

    // Check if it's a private chat or group
    const chat = chats.get(chatId);
    const group = groups.get(chatId);

    if (chat) {
      // Private chat - notify other participant
      const otherUserId = chat.participants.find((id: string) => id !== userId);
      const otherSocketId = userSockets.get(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit('typing:start', { chatId, userId, userName });
      }
    } else if (group) {
      // Group chat - notify all members except sender
      group.members.forEach((memberId: string) => {
        if (memberId !== userId) {
          const memberSocketId = userSockets.get(memberId);
          if (memberSocketId) {
            io.to(memberSocketId).emit('typing:start', { chatId, userId, userName });
          }
        }
      });
    }
  });

  socket.on('typing:stop', ({ chatId }) => {
    const userId = socket.data.userId;
    if (!userId || !chatId) return;

    // Remove user from typing set
    if (typingUsers.has(chatId)) {
      typingUsers.get(chatId).delete(userId);
    }

    // Check if it's a private chat or group
    const chat = chats.get(chatId);
    const group = groups.get(chatId);

    if (chat) {
      // Private chat - notify other participant
      const otherUserId = chat.participants.find((id: string) => id !== userId);
      const otherSocketId = userSockets.get(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit('typing:stop', { chatId, userId });
      }
    } else if (group) {
      // Group chat - notify all members except sender
      group.members.forEach((memberId: string) => {
        if (memberId !== userId) {
          const memberSocketId = userSockets.get(memberId);
          if (memberSocketId) {
            io.to(memberSocketId).emit('typing:stop', { chatId, userId });
          }
        }
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (userId) {
      // Remove socket mapping
      userSockets.delete(userId);
      
      // Set user offline
      const user = users.get(userId);
      if (user) {
        user.isOnline = false;
        user.lastSeen = new Date();
        users.set(userId, user);
        saveData();
        
        // Notify all user's chat participants about offline status
        notifyUserStatus(userId, false);
      }
      
      console.log(`👋 User ${userId} disconnected`);
    }
  });
});

// Helper function to notify user's chat participants about status change
const notifyUserStatus = (userId: string, isOnline: boolean) => {
  // Find all chats where this user is a participant
  for (const [chatId, chat] of chats.entries()) {
    if (chat.participants.includes(userId)) {
      // Get other participant
      const otherUserId = chat.participants.find((id: string) => id !== userId);
      const otherSocketId = userSockets.get(otherUserId);
      
      if (otherSocketId) {
        const user = users.get(userId);
        io.to(otherSocketId).emit('user:status', {
          userId,
          isOnline,
          lastSeen: user?.lastSeen,
        });
      }
    }
  }
};

// POST /api/v1/messages/send-file - Send file message (supports both private chats and groups)
app.post('/api/v1/messages/send-file', authenticate, fileUpload.single('file'), (req: any, res) => {
  try {
    const { chatId } = req.body;
    const senderId = req.userId;

    if (!chatId) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Chat ID required', timestamp: Date.now() }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'NO_FILE', message: 'No file uploaded', timestamp: Date.now() }
      });
    }

    // Check if it's a private chat or group
    const chat = chats.get(chatId);
    const group = groups.get(chatId);

    if (!chat && !group) {
      return res.status(404).json({
        error: { code: 'CHAT_NOT_FOUND', message: 'Chat or group not found', timestamp: Date.now() }
      });
    }

    // Verify user is participant/member
    if (chat && !chat.participants.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a participant of this chat', timestamp: Date.now() }
      });
    }

    if (group && !group.members.includes(senderId)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not a member of this group', timestamp: Date.now() }
      });
    }

    const messageId = uuidv4();
    const timestamp = new Date();
    const fileUrl = `http://localhost:4000/uploads/${req.file.filename}`;

    const message = {
      messageId,
      chatId,
      senderId,
      messageType: 'file',
      text: '', // Empty for file messages
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      timestamp,
      isRead: false,
    };

    messages.set(messageId, message);

    // Update last message
    const lastMessageData = {
      text: `📎 ${req.file.originalname}`,
      timestamp,
    };

    if (chat) {
      // Private chat
      chat.lastMessage = lastMessageData;
      chat.updatedAt = timestamp;
      chats.set(chatId, chat);

      // Send real-time message to other participant via socket
      const otherUserId = chat.participants.find((id: string) => id !== senderId);
      const otherSocketId = userSockets.get(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit('message:new', message);
      }
    } else if (group) {
      // Group chat
      group.lastMessage = lastMessageData;
      group.updatedAt = timestamp;
      groups.set(chatId, group);

      // Send real-time message to all group members except sender
      group.members.forEach((memberId: string) => {
        if (memberId !== senderId) {
          const memberSocketId = userSockets.get(memberId);
          if (memberSocketId) {
            io.to(memberSocketId).emit('message:new', message);
          }
        }
      });
    }

    saveData(); // Save to file

    console.log(`📎 File sent in ${group ? 'group' : 'chat'} ${chatId}: ${req.file.originalname}`);

    res.json(message);
  } catch (error) {
    console.error('Send file error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to send file', timestamp: Date.now() }
    });
  }
});

