import { useEffect, useState } from 'react'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useClientStore } from '@/stores/clientStore'
import { useItemStore } from '@/stores/itemStore'

export function useCertificatesHydrated(): boolean {
  const hydrated = useCertificateStore((s) => s.hasHydrated)
  return hydrated
}

export function useHeatRecordsHydrated(): boolean {
  const hydrated = useHeatRecordStore((s) => s.hasHydrated)
  return hydrated
}

export function useClientsHydrated(): boolean {
  const hydrated = useClientStore((s) => s.hasHydrated)
  return hydrated
}

export function useItemsHydrated(): boolean {
  const hydrated = useItemStore((s) => s.hasHydrated)
  return hydrated
}

export function useStoresHydrated(): boolean {
  const certHydrated = useCertificatesHydrated()
  const heatHydrated = useHeatRecordsHydrated()
  const clientHydrated = useClientsHydrated()
  const itemHydrated = useItemsHydrated()
  return certHydrated && heatHydrated && clientHydrated && itemHydrated
}

export function useHydratedAfter(millis = 50): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), millis)
    return () => clearTimeout(t)
  }, [millis])
  return ready
}
