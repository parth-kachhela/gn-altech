import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { HeatRecordForm } from '@/components/heat-records/HeatRecordForm'
import { useHeatRecordsHydrated } from '@/hooks/useHydrated'
import { LoadingPage } from '@/components/EmptyState'

export function HeatRecordNewPage() {
  const navigate = useNavigate()
  const hydrated = useHeatRecordsHydrated()
  if (!hydrated) return <LoadingPage label="Loading…" />
  return (
    <div>
      <PageHeader
        title="New Heat Record"
        description="Create a heat code linked to an SAP product master."
      />
      <HeatRecordForm onSaved={(id) => navigate(`/heat-records/${id}`)} />
    </div>
  )
}
