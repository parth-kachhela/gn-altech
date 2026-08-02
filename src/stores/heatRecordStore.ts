import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { HeatRecord, HeatRecordStatus } from '@/types'
import { createId, nowIso } from '@/lib/id'
import { buildDemoHeatRecords } from '@/data/heatRecords'

interface HeatRecordState {
  hasHydrated: boolean
  heatRecords: HeatRecord[]
  setHasHydrated: (value: boolean) => void
  getHeatRecord: (id: string) => HeatRecord | undefined
  getHeatRecords: () => HeatRecord[]
  getHeatRecordsByItem: (itemId: string) => HeatRecord[]
  searchHeatRecords: (query: string, filters?: { itemId?: string }) => HeatRecord[]
  addHeatRecord: (input: Omit<HeatRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => string
  updateHeatRecord: (id: string, patch: Partial<HeatRecord>) => void
  deleteHeatRecord: (id: string) => void
  duplicateHeatRecord: (id: string) => string | null
  setHeatRecordStatus: (id: string, status: HeatRecordStatus) => void
  seedDemoData: () => void
}

export const useHeatRecordStore = create<HeatRecordState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      heatRecords: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      getHeatRecord: (id) => get().heatRecords.find((h) => h.id === id),
      getHeatRecords: () => get().heatRecords,
      getHeatRecordsByItem: (itemId) =>
        get().heatRecords.filter((h) => h.itemId === itemId),
      searchHeatRecords: (query, filters) => {
        const q = query.toLowerCase().trim()
        return get().heatRecords.filter((h) => {
          if (filters?.itemId && h.itemId !== filters.itemId) return false
          if (!q) return true
          return (
            h.dailyHeatNumber.toLowerCase().includes(q) ||
            h.monthlyHeatNumber?.toLowerCase().includes(q) ||
            h.yearlyHeatNumber?.toLowerCase().includes(q) ||
            h.batchNumber?.toLowerCase().includes(q)
          )
        })
      },
      addHeatRecord: (input) => {
        const now = nowIso()
        const record: HeatRecord = {
          ...input,
          id: createId(),
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ heatRecords: [record, ...state.heatRecords] }))
        return record.id
      },
      updateHeatRecord: (id, patch) =>
        set((state) => ({
          heatRecords: state.heatRecords.map((h) =>
            h.id === id ? { ...h, ...patch, updatedAt: nowIso() } : h,
          ),
        })),
      deleteHeatRecord: (id) =>
        set((state) => ({
          heatRecords: state.heatRecords.filter((h) => h.id !== id),
        })),
      duplicateHeatRecord: (id) => {
        const source = get().heatRecords.find((h) => h.id === id)
        if (!source) return null
        const now = nowIso()
        const record: HeatRecord = {
          ...source,
          id: createId(),
          dailyHeatNumber: '',
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ heatRecords: [record, ...state.heatRecords] }))
        return record.id
      },
      setHeatRecordStatus: (id, status) =>
        set((state) => ({
          heatRecords: state.heatRecords.map((h) =>
            h.id === id ? { ...h, status, updatedAt: nowIso() } : h,
          ),
        })),
      seedDemoData: () => {
        const current = get().heatRecords
        if (current.length > 0) return
        set({ heatRecords: buildDemoHeatRecords() })
      },
    }),
    {
      name: 'gn-alt-heat-records',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)