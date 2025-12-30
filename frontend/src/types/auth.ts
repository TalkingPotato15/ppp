export interface User {
  id: string;
  email: string;
  nickname: string | null;
  auth_provider: 'LOCAL' | 'GOOGLE';
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface MessageResponse {
  message: string;
}
