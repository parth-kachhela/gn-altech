import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { useProductMastersHydrated } from '@/hooks/useHydrated'
import { departmentForSectionKey } from '@/lib/permissions'
import { createId, dmYtoInput, inputToDmY, toDmY } from '@/lib/id'
import type { HeatRecord, HeatReportRequest, ProductMaster } from '@/types'

export function HeatRecordForm({
  initial,
  onSaved,
}: {
  initial?: HeatRecord
  onSaved: (id: string) => void
}) {
  const navigate = useNavigate()
  const hydrated = useProductMastersHydrated()
  const masters = useProductMasterStore((s) => s.masters)
  const searchMasters = useProductMasterStore((s) => s.searchMasters)
  const addHeatRecord = useHeatRecordStore((s) => s.addHeatRecord)
  const updateHeatRecord = useHeatRecordStore((s) => s.updateHeatRecord)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [master, setMaster] = useState<ProductMaster | undefined>(
    initial
      ? masters.find((m) => m.sapNo.toLowerCase() === initial.sapNo.toLowerCase())
      : undefined,
  )
  const [heatCode, setHeatCode] = useState(initial?.heatCode ?? '')
  const [batchNo, setBatchNo] = useState(initial?.batchNo ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity ?? '')
  const [date, setDate] = useState(initial?.date ?? toDmY(new Date()))
  const [samples, setSamples] = useState<Array<{ id: string; label: string; quantity?: string }>>(
    initial?.heats?.map((h) => ({ id: h.id, label: h.label, quantity: h.quantity })) ?? [],
  )
  const [selectedRequests, setSelectedRequests] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const r of initial?.requests ?? []) {
      const key = requestKey(r.sampleId, r.sectionKey)
      map[key] = r.status !== 'CANCELLED'
    }
    return map
  })

  function requestKey(sampleId: string | undefined, sectionKey: string): string {
    return `${sampleId ?? 'HEAT'}::${sectionKey}`
  }

  const selectAllDefaultsFor = (m: ProductMaster, sampleId: string | undefined) => {
    const next: Record<string, boolean> = { ...selectedRequests }
    for (const section of m.sections) {
      next[requestKey(sampleId, section.key)] = true
    }
    setSelectedRequests(next)
  }

  useEffect(() => {
    if (initial && master) setQuery(`${master.sapNo} — ${master.partNo} ${master.description}`)
  }, [initial, master])

  const results = searchMasters(query).filter(
    (m) => m.status === 'ACTIVE' && !(initial && m.sapNo.toLowerCase() === initial.sapNo.toLowerCase()),
  ).slice(0, 10)

  const selectMaster = (m: ProductMaster) => {
    setMaster(m)
    setQuery(`${m.sapNo} — ${m.partNo} ${m.description}`)
    setOpen(false)
    selectAllDefaultsFor(m, undefined)
  }

  const addSample = () => {
    const label = String.fromCharCode(65 + samples.length)
    const id = createId()
    setSamples((s) => [...s, { id, label }])
    if (master) selectAllDefaultsFor(master, id)
  }

  const removeSample = (id: string) => {
    setSamples((arr) => arr.filter((x) => x.id !== id))
    setSelectedRequests((sel) => {
      const next = { ...sel }
      for (const k of Object.keys(next)) {
        if (k.startsWith(`${id}::`)) delete next[k]
      }
      return next
    })
  }

  const toggleRequest = (sampleId: string | undefined, sectionKey: string) => {
    const key = requestKey(sampleId, sectionKey)
    setSelectedRequests((sel) => ({ ...sel, [key]: !sel[key] }))
  }

  const canSave = Boolean(master && heatCode.trim())

  const save = () => {
    if (!master || !heatCode.trim()) return
    const requests: HeatReportRequest[] = Object.entries(selectedRequests)
      .filter(([, selected]) => selected)
      .map(([key]) => {
        const [sampleIdRaw, sectionKey] = key.split('::')
        const sampleId = sampleIdRaw === 'HEAT' ? undefined : sampleIdRaw
        const section = master.sections.find((s) => s.key === sectionKey)
        const sample = sampleId ? samples.find((s) => s.id === sampleId) : undefined
        const existing = initial?.requests?.find(
          (r) => r.sectionKey === sectionKey && r.sampleId === sampleId,
        )
        return {
          id: existing?.id ?? createId(),
          sectionKey,
          sectionName: section?.name ?? sectionKey,
          department: departmentForSectionKey(sectionKey),
          sampleId,
          sampleLabel: sample?.label,
          status: (existing?.status ?? 'PENDING') as HeatReportRequest['status'],
        }
      })
    const base = {
      sapNo: master.sapNo,
      heatCode: heatCode.trim(),
      batchNo: batchNo.trim() || undefined,
      quantity: quantity.trim() || undefined,
      date: date || undefined,
      heats: samples.map((s, i) => ({ id: s.id, label: s.label.trim() || String.fromCharCode(65 + i), quantity: s.quantity })),
      demoReports: initial?.demoReports ?? {},
      requests,
      reports: initial?.reports ?? [],
    }
    let id: string
    if (initial) {
      updateHeatRecord(initial.id, base)
      id = initial.id
      addLog({ userId: user?.name ?? 'unknown', action: 'heat_updated', entityType: 'HEAT_RECORD', after: { sapNo: master.sapNo, heatCode: base.heatCode, requests: requests.length } })
      toast.success('Heat record updated')
    } else {
      id = addHeatRecord(base)
      addLog({ userId: user?.name ?? 'unknown', action: 'heat_added', entityType: 'HEAT_RECORD', after: { sapNo: master.sapNo, heatCode: base.heatCode, requests: requests.length } })
      toast.success('Heat record created')
    }
    onSaved(id)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product (by SAP No.)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SAP No., Part No., Item or Customer…"
              className="pl-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
                if (!initial) setMaster(undefined)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
          </div>
          {open && !master && (
            <div className="overflow-hidden rounded-md border bg-popover shadow-md">
              {results.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {hydrated
                    ? 'No matching product masters. Import the master workbook first.'
                    : 'Loading product masters…'}
                </div>
              ) : (
                results.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                    onMouseDown={() => selectMaster(m)}
                  >
                    <span className="font-mono font-medium">{m.sapNo}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {m.partNo} — {m.description}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
          {master ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold">{master.sapNo}</span>
                <Badge variant="outline">v{master.revision}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {master.partNo} · {master.description} · {master.material} · {master.customer}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Heat Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Heat Code *</Label>
            <Input value={heatCode} onChange={(e) => setHeatCode(e.target.value)} placeholder="e.g. A6A" />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Batch No.</Label>
            <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="e.g. B-0726-04" />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Quantity</Label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 500" />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Date</Label>
            <Input type="date" value={dmYtoInput(date)} onChange={(e) => setDate(inputToDmY(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Heat Samples</CardTitle>
          <Button variant="outline" size="sm" onClick={addSample}>
            <Plus className="h-3.5 w-3.5" />
            Add Sample
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {samples.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add sample letters for this heat. Samples are named after the heat code (e.g. A6A-A).
            </p>
          ) : (
            samples.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <Input
                  value={s.label}
                  onChange={(e) =>
                    setSamples((arr) => arr.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Sample letter"
                  className="w-40"
                />
                <Input
                  value={s.quantity ?? ''}
                  onChange={(e) =>
                    setSamples((arr) => arr.map((x) => (x.id === s.id ? { ...x, quantity: e.target.value || undefined } : x)))
                  }
                  placeholder="Qty"
                  className="w-40"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeSample(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {master ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department Report Requests</CardTitle>
            <p className="text-xs text-muted-foreground">
              Choose which departments should submit test reports. Each sample can have different
              departments. Defaults to all test sections from the product master.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <DepartmentRequestGroup
              key="HEAT"
              sampleId={undefined}
              sampleLabel="Heat Code (heat level)"
              sections={master.sections}
              selectedRequests={selectedRequests}
              onToggle={toggleRequest}
            />
            {samples.map((s) => (
              <DepartmentRequestGroup
                key={s.id}
                sampleId={s.id}
                sampleLabel={`Sample ${s.label}`}
                sections={master.sections}
                selectedRequests={selectedRequests}
                onToggle={toggleRequest}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/heat-records')}>
          Cancel
        </Button>
        <Button onClick={save} disabled={!canSave}>
          <Check className="h-4 w-4" />
          {initial ? 'Save Changes' : 'Create Heat Record'}
        </Button>
      </div>
    </div>
  )
}

function DepartmentRequestGroup({
  sampleId,
  sampleLabel,
  sections,
  selectedRequests,
  onToggle,
}: {
  sampleId: string | undefined
  sampleLabel: string
  sections: ProductMaster['sections']
  selectedRequests: Record<string, boolean>
  onToggle: (sampleId: string | undefined, sectionKey: string) => void
}) {
  const key = (sectionKey: string) => `${sampleId ?? 'HEAT'}::${sectionKey}`
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="mb-2 text-sm font-medium">{sampleLabel}</p>
      <div className="space-y-1.5">
        {sections.length === 0 ? (
          <p className="text-xs text-muted-foreground">No test sections on the product master.</p>
        ) : (
          sections.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={Boolean(selectedRequests[key(s.key)])}
                onChange={() => onToggle(sampleId, s.key)}
              />
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">→ {departmentForSectionKey(s.key)}</span>
            </label>
          ))
        )}
      </div>
    </div>
  )
}
