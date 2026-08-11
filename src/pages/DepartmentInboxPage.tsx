import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileUp, Inbox, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { toast } from 'sonner'
import { useDepartmentRequestStore } from '@/stores/departmentRequestStore'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { useStoresHydrated } from '@/hooks/useHydrated'
import { parseReport } from '@/services/parsers'
import { saveReportBlob, deleteReportBlob } from '@/lib/fileStorage'
import { createId, nowIso } from '@/lib/id'
import { departmentForSectionKey } from '@/lib/permissions'
import { ParsedReviewDialog } from '@/components/certificate-flow/ParsedReviewDialog'
import type {
  HeatRecord,
  HeatReportData,
  HeatReportRequest,
  MasterSection,
  ParsedReportResult,
  ParsedValue,
  ReportRecord,
} from '@/types'

type InboxItem =
  | { kind: 'cert'; requestId: string; status: string; requestedAt: string }
  | { kind: 'heat'; heat: HeatRecord; request: HeatReportRequest }

interface HeatReviewTarget {
  heat: HeatRecord
  request: HeatReportRequest
  file: File
  storedKey: string
  result: ParsedReportResult
}

export function DepartmentInboxPage() {
  const hydrated = useStoresHydrated()
  const requests = useDepartmentRequestStore((s) => s.requests)
  const getRequest = useDepartmentRequestStore((s) => s.getRequest)
  const updateStatus = useDepartmentRequestStore((s) => s.updateStatus)
  const addComment = useDepartmentRequestStore((s) => s.addComment)
  const linkReport = useDepartmentRequestStore((s) => s.linkReport)
  const upsertReport = useCertificateStore((s) => s.upsertReport)
  const setReportStatus = useCertificateStore((s) => s.setReportStatus)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const setHeatRequestStatus = useHeatRecordStore((s) => s.setRequestStatus)
  const upsertHeatReport = useHeatRecordStore((s) => s.upsertReportData)
  const confirmHeatReport = useHeatRecordStore((s) => s.confirmReportData)
  const masters = useProductMasterStore((s) => s.masters)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)

  const [parsingId, setParsingId] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [heatReview, setHeatReview] = useState<HeatReviewTarget | null>(null)

  const myDepartment = user?.department ?? ''

  const items = useMemo<InboxItem[]>(() => {
    const certItems: InboxItem[] = requests
      .filter((r) => {
        if (myDepartment && r.department !== myDepartment) return false
        return r.status !== 'CANCELLED'
      })
      .map((r) => ({ kind: 'cert' as const, requestId: r.id, status: r.status, requestedAt: r.requestedAt }))

    const heatItems: InboxItem[] = heatRecords.flatMap((h) =>
      h.requests
        .filter((req) => {
          if (myDepartment && req.department !== myDepartment) return false
          return req.status !== 'CANCELLED'
        })
        .map((req) => ({ kind: 'heat' as const, heat: h, request: req })),
    )

    return [...certItems, ...heatItems]
  }, [requests, heatRecords, myDepartment])

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="Department Inbox" />
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const handleCertUpload = async (requestId: string, file: File) => {
    const request = getRequest(requestId)
    if (!request) return
    setParsingId(requestId)
    try {
      updateStatus(requestId, 'IN_PROGRESS')
      const result = await parseReport(file, request.sectionKey)
      const storedKey = `dept-${requestId}-${Date.now()}`
      await saveReportBlob(storedKey, file)
      const cert = useCertificateStore.getState().getCertificate(request.certificateId)
      const selection = cert?.selectedHeats.find(
        (s) => s.heatCode.toLowerCase() === request.heatCode.toLowerCase(),
      )
      if (cert && selection) {
        const report: ReportRecord = {
          id: createId(),
          sectionId: selection.id,
          sectionKey: request.sectionKey,
          sectionName: request.sectionName,
          heatSampleId: undefined,
          heatSampleLabel: request.heatSample,
          fileMetadata: { fileName: file.name, fileSize: file.size, mimeType: file.type, storedKey },
          parsedValues: result.parameters,
          confirmed: false,
          sourceType: 'DEPARTMENT',
          warnings: result.warnings,
          uploadedBy: user?.name,
          uploadedAt: nowIso(),
          departmentRequestId: requestId,
        }
        upsertReport(cert.id, selection.id, report)
        setReportStatus(cert.id, selection.id, report.id, 'NEEDS_REVIEW')
        linkReport(requestId, report.id)
        addLog({ userId: user?.name ?? 'unknown', action: 'dept_uploaded', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber, section: request.sectionKey, requestId } })
        toast.success('Report uploaded and linked to certificate')

        const heat = heatRecords.find(
          (h) =>
            h.sapNo.toLowerCase() === request.sapNo.toLowerCase() &&
            h.heatCode.toLowerCase() === request.heatCode.toLowerCase(),
        )
        if (heat) {
          const sample = heat.heats.find((s) => s.label === request.heatSample)
          const heatReport: HeatReportData = {
            id: createId(),
            sectionKey: request.sectionKey,
            sectionName: request.sectionName,
            sampleId: sample?.id,
            sampleLabel: sample?.label,
            parsedValues: result.parameters,
            confirmed: false,
            fileMetadata: { fileName: file.name, fileSize: file.size, mimeType: file.type, storedKey },
            warnings: result.warnings,
            uploadedBy: user?.name,
            uploadedAt: nowIso(),
            status: 'NEEDS_REVIEW',
          }
          upsertHeatReport(heat.id, heatReport)
        }
      } else {
        linkReport(requestId, '')
        toast.success('Report received (certificate not linked)')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to process upload')
    } finally {
      setParsingId(null)
    }
  }

  const handleHeatUpload = async (heat: HeatRecord, request: HeatReportRequest, file: File) => {
    const id = `heat-${heat.id}-${request.id}`
    setParsingId(id)
    try {
      setHeatRequestStatus(heat.id, request.id, 'IN_PROGRESS')
      const result = await parseReport(file, request.sectionKey)
      const storedKey = `heatreport-${heat.id}-${request.id}-${Date.now()}`
      await saveReportBlob(storedKey, file)
      setHeatReview({ heat, request, file, storedKey, result })
      toast.info('Parsed. Review the extracted data before submitting.')
    } catch (e) {
      console.error(e)
      toast.error('Failed to process upload')
    } finally {
      setParsingId(null)
    }
  }

  const confirmHeatReview = (values: ParsedValue[]) => {
    if (!heatReview) return
    const { heat, request, file, storedKey, result } = heatReview
    const data: HeatReportData = {
      id: request.id,
      sectionKey: request.sectionKey,
      sectionName: request.sectionName,
      sampleId: request.sampleId,
      sampleLabel: request.sampleLabel,
      parsedValues: values,
      confirmed: true,
      fileMetadata: { fileName: file.name, fileSize: file.size, mimeType: file.type, storedKey },
      warnings: result.warnings,
      uploadedBy: user?.name,
      uploadedAt: nowIso(),
      status: 'COMPLETE',
    }
    upsertHeatReport(heat.id, data)
    confirmHeatReport(heat.id, request.id, values)
    addLog({ userId: user?.name ?? 'unknown', action: 'heat_report_submitted', entityType: 'HEAT_RECORD', after: { sapNo: heat.sapNo, heatCode: heat.heatCode, section: request.sectionKey, sample: request.sampleLabel } })
    setHeatReview(null)
    toast.success('Report submitted to the heat record')
  }

  const cancelHeatReview = async () => {
    if (!heatReview) return
    await deleteReportBlob(heatReview.storedKey).catch(() => undefined)
    setHeatReview(null)
    toast.info('Upload discarded. You can upload again.')
  }

  const handleUpload = (item: InboxItem, file: File) => {
    if (item.kind === 'cert') handleCertUpload(item.requestId, file)
    else handleHeatUpload(item.heat, item.request, file)
  }

  const sendComment = (requestId: string) => {
    const text = commentText[requestId]?.trim()
    if (!text) return
    addComment(requestId, text, user?.name ?? 'unknown')
    setCommentText((s) => ({ ...s, [requestId]: '' }))
    toast.success('Comment added')
  }

  const itemKey = (item: InboxItem) => {
    if (item.kind === 'cert') return item.requestId
    return `heat-${item.heat.id}-${item.request.id}`
  }

  const itemStatus = (item: InboxItem): string => {
    if (item.kind === 'cert') return item.status
    return item.request.status
  }

  const itemStatusLabel = (status: string) => status.replace('_', ' ')

  return (
    <div>
      <PageHeader
        title="Department Inbox"
        description={
          myDepartment
            ? `Showing requests for ${myDepartment}. Upload test reports to fulfil them.`
            : 'Reports requested from your department for certificates.'
        }
        actions={
          <Button variant="ghost" asChild>
            <Link to="/departments">
              <ArrowLeft className="h-4 w-4" />
              Back to Requests
            </Link>
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title="Inbox empty"
          description="No requests assigned to your department yet."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const key = itemKey(item)
            const status = itemStatus(item)
            const isUploaded = status === 'UPLOADED' || status === 'REVIEWED'
            const cert = item.kind === 'cert' ? getRequest(item.requestId) : undefined
            const heat = item.kind === 'heat' ? item.heat : undefined
            const request = item.kind === 'heat' ? item.request : undefined
            const certificateNo = cert?.certificateNo ?? (heat ? `${heat.sapNo} / ${heat.heatCode}` : '')
            const sapNo = cert?.sapNo ?? heat?.sapNo ?? ''
            const heatLabel = cert
              ? `${cert.heatCode}${cert.heatSample ? ` / ${cert.heatSample}` : ''}`
              : `${heat!.heatCode}${request!.sampleLabel ? ` / ${request!.sampleLabel}` : ''}`
            const sectionName = cert?.sectionName ?? request!.sectionName
            const sectionKey = cert?.sectionKey ?? request!.sectionKey
            const requestedAt = cert?.requestedAt ?? ''
            const comments = cert?.comments ?? []
            const isCert = item.kind === 'cert'

            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {isCert ? <Badge variant="secondary">Certificate</Badge> : <Badge>Heat Record</Badge>}
                    <CardTitle className="text-sm font-mono">{certificateNo}</CardTitle>
                    <Badge variant="outline" className="font-mono">{sapNo}</Badge>
                    <Badge variant="outline">{heatLabel}</Badge>
                    <Badge variant="secondary">{departmentForSectionKey(sectionKey)}</Badge>
                    <Badge variant={isUploaded ? 'default' : 'outline'}>
                      {itemStatusLabel(status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sectionName}
                    {requestedAt ? ` · requested ${new Date(requestedAt).toLocaleString()}` : ''}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cert?.comment ? (
                    <p className="rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                      Request note: {cert.comment}
                    </p>
                  ) : null}

                  <input
                    ref={(el) => {
                      fileRefs.current[key] = el
                    }}
                    type="file"
                    className="hidden"
                    accept=".pdf,.bmp,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleUpload(item, f)
                      e.target.value = ''
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={parsingId === key}
                      onClick={() => fileRefs.current[key]?.click()}
                    >
                      {parsingId === key ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileUp className="mr-1 h-3.5 w-3.5" />
                      )}
                      {isUploaded ? 'Replace Report' : 'Upload Report'}
                    </Button>
                    {!isUploaded && isCert ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          updateStatus(item.requestId, 'CANCELLED')
                          toast.success('Request cancelled')
                        }}
                      >
                        Cancel Request
                      </Button>
                    ) : null}
                  </div>

                  {comments.length > 0 ? (
                    <div className="space-y-1 rounded-md bg-muted/30 p-2">
                      {comments.map((c) => (
                        <p key={c.id} className="text-xs">
                          <span className="font-medium">{c.user}</span> · {new Date(c.at).toLocaleString()}
                          <br />
                          {c.text}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {isCert ? (
                    <div className="flex gap-2">
                      <Textarea
                        rows={1}
                        placeholder="Add a comment…"
                        className="h-9 resize-none text-xs"
                        value={commentText[key] ?? ''}
                        onChange={(e) => setCommentText((s) => ({ ...s, [key]: e.target.value }))}
                      />
                      <Button size="sm" variant="outline" onClick={() => sendComment(item.requestId)}>
                        Send
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      {heatReview ? <ParsedReviewDialog
        open={Boolean(heatReview)}
        title="Review Parsed Report Data"
        section={heatReviewSection(heatReview, masters)}
        values={heatReview.result.parameters}
        sourceType="DEPARTMENT"
        warnings={heatReview.result.warnings}
        detected={{
          sapNo: heatReview.result.detectedSAPNo,
          heatCode: heatReview.result.detectedHeatCode,
          heatSample: heatReview.result.detectedHeatSample,
          partNo: heatReview.result.detectedPartNo,
          customer: heatReview.result.detectedCustomer,
          material: heatReview.result.detectedMaterial,
        }}
        onClose={() => {
          cancelHeatReview()
        }}
        onConfirm={(values) => confirmHeatReview(values)}
      /> : null}
    </div>
  )
}

function heatReviewSection(
  target: HeatReviewTarget,
  masters: ReturnType<typeof useProductMasterStore.getState>['masters'],
): MasterSection {
  const master = masters.find(
    (m) => m.sapNo.toLowerCase() === target.heat.sapNo.toLowerCase(),
  )
  const found = master?.sections.find((s) => s.key === target.request.sectionKey)
  if (found) return found
  return {
    id: target.request.sectionKey,
    name: target.request.sectionName,
    key: target.request.sectionKey,
    required: true,
    order: 0,
    parameters: [],
  }
}
