import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import client from '../api/client';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: async (email, password) => {
        const { data } = await client.post('/auth/login', { email, password });
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        return data.user;
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        window.location.href = '/login';
      },

      fetchUser: async () => {
        try {
          const { data } = await client.get('/auth/me');
          set({ user: data.user });
          return data.user;
        } catch {
          get().logout();
        }
      },

      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'sts-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;
