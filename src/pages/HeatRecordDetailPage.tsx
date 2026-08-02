import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  FilePlus2,
  Hash,
  Layers,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { HeatRecordStatusBadge } from '@/components/StatusBadge'
import { NotFoundState } from '@/components/EmptyState'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useItemStore } from '@/stores/itemStore'
import { useHeatRecordsHydrated, useItemsHydrated } from '@/hooks/useHydrated'
import { LoadingPage } from '@/components/EmptyState'
import { toast } from 'sonner'

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value?: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </span>
    </div>
  )
}

export function HeatRecordDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const hydrated = useHeatRecordsHydrated()
  const itemsHydrated = useItemsHydrated()
  const record = useHeatRecordStore((s) =>
    hydrated ? s.getHeatRecord(id) : undefined,
  )
  const items = useItemStore((s) => s.items)
  const item = record ? items.find((i) => i.id === record.itemId) : undefined

  if (!hydrated || !itemsHydrated) return <LoadingPage label="Loading heat record…" />

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
        title={item?.name ?? record.dailyHeatNumber}
        description={`${item?.partNumber ?? record.itemId}`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                toast.info('Creating certificate from heat record')
                navigate(`/certificates/new?fromHeat=${record.id}`)
              }}
            >
              <FilePlus2 className="h-4 w-4" />
              Use in Certificate
            </Button>
            <Button asChild>
              <Link to={`/heat-records/${record.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Part</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Part Name" value={item?.name ?? record.itemId} />
            <DetailRow label="Part Number" value={item?.partNumber ?? ''} />
            <DetailRow label="Quantity" value={`${record.quantity} ${record.quantityUnit}`} />
            <DetailRow label="Material" value={item?.material ?? ''} />
            <DetailRow label="Grade" value={item?.grade ?? ''} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Heat Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Daily Heat No." value={record.dailyHeatNumber} mono />
            <DetailRow label="Monthly Heat No." value={record.monthlyHeatNumber} mono />
            <DetailRow label="Yearly Heat No." value={record.yearlyHeatNumber} mono />
            <DetailRow label="Batch Number" value={record.batchNumber} mono />
            <div className="flex items-center justify-between border-b py-2 last:border-0">
              <span className="text-sm text-muted-foreground">Status</span>
              <HeatRecordStatusBadge value={record.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Invoice & Dispatch</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Invoice / Challan Number" value={record.invoiceNumber} />
            <DetailRow label="Invoice Date" value={record.invoiceDate} />
            <DetailRow label="Delivery Condition" value={record.deliveryCondition} />
            <DetailRow label="Production Date" value={record.productionDate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Other</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Remarks" value={record.remarks} />
            <DetailRow label="Created" value={new Date(record.createdAt).toLocaleDateString()} />
            <DetailRow label="Updated" value={new Date(record.updatedAt).toLocaleDateString()} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <Button variant="ghost" asChild>
          <Link to="/heat-records">
            <ArrowLeft className="h-4 w-4" />
            Back to Heat Records
          </Link>
        </Button>
      </div>
    </div>
  )
}
