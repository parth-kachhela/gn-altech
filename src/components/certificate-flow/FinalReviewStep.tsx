import { useMemo } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { sampleContexts, reportFor, reportCardStatus, completionSummary } from '@/lib/certificateStatus'
import { ReportStatusBadge, SourceBadge, ParameterResultBadge } from '@/components/certificate-flow/ReportStatusBadge'
import { validateValue, matchParameter } from '@/lib/validation'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import type { CertificateHeatSelection, ParsedValue, ProductMaster, ReportRecord } from '@/types'

export function FinalReviewStep({
  certId,
  onBack,
  onNext,
}: {
  certId: string
  onBack: () => void
  onNext: () => void
}) {
  const cert = useCertificateStore((s) => (certId ? s.getCertificate(certId) : undefined))
  const updateDraft = useCertificateStore((s) => s.updateDraft)
  const upsertReport = useCertificateStore((s) => s.upsertReport)
  const setSelection = useCertificateStore((s) => s.setSelection)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const updateHeatRecord = useHeatRecordStore((s) => s.updateHeatRecord)
  const updateHeatSample = useHeatRecordStore((s) => s.updateHeatSample)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)

  const summary = useMemo(() => (cert ? completionSummary(cert, heatRecords) : null), [cert, heatRecords])

  if (!cert || !summary) return null

  const sections = cert.productSnapshot.sections

  const editValue = (selectionId: string, report: ReportRecord, value: ParsedValue, newValue: string) => {
    const updated = {
      ...report,
      parsedValues: report.parsedValues.map((v) =>
        v === value ? { ...v, value: newValue } : v,
      ),
      status: 'NEEDS_REVIEW' as ReportRecord['status'],
    }
    upsertReport(certId, selectionId, updated)
    addLog({ userId: user?.name ?? 'unknown', action: 'parsed_value_edited', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber, section: report.sectionKey, param: value.name } })
  }

  const setBasic = (patch: Record<string, string | undefined>) => {
    updateDraft(certId, patch)
  }

  const setProductField = (field: keyof ProductMaster, value: string) => {
    updateDraft(certId, { productSnapshot: { ...cert.productSnapshot, [field]: value } })
  }

  const setHeatField = (selection: CertificateHeatSelection, field: 'heatCode' | 'batchNo', value: string) => {
    setSelection(certId, { ...selection, [field]: value })
    if (selection.heatRecordId) {
      updateHeatRecord(selection.heatRecordId, { [field]: value })
    }
  }

  const setSampleLabel = (selection: CertificateHeatSelection, sampleId: string, label: string) => {
    if (!selection.heatRecordId) return
    updateHeatSample(selection.heatRecordId, sampleId, { label })
  }

  const hasFailures = summary.failed > 0

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Final Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <SummaryStat label="Required" value={summary.required} />
            <SummaryStat label="Complete" value={summary.complete} tone="green" />
            <SummaryStat label="Failed Spec" value={summary.failed} tone="red" />
            <SummaryStat label="Warnings" value={summary.warnings} tone="amber" />
            <SummaryStat label="Repeated / Suggested" value={summary.repeated + summary.suggested} tone="blue" />
          </div>
          {hasFailures ? (
            <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20">
              Some values are out of specification. Review the highlighted entries before issuing.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">SAP No.</Label>
            <Input value={cert.productSnapshot.sapNo} onChange={(e) => setProductField('sapNo', e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Part No.</Label>
            <Input value={cert.productSnapshot.partNo} onChange={(e) => setProductField('partNo', e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Description</Label>
            <Input value={cert.productSnapshot.description} onChange={(e) => setProductField('description', e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Material</Label>
            <Input value={cert.productSnapshot.material} onChange={(e) => setProductField('material', e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Customer</Label>
            <Input value={cert.productSnapshot.customer} onChange={(e) => setProductField('customer', e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Grade</Label>
            <Input value={cert.productSnapshot.grade ?? ''} onChange={(e) => setProductField('grade', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificate & Signatures</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Certificate No.</Label>
            <Input value={cert.certificateNumber} onChange={(e) => setBasic({ certificateNumber: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Certificate Date</Label>
            <Input type="date" value={cert.certificateDate} onChange={(e) => setBasic({ certificateDate: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Invoice Date</Label>
            <Input type="date" value={cert.invoiceDate ?? ''} onChange={(e) => setBasic({ invoiceDate: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Invoice / Challan No.</Label>
            <Input value={cert.invoiceNumber ?? ''} onChange={(e) => setBasic({ invoiceNumber: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Delivery Condition</Label>
            <Input value={cert.deliveryCondition ?? ''} onChange={(e) => setBasic({ deliveryCondition: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Remarks</Label>
            <Input value={cert.remarks ?? ''} onChange={(e) => setBasic({ remarks: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Tested By</Label>
            <Input value={cert.testedBy ?? ''} onChange={(e) => setBasic({ testedBy: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Reviewed By</Label>
            <Input value={cert.reviewedBy ?? ''} onChange={(e) => setBasic({ reviewedBy: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Approved By</Label>
            <Input value={cert.approvedBy ?? ''} onChange={(e) => setBasic({ approvedBy: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {cert.selectedHeats.map((selection) => {
        const contexts = sampleContexts(selection, heatRecords)
        return (
          <Card key={selection.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base">Heat</CardTitle>
                <div>
                  <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Heat Code</Label>
                  <Input
                    className="h-8 w-32 font-mono"
                    value={selection.heatCode}
                    onChange={(e) => setHeatField(selection, 'heatCode', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Batch No.</Label>
                  <Input
                    className="h-8 w-32"
                    value={selection.batchNo ?? ''}
                    onChange={(e) => setHeatField(selection, 'batchNo', e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {contexts.map((ctx) => (
                <div key={ctx.sampleId ?? 'heat-only'}>
                  <div className="mb-2 flex items-center gap-2">
                    {ctx.sampleId ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Sample
                        </p>
                        <div className="flex items-center gap-0.5">
                          <span className="font-mono text-xs">{selection.heatCode}-</span>
                          <Input
                            className="h-7 w-12 font-mono text-xs"
                            value={ctx.label}
                            onChange={(e) => setSampleLabel(selection, ctx.sampleId!, e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Heat Code Only
                      </p>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Section</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Values</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sections.map((section) => {
                          const report = reportFor(selection, section.key, ctx.sampleId)
                          const status = reportCardStatus(report, section)
                          return (
                            <TableRow key={section.id}>
                              <TableCell className="font-medium">{section.name}</TableCell>
                              <TableCell>
                                {report ? <SourceBadge value={report.sourceType} /> : <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {report && report.parsedValues.length > 0 ? (
                                  <div className="overflow-hidden rounded-md border">
                                    <div className="grid grid-cols-[minmax(140px,1fr)_auto_auto_auto] items-center gap-x-3 bg-muted/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      <span>Parameter</span>
                                      <span className="w-24">Value</span>
                                      <span className="w-12">Unit</span>
                                      <span className="w-24 text-right">Result</span>
                                    </div>
                                    <div className="divide-y">
                                      {report.parsedValues.map((v, i) => {
                                        const param = section.parameters.find((p) => matchParameter(p, v.name))
                                        const outcome = param ? validateValue(param, v.value) : undefined
                                        return (
                                          <div
                                            key={i}
                                            className="grid grid-cols-[minmax(140px,1fr)_auto_auto_auto] items-center gap-x-3 px-2 py-1"
                                          >
                                            <span className="truncate text-xs font-medium">{v.name}</span>
                                            <input
                                              className="w-24 rounded border border-input bg-background px-1.5 py-0.5 font-mono text-xs outline-none focus:border-primary"
                                              defaultValue={v.value}
                                              onBlur={(e) => {
                                                if (e.target.value !== v.value) editValue(selection.id, report, v, e.target.value)
                                              }}
                                            />
                                            <span className="w-12 text-xs text-muted-foreground">{v.unit ?? ''}</span>
                                            <span className="w-24 text-right">
                                              {outcome ? <ParameterResultBadge value={outcome.result} /> : <span className="text-xs text-muted-foreground">—</span>}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No values</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <ReportStatusBadge value={status} />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
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
          Next: Confirm & Issue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'green' | 'red' | 'amber' | 'blue'
}) {
  const color: Record<string, string> = {
    green: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
  }
  const cls = tone ? color[tone] ?? '' : ''
  return (
    <div className="rounded-md border bg-card p-3">
      <div className={`text-2xl font-semibold ${cls}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
