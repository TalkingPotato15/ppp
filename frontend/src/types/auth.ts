export interface User {
  id: string;
  email: string;
  nickname: string | null;
  auth_provider: 'LOCAL' | 'GOOGLE';
  is_active?: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

export interface TokenResponse {
  access_token: string;
}

export interface MessageResponse {
  message: string;
}
