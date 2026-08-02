import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Users, MoreHorizontal } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
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
import { useClientStore } from '@/stores/clientStore'
import { useClientsHydrated } from '@/hooks/useHydrated'

export function ClientsPage() {
  const hydrated = useClientsHydrated()
  const clients = useClientStore((s) => s.clients)
  const searchClients = useClientStore((s) => s.searchClients)
  const deleteClient = useClientStore((s) => s.deleteClient)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return clients
    return searchClients(query)
  }, [clients, query, searchClients])

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="Clients" />
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
        title="Clients"
        description="Manage customer details for certificates and heat records."
        actions={
          <Button asChild>
            <Link to="/clients/new">
              <Plus className="h-4 w-4" />
              Add Client
            </Link>
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, location, email, phone, GSTIN…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={query ? 'No matching clients' : 'No clients yet'}
          description="Add client details to link with heat records and certificates."
          action={
            <Button asChild>
              <Link to="/clients/new">
                <Plus className="h-4 w-4" />
                Add Client
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
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.location ?? '—'}</TableCell>
                    <TableCell>{client.contactPerson ?? '—'}</TableCell>
                    <TableCell>{client.email ?? '—'}</TableCell>
                    <TableCell>{client.phone ?? '—'}</TableCell>
                    <TableCell>{client.gstin ?? '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            asChild
                            className="gap-2"
                          >
                            <Link to={`/clients/${client.id}/edit`}>
                              <Edit className="h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget({ id: client.id, name: client.name })}
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

          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete client?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <span className="font-semibold">{deleteTarget?.name}</span>.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (deleteTarget) {
                      deleteClient(deleteTarget.id)
                      toast.success('Client deleted')
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