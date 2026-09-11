import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { BulkReviewTable } from '@/components/workflow/BulkReviewTable'
import { DeptBadge } from '@/components/workflow/WorkflowBadges'
import { LoadLabDemoButton } from '@/components/workflow/LoadLabDemoButton'
import { processQueuedFile, type IngestItem } from '@/services/bulkIngest'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { useStoresHydrated } from '@/hooks/useHydrated'
import { LoadingPage } from '@/components/EmptyState'
import { deptStateForHeat, type DeptKey } from '@/lib/heatWorkflow'
import { saveReportBlob } from '@/lib/fileStorage'
import { assignPreviewSamples, groupBySapHeat, resolveGroupLabels } from '@/lib/sampleSplit'
import { createId, nowIso } from '@/lib/id'
import { toast } from 'sonner'
import { DEPT_CONFIG } from '@/pages/dept/deptConfig'

export function DeptDashboardPage({ dept }: { dept: 'micro' | 'tensile' | 'hardness' }) {
  const cfg = DEPT_CONFIG[dept]
  const hydrated = useStoresHydrated()
  const heats = useHeatRecordStore((s) => s.heatRecords)
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const query = q.toLowerCase().trim()
    return heats.filter((h) => !query || `${h.heatCode} ${h.sapNo}`.toLowerCase().includes(query))
  }, [heats, q])
  if (!hydrated) return <LoadingPage label={`Loading ${cfg.label}…`} />
  const pending = heats.filter((h) => deptStateForHeat(h, cfg.key as DeptKey) !== 'COMPLETED').length
  return (
    <div>
      <PageHeader title={cfg.label} description={`Pending heats created by Chemical. Upload ${cfg.sectionName} reports — single or bulk.`}
        actions={<><LoadLabDemoButton /><Button asChild><Link to={`${cfg.home}/upload`}>Upload Reports</Link></Button></>} />
      <div className="grid gap-4 sm:grid-cols-3">
        {[{ label: 'Pending Requests', value: pending }, { label: 'Completed', value: heats.length - pending }, { label: 'Total Heats', value: heats.length }].map((k) => (
          <Card key={k.label}><CardContent className="p-4"><div className="text-2xl font-semibold">{k.value}</div><div className="text-sm text-muted-foreground">{k.label}</div></CardContent></Card>
        ))}
      </div>
      <div className="mt-4"><Input placeholder="Search Heat Code or SAP…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" /></div>
      <Card className="mt-3"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Heat Code</TableHead><TableHead>SAP Code</TableHead><TableHead>{cfg.sectionName} status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.slice(0, 50).map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-mono font-medium">{h.heatCode}</TableCell>
                <TableCell className="font-mono text-xs">{h.sapNo}</TableCell>
                <TableCell><DeptBadge value={deptStateForHeat(h, cfg.key as DeptKey)} /></TableCell>
                <TableCell><Button size="sm" variant="outline" asChild><Link to={`${cfg.home}/upload?heat=${encodeURIComponent(h.heatCode)}`}>Upload</Link></Button></TableCell>
              </TableRow>
            ))}
            {list.length === 0 ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No heats yet — Chemical creates them first.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}

