import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CopyCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ReportCard } from '@/components/certificate-flow/ReportCard'
import { ParsedReviewDialog } from '@/components/certificate-flow/ParsedReviewDialog'
import { NearAroundDialog } from '@/components/certificate-flow/NearAroundDialog'
import { sampleContexts, reportFor, heatSampleDisplayLabel, isReportComplete } from '@/lib/certificateStatus'
import { parseReport } from '@/services/parsers'
import { saveReportBlob } from '@/lib/fileStorage'
import { createId, nowIso } from '@/lib/id'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useDepartmentRequestStore } from '@/stores/departmentRequestStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { departmentForSectionKey } from '@/lib/permissions'
import type { CertificateHeatSelection, MasterSection, ParsedReportResult, ParsedValue, ReportRecord } from '@/types'
import { toast } from 'sonner'

interface ReviewTarget {
  selectionId: string
  report: ReportRecord
}

export function ReportWorkspaceStep({
  certId,
  onBack,
  onNext,
}: {
  certId: string
  onBack: () => void
  onNext: () => void
}) {
  const cert = useCertificateStore((s) => (certId ? s.getCertificate(certId) : undefined))
  const upsertReport = useCertificateStore((s) => s.upsertReport)
  const confirmReport = useCertificateStore((s) => s.confirmReport)
  const setReportStatus = useCertificateStore((s) => s.setReportStatus)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const createRequest = useDepartmentRequestStore((s) => s.createRequest)
  const certLinkRequest = useCertificateStore((s) => s.linkDepartmentRequest)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)

  const [parsing, setParsing] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)
  const [nearTarget, setNearTarget] = useState<{
    selectionId: string
    section: MasterSection
    heatSampleId?: string
    heatSampleLabel?: string
  } | null>(null)

  const sortedSelections = useMemo(() => {
    if (!cert) return []
    const sections = cert.productSnapshot.sections
    const requiredSections = sections.filter((s) => s.required && s.parameters.length > 0)
    const ranked = cert.selectedHeats.map((selection) => {
      const contexts = sampleContexts(selection, heatRecords)
      const complete = requiredSections.every((section) =>
        contexts.every((ctx) =>
          isReportComplete(reportFor(selection, section.key, ctx.sampleId), section),
        ),
      )
      return { selection, complete }
    })
    return ranked.sort((a, b) => Number(b.complete) - Number(a.complete))
  }, [cert, heatRecords])

  if (!cert) return null

  const sections = cert.productSnapshot.sections

  const upsertParsed = (
    selectionId: string,
    sectionKey: string,
    sectionName: string,
    heatSampleId: string | undefined,
    heatSampleLabel: string | undefined,
    result: ParsedReportResult,
    sourceType: ReportRecord['sourceType'],
    fileMeta?: { fileName: string; fileSize: number; mimeType: string; storedKey: string },
  ) => {
    const report: ReportRecord = {
      id: createId(),
      sectionId: sections.find((s) => s.key === sectionKey)?.id ?? sectionKey,
      sectionKey,
      sectionName,
      heatSampleId,
      heatSampleLabel,
      fileMetadata: fileMeta,
      parsedValues: result.parameters,
      confirmed: false,
      sourceType,
      warnings: result.warnings,
      uploadedBy: user?.name,
      uploadedAt: nowIso(),
    }
    upsertReport(certId, selectionId, report)
    setReportStatus(certId, selectionId, report.id, result.parameters.length > 0 ? 'NEEDS_REVIEW' : 'WARNING')
    addLog({ userId: user?.name ?? 'unknown', action: 'report_uploaded', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber, section: sectionKey, sample: heatSampleLabel } })
    setReviewTarget({ selectionId, report })
    return report
  }

  const handleUpload = async (
    selectionId: string,
    sectionKey: string,
    sectionName: string,
    heatSampleId: string | undefined,
    heatSampleLabel: string | undefined,
    file: File,
  ) => {
    setParsing(true)
    try {
      const result = await parseReport(file, sectionKey)
      const storedKey = `${certId}-${selectionId}-${sectionKey}-${heatSampleId ?? 'only'}-${Date.now()}`
      await saveReportBlob(storedKey, file)
      upsertParsed(selectionId, sectionKey, sectionName, heatSampleId, heatSampleLabel, result, 'UPLOADED', {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        storedKey,
      })
    } catch (e) {
      console.error(e)
      toast.error('Failed to parse report. Please try again.')
    } finally {
      setParsing(false)
    }
  }

  const handleRequestDepartment = (
    selectionId: string,
    section: { key: string; name: string },
    heatSampleLabel: string | undefined,
  ) => {
    const selection = cert.selectedHeats.find((s) => s.id === selectionId)
    if (!selection) return
    const requestId = createRequest({
      certificateId: cert.id,
      certificateNo: cert.certificateNumber,
      sapNo: cert.productSnapshot.sapNo,
      partNo: cert.productSnapshot.partNo,
      heatCode: selection.heatCode,
      heatSample: heatSampleLabel,
      sectionKey: section.key,
      sectionName: section.name,
      reportType: section.name,
      department: departmentForSectionKey(section.key),
      requestedBy: user?.name ?? 'unknown',
    })
    const existing = reportFor(selection, section.key, selection.heatCodeOnly ? undefined : undefined)
    const reportId =
      existing?.id ??
      (() => {
        const r: ReportRecord = {
          id: createId(),
          sectionId: sections.find((s) => s.key === section.key)?.id ?? section.key,
          sectionKey: section.key,
          sectionName: section.name,
          heatSampleId: undefined,
          heatSampleLabel,
          parsedValues: [],
          confirmed: false,
          sourceType: 'DEPARTMENT',
          warnings: [],
        }
        upsertReport(certId, selectionId, r)
        return r.id
      })()
    certLinkRequest(certId, selectionId, reportId, requestId)
    addLog({ userId: user?.name ?? 'unknown', action: 'dept_requested', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber, section: section.key } })
    toast.success(`Request sent to ${departmentForSectionKey(section.key)}`)
  }

  const confirmReview = (selectionId: string, reportId: string, values: ParsedValue[]) => {
    confirmReport(certId, selectionId, reportId, values)
    addLog({ userId: user?.name ?? 'unknown', action: 'report_confirmed', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber, reportId } })
    setReviewTarget(null)
    toast.success('Parsed data confirmed')
  }

  const applyRepeatFromPrevious = (
    selectionId: string,
    section: MasterSection,
    heatSampleId: string | undefined,
    heatSampleLabel: string | undefined,
    previousSelection: CertificateHeatSelection,
  ) => {
    const prevContexts = sampleContexts(previousSelection, heatRecords)
    let sourceSampleId: string | undefined
    if (heatSampleId) {
      const match = prevContexts.find((c) => c.label === heatSampleLabel)
      if (!match) {
        toast.error(`No confirmed ${section.name} data in the previous heat (${previousSelection.heatCode}) for ${heatSampleLabel}.`)
        return
      }
      sourceSampleId = match.sampleId
    }
    const sourceReport = reportFor(previousSelection, section.key, sourceSampleId)
    if (!sourceReport || !sourceReport.confirmed || sourceReport.parsedValues.length === 0) {
      toast.error(`No confirmed ${section.name} data in the previous heat (${previousSelection.heatCode})${heatSampleLabel ? ` for ${heatSampleLabel}` : ''}.`)
      return
    }
    const report: ReportRecord = {
      id: createId(),
      sectionId: section.id,
      sectionKey: section.key,
      sectionName: section.name,
      heatSampleId,
      heatSampleLabel,
      parsedValues: sourceReport.parsedValues.map((v) => ({ ...v })),
      confirmed: false,
      sourceType: 'REPEATED',
      sourceRef: {
        certificateId: cert.id,
        heatCode: previousSelection.heatCode,
        heatSampleId: sourceSampleId,
        sectionKey: section.key,
        reportId: sourceReport.id,
      },
      warnings: [],
      uploadedBy: user?.name,
      uploadedAt: nowIso(),
    }
    upsertReport(certId, selectionId, report)
    setReportStatus(certId, selectionId, report.id, 'NEEDS_REVIEW')
    addLog({ userId: user?.name ?? 'unknown', action: 'report_repeated', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber, from: previousSelection.heatCode, section: section.key } })
    setReviewTarget({ selectionId, report })
    toast.success(`Repeated from ${previousSelection.heatCode} — review required`)
  }

  const applyRepeatUpper = (
    selection: CertificateHeatSelection,
    section: MasterSection,
    targetSampleId: string,
    targetSampleLabel: string,
    sourceReport: ReportRecord,
  ) => {
    const report: ReportRecord = {
      id: createId(),
      sectionId: section.id,
      sectionKey: section.key,
      sectionName: section.name,
      heatSampleId: targetSampleId,
      heatSampleLabel: targetSampleLabel,
      parsedValues: sourceReport.parsedValues.map((v) => ({ ...v })),
      confirmed: false,
      sourceType: 'REPEATED',
      sourceRef: {
        certificateId: cert.id,
        heatCode: selection.heatCode,
        heatSampleId: sourceReport.heatSampleId,
        sectionKey: section.key,
        reportId: sourceReport.id,
      },
      warnings: [],
      uploadedBy: user?.name,
      uploadedAt: nowIso(),
    }
    upsertReport(certId, selection.id, report)
    setReportStatus(certId, selection.id, report.id, 'NEEDS_REVIEW')
    addLog({ userId: user?.name ?? 'unknown', action: 'report_repeated', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber, heat: selection.heatCode, section: section.key, sample: targetSampleLabel } })
    setReviewTarget({ selectionId: selection.id, report })
    toast.success(`Repeated from upper sample — review required`)
  }

  const applyHeatCodeToAllSamples = (selection: CertificateHeatSelection) => {
    const contexts = sampleContexts(selection, heatRecords)
    let filled = 0
    for (const ctx of contexts) {
      if (!ctx.sampleId) continue
      for (const section of sections) {
        const existing = reportFor(selection, section.key, ctx.sampleId)
        if (existing && existing.parsedValues.length > 0) continue
        const source = reportFor(selection, section.key, undefined)
        if (!source || !source.confirmed || source.parsedValues.length === 0) continue
        const report: ReportRecord = {
          id: createId(),
          sectionId: section.id,
          sectionKey: section.key,
          sectionName: section.name,
          heatSampleId: ctx.sampleId,
          heatSampleLabel: ctx.label,
          parsedValues: source.parsedValues.map((v) => ({ ...v })),
          confirmed: true,
          sourceType: 'REPEATED',
          sourceRef: {
            certificateId: cert.id,
            heatCode: selection.heatCode,
            heatSampleId: undefined,
            sectionKey: section.key,
            reportId: source.id,
          },
          warnings: [],
          uploadedBy: user?.name,
          uploadedAt: nowIso(),
          status: 'COMPLETE',
        }
        upsertReport(certId, selection.id, report)
        filled++
      }
    }
    addLog({ userId: user?.name ?? 'unknown', action: 'report_repeated', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber, heat: selection.heatCode, samplesFilled: filled } })
    toast.success(filled > 0 ? `Copied heat-code data to ${filled} sample report(s)` : 'No missing values to fill')
  }

  const applyNearAround = (values: ParsedValue[]) => {
    if (!nearTarget) return
    const { selectionId, section, heatSampleId, heatSampleLabel } = nearTarget
    const report: ReportRecord = {
      id: createId(),
      sectionId: section.id,
      sectionKey: section.key,
      sectionName: section.name,
      heatSampleId,
      heatSampleLabel,
      parsedValues: values.map((v) => ({ ...v })),
      confirmed: false,
      sourceType: 'SUGGESTED',
      suggestedValues: values.map((v) => ({ ...v })),
      warnings: [],
      uploadedBy: user?.name,
      uploadedAt: nowIso(),
    }
    upsertReport(certId, selectionId, report)
    setReportStatus(certId, selectionId, report.id, 'NEEDS_REVIEW')
    addLog({ userId: user?.name ?? 'unknown', action: 'near_around_used', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber, section: section.key } })
    setNearTarget(null)
    setReviewTarget({ selectionId, report })
    toast.success('Near Around values applied — review required')
  }

  return (
    <div className="space-y-5">
      {sortedSelections.map(({ selection, complete: selectionComplete }, heatIdx) => {
        const contexts = sampleContexts(selection, heatRecords)
        const previousSelection = heatIdx > 0 ? sortedSelections[heatIdx - 1].selection : undefined
        const hasMultipleSamples = selection.selectedSamples.length > 1
        const heatLevelHasData = sections.some((s) => {
          const r = reportFor(selection, s.key, undefined)
          return Boolean(r && r.confirmed && r.parsedValues.length > 0)
        })
        const anySampleMissing = contexts.some(
          (ctx) =>
            ctx.sampleId &&
            sections.some((s) => {
              const r = reportFor(selection, s.key, ctx.sampleId)
              return !r || r.parsedValues.length === 0
            }),
        )
        const canCopyHeatToAll =
          selection.selectedSamples.length > 0 && heatLevelHasData && anySampleMissing
        return (
          <Card key={selection.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base font-mono">{selection.heatCode}</CardTitle>
                {selection.batchNo ? <Badge variant="outline">Batch {selection.batchNo}</Badge> : null}
                <Badge variant={selection.heatCodeOnly ? 'secondary' : 'default'}>
                  {selection.heatCodeOnly ? 'Heat Code Only' : `${selection.selectedSamples.length} sample(s)`}
                </Badge>
                {selectionComplete ? (
                  <Badge className="bg-green-600 text-white">All reports complete</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {contexts.map((ctx, ctxIdx) => {
                const upperCtx = ctxIdx > 0 ? contexts[ctxIdx - 1] : undefined
                return (
                  <div key={ctx.sampleId ?? 'heat-only'}>
                    <div className="mb-2 mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {ctx.sampleId ? `Sample ${heatSampleDisplayLabel(selection.heatCode, ctx.label)}` : 'Heat Code Only'}
                      </p>
                      {ctx.sampleId && canCopyHeatToAll ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => applyHeatCodeToAllSamples(selection)}
                          disabled={parsing}
                        >
                          <CopyCheck className="h-3.5 w-3.5" />
                          Copy Heat Code to All Samples
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {sections.map((section) => {
                        const report = reportFor(selection, section.key, ctx.sampleId)
                        const upperReport =
                          upperCtx?.sampleId && ctx.sampleId
                            ? reportFor(selection, section.key, upperCtx.sampleId)
                            : undefined
                        const upperHasData = Boolean(
                          upperReport && upperReport.confirmed && upperReport.parsedValues.length > 0,
                        )
                        const canRepeatUpper =
                          hasMultipleSamples &&
                          Boolean(ctx.sampleId && upperCtx?.sampleId) &&
                          upperHasData &&
                          !(report && report.parsedValues.length > 0)
                        return (
                          <ReportCard
                            key={section.id}
                            section={section}
                            report={report}
                            heatCode={selection.heatCode}
                            sampleLabel={ctx.sampleId ? heatSampleDisplayLabel(selection.heatCode, ctx.label) : undefined}
                            parsing={parsing}
                            onUpload={(file) =>
                              handleUpload(selection.id, section.key, section.name, ctx.sampleId, ctx.label, file)
                            }
                            onRequestDepartment={() =>
                              handleRequestDepartment(selection.id, section, ctx.label)
                            }
                            onRepeatPrevious={() =>
                              previousSelection
                                ? applyRepeatFromPrevious(selection.id, section, ctx.sampleId, ctx.label, previousSelection)
                                : undefined
                            }
                            canRepeatPrevious={Boolean(previousSelection)}
                            onRepeatUpper={
                              canRepeatUpper && upperReport
                                ? () => applyRepeatUpper(selection, section, ctx.sampleId!, heatSampleDisplayLabel(selection.heatCode, ctx.label), upperReport)
                                : undefined
                            }
                            onNearAround={() =>
                              setNearTarget({ selectionId: selection.id, section, heatSampleId: ctx.sampleId, heatSampleLabel: ctx.label })
                            }
                            onOpenReview={(r) => setReviewTarget({ selectionId: selection.id, report: r })}
                            onEditValues={(r) => setReviewTarget({ selectionId: selection.id, report: r })}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          Next: Final Review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <ParsedReviewDialog
        open={reviewTarget !== null}
        title="Parsed Report Review"
        section={sections.find((s) => s.id === reviewTarget?.report.sectionId) ?? sections[0]}
        values={reviewTarget?.report.parsedValues ?? []}
        sourceType={reviewTarget?.report.sourceType ?? 'UPLOADED'}
        warnings={reviewTarget?.report.warnings ?? []}
        detected={undefined}
        onClose={() => setReviewTarget(null)}
        onConfirm={(values) => {
          if (reviewTarget) confirmReview(reviewTarget.selectionId, reviewTarget.report.id, values)
        }}
      />

      <NearAroundDialog
        open={nearTarget !== null}
        section={nearTarget?.section ?? sections[0]}
        onClose={() => setNearTarget(null)}
        onApply={applyNearAround}
      />
    </div>
  )
}
