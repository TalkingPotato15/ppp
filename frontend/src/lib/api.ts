import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { User, AuthResponse } from '@/types/auth';
import type {
  PaymentStatusResponse,
  PaymentConfirmResponse,
  PaymentFailureResponse,
} from '@/types/payment';

// ============================================
// Types
// ============================================

export type { User, AuthResponse } from '@/types/auth';
export type {
  PaymentStatusResponse,
  PaymentConfirmResponse,
  PaymentFailureResponse,
} from '@/types/payment';

export interface Problem {
  id: string;
  source_url: string;
  title: string;
  keywords: string[];
  domain_tag: string;
  trend: 'RISING' | 'STABLE' | 'DECLINING';
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  posted_at: string;
  created_at: string;
}

export interface ProblemListResponse {
  items: Problem[];
  total: number;
  has_more: boolean;
  limit: number;
  offset: number;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  target_audience: string;
  differentiators: string[];
  market_opportunity: string;
  implementation_hints: string;
  market_signals: string[];
  confidence_score: number | null;
  is_bookmarked: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface GenerationSession {
  id: string;
  user_id: string;
  problem_id: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  feedback: string | null;
  error_message: string | null;
  rag_context: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
  ideas: Idea[];
}

export interface SavedIdea {
  id: string;
  idea: Idea;
  problem_id: string;
  problem_title: string;
  notes: string | null;
  saved_at: string;
}

export interface IdeaWithContext extends Idea {
  problem_id: string;
  problem_title: string;
  is_deleted: boolean;
}

export interface SoftDeleteResponse {
  idea_id: string;
  is_deleted: boolean;
  message: string;
}

// ============================================
// Axios Instance
// ============================================

const api = axios.create({
  baseURL: '', // Same origin for Next.js API routes
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// Token Refresh Logic
// ============================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/api/auth/refresh');
        processQueue(null, 'refreshed');
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(new Error('Refresh failed'), null);
        // Don't redirect here - let auth context handle it
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ============================================
// Auth API
// ============================================

export const authApi = {
  register: (data: { email: string; password: string; nickname?: string }) =>
    api.post<AuthResponse>('/api/auth/register', data),

  login: (data: { email: string; password: string; remember_me?: boolean }) =>
    api.post<AuthResponse>('/api/auth/login', data),

  logout: () =>
    api.post<{ message: string }>('/api/auth/logout'),

  refresh: () =>
    api.post<{ access_token: string }>('/api/auth/refresh'),

  googleAuth: (idToken: string) =>
    api.post<AuthResponse>('/api/auth/google', { id_token: idToken }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/api/auth/reset-password', { token, new_password: newPassword }),
};

// ============================================
// User API
// ============================================

export const userApi = {
  getProfile: () =>
    api.get<User>('/api/users/me'),

  updateProfile: (data: { nickname?: string }) =>
    api.patch<User>('/api/users/me', data),
};

// ============================================
// Discovery API
// ============================================

export const discoveryApi = {
  getProblems: (params?: {
    domain?: string;
    trend?: 'RISING' | 'STABLE' | 'DECLINING';
    sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    keywords?: string;
    sort_by?: 'recent' | 'oldest';
    limit?: number;
    offset?: number;
  }) => api.get<ProblemListResponse>('/api/discovery/problems', { params }),

  getProblem: (id: string) =>
    api.get<Problem>(`/api/discovery/problems/${id}`),

  getDomains: () =>
    api.get<{ domains: string[] }>('/api/discovery/domains'),
};

// ============================================
// Ideas API (Stage B)
// ============================================

export const ideasApi = {
  generate: (problemId: string, paymentId?: string, feedback?: string) =>
    api.post<GenerationSession>('/api/ideas/generate', {
      problem_id: problemId,
      payment_id: paymentId || null,
      feedback: feedback || null,
    }),

  getSessions: (params?: { limit?: number; offset?: number }) =>
    api.get<{ items: GenerationSession[]; total: number }>('/api/ideas/sessions', { params }),

  getSession: (sessionId: string) =>
    api.get<GenerationSession>(`/api/ideas/sessions/${sessionId}`),

  getLatestSessionForProblem: (problemId: string) =>
    api.get<GenerationSession>(`/api/ideas/problem/${problemId}/latest`),

  saveIdea: (ideaId: string, notes?: string) =>
    api.post<SavedIdea>(`/api/ideas/${ideaId}/save`, { notes: notes || null }),

  unsaveIdea: (savedId: string) =>
    api.delete<{ message: string }>(`/api/ideas/saved/${savedId}`),

  getSavedIdeas: (params?: { limit?: number; offset?: number }) =>
    api.get<{ items: SavedIdea[]; total: number }>('/api/ideas/saved', { params }),

  checkSavedStatus: (ideaId: string) =>
    api.get<{ is_saved: boolean; saved_id: string | null }>(`/api/ideas/${ideaId}/saved-status`),

  toggleBookmark: (ideaId: string, isBookmarked: boolean) =>
    api.patch<{ idea_id: string; is_bookmarked: boolean }>(`/api/ideas/${ideaId}/bookmark`, {
      is_bookmarked: isBookmarked
    }),

  getBookmarkedIdeas: (params?: { limit?: number; offset?: number }) =>
    api.get<{ items: IdeaWithContext[]; total: number }>('/api/ideas/bookmarked', { params }),

  // My Ideas - all generated ideas
  getMyIdeas: (params?: { bookmarked_only?: boolean; limit?: number; offset?: number }) =>
    api.get<{ items: IdeaWithContext[]; total: number }>('/api/ideas/my-ideas', { params }),

  // Soft delete/restore
  deleteIdea: (ideaId: string) =>
    api.delete<SoftDeleteResponse>(`/api/ideas/${ideaId}`),

  restoreIdea: (ideaId: string) =>
    api.post<SoftDeleteResponse>(`/api/ideas/${ideaId}/restore`),
};

// ============================================
// Payment API
// ============================================

export const paymentApi = {
  confirmPayment: (data: { payment_key: string; order_id: string; amount: number; problem_id: string }) =>
    api.post<PaymentConfirmResponse>('/api/payment/confirm', data),

  recordFailure: (data: { order_id: string; code: string; message: string }) =>
    api.post<PaymentFailureResponse>('/api/payment/fail', data),

  getPaymentStatus: (orderId: string) =>
    api.get<PaymentStatusResponse>(`/api/payment/status/${orderId}`),

  checkUnusedPayment: (problemId: string) =>
    api.get<{ has_unused_payment: boolean; payment_id: string | null }>(`/api/payment/check-unused?problem_id=${problemId}`),
};
