import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppRole, AppUser } from '@/types'
import { createId } from '@/lib/id'
import { ROLES } from '@/lib/permissions'

interface UsersState {
  hasHydrated: boolean
  users: AppUser[]
  setHasHydrated: (value: boolean) => void
  getUsers: () => AppUser[]
  addUser: (input: Omit<AppUser, 'id'>) => void
  updateUser: (id: string, patch: Partial<AppUser>) => void
  deleteUser: (id: string) => void
  clearAll: () => void
}

export const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      users: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      getUsers: () => get().users,
      addUser: (input) => {
        const user: AppUser = { ...input, id: createId() }
        set((state) => ({ users: [...state.users, user] }))
      },
      updateUser: (id, patch) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        })),
      deleteUser: (id) =>
        set((state) => ({ users: state.users.filter((u) => u.id !== id) })),
      clearAll: () => set({ users: [] }),
    }),
    {
      name: 'gn-alt-users',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)

export function isValidRole(role: string | undefined): role is AppRole {
  return ROLES.includes(role as AppRole)
}
