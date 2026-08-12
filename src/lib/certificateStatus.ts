import type {
  Certificate,
  CertificateHeatSelection,
  CertificateStatus,
  HeatRecord,
  MasterSection,
  ReportRecord,
  ReportStatus,
} from '@/types'
import { validateValue } from '@/lib/validation'

export function sampleContexts(
  selection: CertificateHeatSelection,
  heatRecords: HeatRecord[],
): Array<{ sampleId?: string; label: string }> {
  const contexts: Array<{ sampleId?: string; label: string }> = [
    { sampleId: undefined, label: 'Heat Code Only' },
  ]
  if (selection.heatCodeOnly) return contexts
  const heatRecord = heatRecords.find((h) => h.id === selection.heatRecordId)
  for (const id of selection.selectedSamples) {
    const sample = heatRecord?.heats.find((h) => h.id === id)
    contexts.push({ sampleId: id, label: sample?.label ?? id })
  }
  return contexts
}

export function heatSampleDisplayLabel(heatCode: string, sampleLabel?: string): string {
  return sampleLabel ? `${heatCode}-${sampleLabel}` : 'Heat Code Only'
}

export function reportFor(
  selection: CertificateHeatSelection,
  sectionKey: string,
  sampleId?: string,
): ReportRecord | undefined {
  return selection.reportRecords.find(
    (r) => r.sectionKey === sectionKey && r.heatSampleId === sampleId,
  )
}

export function isReportComplete(report: ReportRecord | undefined, section: MasterSection): boolean {
  if (!section.required || section.parameters.length === 0) return true
  if (!report) return false
  if (report.status === 'REQUESTED' || report.status === 'PARSING') return false
  return report.confirmed && report.parsedValues.length > 0
}

export function reportCardStatus(
  report: ReportRecord | undefined,
  section: MasterSection,
): ReportStatus {
  if (!section.required || section.parameters.length === 0) return 'OPTIONAL'
  if (!report) return 'NOT_STARTED'
  if (report.departmentRequestId) return 'REQUESTED'
  if (report.fileMetadata && !report.confirmed && report.parsedValues.length === 0) {
    return 'UPLOADED'
  }
  if (report.parsedValues.length === 0) return 'NOT_STARTED'
  if (!report.confirmed) return 'NEEDS_REVIEW'

  let hasFail = false
  let hasWarning = false
  for (const pv of report.parsedValues) {
    const param = section.parameters.find((p) => matchByName(p.name, pv.name))
    if (!param) continue
    const outcome = validateValue(param, pv.value)
    if (outcome.result === 'FAIL') hasFail = true
    if (outcome.result === 'WARNING') hasWarning = true
  }
  if (hasFail) return 'FAILED_SPEC'
  if (hasWarning || report.warnings.length > 0) return 'WARNING'
  return 'COMPLETE'
}

function matchByName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function anyDepartmentRequestActive(cert: Certificate): boolean {
  return cert.selectedHeats.some((s) =>
    s.reportRecords.some((r) => r.departmentRequestId && r.status !== 'COMPLETE' && r.status !== 'WARNING' && r.status !== 'FAILED_SPEC'),
  )
}

export function allRequiredComplete(cert: Certificate, heatRecords: HeatRecord[]): boolean {
  const requiredSections = cert.productSnapshot.sections.filter(
    (s) => s.required && s.parameters.length > 0,
  )
  if (requiredSections.length === 0) return true
  for (const selection of cert.selectedHeats) {
    const contexts = sampleContexts(selection, heatRecords)
    for (const ctx of contexts) {
      for (const section of requiredSections) {
        const report = reportFor(selection, section.key, ctx.sampleId)
        if (!isReportComplete(report, section)) return false
      }
    }
  }
  return true
}

export function completionSummary(cert: Certificate, heatRecords: HeatRecord[]): {
  required: number
  complete: number
  failed: number
  warnings: number
  repeated: number
  suggested: number
} {
  let required = 0
  let complete = 0
  let failed = 0
  let warnings = 0
  let repeated = 0
  let suggested = 0
  const requiredSections = cert.productSnapshot.sections.filter(
    (s) => s.required && s.parameters.length > 0,
  )
  for (const selection of cert.selectedHeats) {
    const contexts = sampleContexts(selection, heatRecords)
    for (const ctx of contexts) {
      for (const section of requiredSections) {
        required++
        const report = reportFor(selection, section.key, ctx.sampleId)
        const status = reportCardStatus(report, section)
        if (report) {
          if (report.sourceType === 'REPEATED') repeated++
          if (report.sourceType === 'SUGGESTED') suggested++
        }
        if (status === 'COMPLETE' || status === 'WARNING' || status === 'FAILED_SPEC') {
          complete++
        }
        if (status === 'FAILED_SPEC') failed++
        if (status === 'WARNING') warnings++
      }
    }
  }
  return { required, complete, failed, warnings, repeated, suggested }
}

export function deriveCertificateStatus(
  cert: Certificate,
  heatRecords: HeatRecord[],
): CertificateStatus {
  if (cert.status === 'ISSUED') return 'ISSUED'
  if (!cert.productMasterId || cert.selectedHeats.length === 0) return 'DRAFT'
  if (anyDepartmentRequestActive(cert)) return 'WAITING_FOR_DEPARTMENT'
  if (allRequiredComplete(cert, heatRecords)) {
    return cert.reviewed ? 'REVIEWED' : 'READY_FOR_REVIEW'
  }
  return 'REPORTS_PENDING'
}
