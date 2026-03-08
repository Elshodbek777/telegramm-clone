export interface User {
  userId: string;
  phoneNumber: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  profilePhotoUrl?: string;
  statusMessage?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterResponse {
  verificationId: string;
  expiresAt: number;
}

export interface VerifyResponse {
  userId: string;
  sessionToken: string;
  expiresAt: number;
  isNewUser: boolean;
  user: User;
}

export interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, sessionToken: string) => void;
  logout: () => void;
}
