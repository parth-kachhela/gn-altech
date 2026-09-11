import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppRole, AppUser } from '@/types'
import { createId } from '@/lib/id'
import { ROLES } from '@/lib/permissions'

export interface LoginAccount extends AppUser {
  username: string
  password: string
}

interface UsersState {
  hasHydrated: boolean
  users: AppUser[]
  accounts: LoginAccount[]
  setHasHydrated: (value: boolean) => void
  getUsers: () => AppUser[]
  findAccount: (username: string) => LoginAccount | undefined
  checkCredentials: (username: string, password: string) => LoginAccount | undefined
  addUser: (input: Omit<AppUser, 'id'> & { username?: string; password?: string }) => void
  updateUser: (id: string, patch: Partial<AppUser> & { password?: string }) => void
  deleteUser: (id: string) => void
  seedDefaultAccounts: () => void
  clearAll: () => void
}

export const DEFAULT_ACCOUNTS: Array<{ username: string; password: string; name: string; role: AppRole; department?: string }> = [
  { username: 'superadmin', password: 'Admin@123', name: 'Super Admin', role: 'SUPER_ADMIN' },
  { username: 'chemical', password: 'Chem@123', name: 'Chemical Operator', role: 'DEPARTMENT_UPLOADER', department: 'Chemical Lab' },
  { username: 'micro', password: 'Micro@123', name: 'Micro Operator', role: 'DEPARTMENT_UPLOADER', department: 'Micro Lab' },
  { username: 'tensile', password: 'Tensile@123', name: 'Tensile Operator', role: 'DEPARTMENT_UPLOADER', department: 'Tensile Lab' },
  { username: 'hardness', password: 'Hard@123', name: 'Hardness Operator', role: 'DEPARTMENT_UPLOADER', department: 'Hardness Lab' },
]

export const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      users: [],
      accounts: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      getUsers: () => get().users,
      findAccount: (username) =>
        get().accounts.find((a) => a.username.toLowerCase() === username.toLowerCase()),
      checkCredentials: (username, password) => {
        get().seedDefaultAccounts()
        return get().accounts.find(
          (a) => a.username.toLowerCase() === username.toLowerCase() && a.password === password,
        )
      },
      addUser: (input) => {
        const user: AppUser = { ...input, id: createId() }
        set((state) => ({ users: [...state.users, user] }))
        if (input.username && input.password) {
          const acc: LoginAccount = {
            id: user.id, name: input.name, role: input.role, department: input.department,
            username: input.username, password: input.password,
          }
          set((state) => ({ accounts: [...state.accounts.filter((a) => a.username !== acc.username), acc] }))
        }
      },
      updateUser: (id, patch) =>
        set((state) => ({
          users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, ...patch, username: (patch as LoginAccount).username ?? a.username } : a,
          ),
        })),
      deleteUser: (id) =>
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
          accounts: state.accounts.filter((a) => a.id !== id),
        })),
      seedDefaultAccounts: () => {
        if (get().accounts.length > 0) return
        const accounts: LoginAccount[] = DEFAULT_ACCOUNTS.map((d) => ({ ...d, id: createId() }))
        const users: AppUser[] = accounts.map(({ username: _u, password: _p, ...rest }) => rest)
        set((state) => ({
          accounts: [...state.accounts, ...accounts],
          users: state.users.length > 0 ? state.users : [...state.users, ...users],
        }))
      },
      clearAll: () => set({ users: [], accounts: [] }),
    }),
    {
      name: 'gn-alt-users',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
        state?.seedDefaultAccounts()
      },
    },
  ),
)

export function isValidRole(role: string | undefined): role is AppRole {
  return ROLES.includes(role as AppRole)
}
