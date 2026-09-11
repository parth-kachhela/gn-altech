import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { BulkReviewTable } from '@/components/workflow/BulkReviewTable'
import { DeptBadge } from '@/components/workflow/WorkflowBadges'
import { LoadLabDemoButton } from '@/components/workflow/LoadLabDemoButton'
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
import { useStoresHydrated } from '@/hooks/useHydrated'
import { LoadingPage } from '@/components/EmptyState'
import { deptStateForHeat, type DeptKey } from '@/lib/heatWorkflow'
import { saveReportBlob } from '@/lib/fileStorage'
import { assignPreviewSamples, groupBySapHeat, resolveGroupLabels } from '@/lib/sampleSplit'
import { createId, nowIso } from '@/lib/id'
import { toast } from 'sonner'
import { DEPT_CONFIG } from '@/pages/dept/deptConfig'
import { UploadCloud, AlertTriangle } from 'lucide-react'
import type { HeatRecord, HeatReportData } from '@/types'

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
      <PageHeader
        title={cfg.label}
        description={`Pending heats awaiting ${cfg.sectionName} test reports. Single and Bulk upload supported.`}
        actions={
          <>
            <LoadLabDemoButton />
            <Button asChild>
              <Link to={`${cfg.home}/upload`}>Bulk Upload Reports</Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending Requests', value: pending },
          { label: 'Completed', value: heats.length - pending },
          { label: 'Total Heats', value: heats.length },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold">{k.value}</div>
              <div className="text-sm text-muted-foreground">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <Input
          placeholder="Search Heat Code or SAP…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card className="mt-3">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Heat Code</TableHead>
                <TableHead>SAP Code</TableHead>
                <TableHead>{cfg.sectionName} Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.slice(0, 50).map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono font-medium">{h.heatCode}</TableCell>
                  <TableCell className="font-mono text-xs">{h.sapNo}</TableCell>
                  <TableCell>
                    <DeptBadge value={deptStateForHeat(h, cfg.key as DeptKey)} />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`${cfg.home}/upload?heat=${encodeURIComponent(h.heatCode)}`}>
                        Upload &amp; Review
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No heats yet — Chemical or QA creates heats first.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
  const dropzoneInputRef = useRef<HTMLInputElement>(null)
  const user = useAuthStore((s) => s.user)
  const addLog = useAuditStore((s) => s.addLog)

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

  const allHeats = useHeatRecordStore((s) => s.heatRecords)
  const masters = useProductMasterStore((s) => s.masters)

  // Extract all currently pending heats for this department
  const pendingHeats = useMemo(() => {
    return allHeats
      .filter((h) => deptStateForHeat(h, cfg.key as DeptKey) !== 'COMPLETED')
      .map((h) => {
        const m = masters.find((master) => master.sapNo.toLowerCase() === h.sapNo.toLowerCase())
        return {
          heatCode: h.heatCode,
          sapNo: h.sapNo,
          partName: m?.description,
        }
      })
  }, [allHeats, cfg.key, masters])

  const patch = (id: string, p: Partial<IngestItem>) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...p } : i)))

  const itemsRef = useRef(items)
  itemsRef.current = items

  const singleHeatRef = useRef(singleHeat)
  singleHeatRef.current = singleHeat

  const pendingHeatsRef = useRef(pendingHeats)
  pendingHeatsRef.current = pendingHeats

  const takenLabelsOf = (sap: string, heat: string) =>
    useHeatRecordStore.getState().heatRecords.find(
      (h) => h.sapNo.toUpperCase() === sap && h.heatCode.toUpperCase() === heat,
    )?.heats.map((s) => s.label) ?? []

  // Live Sample A/B/C preview: regroup whenever SAP/heat/status change
  const signature = items.map((i) => `${i.id}:${i.sapCode}:${i.heatCode}:${i.status}:${i.assignedSample ?? ''}`).join('|')
  useEffect(() => {
    setItems((prev) => assignPreviewSamples(prev, takenLabelsOf))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  /** Sequential queue: process files one by one with fallback matching */
  const runQueue = async (ids: string[]) => {
    setProcessing(true)
    const currentMasters = useProductMasterStore.getState().masters
    for (const id of ids) {
      const current = itemsRef.current.find((i) => i.id === id)
      if (!current) continue

      const out = await processQueuedFile(current.file, cfg.key, currentMasters, (p) => patch(id, p))

      // Intelligent match with active pending heats if parser didn't find an exact ID
      let matchedHeat = singleHeatRef.current || preselect
      let matchedSap = ''

      if (!matchedHeat) {
        if (out.heatCode) {
          const match = pendingHeatsRef.current.find(
            (p) => p.heatCode.toUpperCase() === out.heatCode.toUpperCase(),
          )
          if (match) {
            matchedHeat = match.heatCode
            matchedSap = match.sapNo
          }
        }
        // Substring / token matching in filename against pending heats
        if (!matchedHeat) {
          const fnUpper = current.file.name.toUpperCase()
          for (const p of pendingHeatsRef.current) {
            const cleanCode = p.heatCode.toUpperCase().replace(/[-_ ]/g, '')
            const cleanFn = fnUpper.replace(/[-_ ]/g, '')
            if (cleanFn.includes(cleanCode) || fnUpper.includes(p.heatCode.toUpperCase())) {
              matchedHeat = p.heatCode
              matchedSap = p.sapNo
              break
            }
          }
        }
        // If there's only 1 pending heat, auto-match single upload
        if (!matchedHeat && pendingHeatsRef.current.length === 1 && ids.length === 1) {
          matchedHeat = pendingHeatsRef.current[0].heatCode
          matchedSap = pendingHeatsRef.current[0].sapNo
        }
      }

      const finalHeat = matchedHeat ? matchedHeat.toUpperCase() : out.heatCode
      const finalSap = matchedSap || out.sapCode
      const hasFinalHeat = Boolean(finalHeat)

      patch(id, {
        ...out,
        heatCode: finalHeat,
        sapCode: finalSap,
        status: out.status === 'FAILED' ? 'FAILED' : hasFinalHeat ? 'MATCHED' : 'REVIEW_REQUIRED',
        progress: 100,
        stage: undefined,
      })
    }
    setProcessing(false)
  }

  const onFiles = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return

    const fresh: IngestItem[] = list.map((f, i) => {
      let initialHeat = (singleHeatRef.current || preselect).toUpperCase()
      let initialSap = ''
      if (!initialHeat) {
        const fnUpper = f.name.toUpperCase()
        for (const p of pendingHeatsRef.current) {
          if (fnUpper.includes(p.heatCode.toUpperCase())) {
            initialHeat = p.heatCode
            initialSap = p.sapNo
            break
          }
        }
      }

      return {
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        progress: 0,
        status: 'QUEUED',
        queueLabel: 'Waiting in queue',
        sapCode: initialSap,
        heatCode: initialHeat,
        confidence: 0,
        message: 'Waiting in queue…',
        values: [],
        valueSource: {},
      }
    })

    setItems((arr) => [...arr, ...fresh])
    setTimeout(() => {
      const pending = itemsRef.current
        .filter((i) => i.status === 'QUEUED' || i.status === 'FAILED')
        .map((i) => i.id)
      if (pending.length > 0) void runQueue(pending)
    }, 50)
    toast.success(`${list.length} file(s) queued — processing and matching to pending heats`)
  }

  const retryOne = (id: string) => {
    patch(id, { status: 'QUEUED', progress: 0, stage: 'Waiting in queue…', message: 'Waiting in queue…' })
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
    if (!itemToSubmit.heatCode) {
      toast.error('Please assign a target Heat Code before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const now = nowIso()
      const st = useHeatRecordStore.getState()
      const heatCode = itemToSubmit.heatCode
      const sapCode = (itemToSubmit.sapCode || '').toLowerCase()
      const heat = st.heatRecords.find(
        (h) => h.heatCode.toLowerCase() === heatCode.toLowerCase() &&
          (!sapCode || h.sapNo.toLowerCase() === sapCode),
      )
      if (!heat) {
        toast.error(`Heat "${heatCode}" not found in system. Create the heat record first.`)
        return
      }

      const storedKey = `${dept}-${heatCode}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      void saveReportBlob(storedKey, itemToSubmit.file).catch(() => {})

      const reportId = replaceExistingId || createId()
      const report: HeatReportData = {
        id: reportId,
        sectionKey: cfg.key,
        sectionName: cfg.sectionName,
        ...(itemToSubmit.assignedSample ? { sampleLabel: itemToSubmit.assignedSample } : {}),
        parsedValues: itemToSubmit.values.length > 0 ? itemToSubmit.values : [{ name: 'Result', value: 'As per report' }],
        confirmed: true,
        warnings: itemToSubmit.result?.warnings ?? [],
        fileMetadata: {
          fileName: itemToSubmit.file.name,
          fileSize: itemToSubmit.file.size,
          mimeType: itemToSubmit.file.type,
          storedKey,
        },
        uploadedBy: user?.name,
        uploadedAt: now,
        status: 'COMPLETE' as const,
      }

      st.upsertReportData(heat.id, report)

      // Mark request as reviewed
      const req = (heat.requests ?? []).find((r) => r.sectionKey === cfg.key)
      if (req) {
        useHeatRecordStore.setState((prev) => ({
          heatRecords: prev.heatRecords.map((h) =>
            h.id === heat.id
              ? { ...h, requests: h.requests.map((r) => (r.id === req.id ? { ...r, status: 'REVIEWED' as const } : r)) }
              : h,
          ),
        }))
      }

      addLog({
        userId: user?.name ?? dept,
        action: replaceExistingId ? `${dept}_report_replaced` : `${dept}_report_submitted`,
        entityType: 'HEAT_RECORD',
        entityId: heat.id,
        after: { fileName: itemToSubmit.file.name, heatCode, replaced: Boolean(replaceExistingId) },
      })

      toast.success(
        replaceExistingId
          ? `Replaced existing ${cfg.sectionName} report for ${heatCode}!`
          : `${cfg.sectionName} report for ${heatCode} successfully submitted!`
      )
      setItems((arr) => arr.filter((i) => i.id !== itemToSubmit.id))
      setSingleConflict(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestSubmitSingle = (itemToSubmit: IngestItem) => {
    if (!itemToSubmit.heatCode) {
      toast.error('Please assign a target Heat Code before submitting.')
      return
    }
    const st = useHeatRecordStore.getState()
    const heatCode = itemToSubmit.heatCode
    const sapCode = (itemToSubmit.sapCode || '').toLowerCase()
    const heat = st.heatRecords.find(
      (h) => h.heatCode.toLowerCase() === heatCode.toLowerCase() &&
        (!sapCode || h.sapNo.toLowerCase() === sapCode),
    )
    if (!heat) {
      toast.error(`Heat "${heatCode}" not found in system. Create the heat record first.`)
      return
    }

    // Check if report already exists for this heat
    const existingReport = heat.reports.find(
      (r) => r.sectionKey === cfg.key && (!itemToSubmit.assignedSample || r.sampleLabel === itemToSubmit.assignedSample)
    )

    if (existingReport) {
      setSingleConflict({
        item: itemToSubmit,
        heat,
        existingReport,
        sampleLabel: itemToSubmit.assignedSample,
      })
      return
    }

    executeSubmitSingle(itemToSubmit)
  }

  const executeSubmitAll = async (validItems: IngestItem[]) => {
    setSubmitting(true)
    try {
      let ok = 0
      const groups = groupBySapHeat(validItems, (i) => i.sapCode, (i) => i.heatCode)
      for (const [, group] of groups) {
        const now = nowIso()
        const st = useHeatRecordStore.getState()
        const heatCode = group[0].heatCode
        const sapCode = (group[0].sapCode || '').toLowerCase()
        const heat = st.heatRecords.find(
          (h) => h.heatCode.toLowerCase() === heatCode.toLowerCase() &&
            (!sapCode || h.sapNo.toLowerCase() === sapCode),
        )
        if (!heat) {
          toast.error(`${heatCode}: heat not found in system`)
          continue
        }

        const makeDeptReport = (it: IngestItem, existingId?: string, sampleId?: string, sampleLabel?: string) => {
          const storedKey = `${dept}-${heatCode}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          void saveReportBlob(storedKey, it.file).catch(() => {})
          return {
            id: existingId || createId(),
            sectionKey: cfg.key,
            sectionName: cfg.sectionName,
            ...(sampleId ? { sampleId, sampleLabel } : sampleLabel ? { sampleLabel } : {}),
            parsedValues: it.values.length > 0 ? it.values : [{ name: 'Result', value: 'As per report' }],
            confirmed: true,
            warnings: it.result?.warnings ?? [],
            fileMetadata: { fileName: it.file.name, fileSize: it.file.size, mimeType: it.file.type, storedKey },
            uploadedBy: user?.name,
            uploadedAt: now,
            status: 'COMPLETE' as const,
          }
        }

        let sampleIds: Array<{ id: string; label: string }> = []
        if (group.length > 1) {
          const fresh = useHeatRecordStore.getState().heatRecords.find((h) => h.id === heat.id)!
          const labels = resolveGroupLabels(group, fresh.heats.map((s) => s.label))
          sampleIds = labels.map((label) => ({ id: createId(), label }))
          st.updateHeatRecord(heat.id, {
            heats: [...fresh.heats, ...sampleIds.map((s) => ({ id: s.id, label: s.label, quantity: undefined }))],
          })
          toast.success(`${heatCode}: multiple files saved as Samples ${labels.join(', ')}`)
        }

        group.forEach((it, idx) => {
          const s = group.length > 1 ? sampleIds[idx] : undefined
          const existing = heat.reports.find(
            (r) => r.sectionKey === cfg.key && (s ? r.sampleLabel === s.label : (!r.sampleLabel || r.sampleLabel === it.assignedSample))
          )
          const report = makeDeptReport(it, existing?.id, s?.id, s?.label || it.assignedSample)
          useHeatRecordStore.getState().upsertReportData(heat.id, report)
          ok++
        })

        const req = (heat.requests ?? []).find((r) => r.sectionKey === cfg.key)
        if (req) {
          useHeatRecordStore.setState((prev) => ({
            heatRecords: prev.heatRecords.map((h) =>
              h.id === heat.id
                ? { ...h, requests: h.requests.map((r) => (r.id === req.id ? { ...r, status: 'REVIEWED' as const } : r)) }
                : h,
            ),
          }))
        }
      }

      addLog({
        userId: user?.name ?? dept,
        action: `${dept}_submitted`,
        entityType: 'HEAT_RECORD',
        after: { count: ok },
      })
      toast.success(`${ok} report(s) submitted successfully`)
      setItems((arr) => arr.filter((i) => !validItems.some((v) => v.id === i.id)))
      setBulkConflict(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestSubmitAll = () => {
    const valid = itemsRef.current.filter((i) => i.heatCode && (i.status === 'MATCHED' || i.status === 'REVIEW_REQUIRED'))
    if (valid.length === 0) {
      toast.error('Select target Heat Codes for at least one processed file')
      return
    }

    const st = useHeatRecordStore.getState()
    const conflicts: Array<{ item: IngestItem; heatCode: string; existingReport: HeatReportData; sampleLabel?: string }> = []

    for (const it of valid) {
      const heatCode = it.heatCode
      const sapCode = (it.sapCode || '').toLowerCase()
      const heat = st.heatRecords.find(
        (h) => h.heatCode.toLowerCase() === heatCode.toLowerCase() &&
          (!sapCode || h.sapNo.toLowerCase() === sapCode),
      )
      if (heat) {
        const existing = heat.reports.find(
          (r) => r.sectionKey === cfg.key && (!it.assignedSample || r.sampleLabel === it.assignedSample)
        )
        if (existing) {
          conflicts.push({
            item: it,
            heatCode: heat.heatCode,
            existingReport: existing,
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
        title={`${cfg.label} — Bulk Upload Reports`}
        description={`Upload multiple PDF or image reports for ${cfg.sectionName}. Data is extracted automatically, matched to pending heats, and ready for review.`}
      />

      {/* Pending Heats Overview Banner */}
      {pendingHeats.length > 0 ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Pending Heats in Queue ({pendingHeats.length})</span>
              <span className="text-xs font-normal text-muted-foreground">Click a heat code to focus single upload</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="flex flex-wrap gap-1.5">
              {pendingHeats.map((h) => (
                <Button
                  key={`${h.sapNo}-${h.heatCode}`}
                  variant={singleHeat === h.heatCode ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs font-mono"
                  onClick={() => setSingleHeat(singleHeat === h.heatCode ? '' : h.heatCode)}
                >
                  {h.heatCode}
                  <span className="ml-1 text-[10px] text-muted-foreground font-sans">({h.sapNo})</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Upload Zone & Single Heat Pre-selector */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder="Optional: Target Heat Code (e.g. GZ-56)"
              value={singleHeat}
              onChange={(e) => setSingleHeat(e.target.value.toUpperCase())}
              className="font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            onClick={() => dropzoneInputRef.current?.click()}
            disabled={processing}
          >
            <UploadCloud className="h-4 w-4 mr-2" />
            <span>{processing ? 'Processing Reports…' : 'Select Files to Upload'}</span>
          </Button>
          <span className="text-xs text-muted-foreground">PDF, BMP, PNG, JPG/JPEG supported.</span>
        </CardContent>
      </Card>

      {/* Hidden file input controlled by dropzone & button */}
      <input
        ref={dropzoneInputRef}
        type="file"
        multiple
        accept=".pdf,.bmp,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Clickable Drag & Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer rounded-lg border-2 border-dashed border-primary/30 bg-muted/20 p-8 text-center transition-all hover:border-primary hover:bg-muted/50 hover:shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
        onClick={() => dropzoneInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            dropzoneInputRef.current?.click()
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
          Click anywhere here or drag &amp; drop {cfg.sectionName} reports
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Bulk upload supported (10, 20, 50+ files). System reads values &amp; matches pending heats automatically.
        </div>
      </div>

      {/* Bulk Review & Submit Table */}
      {items.length > 0 ? (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold">Parsed Reports Ready for Review ({items.length})</h3>
          <BulkReviewTable
            items={items}
            onChange={patch}
            onAcceptAll={() =>
              setItems((a) =>
                a.map((i) => (i.status === 'REVIEW_REQUIRED' ? { ...i, status: 'MATCHED' as const } : i)),
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
            pendingHeats={pendingHeats}
            sectionKey={cfg.key}
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
              <AlertDialogTitle>Report Already Exists</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm text-foreground">
                <p>
                  A <strong>{cfg.sectionName}</strong> report already exists for Heat Code{' '}
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

export function DeptCompletedPage({ dept }: { dept: 'micro' | 'tensile' | 'hardness' }) {
  const cfg = DEPT_CONFIG[dept]
  const hydrated = useStoresHydrated()
  const heats = useHeatRecordStore((s) => s.heatRecords)
  if (!hydrated) return <LoadingPage label="Loading…" />
  const done = heats.filter((h) => deptStateForHeat(h, cfg.key as DeptKey) === 'COMPLETED')

  return (
    <div>
      <PageHeader title={`${cfg.label} — Completed`} description={`${done.length} heats completed.`} />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Heat Code</TableHead>
                <TableHead>SAP Code</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {done.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono font-medium">{h.heatCode}</TableCell>
                  <TableCell className="font-mono text-xs">{h.sapNo}</TableCell>
                  <TableCell>
                    <DeptBadge value="COMPLETED" />
                  </TableCell>
                </TableRow>
              ))}
              {done.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No completed heats yet for this department.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
