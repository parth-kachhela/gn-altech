import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Factory, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'
import { HeatRecordTable } from '@/components/heat-records/HeatRecordTable'
import { EmptyState } from '@/components/EmptyState'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useHeatRecordsHydrated, useItemsHydrated } from '@/hooks/useHydrated'
import { toast } from 'sonner'

export function HeatRecordsPage() {
  const navigate = useNavigate()
  const hydrated = useHeatRecordsHydrated()
  const itemsHydrated = useItemsHydrated()
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const searchHeatRecords = useHeatRecordStore((s) => s.searchHeatRecords)
  const deleteHeatRecord = useHeatRecordStore((s) => s.deleteHeatRecord)
  const duplicateHeatRecord = useHeatRecordStore((s) => s.duplicateHeatRecord)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return heatRecords
    return searchHeatRecords(query)
  }, [heatRecords, query, searchHeatRecords])

  if (!hydrated || !itemsHydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="Heat Records" />
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Heat Records"
        description="Factory-provided heat numbers are entered manually, exactly as given."
        actions={
          <Button asChild>
            <Link to="/heat-records/new">
              <Plus className="h-4 w-4" />
              New Heat Record
            </Link>
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search heat no., batch, part…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Factory className="h-8 w-8" />}
          title={query ? 'No matching heat records' : 'No heat records yet'}
          description="Add heat records with the exact heat numbers supplied by the factory."
          action={
            <Button asChild>
              <Link to="/heat-records/new">
                <Plus className="h-4 w-4" />
                New Heat Record
              </Link>
            </Button>
          }
        />
      ) : (
        <HeatRecordTable
          heatRecords={filtered}
          onDelete={(id) => deleteHeatRecord(id)}
          onDuplicate={(id) => duplicateHeatRecord(id)}
          onUseInCertificate={(id) => {
            toast.info('Creating certificate from heat record')
            navigate(`/certificates/new?fromHeat=${id}`)
          }}
        />
      )}
    </div>
  )
}
