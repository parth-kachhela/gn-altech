import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Package, MoreHorizontal } from 'lucide-react'
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
import { useItemStore } from '@/stores/itemStore'
import { useItemsHydrated } from '@/hooks/useHydrated'

export function ItemsPage() {
  const hydrated = useItemsHydrated()
  const items = useItemStore((s) => s.items)
  const searchItems = useItemStore((s) => s.searchItems)
  const deleteItem = useItemStore((s) => s.deleteItem)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    return searchItems(query)
  }, [items, query, searchItems])

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="Items" />
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
        title="Items"
        description="Manage part/item master data with material and grade specifications."
        actions={
          <Button asChild>
            <Link to="/items/new">
              <Plus className="h-4 w-4" />
              Add Item
            </Link>
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, part no., material, grade…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title={query ? 'No matching items' : 'No items yet'}
          description="Add item details to link with heat records and certificates."
          action={
            <Button asChild>
              <Link to="/items/new">
                <Plus className="h-4 w-4" />
                Add Item
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
                  <TableHead>Part Name</TableHead>
                  <TableHead>Part No.</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono">{item.partNumber}</TableCell>
                    <TableCell>{item.material}</TableCell>
                    <TableCell>{item.grade}</TableCell>
                    <TableCell>{item.unit ?? 'Nos.'}</TableCell>
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
                            <Link to={`/items/${item.id}/edit`}>
                              <Edit className="h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
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
                <AlertDialogTitle>Delete item?</AlertDialogTitle>
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
                      deleteItem(deleteTarget.id)
                      toast.success('Item deleted')
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