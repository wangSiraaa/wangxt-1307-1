import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login(username, password);
          get().setTokens(data.access, data.refresh);
          await get().fetchMe();
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      },

      fetchMe: async () => {
        try {
          const { data } = await authApi.me();
          set({ user: data, isAuthenticated: true });
        } catch (e) {
          get().logout();
        }
      },

      setTokens: (access: string, refresh: string) => {
        set({ accessToken: access, refreshToken: refresh });
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
