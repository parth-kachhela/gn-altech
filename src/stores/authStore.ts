import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Role } from '@/lib/permissions'
import { ROLES } from '@/lib/permissions'
import { useUsersStore } from '@/stores/usersStore'

export interface AuthUser {
  name: string
  username?: string
  role: Role
  isDemo: boolean
  department?: string
}

interface AuthState {
  user: AuthUser | null
  login: (name: string, isDemo?: boolean) => void
  loginAs: (name: string, role: Role, department?: string) => void
  loginWithCredentials: (username: string, password: string) => { ok: boolean; error?: string }
  switchRole: (role: Role) => void
  setDepartment: (department: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (name, isDemo = false) =>
        set({ user: { name: name || 'Demo User', role: 'SUPER_ADMIN', isDemo } }),
      loginAs: (name, role, department) =>
        set({ user: { name: name || 'Demo User', role, isDemo: true, department } }),
      loginWithCredentials: (username, password) => {
        const acc = useUsersStore.getState().checkCredentials(username.trim(), password)
        if (!acc) return { ok: false, error: 'Invalid username or password' }
        set({
          user: {
            name: acc.name, username: acc.username, role: acc.role,
            isDemo: false, department: acc.department,
          },
        })
        return { ok: true }
      },
      switchRole: (role) =>
        set((state) => (state.user ? { user: { ...state.user, role, department: undefined } } : {})),
      setDepartment: (department) =>
        set((state) => (state.user ? { user: { ...state.user, department } } : {})),
      logout: () => set({ user: null }),
    }),
    {
      name: 'gn-alt-auth',
      // NOTE: session-only auth — deliberately NOT persisted so each
      // browser/tab logs in as a different department user (multi-user demo).
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

export { ROLES }
