import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ReportCard } from '@/components/certificate-flow/ReportCard'
import { ParsedReviewDialog } from '@/components/certificate-flow/ParsedReviewDialog'
import { NearAroundDialog } from '@/components/certificate-flow/NearAroundDialog'
import { sampleContexts, reportFor } from '@/lib/certificateStatus'
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
    const sourceSampleId = heatSampleId
      ? prevContexts.find((c) => c.label === heatSampleLabel)?.sampleId
      : undefined
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
      {cert.selectedHeats.map((selection, heatIdx) => {
        const contexts = sampleContexts(selection, heatRecords)
        const previousSelection = heatIdx > 0 ? cert.selectedHeats[heatIdx - 1] : undefined
        return (
          <Card key={selection.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base font-mono">{selection.heatCode}</CardTitle>
                {selection.batchNo ? <Badge variant="outline">Batch {selection.batchNo}</Badge> : null}
                <Badge variant={selection.heatCodeOnly ? 'secondary' : 'default'}>
                  {selection.heatCodeOnly ? 'Heat Code Only' : `${contexts.length} sample(s)`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {contexts.map((ctx) => (
                <div key={ctx.sampleId ?? 'only'}>
                  {!selection.heatCodeOnly ? (
                    <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Sample {ctx.label}
                    </p>
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {sections.map((section) => {
                      const report = reportFor(selection, section.key, ctx.sampleId)
                      return (
                        <ReportCard
                          key={section.id}
                          section={section}
                          report={report}
                          heatCode={selection.heatCode}
                          sampleLabel={selection.heatCodeOnly ? undefined : ctx.label}
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
              ))}
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
