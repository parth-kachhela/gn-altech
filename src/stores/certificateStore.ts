import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Certificate,
  CertificateHeatSelection,
  CertificateStatus,
  ProductMaster,
  ReportRecord,
} from '@/types'
import { createId, nowIso } from '@/lib/id'

function upsertReportInSelection(
  selection: CertificateHeatSelection,
  report: ReportRecord,
): CertificateHeatSelection {
  const idx = selection.reportRecords.findIndex((r) => r.id === report.id)
  return {
    ...selection,
    reportRecords:
      idx !== -1
        ? selection.reportRecords.map((r) => (r.id === report.id ? report : r))
        : [...selection.reportRecords, report],
  }
}

interface CertificateState {
  hasHydrated: boolean
  certificates: Certificate[]
  setHasHydrated: (value: boolean) => void
  getCertificate: (id: string) => Certificate | undefined
  getCertificates: () => Certificate[]
  createDraft: (certificateNumber: string, certificateDate: string) => string
  upsertDraft: (cert: Certificate) => void
  updateDraft: (id: string, patch: Partial<Certificate>) => void
  setProductSnapshot: (id: string, master: ProductMaster) => void
  addHeatSelection: (id: string, selection: CertificateHeatSelection) => void
  removeHeatSelection: (id: string, selectionId: string) => void
  setSelection: (id: string, selection: CertificateHeatSelection) => void
  upsertReport: (id: string, selectionId: string, report: ReportRecord) => void
  removeReport: (id: string, selectionId: string, reportId: string) => void
  confirmReport: (id: string, selectionId: string, reportId: string, values?: ReportRecord['parsedValues']) => void
  setReportStatus: (id: string, selectionId: string, reportId: string, status: ReportRecord['status']) => void
  linkDepartmentRequest: (id: string, selectionId: string, reportId: string, requestId: string) => void
  markReviewed: (id: string) => void
  issueCertificate: (id: string) => void
  deleteCertificate: (id: string) => void
  clearAll: () => void
}

export const useCertificateStore = create<CertificateState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      certificates: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      getCertificate: (id) => get().certificates.find((c) => c.id === id),
      getCertificates: () => get().certificates,
      createDraft: (certificateNumber, certificateDate) => {
        const now = nowIso()
        const cert: Certificate = {
          id: createId(),
          certificateNumber,
          certificateDate,
          invoiceNumber: '',
          invoiceDate: '',
          deliveryCondition: '',
          remarks: '',
          productMasterId: '',
          productMasterRevision: 0,
          productSnapshot: {
            id: '',
            sapNo: '',
            partNo: '',
            description: '',
            material: '',
            customer: '',
            grade: '',
            revision: 1,
            status: 'ACTIVE',
            sections: [],
            createdAt: now,
            updatedAt: now,
          },
          selectedHeats: [],
          status: 'DRAFT',
          reviewed: false,
          testedBy: '',
          reviewedBy: '',
          approvedBy: '',
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ certificates: [cert, ...state.certificates] }))
        return cert.id
      },
      upsertDraft: (cert) =>
        set((state) => {
          const exists = state.certificates.some((c) => c.id === cert.id)
          const updated = { ...cert, updatedAt: nowIso() }
          return {
            certificates: exists
              ? state.certificates.map((c) => (c.id === cert.id ? updated : c))
              : [updated, ...state.certificates],
          }
        }),
      updateDraft: (id, patch) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c,
          ),
        })),
      setProductSnapshot: (id, master) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  productMasterId: master.id,
                  productMasterRevision: master.revision ?? 1,
                  productSnapshot: master,
                  selectedHeats: [],
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      addHeatSelection: (id, selection) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  selectedHeats: [...c.selectedHeats, selection],
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      removeHeatSelection: (id, selectionId) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  selectedHeats: c.selectedHeats.filter((s) => s.id !== selectionId),
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      setSelection: (id, selection) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  selectedHeats: c.selectedHeats.map((s) =>
                    s.id === selection.id ? selection : s,
                  ),
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      upsertReport: (id, selectionId, report) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  selectedHeats: c.selectedHeats.map((s) =>
                    s.id === selectionId ? upsertReportInSelection(s, report) : s,
                  ),
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      removeReport: (id, selectionId, reportId) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  selectedHeats: c.selectedHeats.map((s) =>
                    s.id === selectionId
                      ? {
                          ...s,
                          reportRecords: s.reportRecords.filter((r) => r.id !== reportId),
                        }
                      : s,
                  ),
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      confirmReport: (id, selectionId, reportId, values) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  selectedHeats: c.selectedHeats.map((s) =>
                    s.id === selectionId
                      ? {
                          ...s,
                          reportRecords: s.reportRecords.map((r) =>
                            r.id === reportId
                              ? {
                                  ...r,
                                  confirmed: true,
                                  parsedValues: values ?? r.parsedValues,
                                  status: 'COMPLETE',
                                }
                              : r,
                          ),
                        }
                      : s,
                  ),
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      setReportStatus: (id, selectionId, reportId, status) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  selectedHeats: c.selectedHeats.map((s) =>
                    s.id === selectionId
                      ? {
                          ...s,
                          reportRecords: s.reportRecords.map((r) =>
                            r.id === reportId ? { ...r, status } : r,
                          ),
                        }
                      : s,
                  ),
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      linkDepartmentRequest: (id, selectionId, reportId, requestId) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  selectedHeats: c.selectedHeats.map((s) =>
                    s.id === selectionId
                      ? {
                          ...s,
                          reportRecords: s.reportRecords.map((r) =>
                            r.id === reportId
                              ? { ...r, departmentRequestId: requestId, status: 'REQUESTED' }
                              : r,
                          ),
                        }
                      : s,
                  ),
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      markReviewed: (id) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? { ...c, reviewed: true, status: 'REVIEWED', updatedAt: nowIso() }
              : c,
          ),
        })),
      issueCertificate: (id) =>
        set((state) => ({
          certificates: state.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'ISSUED' as CertificateStatus,
                  issuedAt: nowIso(),
                  updatedAt: nowIso(),
                }
              : c,
          ),
        })),
      deleteCertificate: (id) =>
        set((state) => ({
          certificates: state.certificates.filter((c) => c.id !== id),
        })),
      clearAll: () => set({ certificates: [] }),
    }),
    {
      name: 'gn-alt-certificates',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)
