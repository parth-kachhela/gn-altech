import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { HeatRecordForm } from '@/components/heat-records/HeatRecordForm'
import { LoadingPage } from '@/components/EmptyState'
import { NotFoundState } from '@/components/EmptyState'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useHeatRecordsHydrated } from '@/hooks/useHydrated'
import { toast } from 'sonner'

export function HeatRecordEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const hydrated = useHeatRecordsHydrated()
  const record = useHeatRecordStore((s) =>
    hydrated ? s.getHeatRecord(id) : undefined,
  )
  const updateHeatRecord = useHeatRecordStore((s) => s.updateHeatRecord)

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
      <PageHeader
        title="Edit Heat Record"
        description="Update heat numbers and part details as provided by the factory."
      />
      <HeatRecordForm
        initial={record}
        onSubmit={(values) => {
          updateHeatRecord(id, values)
          toast.success('Heat record updated')
          navigate(`/heat-records/${id}`)
        }}
      />
    </div>
  )
}
