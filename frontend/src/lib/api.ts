import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post('/api/token/refresh/', { refresh });
          localStorage.setItem('access_token', data.access);
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh);
          }
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username: string, password: string) =>
    axios.post<{ access: string; refresh: string }>('/api/token/', { username, password }),
  me: () => api.get('/auth/me/'),
};

export const assignmentApi = {
  list: (params?: Record<string, any>) => api.get('/assignments/', { params }),
  detail: (id: number) => api.get(`/assignments/${id}/`),
  create: (data: any) => api.post('/assignments/', data),
};

export const questionApi = {
  list: (params?: Record<string, any>) => api.get('/questions/', { params }),
  detail: (id: number) => api.get(`/questions/${id}/`),
};

export const studentAnswerApi = {
  list: (params?: Record<string, any>) => api.get('/student-answers/', { params }),
  detail: (id: number) => api.get(`/student-answers/${id}/`),
  myAnswers: (params?: Record<string, any>) => api.get('/student-answers/my_answers/', { params }),
};

export const appealApi = {
  list: (params?: Record<string, any>) => api.get('/appeals/', { params }),
  detail: (id: number) => api.get(`/appeals/${id}/`),
  create: (data: any, config?: any) => api.post('/appeals/', data, config),
  submit: (id: number) => api.post(`/appeals/${id}/submit/`),
  review: (id: number, data: any) => api.post(`/appeals/${id}/review/`, data),
};

export const appealEvidenceApi = {
  list: (params?: Record<string, any>) => api.get('/appeal-evidences/', { params }),
};

export const scoreVersionApi = {
  list: (params?: Record<string, any>) => api.get('/score-versions/', { params }),
};

export const batchCorrectionApi = {
  list: (params?: Record<string, any>) => api.get('/batch-corrections/', { params }),
  detail: (id: number) => api.get(`/batch-corrections/${id}/`),
  create: (data: any) => api.post('/batch-corrections/', data),
  update: (id: number, data: any) => api.patch(`/batch-corrections/${id}/`, data),
  execute: (id: number) => api.post(`/batch-corrections/${id}/execute/`),
  rollback: (id: number) => api.post(`/batch-corrections/${id}/rollback/`),
  preview: (id: number) => api.get(`/batch-corrections/${id}/preview/`),
};

export const gradingPointApi = {
  list: (params?: Record<string, any>) => api.get('/grading-points/', { params }),
};

export const userApi = {
  list: (params?: Record<string, any>) => api.get('/users/', { params }),
  tas: () => api.get('/users/tas/'),
  students: (params?: Record<string, any>) => api.get('/users/students/', { params }),
};

export default api;
