import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
        // Redirect to login if refresh fails
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; nickname?: string }) =>
    api.post('/api/auth/register', data),

  login: (data: { email: string; password: string; remember_me?: boolean }) =>
    api.post('/api/auth/login', data),

  logout: () => api.post('/api/auth/logout'),

  refresh: () => api.post('/api/auth/refresh'),

  googleAuth: (idToken: string) =>
    api.post('/api/auth/google', { id_token: idToken }),

  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/api/auth/reset-password', { token, new_password: newPassword }),
};

// User API
export const userApi = {
  getProfile: () => api.get('/api/users/me'),
  updateProfile: (data: { nickname?: string }) =>
    api.patch('/api/users/me', data),
};

// Discovery API
export const discoveryApi = {
  getProblems: (params?: {
    domain?: string;
    trend?: string;
    sentiment?: string;
    keywords?: string;
    sort_by?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/api/discovery/problems', { params }),

  getProblem: (id: string) => api.get(`/api/discovery/problems/${id}`),

  getDomains: () => api.get('/api/discovery/domains'),
};

// Ideas API (Stage B)
export const ideasApi = {
  generate: (problemId: string, feedback?: string) =>
    api.post('/api/ideas/generate', { problem_id: problemId, feedback }),

  getSessions: (params?: { limit?: number; offset?: number }) =>
    api.get('/api/ideas/sessions', { params }),

  getSession: (sessionId: string) =>
    api.get(`/api/ideas/sessions/${sessionId}`),

  getLatestSessionForProblem: (problemId: string) =>
    api.get(`/api/ideas/problem/${problemId}/latest`),

  saveIdea: (ideaId: string, notes?: string) =>
    api.post(`/api/ideas/${ideaId}/save`, { notes }),

  unsaveIdea: (savedId: string) =>
    api.delete(`/api/ideas/saved/${savedId}`),

  getSavedIdeas: (params?: { limit?: number; offset?: number }) =>
    api.get('/api/ideas/saved', { params }),

  checkSavedStatus: (ideaId: string) =>
    api.get(`/api/ideas/${ideaId}/saved-status`),
};
