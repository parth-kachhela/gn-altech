import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Plus, Search, Upload, Download, MoreHorizontal, Copy, Eye, Pencil, Power, Trash2, Sparkles, Loader2, RotateCcw } from 'lucide-react'
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
import { cleanAndReseedMaster } from '@/services/masterSeed'

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

  const handleCleanAndReseed = async () => {
    setSeeding(true)
    try {
      const outcome = await cleanAndReseedMaster(user?.name ?? 'unknown')
      toast.success(
        `Database cleaned and reseeded: ${outcome.mastersCount} SAP Product Master(s) loaded from Master.xlsx, ${outcome.heatsCount} fresh heats initialized.`,
      )
    } catch (err) {
      console.error(err)
      toast.error('Failed to reseed master data. Please check workbook.')
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
        description="SAP-driven product specifications. Import from Master.xlsx or maintain manually."
        actions={
          <>
            <Button variant="outline" onClick={handleCleanAndReseed} disabled={seeding} className="border-amber-500/50 hover:bg-amber-500/10">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 text-amber-500" />}
              Clean &amp; Reseed Master.xlsx
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by SAP No, Part No, Description, Material, Customer..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="font-normal">
            {masters.length} total
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {activeCount} active
          </Badge>
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title="No product masters found"
            description={query ? 'Try adjusting your search query.' : 'Click "Clean & Reseed Master.xlsx" or import an Excel file to get started.'}
            action={
              query ? undefined : (
                <Button onClick={handleCleanAndReseed} disabled={seeding}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Clean &amp; Reseed Master.xlsx
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SAP No</TableHead>
                <TableHead>Part No</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Sections</TableHead>
                <TableHead className="text-center">Heats</TableHead>
                <TableHead className="text-center">Rev</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono font-medium">
                    <Link
                      to={`/product-masters/${m.id}`}
                      className="hover:underline text-primary"
                    >
                      {m.sapNo}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{m.partNo || '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={m.description}>
                    {m.description}
                  </TableCell>
                  <TableCell>{m.material}</TableCell>
                  <TableCell className="max-w-[150px] truncate" title={m.customer}>
                    {m.customer}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {m.sections.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs">
                      {heatCountBySap[m.sapNo.toLowerCase()] ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    v{m.revision ?? 1}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={m.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/product-masters/${m.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/product-masters/${m.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const newId = duplicateMaster(m.id)
                            if (newId) {
                              addLog({ userId: user?.name ?? 'unknown', action: 'master_duplicated', entityType: 'PRODUCT_MASTER', after: { sourceSap: m.sapNo, targetId: newId } })
                              toast.success(`Created draft revision of ${m.sapNo}`)
                              navigate(`/product-masters/${newId}/edit`)
                            }
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Duplicate (New Rev)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const nextStatus = m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                            setMasterStatus(m.id, nextStatus)
                            addLog({ userId: user?.name ?? 'unknown', action: 'master_status_changed', entityType: 'PRODUCT_MASTER', after: { sapNo: m.sapNo, status: nextStatus } })
                            toast.success(`${m.sapNo} marked as ${nextStatus}`)
                          }}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget({ id: m.id, name: m.sapNo })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product Master?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete master <strong>{deleteTarget?.name}</strong>? This
              action cannot be undone. Any heat records referencing this master will retain their
              snapshots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteMaster(deleteTarget.id)
                  addLog({ userId: user?.name ?? 'unknown', action: 'master_deleted', entityType: 'PRODUCT_MASTER', after: { sapNo: deleteTarget.name } })
                  toast.success(`Deleted master ${deleteTarget.name}`)
                  setDeleteTarget(null)
                }
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
