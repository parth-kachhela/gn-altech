import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AuthUser {
  name: string
  role: string
  isDemo: boolean
}

interface AuthState {
  user: AuthUser | null
  login: (name: string, isDemo?: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (name, isDemo = false) =>
        set({
          user: {
            name: name || 'Demo User',
            role: 'Quality Control',
            isDemo,
          },
        }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'gn-alt-auth',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
