import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { toast } from 'sonner'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { useProductMastersHydrated } from '@/hooks/useHydrated'
import { departmentForSectionKey } from '@/lib/permissions'
import { ReportReviewDialog } from '@/components/workflow/ReportReviewDialog'
import { applyMasterFallback, processQueuedFile } from '@/services/bulkIngest'
import { groupBySapHeat, nextSampleLabels } from '@/lib/sampleSplit'
import { saveReportBlob } from '@/lib/fileStorage'
import { createId, nowIso } from '@/lib/id'
import type { HeatReportData, ParsedValue, ProductMaster } from '@/types'

const FOUR = ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] as const
const NAMES: Record<string, string> = { CHEMICAL: 'Chemical Analysis', MICRO: 'Micro Structure', TENSILE: 'Tensile', HARDNESS: 'Hardness' }

type RowStatus = 'IDLE' | 'QUEUED' | 'PROCESSING' | 'DONE' | 'ERROR'

interface HeatRow {
  key: string
  /** SAP No. for this row — falls back to the global Product above when empty. */
  sap: string
  heatCode: string
  samples: Array<{ id: string; label: string; quantity?: string }>
  file: File | null
  progress: number
  stage?: string
  status: RowStatus
  values: ParsedValue[]
  valueSource: Record<string, 'EXTRACTED' | 'MASTER' | 'MANUAL'>
  demoMatch?: boolean
  message?: string
}

const newRow = (sap = ''): HeatRow => ({
  key: createId(), sap, heatCode: '', samples: [], file: null,
  progress: 0, status: 'IDLE', values: [], valueSource: {},
})

