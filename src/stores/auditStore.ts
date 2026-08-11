import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuditLog } from '@/types'
import { createId, nowIso } from '@/lib/id'

interface AuditState {
  hasHydrated: boolean
  logs: AuditLog[]
  setHasHydrated: (value: boolean) => void
  addLog: (entry: Omit<AuditLog, 'id' | 'timestamp'>) => void
  getLogs: () => AuditLog[]
  clearAll: () => void
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      logs: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addLog: (entry) =>
        set((state) => ({
          logs: [
            { ...entry, id: createId(), timestamp: nowIso() },
            ...state.logs,
          ],
        })),
      getLogs: () => get().logs,
      clearAll: () => set({ logs: [] }),
    }),
    {
      name: 'gn-alt-audit',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)
