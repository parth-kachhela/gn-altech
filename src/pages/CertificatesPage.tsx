import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { useCertificateStore } from '@/stores/certificateStore'
import { useClientStore } from '@/stores/clientStore'
import { useItemStore } from '@/stores/itemStore'
import { useCertificatesHydrated } from '@/hooks/useHydrated'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CertificateStatusBadge } from '@/components/StatusBadge'
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
import { useState as useDeleteState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function CertificatesPage() {
  const navigate = useNavigate()
  const hydrated = useCertificatesHydrated()
  const certificates = useCertificateStore((s) => s.certificates)
  const deleteCertificate = useCertificateStore((s) => s.deleteCertificate)
  const loadA6ADemo = useCertificateStore((s) => s.loadA6ADemo)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useDeleteState<{ id: string; number: string } | null>(null)
  const clients = useClientStore((s) => s.getClients())
  const items = useItemStore((s) => s.getItems())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return certificates
    return certificates.filter((c) => {
      const client = clients.find((cl) => cl.id === c.clientId)
      const firstItem = c.items[0]
      const itemData = firstItem ? items.find((it) => it.id === firstItem.itemId) : undefined
      return [
        c.certificateNumber,
        client?.name,
        itemData?.name,
        itemData?.partNumber,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [certificates, query, clients, items])

  const handleA6A = () => {
    const id = loadA6ADemo()
    toast.success('A6A demo certificate loaded')
    navigate(`/certificates/${id}`)
  }

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
        description="Create, edit and issue test certificates."
        actions={
          <>
            <Button variant="outline" onClick={handleA6A}>
              <Sparkles className="h-4 w-4 text-amber-500" />
              Load A6A Demo
            </Button>
            <Button asChild>
              <Link to="/certificates/new">
                <Plus className="h-4 w-4" />
                New Certificate
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cert no., client, item part no.…"
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
          description="Create a certificate to begin the test certificate workflow."
          action={
            <Button asChild>
              <Link to="/certificates/new">
                <Plus className="h-4 w-4" />
                New Certificate
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cert No.</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cert) => {
                  const client = clients.find((c) => c.id === cert.clientId)
                  const firstItem = cert.items?.[0]
                  const itemData = firstItem ? items.find((i) => i.id === firstItem.itemId) : undefined
                  return (
                    <TableRow key={cert.id} className="cursor-pointer" onClick={() => navigate(`/certificates/${cert.id}`)}>
                      <TableCell className="font-medium">{cert.certificateNumber || '—'}</TableCell>
                      <TableCell>{client?.name ?? cert.clientId}</TableCell>
                      <TableCell>{itemData?.name ?? firstItem?.itemId ?? '—'}</TableCell>
                      <TableCell>{cert.certificateDate}</TableCell>
                      <TableCell><CertificateStatusBadge value={cert.status} /></TableCell>
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
                            <DropdownMenuItem asChild onClick={(e) => e.stopPropagation()}>
                              <Link to={`/certificates/${cert.id}/edit`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
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
                  This will permanently delete certificate <span className="font-semibold">{deleteTarget?.number}</span>.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (deleteTarget) {
                      deleteCertificate(deleteTarget.id)
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
