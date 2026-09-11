import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { PageHeader } from '@/components/PageHeader'
import { toast } from 'sonner'
import { useCertificateStore } from '@/stores/certificateStore'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useProductMastersHydrated, useStoresHydrated } from '@/hooks/useHydrated'
import { LoadingPage } from '@/components/EmptyState'
import { ReportWorkspaceStep } from '@/components/certificate-flow/ReportWorkspaceStep'
import { FinalReviewStep } from '@/components/certificate-flow/FinalReviewStep'
import { IssueStep } from '@/components/certificate-flow/IssueStep'
import { createId, nowIso } from '@/lib/id'
import { parseReport } from '@/services/parsers'
import type { CertificateHeatSelection, HeatRecord, ProductMaster, ReportRecord } from '@/types'

export type WizardStepKey = 'sap' | 'heats' | 'reports' | 'review' | 'issue'

export function CertificateWizardPage({ isEdit = false }: { isEdit?: boolean }) {
  const { id: certIdFromUrl } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const certIdFromQuery = searchParams.get('certId')
  const certId = certIdFromUrl ?? certIdFromQuery ?? ''

  const navigate = useNavigate()
  const hydrated = useStoresHydrated()

  const cert = useCertificateStore((s) => (certId ? s.getCertificate(certId) : undefined))
  const createDraft = useCertificateStore((s) => s.createDraft)
  const upsertDraft = useCertificateStore((s) => s.upsertDraft)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)

  const [activeStep, setActiveStep] = useState<WizardStepKey>('sap')

  useEffect(() => {
    if (!certId && !isEdit) {
      const store = useCertificateStore.getState()
      const nextNum = `TC-${new Date().getFullYear()}-${String(store.certificates.length + 1).padStart(6, '0')}`
      const date = new Date().toLocaleDateString('en-GB').replaceAll('/', '.')
      const newId = createDraft(nextNum, date)
      navigate(`/certificates/new?certId=${newId}`, { replace: true })
    }
  }, [certId, isEdit, createDraft, navigate])

  useEffect(() => {
    if (cert) {
      if (cert.status === 'ISSUED') {
        setActiveStep('issue')
      } else if (cert.selectedHeats.length > 0) {
        setActiveStep('heats')
      } else if (cert.productSnapshot?.sapNo) {
        setActiveStep('heats')
      }
    }
  }, [cert?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated || (!cert && certId)) {
    return <LoadingPage label="Preparing certificate wizard…" />
  }

  const steps: Array<{ key: WizardStepKey; label: string }> = [
    { key: 'sap', label: 'Product / SAP' },
    { key: 'heats', label: 'Heat Codes' },
    { key: 'reports', label: 'Reports' },
    { key: 'review', label: 'Final Review' },
    { key: 'issue', label: 'Confirm & Issue' },
  ]

  const saveDraft = () => {
    if (certId) upsertDraft(useCertificateStore.getState().getCertificate(certId)!)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? 'Edit Certificate' : 'New Certificate'}
        description={`Step ${steps.findIndex((s) => s.key === activeStep) + 1} of ${steps.length}: ${steps.find((s) => s.key === activeStep)?.label}`}
        actions={
          <Button variant="ghost" onClick={() => { saveDraft(); navigate('/certificates') }}>
            <ArrowLeft className="h-4 w-4" />
            Save & Exit
          </Button>
        }
      />

      <StepIndicator steps={steps} activeStep={activeStep} onJump={setActiveStep} />

      {activeStep === 'sap' && (
        <SapSearchStep
          certId={certId}
          onNext={() => setActiveStep('heats')}
        />
      )}
      {activeStep === 'heats' && (
        <HeatsStep
          certId={certId}
          heatRecords={heatRecords}
          onBack={() => setActiveStep('sap')}
          onNext={() => setActiveStep('reports')}
          onAutoFill={() => setActiveStep('review')}
        />
      )}
      {activeStep === 'reports' && (
        <ReportWorkspaceStep
          certId={certId}
          onBack={() => setActiveStep('heats')}
          onNext={() => setActiveStep('review')}
        />
      )}
      {activeStep === 'review' && (
        <FinalReviewStep
          certId={certId}
          onBack={() => setActiveStep('reports')}
          onNext={() => setActiveStep('issue')}
        />
      )}
      {activeStep === 'issue' && (
        <IssueStep
          certId={certId}
          onBack={() => setActiveStep('review')}
        />
      )}
    </div>
  )
}

