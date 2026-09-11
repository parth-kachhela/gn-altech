import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  Send,
  Search,
  Eye,
  PlusCircle,
  UploadCloud,
  ListChecks,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { useDepartmentRequestStore } from '@/stores/departmentRequestStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useStoresHydrated } from '@/hooks/useHydrated'
import type { RequestStatus } from '@/types'

type Item = {
  key: string
  heatId?: string
  status: string
  sapNo: string
  heatCode: string
  sampleLabel?: string
  sectionName: string
  department: string
  deptKey: 'CHEMICAL' | 'MICRO' | 'TENSILE' | 'HARDNESS' | 'OTHER'
  requestedBy?: string
  requestedAt?: string
  note?: string
  hasReport?: boolean
}

type DeptTabKey = 'ALL' | 'CHEMICAL' | 'MICRO' | 'TENSILE' | 'HARDNESS'

const DEPT_INFO: Record<
  DeptTabKey,
  { label: string; name: string; home: string; uploadUrl?: string; reviewUrl?: string; completedUrl?: string; addHeatUrl?: string }
> = {
  ALL: {
    label: 'All Departments',
    name: 'All Departments',
    home: '/departments',
  },
  CHEMICAL: {
    label: 'Chemical Lab',
    name: 'Chemical Analysis',
    home: '/chemical',
    addHeatUrl: '/chemical/add-heat',
    uploadUrl: '/chemical/bulk-upload',
    reviewUrl: '/chemical/review',
    completedUrl: '/chemical/completed',
  },
  MICRO: {
    label: 'Micro Lab',
    name: 'Micro Structure',
    home: '/micro',
    uploadUrl: '/micro/upload',
    reviewUrl: '/micro/review',
    completedUrl: '/micro/completed',
  },
  TENSILE: {
    label: 'Tensile Lab',
    name: 'Tensile Testing',
    home: '/tensile',
    uploadUrl: '/tensile/upload',
    reviewUrl: '/tensile/review',
    completedUrl: '/tensile/completed',
  },
  HARDNESS: {
    label: 'Hardness Lab',
    name: 'Hardness Testing',
    home: '/hardness',
    uploadUrl: '/hardness/upload',
    reviewUrl: '/hardness/review',
    completedUrl: '/hardness/completed',
  },
}

function normalizeDept(dept: string): 'CHEMICAL' | 'MICRO' | 'TENSILE' | 'HARDNESS' | 'OTHER' {
  const d = dept.toLowerCase()
  if (d.includes('chem')) return 'CHEMICAL'
  if (d.includes('micro')) return 'MICRO'
  if (d.includes('tens')) return 'TENSILE'
  if (d.includes('hard') || d.includes('mech')) return 'HARDNESS'
  return 'OTHER'
}

