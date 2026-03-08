import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User } from '../types';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      setAuth: (user: User, sessionToken: string) =>
        set({ user, sessionToken, isAuthenticated: true }),
      logout: () => set({ user: null, sessionToken: null, isAuthenticated: false }),
    }),
    {
      name: 'telegram-auth',
    }
  )
);
