import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Role } from '@/lib/permissions'
import { ROLES } from '@/lib/permissions'

export interface AuthUser {
  name: string
  role: Role
  isDemo: boolean
  department?: string
}

interface AuthState {
  user: AuthUser | null
  login: (name: string, isDemo?: boolean) => void
  switchRole: (role: Role) => void
  setDepartment: (department: string) => void
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
            role: 'SUPER_ADMIN',
            isDemo,
          },
        }),
      switchRole: (role) =>
        set((state) =>
          state.user
            ? { user: { ...state.user, role, department: undefined } }
            : {},
        ),
      setDepartment: (department) =>
        set((state) =>
          state.user ? { user: { ...state.user, department } } : {},
        ),
      logout: () => set({ user: null }),
    }),
    {
      name: 'gn-alt-auth',
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as { user?: Partial<AuthUser> }
        const user = state.user
        if (!user) return state as AuthState
        const valid: Role[] = ROLES
        const role: Role = valid.includes(user.role as Role)
          ? (user.role as Role)
          : 'SUPER_ADMIN'
        return { ...state, user: { ...user, role } }
      },
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