export function ChemicalAddHeatPage() {
  const navigate = useNavigate()
  const hydrated = useProductMastersHydrated()
  const searchMasters = useProductMasterStore((s) => s.searchMasters)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [master, setMaster] = useState<ProductMaster | undefined>()
  const [rows, setRows] = useState<HeatRow[]>([newRow()])
  const [reviewKey, setReviewKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const busyRef = useRef(false)
  const reviewRow = reviewKey ? rows.find((r) => r.key === reviewKey) ?? null : null

  const results = searchMasters(query).filter((m) => m.status === 'ACTIVE').slice(0, 10)

  const patchRow = (key: string, p: Partial<HeatRow>) =>
    setRows((arr) => arr.map((r) => (r.key === key ? { ...r, ...p } : r)))

  const selectMaster = (m: ProductMaster) => {
    setMaster(m)
    setQuery(`${m.sapNo} — ${m.partNo} ${m.description}`)
    setOpen(false)
    // Default SAP for all rows that don't have their own yet.
    setRows((arr) => arr.map((r) => (r.sap ? r : { ...r, sap: m.sapNo })))
  }

  const addSample = (key: string) => {
    setRows((arr) => arr.map((r) => {
      if (r.key !== key) return r
      const label = String.fromCharCode(65 + r.samples.length)
      return { ...r, samples: [...r.samples, { id: createId(), label }] }
    }))
  }

  /** Attach a PDF to a row and run the ~10s extract pipeline for it. */
  const onFile = async (key: string, file: File | undefined) => {
    if (!file) return
    patchRow(key, { file, status: 'QUEUED', progress: 0, stage: 'Waiting in queue…', message: 'Waiting in queue…' })
    // Sequential per-row processing (queue if another row is busy).
    while (busyRef.current) await new Promise((r) => setTimeout(r, 300))
    busyRef.current = true
    try {
      patchRow(key, { status: 'PROCESSING', stage: 'Uploading file…' })
      const masters = useProductMasterStore.getState().masters
      const out = await processQueuedFile(file, 'CHEMICAL', masters, (p) =>
        patchRow(key, { progress: p.progress, stage: p.stage, status: 'PROCESSING' }),
      )
      patchRow(key, {
        status: out.status === 'FAILED' ? 'ERROR' : 'DONE',
        progress: 100, stage: undefined,
        values: out.values, valueSource: out.valueSource,
        demoMatch: out.demoMatch, message: out.message,
        heatCode: rows.find((r) => r.key === key)?.heatCode || out.heatCode,
      })
    } finally {
      busyRef.current = false
    }
  }

  const rowSapOf = (r: HeatRow) => (r.sap.trim() || master?.sapNo || '').toUpperCase()

  const save = async () => {
    if (rows.some((r) => !r.heatCode.trim())) { toast.error('Enter a Heat Code for every row'); return }
    if (rows.some((r) => !rowSapOf(r))) { toast.error('Select a SAP Code for every row'); return }
    // Clash is per (SAP, heat): same heat under another SAP is a different heat.
    const clashKey = rows
      .map((r) => `${rowSapOf(r)}::${r.heatCode.trim().toUpperCase()}`)
      .find((key) => {
        const [sap, heat] = key.split('::')
        return heatRecords.some((h) => h.sapNo.toUpperCase() === sap && h.heatCode.toUpperCase() === heat)
      })
    if (clashKey) { toast.error(`Heat ${clashKey.replace('::', ' / ')} already exists`); return }
    setSaving(true)
    try {
      const store = useHeatRecordStore.getState()
      const now = nowIso()
      // Group by (SAP, heat). Unique group = one heat + heat-level report.
      // Duplicates sharing SAP + heat: every row becomes a sample —
      // Row 1 -> Sample A, Row 2 -> B, … (user's 4-report example).
      const groups = groupBySapHeat(rows, rowSapOf, (r) => r.heatCode)
      const masterFor = (sapNo: string) =>
        useProductMasterStore.getState().getActiveMasterBySap(sapNo) ?? master
      for (const [, group] of groups) {
        const sapNo = rowSapOf(group[0])
        const heatCode = group[0].heatCode.trim().toUpperCase()
        const masterRef = masterFor(sapNo)
        // Merge typed samples, re-lettering on collision
        const taken: string[] = []
        const mergedSamples: Array<{ id: string; label: string; quantity?: string }> = []
        for (const row of group) {
          for (const s of row.samples) {
            const want = (s.label || '').trim().toUpperCase()
            const [fallback] = nextSampleLabels(taken, 1)
            const finalLabel = want && !taken.includes(want) ? want : fallback
            taken.push(finalLabel)
            mergedSamples.push({ id: s.id, label: finalLabel, quantity: s.quantity })
          }
        }
        const id = store.addHeatRecord({ sapNo, heatCode, heats: mergedSamples, demoReports: {} })
        const reports: HeatReportData[] = []
        if (group.length === 1) {
          // Unique -> heat-level report + typed samples as-is
          const row = group[0]
          const chemParams = row.values.length > 0
            ? row.values
            : applyMasterFallback([], masterRef, 'CHEMICAL').values.map((v) => ({ ...v, confidence: 0.4 }))
          let storedKey: string | undefined
          if (row.file) {
            storedKey = `chem-${heatCode}-${Date.now()}`
            try { await saveReportBlob(storedKey, row.file) } catch { storedKey = undefined }
          }
          if (chemParams.length > 0 || row.file) {
            reports.push({
              id: createId(), sectionKey: 'CHEMICAL', sectionName: NAMES.CHEMICAL,
              parsedValues: chemParams, confirmed: true, warnings: [],
              ...(storedKey && row.file ? { fileMetadata: { fileName: row.file.name, fileSize: row.file.size, mimeType: row.file.type, storedKey } } : {}),
              uploadedBy: user?.name, uploadedAt: now, status: 'COMPLETE' as const,
            })
          }
        } else {
          // Duplicates -> each row's PDF/values become the next sample (A, B, C…)
          const rowLabels = nextSampleLabels(taken, group.length)
          for (let idx = 0; idx < group.length; idx++) {
            const row = group[idx]
            const chemParams = row.values.length > 0
              ? row.values
              : applyMasterFallback([], masterRef, 'CHEMICAL').values.map((v) => ({ ...v, confidence: 0.4 }))
            if (chemParams.length === 0 && !row.file) continue
            let storedKey: string | undefined
            if (row.file) {
              storedKey = `chem-${heatCode}-${Date.now()}-${idx}`
              try { await saveReportBlob(storedKey, row.file) } catch { storedKey = undefined }
            }
            const sample = { id: createId(), label: rowLabels[idx] }
            mergedSamples.push({ id: sample.id, label: sample.label, quantity: undefined })
            reports.push({
              id: createId(), sectionKey: 'CHEMICAL', sectionName: NAMES.CHEMICAL,
              sampleId: sample.id, sampleLabel: sample.label,
              parsedValues: chemParams, confirmed: true, warnings: [],
              ...(storedKey && row.file ? { fileMetadata: { fileName: row.file.name, fileSize: row.file.size, mimeType: row.file.type, storedKey } } : {}),
              uploadedBy: user?.name, uploadedAt: now, status: 'COMPLETE' as const,
            })
          }
          toast.success(`${heatCode}: rows saved as Sample ${rowLabels.join(', ')}`)
        }
        useHeatRecordStore.setState((prev) => ({
          heatRecords: prev.heatRecords.map((h) =>
            h.id === id
              ? {
                  ...h, heats: mergedSamples, reports,
                  requests: FOUR.map((k) => ({
                    id: createId(), sectionKey: k, sectionName: NAMES[k],
                    department: departmentForSectionKey(k),
                    status: k === 'CHEMICAL' ? ('REVIEWED' as const) : ('PENDING' as const),
                  })),
                  updatedAt: now,
                }
              : h,
          ),
        }))
      }
      const heatList = [...groups.keys()]
      addLog({ userId: user?.name ?? 'chemical', action: 'heat_added', entityType: 'HEAT_RECORD', after: { heats: heatList } })
      toast.success(`${heatList.length} heat(s) created — pending requests sent to Micro, Tensile, Hardness`)
      navigate('/chemical')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Add Heat" description="Chemical creates the heat first. Other departments are notified automatically." />

      <Card>
        <CardHeader><CardTitle className="text-base">1 · Default Product (applies to all rows — each row can differ)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-lg">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SAP No., Part No., Item or Customer…"
              className="pl-9"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); setMaster(undefined) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
          </div>
          {open && !master && (
            <div className="max-w-lg overflow-hidden rounded-md border bg-popover shadow-md">
              {results.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {hydrated ? 'No matching product masters. Import the master workbook first.' : 'Loading product masters…'}
                </div>
              ) : results.map((m) => (
                <button key={m.id} type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={() => selectMaster(m)}>
                  <span className="font-mono font-medium">{m.sapNo}</span>
                  <span className="truncate text-xs text-muted-foreground">{m.partNo} — {m.description}</span>
                </button>
              ))}
            </div>
          )}
          {master ? (
            <div className="max-w-lg rounded-md border bg-muted/30 px-3 py-2 text-sm">
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

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">2 · Heat codes + samples + PDF per heat</h3>
          <Button size="sm" variant="outline" onClick={() => setRows((a) => [...a, newRow(master?.sapNo ?? '')])}>
            <Plus className="h-3.5 w-3.5" /> Add heat code
          </Button>
        </div>
        {rows.map((row, ri) => (
          <Card key={row.key}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-44 flex-1">
                  <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">SAP Code *</Label>
                  <RowSapPicker
                    value={row.sap}
                    fallback={master?.sapNo ?? ''}
                    onPick={(sapNo) => patchRow(row.key, { sap: sapNo })}
                  />
                </div>
                <div className="min-w-52 flex-1">
                  <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Heat Code * {row.demoMatch ? '(read from file)' : ''}</Label>
                  <Input value={row.heatCode} onChange={(e) => patchRow(row.key, { heatCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. GZ-56" className="font-mono" />
                </div>
                <div className="flex items-end gap-2">
                  <div>
                    <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Chemical PDF</Label>
                    <label>
                      <input type="file" accept=".pdf,.bmp,.png,.jpg,.jpeg" className="hidden"
                        onChange={(e) => { void onFile(row.key, e.target.files?.[0]); e.target.value = '' }} />
                      <Button size="sm" variant="outline" asChild disabled={row.status === 'PROCESSING' || row.status === 'QUEUED'}>
                        <span><Upload className="h-3.5 w-3.5" /> {row.file ? 'Change PDF' : 'Upload PDF'}</span>
                      </Button>
                    </label>
                  </div>
                  {rows.length > 1 ? (
                    <Button size="sm" variant="ghost" className="text-destructive"
                      onClick={() => setRows((a) => a.filter((r) => r.key !== row.key))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>

              {row.file ? <p className="truncate font-mono text-xs text-muted-foreground">File: {row.file.name}</p> : null}
              {(row.status === 'PROCESSING' || row.status === 'QUEUED') ? (
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${row.progress}%` }} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {ri === 0 || row.status === 'PROCESSING' ? `${row.stage ?? 'Processing…'} ${row.progress}%` : `Waiting in queue…`}
                  </p>
                </div>
              ) : null}
              {row.status === 'ERROR' ? <p className="text-xs text-destructive">{row.message ?? 'Processing failed — choose the file again to retry.'}</p> : null}
              {row.status === 'DONE' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {row.message} — {row.values.length} value(s){row.demoMatch ? ' · read from file' : ''}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setReviewKey(row.key)}>Review</Button>
                </div>
              ) : null}

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Samples {row.heatCode ? `(named ${row.heatCode || 'HEAT'}-A, -B…)` : ''}
                  </Label>
                  <Button size="sm" variant="outline" onClick={() => addSample(row.key)}>
                    <Plus className="h-3 w-3" /> Add Sample
                  </Button>
                </div>
                {row.samples.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No samples — heat-level report only. Add A/B/C samples if tested separately.</p>
                ) : (
                  <div className="space-y-1.5">
                    {row.samples.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <Input value={s.label} className="w-28 font-mono"
                          onChange={(e) => patchRow(row.key, { samples: row.samples.map((x) => (x.id === s.id ? { ...x, label: e.target.value.toUpperCase() } : x)) })}
                          placeholder="A" />
                        <Input value={s.quantity ?? ''} className="w-32" placeholder="Qty"
                          onChange={(e) => patchRow(row.key, { samples: row.samples.map((x) => (x.id === s.id ? { ...x, quantity: e.target.value || undefined } : x)) })} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={() => patchRow(row.key, { samples: row.samples.filter((x) => x.id !== s.id) })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/chemical')}>Cancel</Button>
        <Button onClick={() => { void save() }} disabled={saving}>
          {saving ? 'Creating…' : `Create heat(s) + notify departments`}
        </Button>
      </div>

      {/* Review opens as a dialog ON the report — cards stay in place. */}
      <ReportReviewDialog
        item={reviewRow ? {
          fileName: reviewRow.file?.name ?? `${reviewRow.heatCode || 'heat'} (no file)`,
          file: reviewRow.file,
          sapCode: reviewRow.sap || master?.sapNo || '', heatCode: reviewRow.heatCode,
          values: reviewRow.values, valueSource: reviewRow.valueSource,
          message: reviewRow.message, demoMatch: reviewRow.demoMatch,
        } : null}
        onClose={() => setReviewKey(null)}
        onChange={(p) => {
          if (!reviewRow) return
          patchRow(reviewRow.key, {
            ...(p.heatCode !== undefined ? { heatCode: p.heatCode } : {}),
            ...(p.values !== undefined ? { values: p.values } : {}),
            ...(p.valueSource !== undefined ? { valueSource: p.valueSource } : {}),
          })
        }}
      />
    </div>
  )
}

/** Per-row SAP search — rows sharing a SAP stay together, a different SAP saves separately. */
function RowSapPicker({ value, fallback, onPick }: { value: string; fallback: string; onPick: (sapNo: string) => void }) {
  const searchMasters = useProductMasterStore((s) => s.searchMasters)
  const [q, setQ] = useState(value || fallback)
  const [open, setOpen] = useState(false)
  const shown = value || fallback
  const results = searchMasters(q).filter((m) => m.status === 'ACTIVE').slice(0, 8)
  return (
    <div className="relative">
      <Input
        value={open ? q : shown}
        placeholder="Search SAP…"
        className="font-mono"
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => { setQ(''); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open ? (
        <div className="absolute z-20 mt-1 max-h-48 w-72 overflow-auto rounded-md border bg-popover shadow-md">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matching masters.</div>
          ) : results.map((m) => (
            <button key={m.id} type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent"
              onMouseDown={() => { onPick(m.sapNo); setQ(m.sapNo); setOpen(false) }}>
              <span className="font-mono font-medium">{m.sapNo}</span>
              <span className="truncate text-muted-foreground">{m.partNo} {m.description}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
