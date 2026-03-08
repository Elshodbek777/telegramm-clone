export enum AuthErrorCode {
  INVALID_PHONE_NUMBER = 'AUTH_001',
  VERIFICATION_CODE_EXPIRED = 'AUTH_002',
  VERIFICATION_CODE_INVALID = 'AUTH_003',
  MAX_RETRIES_EXCEEDED = 'AUTH_004',
  SESSION_EXPIRED = 'AUTH_005',
  SESSION_INVALID = 'AUTH_006',
  DEVICE_LIMIT_EXCEEDED = 'AUTH_007',
}

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(code: AuthErrorCode, message: string, statusCode: number = 401, details?: Record<string, any>) {
    super(code, message, statusCode, details);
    this.name = 'AuthError';
  }
}
