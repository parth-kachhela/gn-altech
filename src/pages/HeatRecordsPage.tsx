import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Eye, Factory, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { useHeatRecordsHydrated } from '@/hooks/useHydrated'
import { dmYtoDate, inputToDmY } from '@/lib/id'

export function HeatRecordsPage() {
  const hydrated = useHeatRecordsHydrated()
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const searchHeatRecords = useHeatRecordStore((s) => s.searchHeatRecords)
  const deleteHeatRecord = useHeatRecordStore((s) => s.deleteHeatRecord)
  const setHeatRecordStatus = useHeatRecordStore((s) => s.setHeatRecordStatus)
  const masters = useProductMasterStore((s) => s.masters)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; code: string } | null>(null)

  const sapLookup = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of masters) map[m.sapNo.toLowerCase()] = `${m.partNo} · ${m.description}`
    return map
  }, [masters])

  const filtered = useMemo(() => {
    let list = heatRecords
    if (query.trim()) list = searchHeatRecords(query)
    if (dateFilter) {
      const target = inputToDmY(dateFilter)
      list = list.filter((h) => (h.date ?? '') === target || (h.date ?? '').startsWith(target))
    }
    return list
  }, [heatRecords, query, dateFilter, searchHeatRecords])

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, typeof filtered>()
    for (const h of filtered) {
      const day = h.date || 'No date'
      if (!groups.has(day)) groups.set(day, [])
      groups.get(day)!.push(h)
    }
    const dayTime = (day: string) => {
      if (day === 'No date') return -Infinity
      return dmYtoDate(day)?.getTime() ?? new Date(`${day}T00:00:00`).getTime()
    }
    return Array.from(groups.entries()).sort((a, b) => dayTime(b[0]) - dayTime(a[0]))
  }, [filtered])

  if (!hydrated) {
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
        description="Heat codes and samples linked to SAP product masters."
        actions={
          <Button asChild>
            <Link to="/heat-records/new">
              <Plus className="h-4 w-4" />
              New Heat Record
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SAP No., heat code, batch…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            className="w-44 pl-9"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        {dateFilter ? (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setDateFilter('')}>
            Clear date
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Factory className="h-8 w-8" />}
          title={query || dateFilter ? 'No matching heat records' : 'No heat records yet'}
          description="Heat codes are usually created automatically during master import. Add them manually if needed."
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
        <>
          {groupedByDay.map(([day, records]) => (
            <div key={day} className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="px-2 py-0.5">
                  {day === 'No date' ? 'No date' : (dmYtoDate(day) ?? new Date(`${day}T00:00:00`)).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </Badge>
                <span className="text-xs text-muted-foreground">{records.length} record(s)</span>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SAP No.</TableHead>
                      <TableHead>Part / Description</TableHead>
                      <TableHead>Heat Code</TableHead>
                      <TableHead>Batch No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Samples</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-mono text-xs font-medium">
                          <Link to={`/heat-records/${h.id}`} className="hover:underline">
                            {h.sapNo}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{sapLookup[h.sapNo.toLowerCase()] ?? '—'}</TableCell>
                        <TableCell className="font-mono font-medium">{h.heatCode}</TableCell>
                        <TableCell>{h.batchNo ?? '—'}</TableCell>
                        <TableCell>{h.date ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {h.heats.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              h.heats.map((s) => (
                                <Badge key={s.id} variant="outline">{h.heatCode}-{s.label}</Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{h.quantity ?? '—'}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => {
                              const next = h.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                              setHeatRecordStatus(h.id, next)
                              toast.success(next === 'ACTIVE' ? 'Heat record activated' : 'Heat record deactivated')
                            }}
                            className={`text-xs font-medium underline-offset-2 hover:underline ${
                              h.status === 'ACTIVE' ? 'text-green-600' : 'text-muted-foreground'
                            }`}
                          >
                            {h.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </button>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="Actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild className="gap-2">
                                <Link to={`/heat-records/${h.id}`}>
                                  <Eye className="h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="gap-2">
                                <Link to={`/heat-records/${h.id}/edit`}>
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget({ id: h.id, code: `${h.sapNo} / ${h.heatCode}` })}
                                className="gap-2 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}

          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete heat record?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete heat code <span className="font-semibold">{deleteTarget?.code}</span>.
                  Certificates that already selected it keep their snapshots.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (deleteTarget) {
                      deleteHeatRecord(deleteTarget.id)
                      addLog({ userId: user?.name ?? 'unknown', action: 'heat_deleted', entityType: 'HEAT_RECORD', after: { code: deleteTarget.code } })
                      toast.success('Heat record deleted')
                    }
                    setDeleteTarget(null)
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
