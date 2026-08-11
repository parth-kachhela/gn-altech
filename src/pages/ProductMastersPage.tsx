import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Plus, Search, Upload, Download, MoreHorizontal, Copy, Eye, Pencil, Power, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { useMemo } from 'react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { toast } from 'sonner'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { useProductMastersHydrated } from '@/hooks/useHydrated'
import { exportMasterExcel } from '@/services/masterExport'
import { createEmptyMaster } from '@/lib/masterFactory'
import { nowIso } from '@/lib/id'
import { seedDemoMaster } from '@/services/masterSeed'

export function ProductMastersPage() {
  const hydrated = useProductMastersHydrated()
  const masters = useProductMasterStore((s) => s.masters)
  const searchMasters = useProductMasterStore((s) => s.searchMasters)
  const deleteMaster = useProductMasterStore((s) => s.deleteMaster)
  const setMasterStatus = useProductMasterStore((s) => s.setMasterStatus)
  const duplicateMaster = useProductMasterStore((s) => s.duplicateMaster)
  const saveMaster = useProductMasterStore((s) => s.saveMaster)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [seeding, setSeeding] = useState(false)

  const handleLoadDemo = async () => {
    setSeeding(true)
    try {
      const outcome = await seedDemoMaster(user?.name ?? 'unknown')
      toast.success(
        `Demo data loaded: ${outcome.added} added, ${outcome.updated} updated, ${outcome.heatsAdded} heat code(s) added, ${outcome.heatsUpdated} refreshed`,
      )
    } catch (err) {
      console.error(err)
      toast.error('Failed to load demo data. Please import the workbook manually.')
    } finally {
      setSeeding(false)
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return masters
    return searchMasters(query)
  }, [masters, query, searchMasters])

  const activeCount = masters.filter((m) => m.status === 'ACTIVE').length
  const heatCountBySap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const h of heatRecords) {
      map[h.sapNo.toLowerCase()] = (map[h.sapNo.toLowerCase()] ?? 0) + 1
    }
    return map
  }, [heatRecords])

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="Product Master" />
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
        title="Product Master"
        description="SAP-driven product specifications. Import from the master workbook or maintain manually."
        actions={
          <>
            <Button variant="outline" onClick={handleLoadDemo} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
              Load Demo Data
            </Button>
            <Button variant="outline" onClick={() => exportMasterExcel(masters)}>
              <Download className="h-4 w-4" />
              Export Master
            </Button>
            <Button asChild variant="outline">
              <Link to="/product-masters/import">
                <Upload className="h-4 w-4" />
                Import Excel
              </Link>
            </Button>
            <Button
              onClick={() => {
                const master = createEmptyMaster()
                master.sapNo = `NEW-${Date.now().toString().slice(-4)}`
                saveMaster(master)
                addLog({ userId: user?.name ?? 'unknown', action: 'master_created_manual', entityType: 'PRODUCT_MASTER', after: { sapNo: master.sapNo } })
                toast.success('New master created. Click Edit to fill details.')
                navigate(`/product-masters/${master.id}/edit`)
              }}
            >
              <Plus className="h-4 w-4" />
              Add Manually
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SAP No., Part No., Item or Customer…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {masters.length} masters · {activeCount} active
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title={query ? 'No matching masters' : 'No product masters yet'}
          description={
            query
              ? 'Try a different search term.'
              : 'Import the master workbook to load SAP-based product specifications and heat codes, or load the bundled demo data.'
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={handleLoadDemo} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
                Load Demo Data
              </Button>
              <Button asChild>
                <Link to="/product-masters/import">
                  <Upload className="h-4 w-4" />
                  Import Excel
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SAP No.</TableHead>
                <TableHead>Part No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Rev</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Heat Codes</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    <Link to={`/product-masters/${m.id}`} className="hover:underline">
                      {m.sapNo}
                    </Link>
                  </TableCell>
                  <TableCell>{m.partNo || '—'}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{m.description || '—'}</TableCell>
                  <TableCell>{m.material || '—'}</TableCell>
                  <TableCell>{m.customer || '—'}</TableCell>
                  <TableCell>v{m.revision ?? 1}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {m.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{heatCountBySap[m.sapNo.toLowerCase()] ?? 0}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" title="Actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild className="gap-2">
                          <Link to={`/product-masters/${m.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-2">
                          <Link to={`/product-masters/${m.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const id = duplicateMaster(m.id)
                            if (id) {
                              addLog({ userId: user?.name ?? 'unknown', action: 'master_duplicated', entityType: 'PRODUCT_MASTER', after: { sapNo: m.sapNo } })
                              toast.success('Master duplicated as new revision')
                              navigate(`/product-masters/${id}/edit`)
                            }
                          }}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const next = m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                            setMasterStatus(m.id, next)
                            addLog({ userId: user?.name ?? 'unknown', action: `master_${next === 'ACTIVE' ? 'activated' : 'deactivated'}`, entityType: 'PRODUCT_MASTER', after: { sapNo: m.sapNo, status: next, at: nowIso() } })
                            toast.success(next === 'ACTIVE' ? 'Master activated' : 'Master deactivated')
                          }}
                          className="gap-2"
                        >
                          <Power className="h-4 w-4" />
                          {m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget({ id: m.id, name: m.sapNo })}
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
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete master?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{deleteTarget?.name}</span>.
              Certificates that reference it keep their product snapshot, but the master will no longer
              be selectable. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteMaster(deleteTarget.id)
                  addLog({ userId: user?.name ?? 'unknown', action: 'master_deleted', entityType: 'PRODUCT_MASTER', after: { id: deleteTarget.id } })
                  toast.success('Master deleted')
                }
                setDeleteTarget(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
