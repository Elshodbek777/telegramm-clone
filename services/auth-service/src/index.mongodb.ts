import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { connectDB } from './config/mongodb';
import { User } from './models/User.model';
import { VerificationSession } from './models/VerificationSession.model';

const app = express();
const PORT = 4000;

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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

// Middleware
app.use(cors({ origin: '*' }));
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
  res.json({ status: 'ok', mode: 'mongodb' });
});

// Register endpoint
app.post('/api/v1/auth/register', async (req, res) => {
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
    const expiresAt = new Date(Date.now() + 300000); // 5 minutes

    // Delete old sessions for this phone
    await VerificationSession.deleteMany({ phoneNumber });

    // Create new session
    await VerificationSession.create({
      verificationId,
      phoneNumber,
      code,
      expiresAt,
      attempts: 0,
    });

    console.log(`\n📱 SMS to ${phoneNumber}: Your verification code is ${code}\n`);

    res.json({ verificationId, expiresAt: expiresAt.getTime() });
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
app.post('/api/v1/auth/verify', async (req, res) => {
  try {
    const { verificationId, code, deviceId } = req.body;

    const session = await VerificationSession.findOne({ verificationId });
    if (!session) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CODE',
          message: 'Verification code expired or invalid',
          timestamp: Date.now(),
        }
      });
    }

    if (Date.now() > session.expiresAt.getTime()) {
      await VerificationSession.deleteOne({ verificationId });
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
        await VerificationSession.deleteOne({ verificationId });
        return res.status(429).json({
          error: {
            code: 'MAX_ATTEMPTS',
            message: 'Maximum attempts exceeded',
            timestamp: Date.now(),
          }
        });
      }
      await session.save();
      return res.status(401).json({
        error: {
          code: 'WRONG_CODE',
          message: `Invalid code. ${3 - session.attempts} attempts remaining`,
          timestamp: Date.now(),
        }
      });
    }

    await VerificationSession.deleteOne({ verificationId });

    let user = await User.findOne({ phoneNumber: session.phoneNumber });
    let isNewUser = false;

    if (!user) {
      const userId = uuidv4();
      user = await User.create({
        userId,
        phoneNumber: session.phoneNumber,
        displayName: '',
        firstName: '',
        lastName: '',
        username: '',
        bio: '',
        profilePhotoUrl: '',
        isOnline: false,
        lastSeen: new Date(),
      });
      isNewUser = true;
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

// GET /api/v1/users/me - Get current user profile
app.get('/api/v1/users/me', authenticate, async (req: any, res) => {
  try {
    const user = await User.findOne({ userId: req.userId });
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
app.put('/api/v1/users/me/update', authenticate, async (req: any, res) => {
  try {
    const user = await User.findOne({ userId: req.userId });
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

    await user.save();

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
app.put('/api/v1/users/me/photo', authenticate, upload.single('photo'), async (req: any, res) => {
  try {
    const user = await User.findOne({ userId: req.userId });
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
    await user.save();

    console.log(`📸 User ${user.phoneNumber} uploaded profile photo`);

    res.json(user);
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to upload photo', timestamp: Date.now() }
    });
  }
});

// GET /api/v1/users/search - Search users
app.get('/api/v1/users/search', authenticate, async (req: any, res) => {
  try {
    const query = req.query.query?.toString() || '';
    
    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }

    const currentUserId = req.userId;

    // Search using text index or regex
    const results = await User.find({
      userId: { $ne: currentUserId },
      $or: [
        { displayName: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { phoneNumber: { $regex: query, $options: 'i' } },
      ]
    })
    .limit(20)
    .select('userId displayName firstName lastName username phoneNumber profilePhotoUrl bio');

    console.log(`🔍 Search query "${query}" returned ${results.length} results`);

    res.json({ users: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Search failed', timestamp: Date.now() }
    });
  }
});

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log('\n🚀 Auth Service with MongoDB Started!');
    console.log(`📍 http://localhost:${PORT}`);
    console.log('✅ MongoDB connected');
    console.log('📝 Verification codes will be logged here');
    console.log('📁 Profile photos will be saved to uploads/\n');
  });
};

startServer();
