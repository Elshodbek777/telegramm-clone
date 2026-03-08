import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface UserProfile {
  userId: string;
  phoneNumber: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  profilePhotoUrl?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
}

export async function getProfile(sessionToken: string): Promise<UserProfile> {
  const response = await api.get('/api/v1/users/me', {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });
  return response.data;
}

export async function updateProfile(
  sessionToken: string,
  data: UpdateProfileData
): Promise<UserProfile> {
  const response = await api.put('/api/v1/users/me/update', data, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

export async function uploadProfilePhoto(
  sessionToken: string,
  file: File
): Promise<UserProfile> {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await api.put('/api/v1/users/me/photo', formData, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}