function StepIndicator({
  steps,
  activeStep,
  onJump,
}: {
  steps: Array<{ key: WizardStepKey; label: string }>
  activeStep: WizardStepKey
  onJump: (step: WizardStepKey) => void
}) {
  const currentIdx = steps.findIndex((s) => s.key === activeStep)

  return (
    <div className="flex items-center justify-between gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-2 text-xs">
      {steps.map((s, idx) => {
        const isDone = idx < currentIdx
        const isCurrent = idx === currentIdx
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onJump(s.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-center font-medium transition-all ${
              isCurrent
                ? 'bg-primary text-primary-foreground shadow-xs'
                : isDone
                  ? 'bg-background text-foreground hover:bg-muted'
                  : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                isCurrent
                  ? 'bg-primary-foreground text-primary'
                  : isDone
                    ? 'bg-green-600 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {isDone ? '✓' : idx + 1}
            </span>
            <span className="truncate">{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SapSearchStep({
  certId,
  onNext,
}: {
  certId: string
  onNext: () => void
}) {
  const masters = useProductMasterStore((s) => s.masters)
  const searchMasters = useProductMasterStore((s) => s.searchMasters)
  const cert = useCertificateStore((s) => (certId ? s.getCertificate(certId) : undefined))
  const setProductSnapshot = useCertificateStore((s) => s.setProductSnapshot)
  const hydrated = useProductMastersHydrated()

  const [query, setQuery] = useState(cert?.productSnapshot?.sapNo ?? '')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ProductMaster | undefined>(
    cert?.productSnapshot
      ? masters.find((m) => m.sapNo.toLowerCase() === cert.productSnapshot.sapNo.toLowerCase())
      : undefined,
  )

  const results = searchMasters(query).filter((m) => m.status === 'ACTIVE').slice(0, 10)

  const pick = (m: ProductMaster) => {
    setSelected(m)
    setQuery(`${m.sapNo} — ${m.partNo} ${m.description}`)
    setOpen(false)
    setProductSnapshot(certId, m)
    toast.success(`Selected product master ${m.sapNo}`)
  }

  const canNext = Boolean(cert?.productSnapshot?.sapNo || selected)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1: Select SAP Product Master</CardTitle>
          <p className="text-xs text-muted-foreground">
            Search by SAP No., Part No., Material, Item Description, or Customer. The certificate
            inherits test parameters and tolerances from this master.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SAP No., Part No., Description, Customer…"
              className="pl-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
          </div>

          {open && (
            <div className="max-h-60 overflow-y-auto rounded-md border bg-popover shadow-md">
              {results.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {hydrated
                    ? 'No matching active product masters found.'
                    : 'Loading product masters…'}
                </div>
              ) : (
                results.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                    onMouseDown={() => pick(m)}
                  >
                    <div>
                      <span className="font-mono font-semibold">{m.sapNo}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {m.partNo} · {m.description}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {m.material}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          )}

          {selected?.sapNo ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold">{selected.sapNo}</span>
                <Badge variant="outline">v{selected.revision}</Badge>
                <Badge>{selected.material}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {selected.partNo} · {selected.description} · {selected.customer}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canNext}>
          Next: Heat Codes
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function HeatsStep({
  certId,
  heatRecords,
  onBack,
  onNext,
  onAutoFill,
}: {
  certId: string
  heatRecords: ReturnType<typeof useHeatRecordStore.getState>['heatRecords']
  onBack: () => void
  onNext: () => void
  onAutoFill?: () => void
}) {
  const cert = useCertificateStore((s) => (certId ? s.getCertificate(certId) : undefined))
  const addHeatSelection = useCertificateStore((s) => s.addHeatSelection)
  const removeHeatSelection = useCertificateStore((s) => s.removeHeatSelection)
  const setSelection = useCertificateStore((s) => s.setSelection)
  const upsertReport = useCertificateStore((s) => s.upsertReport)
  const addHeatRecord = useHeatRecordStore((s) => s.addHeatRecord)

  const [showCreate, setShowCreate] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newBatch, setNewBatch] = useState('')
  const [expandedHeat, setExpandedHeat] = useState<string | null>(null)

  const sapNo = cert?.productSnapshot?.sapNo ?? ''
  const available = heatRecords.filter((h) => h.sapNo.toLowerCase() === sapNo.toLowerCase())
  const selected = cert?.selectedHeats ?? []

  const canNext = selected.length > 0
  const allComplete = cert ? allRequiredComplete(cert, heatRecords) : false

  const buildReportsFromHeat = (heat: HeatRecord): ReportRecord[] => {
    const sections = cert?.productSnapshot.sections ?? []
    return (heat.reports ?? [])
      .filter((r) => r.confirmed && sections.some((s) => s.key === r.sectionKey))
      .map((r) => {
        const section = sections.find((s) => s.key === r.sectionKey)
        const sample = heat.heats.find((h) => h.id === r.sampleId)
        return {
          id: createId(),
          sectionId: section?.id ?? r.sectionKey,
          sectionKey: r.sectionKey,
          sectionName: r.sectionName,
          heatSampleId: r.sampleId,
          heatSampleLabel: sample?.label ?? r.sampleLabel,
          parsedValues: r.parsedValues ?? [],
          confirmed: true,
          sourceType: 'DEPARTMENT' as ReportRecord['sourceType'],
          warnings: r.warnings ?? [],
          uploadedBy: r.uploadedBy,
          uploadedAt: r.uploadedAt,
          status: (r.warnings && r.warnings.length > 0 ? 'WARNING' : 'COMPLETE') as ReportRecord['status'],
        }
      })
  }

  const toggleSample = (heat: HeatRecord, sampleId: string) => {
    if (!cert) return
    const sel = selected.find((s) => s.heatRecordId === heat.id)
    if (!sel) return
    const included = sel.selectedSamples.includes(sampleId)
    if (included) {
      const remaining = sel.selectedSamples.filter((id) => id !== sampleId)
      if (remaining.length === 0) {
        removeHeatSelection(certId, sel.id)
        return
      }
      setSelection(certId, {
        ...sel,
        selectedSamples: remaining,
        reportRecords: sel.reportRecords.filter((r) => r.heatSampleId !== sampleId),
      })
    } else {
      setSelection(certId, {
        ...sel,
        heatCodeOnly: false,
        selectedSamples: [...sel.selectedSamples, sampleId],
      })
      for (const report of buildReportsFromHeat(heat).filter((r) => r.heatSampleId === sampleId)) {
        upsertReport(certId, sel.id, report)
      }
    }
  }

  const selectAllSamples = (heat: HeatRecord) => {
    if (!cert) return
    const sel = selected.find((s) => s.heatRecordId === heat.id)
    if (!sel) return
    const all = heat.heats.map((h) => h.id)
    const missing = all.filter((id) => !sel.selectedSamples.includes(id))
    setSelection(certId, { ...sel, heatCodeOnly: false, selectedSamples: all })
    for (const sampleId of missing) {
      for (const report of buildReportsFromHeat(heat).filter((r) => r.heatSampleId === sampleId)) {
        upsertReport(certId, sel.id, report)
      }
    }
  }

  const toggleHeat = async (heatRecordId: string) => {
    const heat = heatRecords.find((h) => h.id === heatRecordId)
    if (!heat || !cert) return
    const existing = selected.find((s) => s.heatRecordId === heatRecordId)
    if (existing) {
      removeHeatSelection(certId, existing.id)
      if (expandedHeat === heatRecordId) setExpandedHeat(null)
      return
    }
    const selection: CertificateHeatSelection = {
      id: createId(),
      heatRecordId: heat.id,
      heatCode: heat.heatCode,
      batchNo: heat.batchNo,
      heatCodeOnly: heat.heats.length === 0,
      includeHeatLevel: heat.heats.length === 0,
      selectedSamples: heat.heats.map((h) => h.id),
      reportRecords: [],
    }
    addHeatSelection(certId, selection)
    if (heat.heats.length > 0) setExpandedHeat(heat.id)

    for (const report of buildReportsFromHeat(heat)) {
      upsertReport(certId, selection.id, report)
    }

    const sections = cert.productSnapshot.sections
    const coveredKeys = new Set(
      (heat.reports ?? [])
        .filter((r) => r.confirmed && sections.some((s) => s.key === r.sectionKey))
        .map((r) => r.sectionKey),
    )
    const demoKeys = Object.keys(heat.demoReports ?? {}).filter((k) =>
      sections.some((s) => s.key === k) && !coveredKeys.has(k),
    )

    if (demoKeys.length > 0) {
      try {
        for (const sectionKey of demoKeys) {
          const path = heat.demoReports![sectionKey]
          const res = await fetch(path)
          if (!res.ok) continue
          const blob = await res.blob()
          const fileName = path.split('/').pop() ?? 'demo'
          const file = new File([blob], fileName, {
            type: blob.type || (path.endsWith('.bmp') ? 'image/bmp' : 'application/pdf'),
          })
          const result = await parseReport(file, sectionKey)
          const section = sections.find((s) => s.key === sectionKey)
          if (!section) continue
          const sampleIds: Array<string | undefined> =
            heat.heats.length > 0 ? heat.heats.map((h) => h.id) : [undefined]
          for (const sampleId of sampleIds) {
            const sample = heat.heats.find((h) => h.id === sampleId)
            const report: ReportRecord = {
              id: createId(),
              sectionId: section.id,
              sectionKey,
              sectionName: section.name,
              heatSampleId: sampleId,
              heatSampleLabel: sample?.label,
              parsedValues: result.parameters,
              confirmed: true,
              sourceType: 'DEMO' as ReportRecord['sourceType'],
              warnings: result.warnings,
              uploadedAt: nowIso(),
              status: (result.warnings && result.warnings.length > 0 ? 'WARNING' : 'COMPLETE') as ReportRecord['status'],
            }
            upsertReport(certId, selection.id, report)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  const createHeat = () => {
    const code = newCode.trim()
    if (!sapNo || !code) return
    const exists = available.some((h) => h.heatCode.toLowerCase() === code.toLowerCase())
    if (exists) {
      toast.error(`Heat code ${code} already exists for this SAP.`)
      return
    }
    const id = addHeatRecord({ sapNo, heatCode: code, batchNo: newBatch.trim() || undefined, heats: [], demoReports: {} })
    toast.success(`Heat code ${code} created. It can be linked to the certificate.`)
    setNewCode('')
    setNewBatch('')
    setShowCreate(false)
    const heat = useHeatRecordStore.getState().getHeatRecord(id)
    if (heat) toggleHeat(id)
  }

  if (!cert) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Step 2: Select Heat Codes</CardTitle>
            <p className="text-xs text-muted-foreground">
              SAP: <span className="font-mono">{sapNo || '—'}</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCreate((v) => !v)}>
            + Add Heat Code
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showCreate && (
            <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Heat Code</label>
                <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. A6A" className="h-8 w-40" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Batch No.</label>
                <Input value={newBatch} onChange={(e) => setNewBatch(e.target.value)} placeholder="optional" className="h-8 w-40" />
              </div>
              <Button size="sm" onClick={createHeat}>Create</Button>
            </div>
          )}

          {available.length === 0 && selected.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No heat codes found for this SAP. Create one above or import the master workbook.
            </p>
          ) : (
            <div className="space-y-2">
              {available.map((h) => {
                const sel = selected.find((s) => s.heatRecordId === h.id)
                const isSel = Boolean(sel)
                const multi = h.heats.length > 0
                const expanded = expandedHeat === h.id
                return (
                  <div
                    key={h.id}
                    className={`rounded-md border px-3 py-2 ${isSel ? 'border-primary/40 bg-primary/5' : ''}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Button
                          variant={isSel ? 'default' : 'outline'}
                          size="sm"
                          className="w-8 px-0"
                          onClick={() => toggleHeat(h.id)}
                        >
                          {isSel ? '✓' : '+'}
                        </Button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="flex items-center gap-1.5 font-mono text-sm font-medium hover:underline"
                            onClick={() => setExpandedHeat(expanded ? null : h.id)}
                          >
                            {h.heatCode}
                            {multi
                              ? expanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              : null}
                          </button>
                          <div className="text-xs text-muted-foreground">
                            {h.batchNo ? `Batch ${h.batchNo} · ` : ''}
                            {multi ? `${h.heats.length} sample(s)` : 'Single Heat'}
                          </div>
                        </div>
                      </div>
                      {isSel ? (
                        <Badge variant="secondary">
                          {h.heats.length === 0
                            ? 'Single Heat'
                            : `${sel?.selectedSamples.length ?? 0}/${h.heats.length} sample(s)`}
                        </Badge>
                      ) : null}
                    </div>

                    {expanded && multi ? (
                      <div className="mt-2 space-y-1.5 border-t pt-2 pl-11">
                        <div className="space-y-1">
                          {h.heats.map((s) => {
                            const checked = Boolean(sel?.selectedSamples.includes(s.id))
                            return (
                              <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={checked}
                                    disabled={!isSel}
                                    onCheckedChange={() => isSel && toggleSample(h, s.id)}
                                  />
                                  <span className="font-mono text-xs">Sample {h.heatCode}-{s.label}</span>
                                  {s.quantity ? <span className="text-xs text-muted-foreground">· Qty: {s.quantity}</span> : null}
                                </label>
                                {isSel && checked ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                ) : isSel ? (
                                  <span className="text-xs text-muted-foreground">not included</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">add heat to choose samples</span>
                                )}
                              </div>
                            )
                          })}
                          {isSel && h.heats.length > 1 ? (
                            <div className="pt-1">
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline font-medium"
                                onClick={() => selectAllSamples(h)}
                              >
                                Select all {h.heats.length} samples
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back: Product / SAP
        </Button>
        <div className="flex gap-2">
          {allComplete && onAutoFill && (
            <Button variant="secondary" onClick={onAutoFill}>
              Skip to Review (All Complete)
            </Button>
          )}
          <Button onClick={onNext} disabled={!canNext}>
            Next: Reports Workspace
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function allRequiredComplete(
  cert: { productSnapshot: ProductMaster; selectedHeats: CertificateHeatSelection[] },
  heatRecords: HeatRecord[],
): boolean {
  const reqSections = cert.productSnapshot.sections.filter((s) => s.required)
  if (reqSections.length === 0 || cert.selectedHeats.length === 0) return false
  for (const sel of cert.selectedHeats) {
    const heat = heatRecords.find((h) => h.id === sel.heatRecordId)
    if (!heat) return false
    for (const s of reqSections) {
      const hasReport = (heat.reports ?? []).some((r) => r.sectionKey === s.key && r.confirmed)
      const hasDemo = Boolean(heat.demoReports?.[s.key])
      if (!hasReport && !hasDemo) return false
    }
  }
  return true
}
