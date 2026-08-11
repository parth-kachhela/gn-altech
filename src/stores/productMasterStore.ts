import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ProductMaster } from '@/types'
import { nowIso } from '@/lib/id'

export interface ImportOutcome {
  added: string[]
  updated: string[]
  skipped: string[]
}

interface ProductMasterState {
  hasHydrated: boolean
  masters: ProductMaster[]
  setHasHydrated: (value: boolean) => void
  getMaster: (id: string) => ProductMaster | undefined
  getMasterBySap: (sapNo: string) => ProductMaster | undefined
  getActiveMasterBySap: (sapNo: string) => ProductMaster | undefined
  getMasters: () => ProductMaster[]
  searchMasters: (query: string) => ProductMaster[]
  saveMaster: (master: ProductMaster) => void
  deleteMaster: (id: string) => void
  setMasterStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') => void
  duplicateMaster: (id: string) => string | null
  importMasters: (masters: ProductMaster[]) => ImportOutcome
  clearAll: () => void
}

export const useProductMasterStore = create<ProductMasterState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      masters: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      getMaster: (id) => get().masters.find((m) => m.id === id),
      getMasterBySap: (sapNo) =>
        get().masters.find((m) => m.sapNo.toLowerCase() === (sapNo ?? '').toLowerCase()),
      getActiveMasterBySap: (sapNo) =>
        get().masters.find(
          (m) => m.status === 'ACTIVE' && m.sapNo.toLowerCase() === (sapNo ?? '').toLowerCase(),
        ),
      getMasters: () => get().masters,
      searchMasters: (query) => {
        const q = (query ?? '').toLowerCase().trim()
        if (!q) return get().masters
        return get().masters.filter((m) =>
          [m.sapNo, m.partNo, m.description, m.material, m.customer]
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      },
      saveMaster: (master) =>
        set((state) => {
          const exists = state.masters.some((m) => m.id === master.id)
          const updated = { ...master, updatedAt: nowIso() }
          return {
            masters: exists
              ? state.masters.map((m) => (m.id === master.id ? updated : m))
              : [...state.masters, updated],
          }
        }),
      deleteMaster: (id) =>
        set((state) => ({ masters: state.masters.filter((m) => m.id !== id) })),
      setMasterStatus: (id, status) =>
        set((state) => ({
          masters: state.masters.map((m) =>
            m.id === id ? { ...m, status, updatedAt: nowIso() } : m,
          ),
        })),
      duplicateMaster: (id) => {
        const source = get().masters.find((m) => m.id === id)
        if (!source) return null
        const now = nowIso()
        const copy: ProductMaster = {
          ...source,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sapNo: source.sapNo,
          revision: (source.revision ?? 1) + 1,
          status: 'INACTIVE',
          sections: source.sections.map((s) => ({
            ...s,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            parameters: s.parameters.map((p) => ({
              ...p,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            })),
          })),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ masters: [copy, ...state.masters] }))
        return copy.id
      },
      importMasters: (incoming) => {
        const outcome: ImportOutcome = { added: [], updated: [], skipped: [] }
        const state = get()
        const bySap = new Map<string, ProductMaster>()
        for (const m of state.masters) {
          if (m.status === 'ACTIVE') bySap.set(m.sapNo.toLowerCase(), m)
        }
        const next = [...state.masters]
        for (const incomingMaster of incoming) {
          const key = incomingMaster.sapNo.toLowerCase()
          const existing = bySap.get(key)
          if (existing) {
            const updated = {
              ...incomingMaster,
              id: existing.id,
              revision: (existing.revision ?? 1) + 1,
              createdAt: existing.createdAt,
              updatedAt: nowIso(),
            }
            const idx = next.findIndex((m) => m.id === existing.id)
            if (idx !== -1) next[idx] = updated
            bySap.set(key, updated)
            outcome.updated.push(incomingMaster.sapNo)
          } else {
            next.push(incomingMaster)
            bySap.set(key, incomingMaster)
            outcome.added.push(incomingMaster.sapNo)
          }
        }
        set({ masters: next })
        return outcome
      },
      clearAll: () => set({ masters: [] }),
    }),
    {
      name: 'gn-alt-product-masters',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)
