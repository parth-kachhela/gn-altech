import { useEffect } from 'react'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useClientStore } from '@/stores/clientStore'
import { useItemStore } from '@/stores/itemStore'
import { useStoresHydrated } from '@/hooks/useHydrated'

export function useSeedDemo() {
  const hydrated = useStoresHydrated()
  const certificates = useCertificateStore((s) => s.certificates)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const clients = useClientStore((s) => s.clients)
  const items = useItemStore((s) => s.items)
  const seedCertificates = useCertificateStore((s) => s.seedDemoData)
  const seedHeatRecords = useHeatRecordStore((s) => s.seedDemoData)
  const seedClients = useClientStore((s) => s.seedDemoData)
  const seedItems = useItemStore((s) => s.seedDemoData)

  useEffect(() => {
    if (!hydrated) return
    if (clients.length === 0) seedClients()
    if (items.length === 0) seedItems()
    if (heatRecords.length === 0) seedHeatRecords()
    if (certificates.length === 0) seedCertificates()
  }, [hydrated, clients.length, items.length, heatRecords.length, certificates.length, seedClients, seedItems, seedHeatRecords, seedCertificates])
}
