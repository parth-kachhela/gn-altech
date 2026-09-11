import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { BulkReviewTable } from '@/components/workflow/BulkReviewTable'
import { processQueuedFile, type IngestItem } from '@/services/bulkIngest'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { departmentForSectionKey } from '@/lib/permissions'
import { assignPreviewSamples, groupBySapHeat, resolveGroupLabels } from '@/lib/sampleSplit'
import { saveReportBlob } from '@/lib/fileStorage'
import { createId, nowIso } from '@/lib/id'
import { toast } from 'sonner'

const FOUR = ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] as const
const NAMES: Record<string, string> = { CHEMICAL: 'Chemical Analysis', MICRO: 'Micro Structure', TENSILE: 'Tensile', HARDNESS: 'Hardness' }

export function ChemicalBulkUploadPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<IngestItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
      const out = await processQueuedFile(current.file, 'CHEMICAL', masters, (p) => patch(id, p))
      patch(id, { ...out, progress: 100, stage: undefined, queueLabel: undefined })
    }
    setProcessing(false)
  }

  const onFiles = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    const fresh: IngestItem[] = list.map((f, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`, file: f, progress: 0, status: 'QUEUED',
      queueLabel: 'Waiting in queue', sapCode: '', heatCode: '', confidence: 0,
      message: 'Waiting in queue…', values: [], valueSource: {},
    }))
    setItems((arr) => [...arr, ...fresh])
    // Let state settle, then drain the queue (new + previously failed/queued).
    setTimeout(() => {
      const pending = [...itemsRef.current
        .filter((i) => i.status === 'QUEUED' || i.status === 'FAILED')
        .map((i) => i.id)]
      if (pending.length > 0) void runQueue(pending)
    }, 50)
    toast.success(`${list.length} file(s) queued — processing one by one (~10s each)`)
  }

  const retryOne = (id: string) => {
    patch(id, { status: 'QUEUED', progress: 0, stage: 'Waiting in queue…', message: 'Waiting in queue…', queueLabel: 'Waiting in queue' })
    setTimeout(() => { void runQueue([id]) }, 50)
  }

  const submitAll = async () => {
    const valid = itemsRef.current.filter((i) => i.sapCode && i.heatCode && (i.status === 'MATCHED' || i.status === 'REVIEW_REQUIRED'))
    if (valid.length === 0) { toast.error('Confirm SAP Code and Heat Code for at least one processed record'); return }
    setSubmitting(true)
    try {
      // Group by (SAP, heat). Unique group = heat-level report.
      // Repeats sharing SAP + heat: Report 1 -> Sample A, Report 2 -> B, …
      const groups = groupBySapHeat(valid, (i) => i.sapCode, (i) => i.heatCode)
      let reportsWritten = 0
      for (const [, group] of groups) {
        const now = nowIso()
        // Fresh lookup each iteration (store snapshot goes stale as we add heats)
        const st = useHeatRecordStore.getState()
        const head = group[0]
        const sapNo = head.sapCode.toUpperCase()
        const heatCode = head.heatCode.toUpperCase()
        // Same heat under a different SAP is a different heat — match both.
        const existing = st.heatRecords.find(
          (h) => h.heatCode.toLowerCase() === heatCode.toLowerCase() && h.sapNo.toLowerCase() === sapNo.toLowerCase(),
        )

        const makeReport = (it: IngestItem, sampleId?: string, sampleLabel?: string) => {
          const storedKey = `chem-${heatCode}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          void saveReportBlob(storedKey, it.file).catch(() => { /* ignore */ })
          return {
            id: createId(), sectionKey: 'CHEMICAL', sectionName: NAMES.CHEMICAL,
            ...(sampleId ? { sampleId, sampleLabel } : {}),
            parsedValues: it.values, confirmed: true, warnings: it.result?.warnings ?? [],
            fileMetadata: { fileName: it.file.name, fileSize: it.file.size, mimeType: it.file.type, storedKey },
            uploadedBy: user?.name, uploadedAt: now, status: 'COMPLETE' as const,
          }
        }

        const attachAsSamples = (heatId: string, taken: string[]) => {
          // Reuse the previewed letters so review == saved.
          const labels = resolveGroupLabels(group, taken)
          const newSamples = labels.map((label) => ({ id: createId(), label, quantity: undefined }))
          const cur = useHeatRecordStore.getState().heatRecords.find((h) => h.id === heatId)!
          useHeatRecordStore.getState().updateHeatRecord(heatId, { heats: [...cur.heats, ...newSamples] })
          group.forEach((it, idx) => {
            const s = newSamples[idx]
            const r = makeReport(it, s.id, s.label)
            useHeatRecordStore.getState().upsertReportData(heatId, r)
            useHeatRecordStore.getState().confirmReportData(heatId, r.id, it.values)
            reportsWritten++
          })
          toast.success(`${heatCode}: saved as Sample ${labels.join(', ')}`)
        }

        if (existing) {
          if (group.length === 1) {
            // Unique report -> heat level
            const r0 = makeReport(head)
            st.upsertReportData(existing.id, r0)
            st.confirmReportData(existing.id, r0.id, head.values)
            reportsWritten++
          } else {
            // Repeats -> every report becomes a sample (A, B, C…)
            const fresh = useHeatRecordStore.getState().heatRecords.find((h) => h.id === existing.id)!
            attachAsSamples(existing.id, fresh.heats.map((s) => s.label))
          }
        } else if (group.length === 1) {
          const id = st.addHeatRecord({ sapNo, heatCode, heats: [], demoReports: {} })
          useHeatRecordStore.setState((prev) => ({
            heatRecords: prev.heatRecords.map((h) =>
              h.id === id
                ? {
                    ...h, reports: [makeReport(head)],
                    requests: FOUR.map((k) => ({
                      id: createId(), sectionKey: k, sectionName: NAMES[k],
                      department: departmentForSectionKey(k),
                      status: k === 'CHEMICAL' ? ('REVIEWED' as const) : ('PENDING' as const),
                    })),
                  }
                : h,
            ),
          }))
          reportsWritten++
        } else {
          const id = st.addHeatRecord({ sapNo, heatCode, heats: [], demoReports: {} })
          // Create heat-level requests first, then attach all reports as samples.
          useHeatRecordStore.setState((prev) => ({
            heatRecords: prev.heatRecords.map((h) =>
              h.id === id
                ? {
                    ...h,
                    requests: FOUR.map((k) => ({
                      id: createId(), sectionKey: k, sectionName: NAMES[k],
                      department: departmentForSectionKey(k),
                      status: k === 'CHEMICAL' ? ('REVIEWED' as const) : ('PENDING' as const),
                    })),
                  }
                : h,
            ),
          }))
          attachAsSamples(id, [])
        }
      }
      // Single audit entry for the whole batch (was N writes → N re-renders)
      addLog({ userId: user?.name ?? 'chemical', action: 'chemical_submitted', entityType: 'HEAT_RECORD', after: { count: reportsWritten, heats: [...new Set(valid.map((v) => v.heatCode))] } })
      toast.success(`${reportsWritten} report(s) in ${groups.size} heat(s) submitted — Micro, Tensile, Hardness notified`)
      setItems((arr) => arr.filter((i) => !valid.some((v) => v.id === i.id)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Bulk Chemical Upload" description="Upload 10, 20, 50, 60+ PDFs at once. Each file is auto-matched to its Heat Code."
        actions={<Button onClick={() => inputRef.current?.click()} disabled={processing}>{processing ? 'Processing…' : 'Select PDFs'}</Button>} />
      <input ref={inputRef} type="file" multiple accept=".pdf,.bmp,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = '' }} />
      <Card className="cursor-pointer border-dashed" onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files) }}>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Drag &amp; drop chemical PDFs here, or click to browse. Queued → Uploading → Processing → Extracted info → Auto-match → Review → Submit.
        </CardContent>
      </Card>
      <div className="mt-4">
        <BulkReviewTable items={items} onChange={patch}
          onAcceptAll={() => setItems((arr) => arr.map((i) => (i.status === 'REVIEW_REQUIRED' ? { ...i, status: 'MATCHED' as const } : i)))}
          onSubmitAll={submitAll} submitting={submitting} onRetry={retryOne} />
      </div>
    </div>
  )
}
