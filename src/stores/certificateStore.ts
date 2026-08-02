import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Certificate,
  CertificateStatus,
  OverallOverride,
  UploadedReport,
} from '@/types'
import { createId, nowIso } from '@/lib/id'
import { buildDemoCertificates, buildA6ACertificateRecord } from '@/data/certificates'

function deriveStatus(reports: UploadedReport[]): CertificateStatus {
  const required: UploadedReport['reportType'][] = [
    'CHEMICAL',
    'MECHANICAL',
    'MICRO_STRUCTURE',
  ]
  const readyTypes = new Set(
    reports.filter((r) => r.status === 'READY').map((r) => r.reportType),
  )
  const allReady = required.every((t) => readyTypes.has(t))
  return allReady ? 'READY' : 'REPORTS_PENDING'
}

interface CertificateState {
  hasHydrated: boolean
  certificates: Certificate[]
  setHasHydrated: (value: boolean) => void
  getCertificate: (identifier: string) => Certificate | undefined
  getCertificates: () => Certificate[]
  addCertificate: (certificate: Certificate) => string
  updateCertificate: (id: string, patch: Partial<Certificate>) => void
  deleteCertificate: (id: string) => void
  upsertCertificate: (certificate: Certificate) => void
  setReports: (certificateId: string, reports: UploadedReport[]) => void
  setOverallOverride: (certificateId: string, override: OverallOverride) => void
  clearOverallOverride: (certificateId: string) => void
  setStatus: (certificateId: string, status: CertificateStatus) => void
  issueCertificate: (certificateId: string) => void
  seedDemoData: () => void
  loadA6ADemo: () => string
}

export const useCertificateStore = create<CertificateState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      certificates: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      getCertificate: (identifier) =>
        get().certificates.find(
          (item) =>
            item.id === identifier || item.certificateNumber === identifier,
        ),
      getCertificates: () => get().certificates,
      addCertificate: (certificate) => {
        set((state) => ({
          certificates: [certificate, ...state.certificates],
        }))
        return certificate.id
      },
      updateCertificate: (id, patch) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...patch,
                  status: patch.reports ? deriveStatus(patch.reports) : c.status,
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      deleteCertificate: (id) =>
        set((state) => ({
          certificates: state.certificates.filter((c) => c.id !== id),
        })),
      upsertCertificate: (certificate) =>
        set((state) => {
          const exists = state.certificates.some((c) => c.id === certificate.id)
          const updated = {
            ...certificate,
            status: deriveStatus(certificate.reports),
            updatedAt: nowIso(),
          }
          return {
            certificates: exists
              ? state.certificates.map((c) =>
                  c.id === certificate.id ? updated : c,
                )
              : [updated, ...state.certificates],
          }
        }),
      setReports: (certificateId, reports) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === certificateId
              ? {
                  ...c,
                  reports,
                  status: deriveStatus(reports),
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      setOverallOverride: (certificateId, override) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === certificateId
              ? {
                  ...c,
                  overallResultOverride: override,
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      clearOverallOverride: (certificateId) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === certificateId
              ? { ...c, overallResultOverride: undefined }
              : c,
          ),
        })),
      setStatus: (certificateId, status) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === certificateId
              ? { ...c, status, updatedAt: nowIso() }
              : c,
          ),
        })),
      issueCertificate: (certificateId) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === certificateId
              ? {
                  ...c,
                  status: 'ISSUED',
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      seedDemoData: () => {
        const current = get().certificates
        if (current.length > 0) return
        set({ certificates: buildDemoCertificates() })
      },
      loadA6ADemo: () => {
        const existing = get().getCertificate('TC-2026-000184')
        if (existing) return existing.id
        const record = buildA6ACertificateRecord()
        const id = get().addCertificate({ ...record, id: createId() })
        return id
      },
    }),
    {
      name: 'gn-alt-certificates',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)