export function DepartmentRequestsPage() {
  const hydrated = useStoresHydrated()
  const requests = useDepartmentRequestStore((s) => s.requests)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)

  const [activeDept, setActiveDept] = useState<DeptTabKey>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | RequestStatus>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const allItems = useMemo<Item[]>(() => {
    const certItems: Item[] = requests.map((r) => ({
      key: r.id,
      status: r.status,
      sapNo: r.sapNo,
      heatCode: r.heatCode,
      sampleLabel: r.heatSample,
      sectionName: r.sectionName,
      department: r.department,
      deptKey: normalizeDept(r.department),
      requestedBy: r.requestedBy,
      requestedAt: r.requestedAt,
      note: r.comment,
    }))

    const heatItems: Item[] = heatRecords.flatMap((h) =>
      (h.requests ?? []).map((req) => {
        const matchingReport = (h.reports ?? []).find(
          (rep) => rep.sectionKey === req.sectionKey && rep.sampleId === req.sampleId,
        )
        return {
          key: `heat-${h.id}-${req.id}`,
          heatId: h.id,
          status: req.status,
          sapNo: h.sapNo,
          heatCode: h.heatCode,
          sampleLabel: req.sampleLabel,
          sectionName: req.sectionName,
          department: req.department,
          deptKey: normalizeDept(req.department),
          requestedBy: 'Heat Record Request',
          requestedAt: h.createdAt,
          hasReport: Boolean(matchingReport),
        }
      }),
    )

    return [...certItems, ...heatItems]
  }, [requests, heatRecords])

  const deptFilteredItems = useMemo(() => {
    if (activeDept === 'ALL') return allItems
    return allItems.filter((i) => i.deptKey === activeDept)
  }, [allItems, activeDept])

  const finalFilteredItems = useMemo(() => {
    let list = deptFilteredItems
    if (statusFilter !== 'ALL') {
      list = list.filter((i) => i.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (i) =>
          i.sapNo.toLowerCase().includes(q) ||
          i.heatCode.toLowerCase().includes(q) ||
          (i.sampleLabel && i.sampleLabel.toLowerCase().includes(q)) ||
          i.sectionName.toLowerCase().includes(q) ||
          i.department.toLowerCase().includes(q),
      )
    }
    return list
  }, [deptFilteredItems, statusFilter, searchQuery])

  // Summary statistics for the active department
  const pendingCount = deptFilteredItems.filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS').length

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="Department Testing" />
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const currentDeptInfo = DEPT_INFO[activeDept]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Department Testing"
        description="Testing requests, report upload workflows, and completed results across all departments."
      />

      {/* Top Department Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
        {(['ALL', 'CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] as const).map((deptKey) => {
          const info = DEPT_INFO[deptKey]
          const isSelected = activeDept === deptKey
          const count = deptKey === 'ALL' ? allItems.length : allItems.filter((i) => i.deptKey === deptKey).length
          const deptPending =
            deptKey === 'ALL'
              ? allItems.filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS').length
              : allItems.filter(
                  (i) => i.deptKey === deptKey && (i.status === 'PENDING' || i.status === 'IN_PROGRESS'),
                ).length

          return (
            <button
              key={deptKey}
              type="button"
              onClick={() => {
                setActiveDept(deptKey)
                setStatusFilter('ALL')
              }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>{info.label}</span>
              <Badge
                variant={isSelected ? 'secondary' : 'outline'}
                className={`text-[11px] px-1.5 py-0 ${
                  deptPending > 0 && !isSelected ? 'border-amber-500/50 text-amber-700 dark:text-amber-400' : ''
                }`}
              >
                {deptPending > 0 ? `${deptPending} pending` : count}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Department Quick Workspace Card */}
      {activeDept !== 'ALL' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">{currentDeptInfo.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage report uploads, view parsed chemical/mechanical parameters, and review pending heats.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to={currentDeptInfo.home}>
                Open Department Workspace
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {currentDeptInfo.addHeatUrl && (
                <Button asChild size="sm" variant="default" className="h-8 gap-1.5">
                  <Link to={currentDeptInfo.addHeatUrl}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    + Add Heat
                  </Link>
                </Button>
              )}
              {currentDeptInfo.uploadUrl && (
                <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 bg-background">
                  <Link to={currentDeptInfo.uploadUrl}>
                    <UploadCloud className="h-3.5 w-3.5" />
                    Upload Reports
                  </Link>
                </Button>
              )}
              {currentDeptInfo.reviewUrl && (
                <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 bg-background">
                  <Link to={currentDeptInfo.reviewUrl}>
                    <ListChecks className="h-3.5 w-3.5" />
                    Pending Review
                  </Link>
                </Button>
              )}
              {currentDeptInfo.completedUrl && (
                <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 bg-background">
                  <Link to={currentDeptInfo.completedUrl}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed Reports
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'UPLOADED', 'REVIEWED'] as const).map((s) => {
            const count =
              s === 'ALL'
                ? deptFilteredItems.length
                : deptFilteredItems.filter((i) => i.status === s).length
            return (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
                className="h-7 text-xs"
              >
                {s === 'ALL' ? `All (${count})` : `${s.replace('_', ' ')} (${count})`}
              </Button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search SAP, heat, sample…"
              className="h-8 pl-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="h-8 px-2.5 text-xs font-medium">
            <Clock className="mr-1 h-3 w-3" /> {pendingCount} pending
          </Badge>
        </div>
      </div>

      {/* Requests List */}
      {finalFilteredItems.length === 0 ? (
        <EmptyState
          icon={<Send className="h-8 w-8" />}
          title="No requests found"
          description={
            searchQuery || statusFilter !== 'ALL'
              ? 'No requests match the selected filters.'
              : `No test requests currently assigned for ${currentDeptInfo.label}.`
          }
        />
      ) : (
        <div className="space-y-2">
          {finalFilteredItems.map((item) => (
            <Card key={item.key} className="transition-colors hover:border-primary/40">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{item.sapNo}</span>
                    <Badge variant="outline" className="font-mono font-medium">
                      Heat: {item.heatCode}
                      {item.sampleLabel ? ` · Sample ${item.sampleLabel}` : ''}
                    </Badge>
                    <Badge
                      variant={
                        item.status === 'PENDING'
                          ? 'destructive'
                          : item.status === 'IN_PROGRESS'
                            ? 'secondary'
                            : 'default'
                      }
                      className="text-xs"
                    >
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{item.sectionName}</span>
                    <span>•</span>
                    <span>{item.department}</span>
                    {item.requestedAt ? (
                      <>
                        <span>•</span>
                        <span>{new Date(item.requestedAt).toLocaleDateString()}</span>
                      </>
                    ) : null}
                  </div>
                  {item.note ? (
                    <p className="text-xs text-muted-foreground italic">Note: {item.note}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {item.heatId ? (
                    <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                      <Link to={`/heat-records/${item.heatId}`}>
                        <Eye className="h-3.5 w-3.5" />
                        View Heat
                      </Link>
                    </Button>
                  ) : null}
                  {item.status === 'PENDING' && (
                    <Button asChild size="sm" variant="default" className="h-8 gap-1 text-xs">
                      <Link
                        to={
                          item.deptKey === 'CHEMICAL'
                            ? '/chemical/bulk-upload'
                            : `/${item.deptKey.toLowerCase()}/upload`
                        }
                      >
                        <UploadCloud className="h-3.5 w-3.5" />
                        Upload Report
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
