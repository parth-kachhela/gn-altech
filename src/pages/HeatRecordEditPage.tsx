import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { HeatRecordForm } from '@/components/heat-records/HeatRecordForm'
import { LoadingPage, NotFoundState } from '@/components/EmptyState'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useHeatRecordsHydrated } from '@/hooks/useHydrated'

export function HeatRecordEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const hydrated = useHeatRecordsHydrated()
  const record = useHeatRecordStore((s) => (hydrated ? s.getHeatRecord(id) : undefined))

  if (!hydrated) return <LoadingPage label="Loading heat record…" />

  if (!record) {
    return (
      <NotFoundState
        backTo="/heat-records"
        backLabel="Back to Heat Records"
        title="Heat Record Not Found"
      />
    )
  }

  return (
    <div>
      <PageHeader title="Edit Heat Record" description="Update the heat code and samples." />
      <HeatRecordForm initial={record} onSaved={(savedId) => navigate(`/heat-records/${savedId}`)} />
    </div>
  )
}
