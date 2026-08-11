import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { HeatRecord, HeatRecordStatus, HeatReportData, HeatSample, ParsedValue, RequestStatus } from '@/types'
import { createId, nowIso } from '@/lib/id'

interface HeatRecordState {
  hasHydrated: boolean
  heatRecords: HeatRecord[]
  setHasHydrated: (value: boolean) => void
  getHeatRecord: (id: string) => HeatRecord | undefined
  getHeatRecords: () => HeatRecord[]
  getHeatRecordsBySap: (sapNo: string) => HeatRecord[]
  searchHeatRecords: (query: string, sapNo?: string) => HeatRecord[]
  addHeatRecord: (input: Omit<HeatRecord, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'requests' | 'reports'>) => string
  updateHeatRecord: (id: string, patch: Partial<HeatRecord>) => void
  deleteHeatRecord: (id: string) => void
  setHeatRecordStatus: (id: string, status: HeatRecordStatus) => void
  addHeatSample: (heatRecordId: string, label: string, quantity?: string) => void
  removeHeatSample: (heatRecordId: string, sampleId: string) => void
  updateHeatSample: (heatRecordId: string, sampleId: string, patch: Partial<HeatSample>) => void
  setRequestStatus: (heatRecordId: string, requestId: string, status: RequestStatus) => void
  upsertReportData: (heatRecordId: string, report: HeatReportData) => void
  confirmReportData: (heatRecordId: string, reportId: string, values: ParsedValue[]) => void
  clearAll: () => void
}

export const useHeatRecordStore = create<HeatRecordState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      heatRecords: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      getHeatRecord: (id) => get().heatRecords.find((h) => h.id === id),
      getHeatRecords: () => get().heatRecords,
      getHeatRecordsBySap: (sapNo) =>
        get().heatRecords.filter(
          (h) => h.sapNo.toLowerCase() === (sapNo ?? '').toLowerCase(),
        ),
      searchHeatRecords: (query, sapNo) => {
        const q = (query ?? '').toLowerCase().trim()
        return get().heatRecords.filter((h) => {
          if (sapNo && h.sapNo.toLowerCase() !== sapNo.toLowerCase()) return false
          if (!q) return true
          return (
            h.heatCode.toLowerCase().includes(q) ||
            h.batchNo?.toLowerCase().includes(q) ||
            h.sapNo.toLowerCase().includes(q)
          )
        })
      },
      addHeatRecord: (input) => {
        const now = nowIso()
        const record: HeatRecord = {
          ...input,
          id: createId(),
          status: 'ACTIVE',
          heats: input.heats ?? [],
          demoReports: input.demoReports ?? {},
          requests: [],
          reports: [],
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
      setHeatRecordStatus: (id, status) =>
        set((state) => ({
          heatRecords: state.heatRecords.map((h) =>
            h.id === id ? { ...h, status, updatedAt: nowIso() } : h,
          ),
        })),
      addHeatSample: (heatRecordId, label, quantity) =>
        set((state) => ({
          heatRecords: state.heatRecords.map((h) =>
            h.id === heatRecordId
              ? {
                  ...h,
                  heats: [...h.heats, { id: createId(), label, quantity }],
                  updatedAt: nowIso(),
                }
              : h,
          ),
        })),
      removeHeatSample: (heatRecordId, sampleId) =>
        set((state) => ({
          heatRecords: state.heatRecords.map((h) =>
            h.id === heatRecordId
              ? {
                  ...h,
                  heats: h.heats.filter((s) => s.id !== sampleId),
                  updatedAt: nowIso(),
                }
              : h,
          ),
        })),
      updateHeatSample: (heatRecordId, sampleId, patch) =>
        set((state) => ({
          heatRecords: state.heatRecords.map((h) =>
            h.id === heatRecordId
              ? {
                  ...h,
                  heats: h.heats.map((s) =>
                    s.id === sampleId ? { ...s, ...patch } : s,
                  ),
                  updatedAt: nowIso(),
                }
              : h,
          ),
        })),
      setRequestStatus: (heatRecordId, requestId, status) =>
        set((state) => ({
          heatRecords: state.heatRecords.map((h) =>
            h.id === heatRecordId
              ? {
                  ...h,
                  requests: h.requests.map((r) =>
                    r.id === requestId ? { ...r, status } : r,
                  ),
                  updatedAt: nowIso(),
                }
              : h,
          ),
        })),
      upsertReportData: (heatRecordId, report) =>
        set((state) => ({
          heatRecords: state.heatRecords.map((h) =>
            h.id === heatRecordId
              ? {
                  ...h,
                  reports: h.reports.some((r) => r.id === report.id)
                    ? h.reports.map((r) => (r.id === report.id ? report : r))
                    : [...h.reports, report],
                  updatedAt: nowIso(),
                }
              : h,
          ),
        })),
      confirmReportData: (heatRecordId, reportId, values) =>
        set((state) => ({
          heatRecords: state.heatRecords.map((h) =>
            h.id === heatRecordId
              ? {
                  ...h,
                  reports: h.reports.map((r) =>
                    r.id === reportId
                      ? { ...r, confirmed: true, parsedValues: values, status: 'COMPLETE' }
                      : r,
                  ),
                  requests: h.requests.map((r) =>
                    r.id === reportId ? { ...r, status: 'REVIEWED' } : r,
                  ),
                  updatedAt: nowIso(),
                }
              : h,
          ),
        })),
      clearAll: () => set({ heatRecords: [] }),
    }),
    {
      name: 'gn-alt-heat-records',
      version: 4,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as { heatRecords?: HeatRecord[] }
        if (version < 4 && Array.isArray(state?.heatRecords)) {
          state.heatRecords = state.heatRecords.map((h) => ({
            ...h,
            requests: h.requests ?? [],
            reports: h.reports ?? [],
          }))
        }
        return state
      },
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)
