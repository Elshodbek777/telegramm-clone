import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface SearchUser {
  userId: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phoneNumber: string;
  profilePhotoUrl?: string;
  bio?: string;
}

export async function searchUsers(sessionToken: string, query: string): Promise<SearchUser[]> {
  const response = await api.get('/api/v1/users/search', {
    params: { query },
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });
  return response.data.users;
}
