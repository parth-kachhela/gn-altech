import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search, X } from 'lucide-react'
import type { HeatRecord, Item } from '@/types'
import {
  heatRecordSchema,
  type HeatRecordFormValues,
} from '@/schemas'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useItemStore } from '@/stores/itemStore'

interface Props {
  initial?: HeatRecord
  onSubmit: (values: HeatRecordFormValues) => void
  isSubmitting?: boolean
}

function toFormValues(initial?: HeatRecord): HeatRecordFormValues {
  if (!initial) {
    return {
      itemId: '',
      dailyHeatNumber: '',
      monthlyHeatNumber: '',
      yearlyHeatNumber: '',
      batchNumber: '',
      quantity: 1,
      quantityUnit: 'Nos.',
      invoiceNumber: '',
      invoiceDate: '',
      deliveryCondition: '',
      productionDate: '',
      remarks: '',
    }
  }
  return {
    itemId: initial.itemId,
    dailyHeatNumber: initial.dailyHeatNumber,
    monthlyHeatNumber: initial.monthlyHeatNumber ?? '',
    yearlyHeatNumber: initial.yearlyHeatNumber ?? '',
    batchNumber: initial.batchNumber ?? '',
    quantity: initial.quantity,
    quantityUnit: initial.quantityUnit,
    invoiceNumber: initial.invoiceNumber ?? '',
    invoiceDate: initial.invoiceDate ?? '',
    deliveryCondition: initial.deliveryCondition ?? '',
    productionDate: initial.productionDate ?? '',
    remarks: initial.remarks ?? '',
  }
}

function filterItems(items: Item[], query: string): Item[] {
  const q = query.toLowerCase().trim()
  if (!q) return items
  return items.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      i.partNumber.toLowerCase().includes(q),
  )
}

function PartSearchField({
  value,
  onChange,
}: {
  value: string
  onChange: (itemId: string) => void
}) {
  const items = useItemStore((s) => s.items)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = items.find((i) => i.id === value)
  const results = filterItems(items, query).slice(0, 10)

  useEffect(() => {
    if (selected) setQuery(`${selected.name} — ${selected.partNumber}`)
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search part name or number…"
          className="pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {selected && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              setQuery('')
            }}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="overflow-hidden rounded-md border bg-popover shadow-md">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matching parts. Create the part first from the Items section.
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={() => {
                  onChange(item.id)
                  setQuery(`${item.name} — ${item.partNumber}`)
                  setOpen(false)
                }}
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.partNumber}</span>
              </button>
            ))
          )}
        </div>
      )}

      {selected && (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <div className="font-medium">{selected.name}</div>
          <div className="text-xs text-muted-foreground">
            Part No: {selected.partNumber} | Material: {selected.material} | Grade: {selected.grade}
          </div>
        </div>
      )}
    </div>
  )
}

export function HeatRecordForm({ initial, onSubmit, isSubmitting }: Props) {
  const form = useForm<HeatRecordFormValues>({
    resolver: zodResolver(heatRecordSchema) as Resolver<HeatRecordFormValues>,
    defaultValues: toFormValues(initial),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Part Selection</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Part *</FormLabel>
                  <FormControl>
                    <PartSearchField value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity *</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantityUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl>
                    <Input placeholder="Nos." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Heat Numbers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="dailyHeatNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Heat No. *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. A6A" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter exactly as provided by the factory. Example format: A6A (A = January,
                    6 = 2026, A = day 1).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthlyHeatNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Heat No.</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. AY-001" {...field} />
                  </FormControl>
                  <FormDescription>Example format: AY-001</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="yearlyHeatNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yearly Heat No.</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 2026" {...field} />
                  </FormControl>
                  <FormDescription>Example format: 2026</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="batchNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. B-0726-04" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice & Dispatch (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice / Challan Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. INV-2026-0814" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoiceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deliveryCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Condition</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. As Cast" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Production Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="Optional remarks" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Heat Record'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
