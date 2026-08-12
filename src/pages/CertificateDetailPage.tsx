import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileText, FileSpreadsheet, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { NotFoundState } from '@/components/EmptyState'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { getCapabilities } from '@/lib/permissions'
import { useCertificatesHydrated } from '@/hooks/useHydrated'
import { downloadCertificatePdf } from '@/services/certificatePdf'
import { exportCertificateToExcel } from '@/services/excelExport'
import { toast } from 'sonner'
import { formatDateDisplay } from '@/lib/id'
import {
  deriveCertificateStatus,
  isReportComplete,
  reportCardStatus,
  reportFor,
  sampleContexts,
} from '@/lib/certificateStatus'
import { CertificateStatusBadge, ReportStatusBadge } from '@/components/certificate-flow/ReportStatusBadge'
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
import type { ReportRecord } from '@/types'

export function CertificateDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const hydrated = useCertificatesHydrated()
  const certificate = useCertificateStore((s) =>
    hydrated ? s.getCertificate(id) : undefined,
  )
  const deleteCertificate = useCertificateStore((s) => s.deleteCertificate)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)
  const caps = getCapabilities(user?.role)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!hydrated) {
    return <div className="p-8">Loading…</div>
  }

  if (!certificate) {
    return (
      <NotFoundState
        backTo="/certificates"
        backLabel="Back to Certificates"
        title="Certificate Not Found"
      />
    )
  }

  const status = deriveCertificateStatus(certificate, heatRecords)
  const snap = certificate.productSnapshot
  const allReports: ReportRecord[] = certificate.selectedHeats.flatMap((s) => s.reportRecords)

  const handleDelete = () => {
    deleteCertificate(certificate.id)
    addLog({ userId: user?.name ?? 'unknown', action: 'cert_deleted', entityType: 'CERTIFICATE', after: { cert: certificate.certificateNumber } })
    toast.success('Certificate deleted')
    navigate('/certificates')
  }

  return (
    <div>
      <PageHeader
        title={certificate.certificateNumber}
        description={snap ? `${snap.sapNo} — ${snap.partNo} · ${snap.description}` : 'Certificate'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {caps.createCertificate ? (
              <Button asChild>
                <Link to={`/certificates/${certificate.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Continue Editing
                </Link>
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={async () => {
                await downloadCertificatePdf(certificate)
                toast.success('PDF downloaded')
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                exportCertificateToExcel(certificate)
                toast.success('Excel exported')
              }}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            {caps.deleteCertificate ? (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="mt-1"><CertificateStatusBadge value={status} /></div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Reports</span>
            <div className="mt-1 text-2xl font-bold">
              {allReports.filter((r) => r.status === 'COMPLETE').length}/{allReports.length}
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Heat Codes</span>
            <div className="mt-1 text-2xl font-bold">{certificate.selectedHeats.length}</div>
            <div className="text-xs text-muted-foreground">
              {certificate.selectedHeats.reduce((n, s) => n + (s.selectedSamples?.length ?? 0), 0)} samples
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Reviewed</span>
            <div className="mt-1 flex items-center gap-1">
              {certificate.reviewed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Yes</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">No</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Key Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-3">
          <div><span className="text-sm text-muted-foreground">SAP No.</span><div className="font-mono text-sm">{snap?.sapNo || '—'}</div></div>
          <div><span className="text-sm text-muted-foreground">Part No.</span><div>{snap?.partNo || '—'}</div></div>
          <div><span className="text-sm text-muted-foreground">Description</span><div>{snap?.description || '—'}</div></div>
          <div><span className="text-sm text-muted-foreground">Material</span><div>{snap?.material || '—'}</div></div>
          <div><span className="text-sm text-muted-foreground">Customer</span><div>{snap?.customer || '—'}</div></div>
          <div><span className="text-sm text-muted-foreground">Date</span><div>{formatDateDisplay(certificate.certificateDate)}</div></div>
          <div><span className="text-sm text-muted-foreground">Invoice No.</span><div>{certificate.invoiceNumber || '—'}</div></div>
          <div><span className="text-sm text-muted-foreground">Delivery Condition</span><div>{certificate.deliveryCondition || '—'}</div></div>
          {certificate.issuedAt ? (
            <div><span className="text-sm text-muted-foreground">Issued At</span><div>{formatDateDisplay(certificate.issuedAt)}</div></div>
          ) : null}
        </CardContent>
      </Card>

      {certificate.remarks ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>Remarks</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{certificate.remarks}</p></CardContent>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Heat Codes & Test Data</CardTitle>
          <p className="text-xs text-muted-foreground">
            Organized by heat code and sample.
          </p>
        </CardHeader>
        <CardContent>
          {certificate.selectedHeats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No heat codes selected yet.</p>
          ) : (
            <div className="space-y-3">
              {certificate.selectedHeats.map((sel) => {
                const rec = heatRecords.find((h) => h.id === sel.heatRecordId)
                const contexts = sampleContexts(sel, heatRecords)
                const requiredSections = (snap?.sections ?? []).filter(
                  (s) => s.required && s.parameters.length > 0,
                )
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
                      {overallComplete ? (
                        <Badge className="bg-green-600 text-white">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>

                    <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
                      {contexts.map((ctx) => {
                        const sample = rec?.heats.find((s) => s.id === ctx.sampleId)
                        return (
                          <div
                            key={ctx.sampleId ?? 'heat-only'}
                            className="flex flex-col rounded-md border"
                          >
                            <div className="flex items-center justify-between border-b bg-muted/40 px-2.5 py-1.5">
                              <span className="font-mono text-xs font-medium">
                                {ctx.sampleId ? `Sample ${sel.heatCode}-${ctx.label}` : 'Heat Code Only'}
                                {sample?.quantity ? (
                                  <span className="ml-1 font-normal text-muted-foreground">· {sample.quantity}</span>
                                ) : null}
                              </span>
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
          )}
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link to="/certificates">All Certificates</Link>
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete certificate{' '}
              <span className="font-semibold">{certificate.certificateNumber}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
