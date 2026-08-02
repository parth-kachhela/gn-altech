import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, FilePlus2, Thermometer, Check, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useItemStore } from '@/stores/itemStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { createCertificateHeatRecord, createCertificateItem } from '@/lib/factories'
import type { Certificate, HeatRecord, Item } from '@/types'
import { InputField, RemoveButton, SectionCard, StepNav } from '@/components/certificate-wizard/WizardFields'

type DraftSetter = (updater: (d: Certificate) => Certificate) => void

interface ItemsStepProps {
  certificate: Certificate
  setDraft: DraftSetter
  searchHeatRecords: (query: string, filters?: { itemId?: string }) => HeatRecord[]
  onBack: () => void
  onNext: () => void
}

export function ItemsStep({
  certificate,
  setDraft,
  searchHeatRecords,
  onBack,
  onNext,
}: ItemsStepProps) {
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const allItems = useItemStore((s) => s.items)
  const [searchParams] = useSearchParams()
  const fromHeatProcessed = useRef(false)
  const attachRef = useRef<((hr: HeatRecord) => void) | null>(null)

  const attachedHeatIds = new Set(certificate.heatRecords.map((l) => l.heatRecordId))
  const results = searchHeatRecords(query).filter((h) => !attachedHeatIds.has(h.id))

  const attachHeatRecord = (hr: HeatRecord) => {
    const itemData = useItemStore.getState().getItem(hr.itemId)
    setDraft((d) => {
      const existingItem = d.items.find((i) => i.itemId === hr.itemId)
      const item =
        existingItem ??
        createCertificateItem(hr.itemId, hr.quantity || 1)
      const link = createCertificateHeatRecord(hr.id, hr.itemId, hr.quantity || 1)
      return {
        ...d,
        material: d.material || itemData?.material || '',
        grade: d.grade || itemData?.grade || '',
        items: existingItem
          ? d.items.map((i) =>
              i.id === existingItem.id
                ? { ...i, heatRecordIds: [...i.heatRecordIds, link.id] }
                : i,
            )
          : [...d.items, { ...item, heatRecordIds: [link.id] }],
        heatRecords: [...d.heatRecords, link],
      }
    })
  }
  attachRef.current = attachHeatRecord

  const removeItem = (itemId: string) => {
    setDraft((d) => {
      const target = d.items.find((i) => i.id === itemId)
      if (!target) return d
      const removedIds = new Set(target.heatRecordIds)
      return {
        ...d,
        items: d.items.filter((i) => i.id !== itemId),
        heatRecords: d.heatRecords.filter((h) => !removedIds.has(h.id)),
      }
    })
  }

  const updateItemQty = (itemId: string, qty: number) => {
    setDraft((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === itemId ? { ...i, quantity: qty || 0 } : i)),
    }))
  }

  const removeHeatLink = (itemId: string, linkId: string) => {
    setDraft((d) => ({
      ...d,
      heatRecords: d.heatRecords.filter((h) => h.id !== linkId),
      items: d.items.map((i) =>
        i.id === itemId
          ? { ...i, heatRecordIds: i.heatRecordIds.filter((id) => id !== linkId) }
          : i,
      ),
    }))
  }

  const updateHeatLinkQty = (linkId: string, qty: number) => {
    setDraft((d) => ({
      ...d,
      heatRecords: d.heatRecords.map((h) => (h.id === linkId ? { ...h, quantity: qty || 0 } : h)),
    }))
  }

  const updateHeatField = (heatRecordId: string, patch: Partial<HeatRecord>) => {
    useHeatRecordStore.getState().updateHeatRecord(heatRecordId, patch)
  }

  const updateItemField = (itemId: string, patch: Partial<Item>) => {
    useItemStore.getState().updateItem(itemId, patch)
  }

  const heatRecordFor = (linkId: string): HeatRecord | undefined => {
    const link = certificate.heatRecords.find((h) => h.id === linkId)
    if (!link) return undefined
    return heatRecords.find((h) => h.id === link.heatRecordId)
  }

  const itemFor = (itemId: string): Item | undefined => {
    return (
      allItems.find((i) => i.id === itemId) ??
      useItemStore.getState().getItem(itemId)
    )
  }

  useEffect(() => {
    const fromHeat = searchParams.get('fromHeat')
    if (!fromHeat || fromHeatProcessed.current) return
    const hr = useHeatRecordStore.getState().getHeatRecord(fromHeat)
    fromHeatProcessed.current = true
    if (!hr) return
    attachRef.current?.(hr)
    toast('Heat record added from selection')
  }, [searchParams])

  const hasHeatRecords = certificate.items.some((i) => i.heatRecordIds.length > 0)

  return (
    <div className="space-y-4">
      <SectionCard
        title="Search Heat Records"
        description="Heat codes are global — search any part's heat number and add it. The part is added automatically."
      >
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input py-2.5 pl-10 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            placeholder="Search all heat numbers / batch / part…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          />
        </div>

        {searchOpen && (
          <div className="overflow-hidden rounded-md border bg-popover shadow-md">
            {results.length === 0 ? (
              <div className="space-y-2 p-3">
                <p className="text-sm text-muted-foreground">
                  No matching heat records found.
                </p>
                {!showNewForm && (
                  <Button size="sm" variant="outline" onClick={() => setShowNewForm(true)}>
                    <FilePlus2 className="h-4 w-4 mr-1.5" />
                    Add New Heat Code
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-h-80 divide-y overflow-y-auto">
                {results.map((hr) => {
                  const item = itemFor(hr.itemId)
                  return (
                    <div
                      key={hr.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{item?.name ?? hr.itemId}</div>
                        <div className="text-xs text-muted-foreground">
                          Part No: {item?.partNumber ?? '—'}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="font-mono">{hr.dailyHeatNumber}</Badge>
                          {hr.monthlyHeatNumber ? (
                            <span className="text-xs text-muted-foreground">M: {hr.monthlyHeatNumber}</span>
                          ) : null}
                          {hr.yearlyHeatNumber ? (
                            <span className="text-xs text-muted-foreground">Y: {hr.yearlyHeatNumber}</span>
                          ) : null}
                          {hr.batchNumber ? (
                            <span className="text-xs text-muted-foreground">Batch: {hr.batchNumber}</span>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            Qty: {hr.quantity} {hr.quantityUnit}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onMouseDown={() => {
                          attachHeatRecord(hr)
                          setQuery('')
                          setSearchOpen(false)
                        }}
                      >
                        <Thermometer className="h-4 w-4 mr-1.5" />
                        Add
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {showNewForm && (
          <NewHeatForm
            onCancel={() => setShowNewForm(false)}
            onCreated={(heatRecordId) => {
              const hr = useHeatRecordStore.getState().getHeatRecord(heatRecordId)
              if (hr) attachHeatRecord(hr)
              setShowNewForm(false)
              setQuery('')
              setSearchOpen(false)
            }}
          />
        )}
      </SectionCard>

      {certificate.items.length === 0 ? (
        <SectionCard title="Selected Items & Heat Records">
          <p className="text-sm text-muted-foreground">
            No items selected yet. Search a heat number above and click Add.
          </p>
        </SectionCard>
      ) : (
        <SectionCard title="Selected Items & Heat Records">
          <div className="space-y-4">
            {certificate.items.map((item) => {
              const itemData = itemFor(item.itemId)
              const links = item.heatRecordIds
                .map((id) => certificate.heatRecords.find((h) => h.id === id))
                .filter((x): x is NonNullable<typeof x> => Boolean(x))
              return (
                <div key={item.id} className="rounded-lg border">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <InputField
                        label="Part Name"
                        value={itemData?.name ?? ''}
                        onChange={(v) => updateItemField(item.itemId, { name: v })}
                      />
                      <InputField
                        label="Part No."
                        value={itemData?.partNumber ?? ''}
                        onChange={(v) => updateItemField(item.itemId, { partNumber: v })}
                      />
                      <InputField
                        label="Qty"
                        type="number"
                        min={1}
                        value={String(item.quantity)}
                        onChange={(v) => updateItemQty(item.id, Number(v))}
                      />
                    </div>
                    <div className="flex flex-col gap-1 sm:items-end">
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Material: {itemData?.material ?? '—'}</span>
                        <span>Grade: {itemData?.grade ?? '—'}</span>
                      </div>
                      <RemoveButton label="Remove Item" onClick={() => removeItem(item.id)} />
                    </div>
                  </div>

                  <div className="space-y-2 p-4">
                    {links.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No heat records attached.</p>
                    ) : (
                      links.map((link) => {
                        const hr = heatRecordFor(link.id)
                        return (
                          <div
                            key={link.id}
                            className="rounded-md border px-3 py-2"
                          >
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono">
                                  {hr?.dailyHeatNumber ?? link.heatRecordId}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Heat details (editable)</span>
                              </div>
                              <RemoveButton label="Remove" onClick={() => removeHeatLink(item.id, link.id)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <InputField
                                label="Daily Heat No."
                                value={hr?.dailyHeatNumber ?? ''}
                                onChange={(v) => updateHeatField(link.heatRecordId, { dailyHeatNumber: v })}
                              />
                              <InputField
                                label="Monthly Heat No."
                                value={hr?.monthlyHeatNumber ?? ''}
                                onChange={(v) => updateHeatField(link.heatRecordId, { monthlyHeatNumber: v })}
                              />
                              <InputField
                                label="Yearly Heat No."
                                value={hr?.yearlyHeatNumber ?? ''}
                                onChange={(v) => updateHeatField(link.heatRecordId, { yearlyHeatNumber: v })}
                              />
                              <InputField
                                label="Batch No."
                                value={hr?.batchNumber ?? ''}
                                onChange={(v) => updateHeatField(link.heatRecordId, { batchNumber: v })}
                              />
                              <div className="flex items-end gap-2">
                                <InputField
                                  label="Qty"
                                  type="number"
                                  min={1}
                                  value={String(link.quantity)}
                                  onChange={(v) => updateHeatLinkQty(link.id, Number(v))}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      <StepNav
        onBack={onBack}
        onNext={onNext}
        canNext={Boolean(certificate.clientId && certificate.items.length > 0 && hasHeatRecords)}
        nextLabel="Next: Footer & Authorization"
      />
    </div>
  )
}

interface NewHeatFormProps {
  onCancel: () => void
  onCreated: (heatRecordId: string) => void
}

function NewHeatForm({ onCancel, onCreated }: NewHeatFormProps) {
  const [mode, setMode] = useState<'select' | 'create'>('select')
  const [partQuery, setPartQuery] = useState('')
  const [partOpen, setPartOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')

  const [name, setName] = useState('')
  const [partNo, setPartNo] = useState('')
  const [material, setMaterial] = useState('')
  const [grade, setGrade] = useState('')

  const [daily, setDaily] = useState('')
  const [monthly, setMonthly] = useState('')
  const [yearly, setYearly] = useState('')
  const [batch, setBatch] = useState('')
  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState('Nos.')

  const allItems = useItemStore((s) => s.items)
  const selectedItem = allItems.find((i) => i.id === selectedItemId)
  const partResults = allItems
    .filter((i) => {
      const q = partQuery.toLowerCase().trim()
      if (!q) return true
      return (
        i.name.toLowerCase().includes(q) ||
        i.partNumber.toLowerCase().includes(q)
      )
    })
    .slice(0, 10)

  const submit = () => {
    if (!daily.trim()) return
    let resolvedItemId = selectedItemId
    if (mode === 'create') {
      if (!name.trim() || !partNo.trim()) return
      resolvedItemId = useItemStore.getState().addItem({
        name: name.trim(),
        partNumber: partNo.trim(),
        material: material.trim(),
        grade: grade.trim(),
      })
    }
    if (!resolvedItemId) return
    const id = useHeatRecordStore.getState().addHeatRecord({
      itemId: resolvedItemId,
      dailyHeatNumber: daily.trim(),
      monthlyHeatNumber: monthly.trim() || undefined,
      yearlyHeatNumber: yearly.trim() || undefined,
      batchNumber: batch.trim() || undefined,
      quantity: qty || 1,
      quantityUnit: unit.trim() || 'Nos.',
    })
    onCreated(id)
  }

  return (
    <div className="mt-2 space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">New Heat Code</div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={mode === 'select' ? 'default' : 'outline'}
            onClick={() => setMode('select')}
          >
            Choose Part
          </Button>
          <Button
            size="sm"
            variant={mode === 'create' ? 'default' : 'outline'}
            onClick={() => setMode('create')}
          >
            <PackagePlus className="h-3.5 w-3.5 mr-1" />
            New Part
          </Button>
        </div>
      </div>

      {mode === 'select' ? (
        <div className="relative">
          <input
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
            placeholder="Search existing part name / number…"
            value={partQuery}
            onChange={(e) => {
              setPartQuery(e.target.value)
              setPartOpen(true)
            }}
            onFocus={() => setPartOpen(true)}
            onBlur={() => setTimeout(() => setPartOpen(false), 150)}
          />
          {partOpen && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
              {partResults.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No matching parts. Switch to "New Part".
                </div>
              ) : (
                partResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                    onMouseDown={() => {
                      setSelectedItemId(item.id)
                      setPartOpen(false)
                    }}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.partNumber}</span>
                  </button>
                ))
              )}
            </div>
          )}
          {selectedItem && (
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600" />
              <span className="font-medium">{selectedItem.name}</span>
              <span className="text-xs text-muted-foreground">— {selectedItem.partNumber}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InputField label="Part Name" value={name} onChange={setName} required />
          <InputField label="Part Number" value={partNo} onChange={setPartNo} required />
          <InputField label="Material" value={material} onChange={setMaterial} placeholder="e.g. SG Iron / Ductile Iron" />
          <InputField label="Grade" value={grade} onChange={setGrade} placeholder="e.g. IS 1865 SG 450/10" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InputField label="Daily Heat No." value={daily} onChange={setDaily} placeholder="e.g. A6A" required />
        <InputField label="Monthly Heat No." value={monthly} onChange={setMonthly} placeholder="e.g. AY-001" />
        <InputField label="Yearly Heat No." value={yearly} onChange={setYearly} placeholder="e.g. 2026" />
        <InputField label="Batch Number" value={batch} onChange={setBatch} placeholder="e.g. B-0726-04" />
        <InputField label="Quantity" type="number" min={1} value={String(qty)} onChange={(v) => setQty(Number(v))} />
        <InputField label="Unit" value={unit} onChange={setUnit} placeholder="Nos." />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={submit}
          disabled={
            !daily.trim() ||
            (mode === 'create' ? !name.trim() || !partNo.trim() : !selectedItemId)
          }
        >
          Create & Add
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
