import axios from 'axios';
import type { RegisterResponse, VerifyResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function registerPhone(phoneNumber: string, deviceId: string): Promise<RegisterResponse> {
  const response = await api.post('/api/v1/auth/register', { phoneNumber, deviceId });
  return response.data;
}

export async function verifyCode(
  verificationId: string,
  code: string,
  deviceId: string
): Promise<VerifyResponse> {
  const response = await api.post('/api/v1/auth/verify', {
    verificationId,
    code,
    deviceId,
    deviceType: 'web',
  });
  return response.data;
}

export async function logout(sessionToken: string): Promise<void> {
  await api.post('/api/v1/auth/logout', {}, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });
}
