import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Inbox, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { useDepartmentRequestStore } from '@/stores/departmentRequestStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useStoresHydrated } from '@/hooks/useHydrated'
import type { RequestStatus } from '@/types'

type Item = { key: string; status: string; line1: string; line2: string; badge: string; note?: string; department: string }

export function DepartmentRequestsPage() {
  const hydrated = useStoresHydrated()
  const requests = useDepartmentRequestStore((s) => s.requests)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const [filter, setFilter] = useState<'ALL' | RequestStatus>('ALL')

  const items = useMemo<Item[]>(() => {
    const certItems: Item[] = requests.map((r) => ({
      key: r.id,
      status: r.status,
      line1: `${r.certificateNo}`,
      line2: `${r.sectionName} → ${r.department} · requested by ${r.requestedBy} · ${new Date(r.requestedAt).toLocaleString()}`,
      badge: `${r.sapNo} · ${r.heatCode}${r.heatSample ? ` / ${r.heatSample}` : ''}`,
      note: r.comment,
      department: r.department,
    }))
    const heatItems: Item[] = heatRecords.flatMap((h) =>
      (h.requests ?? []).map((req) => ({
        key: `heat-${h.id}-${req.id}`,
        status: req.status,
        line1: `${h.sapNo} / ${h.heatCode}`,
        line2: `${req.sectionName} → ${req.department} · heat record`,
        badge: `${h.heatCode}${req.sampleLabel ? ` / ${req.sampleLabel}` : ''}`,
        note: undefined,
        department: req.department,
      })),
    )
    return [...certItems, ...heatItems]
  }, [requests, heatRecords])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return items
    return items.filter((i) => i.status === filter)
  }, [items, filter])

  const pending = items.filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS').length

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="Department Requests" />
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
        title="Department Requests"
        description="Reports requested from testing departments for certificates and heat records."
        actions={
          <Button asChild>
            <Link to="/departments/inbox">
              <Inbox className="h-4 w-4" />
              Department Inbox
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['ALL', 'PENDING', 'IN_PROGRESS', 'UPLOADED', 'REVIEWED', 'CANCELLED'] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'outline'}
            onClick={() => setFilter(s as typeof filter)}
            className="h-7 text-xs"
          >
            {s === 'ALL' ? `All (${items.length})` : `${s} (${items.filter((i) => i.status === s).length})`}
          </Button>
        ))}
        <Badge variant="secondary" className="ml-auto">
          <Clock className="mr-1 h-3 w-3" /> {pending} pending
        </Badge>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Send className="h-8 w-8" />}
          title="No requests"
          description="Requests appear here when a report is sent to a department for testing."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.key}>
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{item.line1}</span>
                      <Badge variant="outline" className="font-mono">{item.badge}</Badge>
                      <Badge variant={item.status === 'PENDING' ? 'default' : 'outline'}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.line2}</p>
                    {item.note ? <p className="text-xs text-muted-foreground">Note: {item.note}</p> : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{item.department}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
