import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { BulkReviewTable } from '@/components/workflow/BulkReviewTable'
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
import { UploadCloud, AlertTriangle } from 'lucide-react'
import type { HeatRecord, HeatReportData } from '@/types'

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

  // Conflict modal state
  const [singleConflict, setSingleConflict] = useState<{
    item: IngestItem
    heat: HeatRecord
    existingReport: HeatReportData
    sampleLabel?: string
  } | null>(null)

  const [bulkConflict, setBulkConflict] = useState<{
    conflicts: Array<{ item: IngestItem; heatCode: string; existingReport: HeatReportData; sampleLabel?: string }>
    validItems: IngestItem[]
  } | null>(null)

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
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      progress: 0,
      status: 'QUEUED',
      queueLabel: 'Waiting in queue',
      sapCode: '',
      heatCode: '',
      confidence: 0,
      message: 'Waiting in queue…',
      values: [],
      valueSource: {},
    }))
    setItems((arr) => [...arr, ...fresh])
    // Let state settle, then drain the queue (new + previously failed/queued).
    setTimeout(() => {
      const pending = [...itemsRef.current
        .filter((i) => i.status === 'QUEUED' || i.status === 'FAILED')
        .map((i) => i.id)]
      if (pending.length > 0) void runQueue(pending)
    }, 50)
    toast.success(`${list.length} file(s) queued — processing one by one`)
  }

  const retryOne = (id: string) => {
    patch(id, { status: 'QUEUED', progress: 0, stage: 'Waiting in queue…', message: 'Waiting in queue…', queueLabel: 'Waiting in queue' })
    setTimeout(() => { void runQueue([id]) }, 50)
    toast.info('Re-processing file extraction…')
  }

  const handleRemoveFile = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    toast.info('File upload cancelled')
  }

  const handleReplaceFile = (id: string, newFile: File) => {
    patch(id, {
      file: newFile,
      status: 'QUEUED',
      progress: 0,
      stage: 'Waiting in queue…',
      message: 'Waiting in queue…',
      values: [],
    })
    setTimeout(() => {
      void runQueue([id])
    }, 50)
    toast.success(`Replaced with ${newFile.name} — reprocessing`)
  }

  const executeSubmitSingle = (itemToSubmit: IngestItem, replaceExistingId?: string) => {
    if (!itemToSubmit.sapCode || !itemToSubmit.heatCode) {
      toast.error('Confirm SAP Code and Heat Code before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const now = nowIso()
      const st = useHeatRecordStore.getState()
      const sapNo = itemToSubmit.sapCode.toUpperCase()
      const heatCode = itemToSubmit.heatCode.toUpperCase()
      const existing = st.heatRecords.find(
        (h) => h.heatCode.toLowerCase() === heatCode.toLowerCase() && h.sapNo.toLowerCase() === sapNo.toLowerCase(),
      )

      const storedKey = `chem-${heatCode}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      void saveReportBlob(storedKey, itemToSubmit.file).catch(() => {})

      const reportId = replaceExistingId || createId()
      const makeReport = () => ({
        id: reportId,
        sectionKey: 'CHEMICAL',
        sectionName: NAMES.CHEMICAL,
        ...(itemToSubmit.assignedSample ? { sampleLabel: itemToSubmit.assignedSample } : {}),
        parsedValues: itemToSubmit.values,
        confirmed: true,
        warnings: itemToSubmit.result?.warnings ?? [],
        fileMetadata: { fileName: itemToSubmit.file.name, fileSize: itemToSubmit.file.size, mimeType: itemToSubmit.file.type, storedKey },
        uploadedBy: user?.name,
        uploadedAt: now,
        status: 'COMPLETE' as const,
      })

      if (existing) {
        const r0 = makeReport()
        st.upsertReportData(existing.id, r0)
        st.confirmReportData(existing.id, r0.id, itemToSubmit.values)
      } else {
        const id = st.addHeatRecord({ sapNo, heatCode, heats: [], demoReports: {} })
        useHeatRecordStore.setState((prev) => ({
          heatRecords: prev.heatRecords.map((h) =>
            h.id === id
              ? {
                  ...h,
                  reports: [makeReport()],
                  requests: FOUR.map((k) => ({
                    id: createId(),
                    sectionKey: k,
                    sectionName: NAMES[k],
                    department: departmentForSectionKey(k),
                    status: k === 'CHEMICAL' ? ('REVIEWED' as const) : ('PENDING' as const),
                  })),
                }
              : h,
          ),
        }))
      }

      addLog({
        userId: user?.name ?? 'chemical',
        action: replaceExistingId ? 'chemical_report_replaced' : 'chemical_submitted',
        entityType: 'HEAT_RECORD',
        after: { heatCode, fileName: itemToSubmit.file.name, replaced: Boolean(replaceExistingId) },
      })
      toast.success(
        replaceExistingId
          ? `Replaced existing Chemical report for Heat ${heatCode}!`
          : `Heat ${heatCode} chemical report saved — lab departments notified!`
      )
      setItems((arr) => arr.filter((i) => i.id !== itemToSubmit.id))
      setSingleConflict(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestSubmitSingle = (itemToSubmit: IngestItem) => {
    if (!itemToSubmit.sapCode || !itemToSubmit.heatCode) {
      toast.error('Confirm SAP Code and Heat Code before submitting.')
      return
    }
    const st = useHeatRecordStore.getState()
    const sapNo = itemToSubmit.sapCode.toUpperCase()
    const heatCode = itemToSubmit.heatCode.toUpperCase()
    const existing = st.heatRecords.find(
      (h) => h.heatCode.toLowerCase() === heatCode.toLowerCase() && h.sapNo.toLowerCase() === sapNo.toLowerCase(),
    )

    if (existing) {
      const existingReport = existing.reports.find(
        (r) => r.sectionKey === 'CHEMICAL' && (!itemToSubmit.assignedSample || r.sampleLabel === itemToSubmit.assignedSample)
      )
      if (existingReport) {
        setSingleConflict({
          item: itemToSubmit,
          heat: existing,
          existingReport,
          sampleLabel: itemToSubmit.assignedSample,
        })
        return
      }
    }

    executeSubmitSingle(itemToSubmit)
  }

  const executeSubmitAll = async (valid: IngestItem[]) => {
    setSubmitting(true)
    try {
      const groups = groupBySapHeat(valid, (i) => i.sapCode, (i) => i.heatCode)
      let reportsWritten = 0
      for (const [, group] of groups) {
        const now = nowIso()
        const st = useHeatRecordStore.getState()
        const head = group[0]
        const sapNo = head.sapCode.toUpperCase()
        const heatCode = head.heatCode.toUpperCase()
        const existing = st.heatRecords.find(
          (h) => h.heatCode.toLowerCase() === heatCode.toLowerCase() && h.sapNo.toLowerCase() === sapNo.toLowerCase(),
        )

        const makeReport = (it: IngestItem, existingId?: string, sampleId?: string, sampleLabel?: string) => {
          const storedKey = `chem-${heatCode}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          void saveReportBlob(storedKey, it.file).catch(() => {})
          return {
            id: existingId || createId(),
            sectionKey: 'CHEMICAL',
            sectionName: NAMES.CHEMICAL,
            ...(sampleId ? { sampleId, sampleLabel } : sampleLabel ? { sampleLabel } : {}),
            parsedValues: it.values,
            confirmed: true,
            warnings: it.result?.warnings ?? [],
            fileMetadata: { fileName: it.file.name, fileSize: it.file.size, mimeType: it.file.type, storedKey },
            uploadedBy: user?.name,
            uploadedAt: now,
            status: 'COMPLETE' as const,
          }
        }

        const attachAsSamples = (heatId: string, taken: string[]) => {
          const labels = resolveGroupLabels(group, taken)
          const newSamples = labels.map((label) => ({ id: createId(), label, quantity: undefined }))
          const cur = useHeatRecordStore.getState().heatRecords.find((h) => h.id === heatId)!
          useHeatRecordStore.getState().updateHeatRecord(heatId, { heats: [...cur.heats, ...newSamples] })
          group.forEach((it, idx) => {
            const s = newSamples[idx]
            const existingRep = cur.reports.find((r) => r.sectionKey === 'CHEMICAL' && r.sampleLabel === s.label)
            const r = makeReport(it, existingRep?.id, s.id, s.label)
            useHeatRecordStore.getState().upsertReportData(heatId, r)
            useHeatRecordStore.getState().confirmReportData(heatId, r.id, it.values)
            reportsWritten++
          })
          toast.success(`${heatCode}: saved as Sample ${labels.join(', ')}`)
        }

        if (existing) {
          if (group.length === 1) {
            const existingRep = existing.reports.find((r) => r.sectionKey === 'CHEMICAL')
            const r0 = makeReport(head, existingRep?.id)
            st.upsertReportData(existing.id, r0)
            st.confirmReportData(existing.id, r0.id, head.values)
            reportsWritten++
          } else {
            const fresh = useHeatRecordStore.getState().heatRecords.find((h) => h.id === existing.id)!
            attachAsSamples(existing.id, fresh.heats.map((s) => s.label))
          }
        } else if (group.length === 1) {
          const id = st.addHeatRecord({ sapNo, heatCode, heats: [], demoReports: {} })
          useHeatRecordStore.setState((prev) => ({
            heatRecords: prev.heatRecords.map((h) =>
              h.id === id
                ? {
                    ...h,
                    reports: [makeReport(head)],
                    requests: FOUR.map((k) => ({
                      id: createId(),
                      sectionKey: k,
                      sectionName: NAMES[k],
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
          useHeatRecordStore.setState((prev) => ({
            heatRecords: prev.heatRecords.map((h) =>
              h.id === id
                ? {
                    ...h,
                    requests: FOUR.map((k) => ({
                      id: createId(),
                      sectionKey: k,
                      sectionName: NAMES[k],
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
      addLog({
        userId: user?.name ?? 'chemical',
        action: 'chemical_submitted',
        entityType: 'HEAT_RECORD',
        after: { count: reportsWritten, heats: [...new Set(valid.map((v) => v.heatCode))] },
      })
      toast.success(`${reportsWritten} report(s) in ${groups.size} heat(s) submitted — Micro, Tensile, Hardness notified`)
      setItems((arr) => arr.filter((i) => !valid.some((v) => v.id === i.id)))
      setBulkConflict(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestSubmitAll = () => {
    const valid = itemsRef.current.filter((i) => i.sapCode && i.heatCode && (i.status === 'MATCHED' || i.status === 'REVIEW_REQUIRED'))
    if (valid.length === 0) {
      toast.error('Confirm SAP Code and Heat Code for at least one processed record')
      return
    }

    const st = useHeatRecordStore.getState()
    const conflicts: Array<{ item: IngestItem; heatCode: string; existingReport: HeatReportData; sampleLabel?: string }> = []

    for (const it of valid) {
      const heatCode = it.heatCode.toUpperCase()
      const sapNo = it.sapCode.toUpperCase()
      const existing = st.heatRecords.find(
        (h) => h.heatCode.toLowerCase() === heatCode.toLowerCase() && h.sapNo.toLowerCase() === sapNo.toLowerCase(),
      )
      if (existing) {
        const existingRep = existing.reports.find(
          (r) => r.sectionKey === 'CHEMICAL' && (!it.assignedSample || r.sampleLabel === it.assignedSample)
        )
        if (existingRep) {
          conflicts.push({
            item: it,
            heatCode,
            existingReport: existingRep,
            sampleLabel: it.assignedSample,
          })
        }
      }
    }

    if (conflicts.length > 0) {
      setBulkConflict({ conflicts, validItems: valid })
      return
    }

    void executeSubmitAll(valid)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bulk Chemical Upload"
        description="Upload 10, 20, 50+ PDFs at once. Each file is auto-matched to its Heat Code and editable directly on the page."
        actions={
          <Button onClick={() => inputRef.current?.click()} disabled={processing}>
            <UploadCloud className="h-4 w-4 mr-2" />
            {processing ? 'Processing…' : 'Select PDFs'}
          </Button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.bmp,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer rounded-lg border-2 border-dashed border-primary/30 bg-muted/20 p-8 text-center transition-all hover:border-primary hover:bg-muted/50 hover:shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onFiles(e.dataTransfer.files)
        }}
      >
        <UploadCloud className="mx-auto h-10 w-10 text-primary/70 mb-2" />
        <div className="text-sm font-semibold text-foreground">
          Click anywhere here or drag &amp; drop Chemical PDF reports
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Bulk upload supported (10, 20, 50+ files). Files are parsed automatically and rendered for inline review below.
        </div>
      </div>
      {items.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold">Parsed Reports Ready for Review ({items.length})</h3>
          <BulkReviewTable
            items={items}
            onChange={patch}
            onAcceptAll={() =>
              setItems((arr) =>
                arr.map((i) => (i.status === 'REVIEW_REQUIRED' ? { ...i, status: 'MATCHED' as const } : i)),
              )
            }
            onSubmitAll={handleRequestSubmitAll}
            onSubmitOne={(id) => {
              const it = items.find((i) => i.id === id)
              if (it) handleRequestSubmitSingle(it)
            }}
            onRemove={handleRemoveFile}
            onReplaceFile={handleReplaceFile}
            onRetry={retryOne}
            submitting={submitting}
          />
        </div>
      ) : null}

      {/* Single Report Conflict Alert Dialog */}
      <AlertDialog
        open={Boolean(singleConflict)}
        onOpenChange={(open) => !open && setSingleConflict(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>Chemical Report Already Exists</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm text-foreground">
                <p>
                  A Chemical report already exists for Heat Code{' '}
                  <strong className="font-mono text-primary">{singleConflict?.heat.heatCode}</strong>
                  {singleConflict?.sampleLabel ? (
                    <span> (Sample <strong>{singleConflict.sampleLabel}</strong>)</span>
                  ) : ''}.
                </p>
                <div className="rounded-md border bg-muted/40 p-2.5 text-xs space-y-1 font-mono">
                  <div>
                    <span className="text-muted-foreground font-sans">Current file: </span>
                    <span className="font-semibold text-foreground">
                      {singleConflict?.existingReport.fileMetadata?.fileName ?? 'Previous Report Attachment'}
                    </span>
                  </div>
                  {singleConflict?.existingReport.uploadedAt ? (
                    <div>
                      <span className="text-muted-foreground font-sans">Uploaded on: </span>
                      <span>{new Date(singleConflict.existingReport.uploadedAt).toLocaleString()}</span>
                    </div>
                  ) : null}
                  <div>
                    <span className="text-muted-foreground font-sans">New file: </span>
                    <span className="font-semibold text-primary">{singleConflict?.item.file.name}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Do you want to <strong>replace</strong> the existing report with this new file, or <strong>cancel</strong>?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={() => {
                if (singleConflict) {
                  executeSubmitSingle(singleConflict.item, singleConflict.existingReport.id)
                }
              }}
            >
              Replace Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Conflicts Alert Dialog */}
      <AlertDialog
        open={Boolean(bulkConflict)}
        onOpenChange={(open) => !open && setBulkConflict(null)}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>Existing Reports Detected ({bulkConflict?.conflicts.length})</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm text-foreground">
                <p>
                  <strong>{bulkConflict?.conflicts.length}</strong> of the {bulkConflict?.validItems.length} reports in this batch already have existing data for their respective Heat Codes:
                </p>
                <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/40 p-2 text-xs space-y-1.5 font-mono">
                  {bulkConflict?.conflicts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-1 last:border-b-0">
                      <div>
                        <span className="font-bold text-foreground">{c.heatCode}</span>
                        {c.sampleLabel ? <span className="ml-1 text-primary">({c.sampleLabel})</span> : ''}
                      </div>
                      <span className="text-muted-foreground truncate max-w-[220px]" title={c.item.file.name}>
                        {c.item.file.name}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Do you want to <strong>replace all existing reports</strong> with the new uploads, or <strong>cancel</strong> to review?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={() => {
                if (bulkConflict) {
                  void executeSubmitAll(bulkConflict.validItems)
                }
              }}
            >
              Replace All Existing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
