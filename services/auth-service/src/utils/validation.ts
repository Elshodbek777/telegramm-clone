import { z } from 'zod';

export const phoneNumberSchema = z.string().regex(/^\+[1-9]\d{1,14}$/, {
  message: 'Phone number must be in E.164 format (e.g., +1234567890)',
});

export const verificationCodeSchema = z.string().regex(/^\d{6}$/, {
  message: 'Verification code must be 6 digits',
});

export const deviceIdSchema = z.string().min(1).max(255);

export const registerRequestSchema = z.object({
  phoneNumber: phoneNumberSchema,
  deviceId: deviceIdSchema,
});

export const verifyRequestSchema = z.object({
  verificationId: z.string().uuid(),
  code: verificationCodeSchema,
});

export function validatePhoneNumber(phoneNumber: string): boolean {
  return phoneNumberSchema.safeParse(phoneNumber).success;
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
