import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  //isAuthenticated: boolean
  isAuthLoading: boolean

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setAuthLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isAuthLoading: true,
      
      setAuth: (user, accessToken, refreshToken) => set({
        user,
        accessToken,
        refreshToken,
        //isAuthenticated: true,
        isAuthLoading: false
      }),
      
      clearAuth: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        //isAuthenticated: false,
        isAuthLoading: false
      }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      setAuthLoading: (loading) => set({ isAuthLoading: loading }),
    }),
    {
      name: 'fintrack-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Khi localStorage đã đọc xong và đổ vào store
          state.setAuthLoading(false); 
        }
      },
    }
  )
)

export const useIsAuthenticated = () => useAuthStore((state) => !!state.accessToken);