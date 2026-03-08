import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

export async function initRedis() {
  await redisClient.connect();
}

// Verification session helpers
export async function setVerificationSession(
  verificationId: string,
  phoneNumber: string,
  code: string,
  expiresInSeconds: number = 300
) {
  const key = `verification:${verificationId}`;
  await redisClient.setEx(
    key,
    expiresInSeconds,
    JSON.stringify({
      phoneNumber,
      code,
      attempts: 0,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    })
  );
}

export async function getVerificationSession(verificationId: string) {
  const key = `verification:${verificationId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

export async function incrementVerificationAttempts(verificationId: string) {
  const session = await getVerificationSession(verificationId);
  if (!session) return null;

  session.attempts += 1;
  const ttl = await redisClient.ttl(`verification:${verificationId}`);
  await redisClient.setEx(`verification:${verificationId}`, ttl, JSON.stringify(session));
  return session;
}

export async function deleteVerificationSession(verificationId: string) {
  await redisClient.del(`verification:${verificationId}`);
}

// Session token helpers
export async function setSessionToken(sessionToken: string, userId: string, expiresInSeconds: number) {
  const key = `session:${sessionToken}`;
  await redisClient.setEx(key, expiresInSeconds, userId);
}

export async function getSessionToken(sessionToken: string) {
  const key = `session:${sessionToken}`;
  return await redisClient.get(key);
}

export async function deleteSessionToken(sessionToken: string) {
  await redisClient.del(`session:${sessionToken}`);
}
