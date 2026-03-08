import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';
import {
  setVerificationSession,
  getVerificationSession,
  incrementVerificationAttempts,
  deleteVerificationSession,
  setSessionToken,
} from '../config/redis';
import { sendVerificationCode } from './sms.service';
import { generateVerificationCode, validatePhoneNumber } from '../utils/validation';
import { AuthError, AuthErrorCode } from '../utils/errors';
import type { RegisterRequest, RegisterResponse, VerifyRequest, VerifyResponse, User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const VERIFICATION_EXPIRY = 300; // 5 minutes
const MAX_VERIFICATION_ATTEMPTS = 3;

export class AuthService {
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const { phoneNumber, deviceId } = data;

    // Validate phone number
    if (!validatePhoneNumber(phoneNumber)) {
      throw new AuthError(
        AuthErrorCode.INVALID_PHONE_NUMBER,
        'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
        400
      );
    }

    // Generate verification code
    const code = generateVerificationCode();
    const verificationId = uuidv4();
    const expiresAt = Date.now() + VERIFICATION_EXPIRY * 1000;

    // Store verification session in Redis
    await setVerificationSession(verificationId, phoneNumber, code, VERIFICATION_EXPIRY);

    // Send SMS
    const smsSent = await sendVerificationCode(phoneNumber, code);
    if (!smsSent) {
      console.warn('SMS sending failed, but continuing...');
    }

    return {
      verificationId,
      expiresAt,
    };
  }

  async verify(data: VerifyRequest, deviceInfo: any): Promise<VerifyResponse> {
    const { verificationId, code } = data;

    // Get verification session
    const session = await getVerificationSession(verificationId);
    if (!session) {
      throw new AuthError(
        AuthErrorCode.VERIFICATION_CODE_EXPIRED,
        'Verification code expired or invalid',
        401
      );
    }

    // Check attempts
    if (session.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await deleteVerificationSession(verificationId);
      throw new AuthError(
        AuthErrorCode.MAX_RETRIES_EXCEEDED,
        'Maximum verification attempts exceeded',
        429
      );
    }

    // Verify code
    if (session.code !== code) {
      await incrementVerificationAttempts(verificationId);
      throw new AuthError(
        AuthErrorCode.VERIFICATION_CODE_INVALID,
        `Invalid verification code. ${MAX_VERIFICATION_ATTEMPTS - session.attempts - 1} attempts remaining`,
        401
      );
    }

    // Delete verification session
    await deleteVerificationSession(verificationId);

    // Check if user exists
    const client = await pool.connect();
    try {
      let user: User;
      let isNewUser = false;

      const existingUser = await client.query('SELECT * FROM users WHERE phone_number = $1', [session.phoneNumber]);

      if (existingUser.rows.length === 0) {
        // Create new user
        const userId = uuidv4();
        const result = await client.query(
          `INSERT INTO users (user_id, phone_number, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           RETURNING *`,
          [userId, session.phoneNumber]
        );
        user = this.mapDbUserToUser(result.rows[0]);
        isNewUser = true;
      } else {
        user = this.mapDbUserToUser(existingUser.rows[0]);
      }

      // Create session
      const sessionToken = await this.createSession(user.userId, deviceInfo);

      return {
        userId: user.userId,
        sessionToken,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        isNewUser,
        user,
      };
    } finally {
      client.release();
    }
  }

  private async createSession(userId: string, deviceInfo: any): Promise<string> {
    const sessionId = uuidv4();
    const sessionToken = jwt.sign({ userId, sessionId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const sessionTokenHash = await bcrypt.hash(sessionToken, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO sessions (session_id, user_id, device_id, device_name, device_type, session_token_hash, expires_at, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          sessionId,
          userId,
          deviceInfo.deviceId,
          deviceInfo.deviceName || 'Unknown Device',
          deviceInfo.deviceType || 'web',
          sessionTokenHash,
          expiresAt,
          deviceInfo.ipAddress || null,
        ]
      );

      // Store in Redis for quick lookup
      await setSessionToken(sessionToken, userId, 30 * 24 * 60 * 60);

      return sessionToken;
    } finally {
      client.release();
    }
  }

  private mapDbUserToUser(dbUser: any): User {
    return {
      userId: dbUser.user_id,
      phoneNumber: dbUser.phone_number,
      displayName: dbUser.display_name,
      username: dbUser.username,
      profilePhotoUrl: dbUser.profile_photo_url,
      statusMessage: dbUser.status_message,
      isOnline: dbUser.is_online,
      lastSeen: dbUser.last_seen,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }
}
