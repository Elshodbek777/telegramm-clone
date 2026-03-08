import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { AuthError, AuthErrorCode } from '../utils/errors';
import type { RegisterRequest, RegisterResponse, VerifyRequest, VerifyResponse, User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '30d';

// In-memory storage for development
const verificationSessions = new Map<string, { phoneNumber: string; code: string; expiresAt: number; attempts: number }>();
const users = new Map<string, User>();

export class MockAuthService {
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const { phoneNumber } = data;
    
    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationId = uuidv4();
    const expiresAt = Date.now() + 300000; // 5 minutes

    // Store in memory
    verificationSessions.set(verificationId, {
      phoneNumber,
      code,
      expiresAt,
      attempts: 0,
    });

    // Log code to console (development only)
    console.log(`\n📱 SMS to ${phoneNumber}: Your verification code is ${code}\n`);

    return {
      verificationId,
      expiresAt,
    };
  }

  async verify(data: VerifyRequest, deviceInfo: any): Promise<VerifyResponse> {
    const { verificationId, code } = data;

    // Get verification session
    const session = verificationSessions.get(verificationId);
    if (!session) {
      throw new AuthError(
        AuthErrorCode.VERIFICATION_CODE_EXPIRED,
        'Verification code expired or invalid',
        401
      );
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      verificationSessions.delete(verificationId);
      throw new AuthError(
        AuthErrorCode.VERIFICATION_CODE_EXPIRED,
        'Verification code expired',
        401
      );
    }

    // Check attempts
    if (session.attempts >= 3) {
      verificationSessions.delete(verificationId);
      throw new AuthError(
        AuthErrorCode.MAX_RETRIES_EXCEEDED,
        'Maximum verification attempts exceeded',
        429
      );
    }

    // Verify code
    if (session.code !== code) {
      session.attempts++;
      throw new AuthError(
        AuthErrorCode.VERIFICATION_CODE_INVALID,
        `Invalid verification code. ${3 - session.attempts} attempts remaining`,
        401
      );
    }

    // Delete verification session
    verificationSessions.delete(verificationId);

    // Check if user exists
    let user = Array.from(users.values()).find(u => u.phoneNumber === session.phoneNumber);
    let isNewUser = false;

    if (!user) {
      // Create new user
      const userId = uuidv4();
      user = {
        userId,
        phoneNumber: session.phoneNumber,
        isOnline: false,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      users.set(userId, user);
      isNewUser = true;
    }

    // Create session token
    const sessionToken = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      userId: user.userId,
      sessionToken,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      isNewUser,
      user,
    };
  }
}
