export interface User {
  userId: string;
  phoneNumber: string;
  displayName?: string;
  username?: string;
  profilePhotoUrl?: string;
  statusMessage?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  sessionId: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'web' | 'desktop';
  sessionToken: string;
  createdAt: Date;
  expiresAt: Date;
  lastActiveAt: Date;
  ipAddress: string;
}

export interface VerificationSession {
  verificationId: string;
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  attempts: number;
}

export interface RegisterRequest {
  phoneNumber: string;
  deviceId: string;
}

export interface RegisterResponse {
  verificationId: string;
  expiresAt: number;
}

export interface VerifyRequest {
  verificationId: string;
  code: string;
}

export interface VerifyResponse {
  userId: string;
  sessionToken: string;
  expiresAt: number;
  isNewUser: boolean;
  user: User;
}

export interface RefreshRequest {
  sessionToken: string;
}

export interface RefreshResponse {
  sessionToken: string;
  expiresAt: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: number;
    requestId: string;
  };
}
