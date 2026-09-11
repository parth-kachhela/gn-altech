import { useEffect, useState } from 'react'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useAuditStore } from '@/stores/auditStore'
import { useDepartmentRequestStore } from '@/stores/departmentRequestStore'

export function useCertificatesHydrated(): boolean {
  const hydrated = useCertificateStore((s) => s.hasHydrated)
  return hydrated
}

export function useProductMastersHydrated(): boolean {
  const hydrated = useProductMasterStore((s) => s.hasHydrated)
  return hydrated
}

export function useHeatRecordsHydrated(): boolean {
  const hydrated = useHeatRecordStore((s) => s.hasHydrated)
  return hydrated
}

export function useAuditHydrated(): boolean {
  const hydrated = useAuditStore((s) => s.hasHydrated)
  return hydrated
}

export function useDepartmentRequestsHydrated(): boolean {
  const hydrated = useDepartmentRequestStore((s) => s.hasHydrated)
  return hydrated
}

export function useStoresHydrated(): boolean {
  const certHydrated = useCertificatesHydrated()
  const heatHydrated = useHeatRecordsHydrated()
  const masterHydrated = useProductMastersHydrated()
  const auditHydrated = useAuditHydrated()
  const deptHydrated = useDepartmentRequestsHydrated()
  // Safety timeout: never leave the whole app stuck on a loader because one
  // persisted slice is slow — render from cache/server after 1.2s regardless.
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 1200)
    return () => clearTimeout(t)
  }, [])
  return (certHydrated && heatHydrated && masterHydrated && auditHydrated && deptHydrated) || timedOut
}

export function useHydratedAfter(millis = 50): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), millis)
    return () => clearTimeout(t)
  }, [millis])
  return ready
}
