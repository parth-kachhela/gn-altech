import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { HeatRecordForm } from '@/components/heat-records/HeatRecordForm'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { toast } from 'sonner'

export function HeatRecordNewPage() {
  const navigate = useNavigate()
  const addHeatRecord = useHeatRecordStore((s) => s.addHeatRecord)

  return (
    <div>
      <PageHeader
        title="New Heat Record"
        description="Enter heat numbers manually as provided by the factory."
      />
      <HeatRecordForm
        onSubmit={(values) => {
          const id = addHeatRecord(values)
          toast.success('Heat record created')
          navigate(`/heat-records/${id}`)
        }}
      />
    </div>
  )
}
