import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { DepartmentRequest, RequestStatus } from '@/types'
import { createId, nowIso } from '@/lib/id'

interface DepartmentRequestState {
  hasHydrated: boolean
  requests: DepartmentRequest[]
  setHasHydrated: (value: boolean) => void
  getRequest: (id: string) => DepartmentRequest | undefined
  getRequests: () => DepartmentRequest[]
  createRequest: (input: Omit<DepartmentRequest, 'id' | 'requestedAt' | 'status' | 'comments'>) => string
  updateStatus: (id: string, status: RequestStatus) => void
  addComment: (id: string, text: string, user: string) => void
  linkReport: (id: string, reportRecordId: string) => void
  clearAll: () => void
}

export const useDepartmentRequestStore = create<DepartmentRequestState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      requests: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      getRequest: (id) => get().requests.find((r) => r.id === id),
      getRequests: () => get().requests,
      createRequest: (input) => {
        const id = createId()
        const request: DepartmentRequest = {
          ...input,
          id,
          requestedAt: nowIso(),
          status: 'PENDING',
          comments: [],
        }
        set((state) => ({ requests: [request, ...state.requests] }))
        return id
      },
      updateStatus: (id, status) =>
        set((state) => ({
          requests: state.requests.map((r) => (r.id === id ? { ...r, status } : r)),
        })),
      addComment: (id, text, user) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id
              ? { ...r, comments: [...r.comments, { id: createId(), text, user, at: nowIso() }] }
              : r,
          ),
        })),
      linkReport: (id, reportRecordId) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, reportRecordId, status: 'UPLOADED' } : r,
          ),
        })),
      clearAll: () => set({ requests: [] }),
    }),
    {
      name: 'gn-alt-department-requests',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)
