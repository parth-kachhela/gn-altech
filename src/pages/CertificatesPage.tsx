import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus, Search, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { getCapabilities } from '@/lib/permissions'
import { useCertificatesHydrated } from '@/hooks/useHydrated'
import { deriveCertificateStatus } from '@/lib/certificateStatus'
import { CertificateStatusBadge } from '@/components/certificate-flow/ReportStatusBadge'

export function CertificatesPage() {
  const navigate = useNavigate()
  const hydrated = useCertificatesHydrated()
  const certificates = useCertificateStore((s) => s.certificates)
  const deleteCertificate = useCertificateStore((s) => s.deleteCertificate)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)
  const caps = getCapabilities(user?.role)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return certificates
    return certificates.filter((c) => {
      const snap = c.productSnapshot
      const heats = c.selectedHeats.map((s) => s.heatCode).join(' ')
      return [
        c.certificateNumber,
        snap?.sapNo,
        snap?.partNo,
        snap?.description,
        snap?.customer,
        heats,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [certificates, query])

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="Certificates" />
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
        title="Certificates"
        description="Create, edit and issue test certificates from SAP product masters."
        actions={
          caps.createCertificate ? (
            <Button asChild>
              <Link to="/certificates/new">
                <Plus className="h-4 w-4" />
                New Certificate
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cert no., SAP No., part no., customer…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title={query ? 'No matching certificates' : 'No certificates yet'}
          description={
            query
              ? 'Try a different search term.'
              : 'Create a certificate from a SAP product master and heat codes.'
          }
          action={
            caps.createCertificate ? (
              <Button asChild>
                <Link to="/certificates/new">
                  <Plus className="h-4 w-4" />
                  New Certificate
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cert No.</TableHead>
                  <TableHead>SAP No.</TableHead>
                  <TableHead>Part / Description</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Heat Codes</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cert) => {
                  const status = deriveCertificateStatus(cert, heatRecords)
                  const snap = cert.productSnapshot
                  return (
                    <TableRow key={cert.id} className="cursor-pointer" onClick={() => navigate(`/certificates/${cert.id}`)}>
                      <TableCell className="font-medium">{cert.certificateNumber || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{snap?.sapNo || '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {snap?.partNo} · {snap?.description}
                      </TableCell>
                      <TableCell>{snap?.customer || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {cert.selectedHeats.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            cert.selectedHeats.slice(0, 3).map((s) => (
                              <Badge key={s.id} variant="outline" className="font-mono">{s.heatCode}</Badge>
                            ))
                          )}
                          {cert.selectedHeats.length > 3 ? (
                            <Badge variant="outline">+{cert.selectedHeats.length - 3}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{cert.certificateDate}</TableCell>
                      <TableCell><CertificateStatusBadge value={status} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Actions" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild onClick={(e) => e.stopPropagation()}>
                              <Link to={`/certificates/${cert.id}`}>
                                <FileText className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            {caps.createCertificate ? (
                              <DropdownMenuItem asChild onClick={(e) => e.stopPropagation()}>
                                <Link to={`/certificates/${cert.id}/edit`}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                            ) : null}
                            {caps.deleteCertificate ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteTarget({ id: cert.id, number: cert.certificateNumber })
                                }}
                                className="gap-2 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete certificate?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete certificate{' '}
                  <span className="font-semibold">{deleteTarget?.number}</span>. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (deleteTarget) {
                      deleteCertificate(deleteTarget.id)
                      addLog({ userId: user?.name ?? 'unknown', action: 'cert_deleted', entityType: 'CERTIFICATE', after: { cert: deleteTarget.number } })
                      toast.success('Certificate deleted')
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
