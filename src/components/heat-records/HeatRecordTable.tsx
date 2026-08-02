import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Copy,
  Eye,
  FilePlus2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { HeatRecord } from '@/types'
import { Button } from '@/components/ui/button'
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
import { HeatRecordStatusBadge } from '@/components/StatusBadge'
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
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useItemStore } from '@/stores/itemStore'

interface Props {
  heatRecords: HeatRecord[]
  onDelete: (id: string) => void
  onDuplicate: (id: string) => string | null
  onUseInCertificate: (id: string) => void
}

export function HeatRecordTable({
  heatRecords,
  onDelete,
  onDuplicate,
  onUseInCertificate,
}: Props) {
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<HeatRecord | null>(null)
  const items = useItemStore((s) => s.items)
  const itemsById = useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items],
  )

  const columns = useMemo<ColumnDef<HeatRecord>[]>(
    () => [
      {
        header: 'Part Name',
        cell: ({ row }) => (
          <span>{itemsById.get(row.original.itemId)?.name ?? row.original.itemId}</span>
        ),
      },
      {
        header: 'Part No.',
        cell: ({ row }) => (
          <span>{itemsById.get(row.original.itemId)?.partNumber ?? row.original.itemId}</span>
        ),
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        cell: ({ row }) => (
          <span>
            {row.original.quantity} {row.original.quantityUnit}
          </span>
        ),
      },
      {
        accessorKey: 'dailyHeatNumber',
        header: 'Daily Heat No.',
        cell: ({ row }) => (
          <span className="font-mono">{row.original.dailyHeatNumber}</span>
        ),
      },
      {
        accessorKey: 'monthlyHeatNumber',
        header: 'Monthly Heat No.',
        cell: ({ row }) => (
          <span className="font-mono">{row.original.monthlyHeatNumber ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'yearlyHeatNumber',
        header: 'Yearly Heat No.',
        cell: ({ row }) => (
          <span className="font-mono">{row.original.yearlyHeatNumber ?? '—'}</span>
        ),
      },
      { accessorKey: 'batchNumber', header: 'Batch No.' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <HeatRecordStatusBadge value={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const record = row.original
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="View"
                onClick={() => navigate(`/heat-records/${record.id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Edit"
                onClick={() => navigate(`/heat-records/${record.id}/edit`)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onUseInCertificate(record.id)}
                    className="gap-2"
                  >
                    <FilePlus2 className="h-4 w-4" />
                    Use in Certificate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const newId = onDuplicate(record.id)
                      if (newId) {
                        toast.success('Heat record duplicated')
                        navigate(`/heat-records/${newId}`)
                      }
                    }}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(record)}
                    className="gap-2 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [navigate, onDuplicate, onUseInCertificate, itemsById],
  )

  const table = useReactTable({
    data: heatRecords,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  No heat records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete heat record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the record for{' '}
              <span className="font-semibold">
                {deleteTarget
                  ? `${itemsById.get(deleteTarget.itemId)?.name ?? deleteTarget.itemId} (${deleteTarget.dailyHeatNumber})`
                  : ''}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget.id)
                setDeleteTarget(null)
                toast.success('Heat record deleted')
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        <Link to="/heat-records/new" className="text-primary hover:underline">
          Create a new heat record
        </Link>
      </div>
    </>
  )
}
