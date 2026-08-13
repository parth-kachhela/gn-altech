import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Loader2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { PageHeader } from '@/components/PageHeader'
import { toast } from 'sonner'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useCertificateStore } from '@/stores/certificateStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { useCertificatesHydrated } from '@/hooks/useHydrated'
import { suggestCertificateNumber } from '@/lib/certificateNo'
import { parseReport } from '@/services/parsers'
import { createId, nowIso } from '@/lib/id'
import {
  allRequiredComplete,
  isReportComplete,
  reportCardStatus,
  reportFor,
  sampleContexts,
} from '@/lib/certificateStatus'
import { ReportWorkspaceStep } from '@/components/certificate-flow/ReportWorkspaceStep'
import { FinalReviewStep } from '@/components/certificate-flow/FinalReviewStep'
import { IssueStep } from '@/components/certificate-flow/IssueStep'
import { ReportStatusBadge } from '@/components/certificate-flow/ReportStatusBadge'
import type { CertificateHeatSelection, HeatRecord, ProductMaster, ReportRecord } from '@/types'

export type WizardStepKey = 'sap' | 'heats' | 'reports' | 'review' | 'issue'

export function CertificateWizardPage() {
  const navigate = useNavigate()
  const hydrated = useCertificatesHydrated()
  const createDraft = useCertificateStore((s) => s.createDraft)
  const getCertificate = useCertificateStore((s) => s.getCertificate)
  const upsertDraft = useCertificateStore((s) => s.upsertDraft)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)

  const { id: editId } = useParams()
  const isEdit = Boolean(editId)

  const [certId, setCertId] = useState<string | null>(editId ?? null)
  const [activeStep, setActiveStep] = useState<WizardStepKey>(isEdit ? 'review' : 'sap')
  const createdRef = useRef(false)

  useEffect(() => {
    if (!hydrated || createdRef.current) return
    createdRef.current = true
    if (editId) {
      const existing = useCertificateStore.getState().getCertificate(editId)
      if (existing) {
        setCertId(existing.id)
        setActiveStep('review')
      } else {
        navigate('/certificates', { replace: true })
      }
      return
    }
    const id = createDraft(
      suggestCertificateNumber(useCertificateStore.getState().certificates),
      new Date().toISOString().slice(0, 10),
    )
    setCertId(id)
    addLog({ userId: user?.name ?? 'unknown', action: 'cert_created', entityType: 'CERTIFICATE', after: { id } })
  }, [hydrated, editId, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  const cert = certId ? getCertificate(certId) : undefined

  if (!hydrated || !cert || !certId) {
    return (
      <div className="space-y-4">
        <PageHeader title={isEdit ? 'Edit Certificate' : 'New Certificate'} />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-6 w-3/4 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const steps: Array<{ key: WizardStepKey; label: string }> = [
    { key: 'sap', label: 'SAP Search' },
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
  onJump: (k: WizardStepKey) => void
}) {
  const activeIdx = steps.findIndex((s) => s.key === activeStep)
  return (
    <Card className="mb-2">
      <CardContent className="pt-6">
        <ol className="flex items-center justify-between">
          {steps.map((step) => {
            const idx = steps.findIndex((s) => s.key === step.key)
            const active = idx === activeIdx
            const complete = idx < activeIdx
            return (
              <li key={step.key} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onJump(step.key)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : complete
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {idx + 1}
                </button>
                <span className="mt-1 text-xs text-muted-foreground">{step.label}</span>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}

function SapSearchStep({ certId, onNext }: { certId: string; onNext: () => void }) {
  const searchMasters = useProductMasterStore((s) => s.searchMasters)
  const cert = useCertificateStore((s) => (certId ? s.getCertificate(certId) : undefined))
  const setProductSnapshot = useCertificateStore((s) => s.setProductSnapshot)
  const setSelection = useCertificateStore((s) => s.setSelection)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results = useMemo(() => {
    return searchMasters(query)
      .filter((m) => m.status === 'ACTIVE')
      .slice(0, 8)
  }, [query, searchMasters])

  const selected = cert?.productSnapshot

  const pick = (m: ProductMaster) => {
    setProductSnapshot(certId, m)
    setQuery('')
    setOpen(false)
    // reset any selections from a previous SAP
    for (const sel of useCertificateStore.getState().getCertificate(certId)?.selectedHeats ?? []) {
      setSelection(certId, { ...sel, selectedSamples: [], reportRecords: [] })
    }
  }

  const canNext = Boolean(selected?.sapNo)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1: Search SAP No.</CardTitle>
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
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {selected?.sapNo && (
              <button
                type="button"
                onClick={() => {
                  // keep snapshot but allow re-search
                  setQuery('')
                  setOpen(true)
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
                  No matching product masters. Import the master workbook first.
                </div>
              ) : (
                results.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                    onMouseDown={() => pick(m)}
                  >
                    <span className="font-mono font-medium">{m.sapNo}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {m.partNo} — {m.description} · {m.customer}
                    </span>
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
  const [autoFilling, setAutoFilling] = useState<string | null>(null)
  const [expandedHeat, setExpandedHeat] = useState<string | null>(null)

  const sapNo = cert?.productSnapshot?.sapNo ?? ''
  const available = heatRecords.filter((h) => h.sapNo.toLowerCase() === sapNo.toLowerCase())
  const selected = cert?.selectedHeats ?? []
  const sections = cert?.productSnapshot.sections ?? []

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
        if (sel.includeHeatLevel === false) {
          removeHeatSelection(certId, sel.id)
          return
        }
        setSelection(certId, {
          ...sel,
          heatCodeOnly: true,
          selectedSamples: [],
          reportRecords: sel.reportRecords.filter((r) => r.heatSampleId === undefined),
        })
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

  const toggleHeatLevel = (heat: HeatRecord) => {
    if (!cert) return
    const sel = selected.find((s) => s.heatRecordId === heat.id)
    if (!sel) return
    const includeHeatLevel = sel.includeHeatLevel ?? true
    if (includeHeatLevel) {
      if (heat.heats.length === 0) return
      if (sel.selectedSamples.length === 0) {
        removeHeatSelection(certId, sel.id)
        return
      }
      setSelection(certId, { ...sel, includeHeatLevel: false })
    } else {
      setSelection(certId, {
        ...sel,
        includeHeatLevel: true,
        heatCodeOnly: sel.selectedSamples.length === 0,
      })
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
      includeHeatLevel: true,
      selectedSamples: heat.heats.map((h) => h.id),
      reportRecords: [],
    }
    addHeatSelection(certId, selection)
    if (heat.heats.length > 1) setExpandedHeat(heat.id)

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
      setAutoFilling(heat.heatCode)
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
      } finally {
        setAutoFilling(null)
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
    // auto-select it
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
                const multi = h.heats.length > 1
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
                            {multi ? `${h.heats.length} samples` : h.heats.length === 1 ? '1 sample' : 'No samples (Heat Code Only)'}
                          </div>
                        </div>
                      </div>
                      {isSel ? (
                        <Badge variant="secondary">
                          {sel?.heatCodeOnly ? 'Heat Code Only' : `${sel?.selectedSamples.length ?? 0}/${h.heats.length} sample(s)`}
                        </Badge>
                      ) : null}
                    </div>

                    {expanded ? (
                      <div className="mt-2 space-y-1.5 border-t pt-2 pl-11">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={isSel ? (sel?.includeHeatLevel ?? true) : false}
                              disabled={!isSel || h.heats.length === 0}
                              onCheckedChange={() => isSel && toggleHeatLevel(h)}
                            />
                            <span className="font-mono text-xs">Main Heat Level</span>
                            {h.heats.length === 0 ? (
                              <span className="text-xs text-muted-foreground">· only</span>
                            ) : null}
                          </label>
                          {isSel && (sel?.includeHeatLevel ?? true) ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          ) : isSel ? (
                            <span className="text-xs text-muted-foreground">not included</span>
                          ) : null}
                        </div>
                        {h.heats.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No samples linked to this heat code.</p>
                        ) : (
                          <>
                            {h.heats.map((s) => {
                              const checked = Boolean(sel?.selectedSamples.includes(s.id))
                              return (
                                <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                                  <label className="flex items-center gap-2">
                                    <Checkbox
                                      checked={checked}
                                      disabled={!isSel}
                                      onCheckedChange={() => isSel && toggleSample(h, s.id)}
                                    />
                                    <span className="font-mono text-xs">{h.heatCode}-{s.label}</span>
                                    {s.quantity ? <span className="text-xs text-muted-foreground">· {s.quantity}</span> : null}
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
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline"
                                onClick={() => selectAllSamples(h)}
                              >
                                Select all samples
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}

          {autoFilling ? (
            <div className="flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/20">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading stored report data for heat {autoFilling}…
            </div>
          ) : null}

          {selected.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <span className="text-sm font-medium">Selected</span>
                <span className="text-xs text-muted-foreground">
                  {selected.length} heat code(s) ·{' '}
                  {selected.reduce((n, s) => n + s.selectedSamples.length, 0)} sample(s)
                </span>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {selected.map((sel) => (
                    <button
                      key={sel.id}
                      type="button"
                      title={`Remove ${sel.heatCode}`}
                      className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs hover:border-destructive/60"
                      onClick={() => toggleHeat(sel.heatRecordId)}
                    >
                      <span className="font-mono font-medium">{sel.heatCode}</span>
                      <span className="text-muted-foreground">
                        {sel.heatCodeOnly ? 'Heat Code Only' : `${sel.selectedSamples.length} sample(s)`}
                      </span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {selected.map((sel) => {
                  const heat = heatRecords.find((r) => r.id === sel.heatRecordId)
                  const contexts = sampleContexts(sel, heatRecords)
                  const requiredSections = sections.filter((s) => s.required && s.parameters.length > 0)
                  const overallComplete = requiredSections.every((section) =>
                    contexts.every((ctx) =>
                      isReportComplete(reportFor(sel, section.key, ctx.sampleId), section),
                    ),
                  )
                  return (
                    <div key={sel.id} className="rounded-md border bg-background">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{sel.heatCode}</span>
                          {sel.batchNo ? <Badge variant="outline">Batch {sel.batchNo}</Badge> : null}
                          <Badge variant={sel.heatCodeOnly ? 'secondary' : 'default'}>
                            {sel.heatCodeOnly ? 'Heat Code Only' : `${sel.selectedSamples.length} sample(s)`}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {overallComplete ? (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={`Remove ${sel.heatCode}`}
                            onClick={() => toggleHeat(sel.heatRecordId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
                        {contexts.map((ctx) => {
                          const sample = heat?.heats.find((s) => s.id === ctx.sampleId)
                          const sampleComplete =
                            !sel.heatCodeOnly &&
                            requiredSections.every((section) =>
                              isReportComplete(reportFor(sel, section.key, ctx.sampleId), section),
                            )
                          return (
                            <div key={ctx.sampleId ?? 'heat-only'} className="flex flex-col rounded-md border">
                              <div className="flex items-center justify-between border-b bg-muted/40 px-2.5 py-1.5">
                                <span className="font-mono text-xs font-medium">
                                  {ctx.sampleId ? `Sample ${sel.heatCode}-${ctx.label}` : 'Heat Code Only'}
                                  {sample?.quantity ? (
                                    <span className="ml-1 font-normal text-muted-foreground">· {sample.quantity}</span>
                                  ) : null}
                                </span>
                                {sampleComplete ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : null}
                              </div>
                              <div className="flex-1 space-y-2.5 p-2.5">
                                {requiredSections.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No required sections.</p>
                                ) : (
                                  requiredSections.map((section) => {
                                    const report = reportFor(sel, section.key, ctx.sampleId)
                                    const status = reportCardStatus(report, section)
                                    return (
                                      <div key={section.id}>
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            {section.name}
                                          </p>
                                          <ReportStatusBadge value={status} />
                                        </div>
                                        {report && report.parsedValues.length > 0 ? (
                                          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                                            {report.parsedValues.map((pv) => (
                                              <div
                                                key={`${report.id}-${pv.name}`}
                                                className="flex items-baseline justify-between gap-2 text-xs"
                                              >
                                                <dt className="truncate text-muted-foreground">{pv.name}</dt>
                                                <dd className="font-mono font-medium">
                                                  {pv.value}
                                                  {pv.unit ? ` ${pv.unit}` : ''}
                                                </dd>
                                              </div>
                                            ))}
                                          </dl>
                                        ) : (
                                          <p className="mt-1 text-xs text-muted-foreground">no data</p>
                                        )}
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => (allComplete ? onAutoFill?.() : onNext())}
          disabled={!canNext}
        >
          {allComplete ? 'Next: Final Review' : 'Next: Reports'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