export function DeptUploadPage({ dept }: { dept: 'micro' | 'tensile' | 'hardness' }) {
  const cfg = DEPT_CONFIG[dept]
  const [params] = useSearchParams()
  const preselect = (params.get('heat') ?? '').toUpperCase()
  const [items, setItems] = useState<IngestItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [singleHeat, setSingleHeat] = useState(preselect)
  const user = useAuthStore((s) => s.user)
  const addLog = useAuditStore((s) => s.addLog)
  const patch = (id: string, p: Partial<IngestItem>) => setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...p } : i)))

  // Fresh snapshot readable inside the async queue loop.
  const itemsRef = useRef(items)
  itemsRef.current = items

  const takenLabelsOf = (sap: string, heat: string) =>
    useHeatRecordStore.getState().heatRecords.find(
      (h) => h.sapNo.toUpperCase() === sap && h.heatCode.toUpperCase() === heat,
    )?.heats.map((s) => s.label) ?? []

  // Live Sample A/B/C preview: regroup whenever SAP/heat/status change.
  const signature = items.map((i) => `${i.id}:${i.sapCode}:${i.heatCode}:${i.status}:${i.assignedSample ?? ''}`).join('|')
  useEffect(() => {
    setItems((prev) => assignPreviewSamples(prev, takenLabelsOf))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  /** Sequential queue: one file processes (~10s), the rest wait as QUEUED. */
  const runQueue = async (ids: string[]) => {
    setProcessing(true)
    const masters = useProductMasterStore.getState().masters
    for (const id of ids) {
      const current = itemsRef.current.find((i) => i.id === id)
      if (!current) continue
      const out = await processQueuedFile(current.file, cfg.key, masters, (p) => patch(id, p))
      const forced = singleHeatRef.current || preselect
      patch(id, forced
        ? { ...out, heatCode: forced.toUpperCase(), status: out.status === 'FAILED' ? 'FAILED' : 'MATCHED' as const, progress: 100, stage: undefined }
        : { ...out, progress: 100, stage: undefined })
    }
    setProcessing(false)
  }

  const singleHeatRef = useRef(singleHeat)
  singleHeatRef.current = singleHeat

  const onFiles = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    const fresh: IngestItem[] = list.map((f, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`, file: f, progress: 0, status: 'QUEUED',
      queueLabel: 'Waiting in queue',
      sapCode: '', heatCode: (singleHeatRef.current || preselect).toUpperCase(),
      confidence: 0, message: 'Waiting in queue…', values: [], valueSource: {},
    }))
    setItems((arr) => [...arr, ...fresh])
    setTimeout(() => {
      const pending = itemsRef.current.filter((i) => i.status === 'QUEUED' || i.status === 'FAILED').map((i) => i.id)
      if (pending.length > 0) void runQueue(pending)
    }, 50)
    toast.success(`${list.length} file(s) queued — processing one by one (~10s each)`)
  }

  const retryOne = (id: string) => {
    patch(id, { status: 'QUEUED', progress: 0, stage: 'Waiting in queue…', message: 'Waiting in queue…' })
    setTimeout(() => { void runQueue([id]) }, 50)
  }

  const submitAll = async () => {
    const valid = itemsRef.current.filter((i) => i.heatCode && (i.status === 'MATCHED' || i.status === 'REVIEW_REQUIRED'))
    if (valid.length === 0) { toast.error('Set the Heat Code for at least one processed file'); return }
    setSubmitting(true)
    try {
      let ok = 0
      // Group by (SAP, heat). Unique = heat-level report.
      // Repeats sharing SAP + heat: Report 1 -> Sample A, Report 2 -> B, …
      const groups = groupBySapHeat(valid, (i) => i.sapCode, (i) => i.heatCode)
      for (const [, group] of groups) {
        const now = nowIso()
        const st = useHeatRecordStore.getState()
        const heatCode = group[0].heatCode
        const sapCode = (group[0].sapCode || '').toLowerCase()
        const heat = st.heatRecords.find((h) =>
          h.heatCode.toLowerCase() === heatCode.toLowerCase() &&
          (!sapCode || h.sapNo.toLowerCase() === sapCode),
        )
        if (!heat) { toast.error(`${heatCode}: heat not found — ask Chemical to create it first`); continue }
        const makeDeptReport = (it: IngestItem, sampleId?: string, sampleLabel?: string) => {
          const storedKey = `${dept}-${heatCode}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          void saveReportBlob(storedKey, it.file).catch(() => { /* ignore */ })
          return {
            id: createId(), sectionKey: cfg.key, sectionName: cfg.sectionName,
            ...(sampleId ? { sampleId, sampleLabel } : {}),
            parsedValues: it.values.length > 0 ? it.values : [{ name: 'Result', value: 'As per report' }],
            confirmed: true, warnings: it.result?.warnings ?? [],
            fileMetadata: { fileName: it.file.name, fileSize: it.file.size, mimeType: it.file.type, storedKey },
            uploadedBy: user?.name, uploadedAt: now, status: 'COMPLETE' as const,
          }
        }
        // Unique report -> heat level; repeats -> every report becomes a sample.
        // Reuse the previewed letters so review == saved.
        let sampleIds: Array<{ id: string; label: string }> = []
        if (group.length > 1) {
          const fresh = useHeatRecordStore.getState().heatRecords.find((h) => h.id === heat.id)!
          const labels = resolveGroupLabels(group, fresh.heats.map((s) => s.label))
          sampleIds = labels.map((label) => ({ id: createId(), label }))
          st.updateHeatRecord(heat.id, {
            heats: [...fresh.heats, ...sampleIds.map((s) => ({ id: s.id, label: s.label, quantity: undefined }))],
          })
          toast.success(`${heatCode}: saved as Sample ${labels.join(', ')}`)
        }
        group.forEach((it, idx) => {
          const s = group.length > 1 ? sampleIds[idx] : undefined
          const report = makeDeptReport(it, s?.id, s?.label)
          useHeatRecordStore.getState().upsertReportData(heat.id, report)
          ok++
        })
        const req = (heat.requests ?? []).find((r) => r.sectionKey === cfg.key)
        if (req) {
          useHeatRecordStore.setState((prev) => ({
            heatRecords: prev.heatRecords.map((h) =>
              h.id === heat.id ? { ...h, requests: h.requests.map((r) => (r.id === req.id ? { ...r, status: 'REVIEWED' as const } : r)) } : h,
            ),
          }))
        }
      }
      addLog({ userId: user?.name ?? dept, action: `${dept}_submitted`, entityType: 'HEAT_RECORD', after: { count: ok } })
      toast.success(`${ok} report(s) submitted`)
      setItems((arr) => arr.filter((i) => !valid.some((v) => v.id === i.id)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title={`${cfg.label} — Upload Reports`} description="Method 1: pick a heat + one file. Method 2: bulk-upload many files — auto-matched to heat codes. Files process one by one (~10s each)." />
      <Card><CardContent className="flex flex-wrap items-center gap-2 p-4">
        <Input placeholder="Heat Code for single upload (e.g. GZ-56)" value={singleHeat} onChange={(e) => setSingleHeat(e.target.value.toUpperCase())} className="max-w-xs font-mono" />
        <label className="text-sm">
          <input type="file" multiple accept=".pdf,.bmp,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = '' }} />
          <Button asChild disabled={processing}><span>{processing ? 'Processing…' : 'Select files'}</span></Button>
        </label>
        <span className="text-xs text-muted-foreground">PDF, BMP, PNG, JPG/JPEG supported.</span>
      </CardContent></Card>
      <div className="mt-3 cursor-pointer rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground"
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files) }}>
        Drag &amp; drop {dept} reports here for bulk matching (10 / 20 / 50 / 60+ at once).
      </div>
      <div className="mt-4">
        <BulkReviewTable items={items} onChange={patch}
          onAcceptAll={() => setItems((a) => a.map((i) => (i.status === 'REVIEW_REQUIRED' ? { ...i, status: 'MATCHED' as const } : i)))}
          onSubmitAll={submitAll} submitting={submitting} onRetry={retryOne} />
      </div>
    </div>
  )
}

export function DeptCompletedPage({ dept }: { dept: 'micro' | 'tensile' | 'hardness' }) {
  const cfg = DEPT_CONFIG[dept]
  const hydrated = useStoresHydrated()
  const heats = useHeatRecordStore((s) => s.heatRecords)
  if (!hydrated) return <LoadingPage label="Loading…" />
  const done = heats.filter((h) => deptStateForHeat(h, cfg.key as DeptKey) === 'COMPLETED')
  return (
    <div>
      <PageHeader title={`${cfg.label} — Completed`} description={`${done.length} heats completed.`} />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Heat</TableHead><TableHead>SAP</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {done.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-mono">{h.heatCode}</TableCell>
                <TableCell className="font-mono text-xs">{h.sapNo}</TableCell>
                <TableCell><DeptBadge value="COMPLETED" /></TableCell>
              </TableRow>
            ))}
            {done.length === 0 ? <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Nothing completed yet.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
