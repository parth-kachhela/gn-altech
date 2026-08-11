import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileCheck2, FileSpreadsheet, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import { completionSummary, deriveCertificateStatus } from '@/lib/certificateStatus'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { downloadCertificatePdf } from '@/services/certificatePdf'
import { exportCertificateToExcel } from '@/services/excelExport'
import { CertificateStatusBadge } from '@/components/certificate-flow/ReportStatusBadge'

export function IssueStep({
  certId,
  onBack,
}: {
  certId: string
  onBack: () => void
}) {
  const navigate = useNavigate()
  const cert = useCertificateStore((s) => (certId ? s.getCertificate(certId) : undefined))
  const markReviewed = useCertificateStore((s) => s.markReviewed)
  const issueCertificate = useCertificateStore((s) => s.issueCertificate)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)

  const [confirmOpen, setConfirmOpen] = useState(false)

  const summary = useMemo(() => (cert ? completionSummary(cert, heatRecords) : null), [cert, heatRecords])
  const derived = cert ? deriveCertificateStatus(cert, heatRecords) : 'DRAFT'

  if (!cert || !summary) return null

  const ready = derived === 'READY_FOR_REVIEW' || derived === 'REVIEWED' || derived === 'ISSUED'
  const hasFailures = summary.failed > 0

  const handleReview = () => {
    if (!cert) return
    markReviewed(cert.id)
    addLog({ userId: user?.name ?? 'unknown', action: 'cert_reviewed', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber } })
    toast.success('Certificate marked as reviewed')
  }

  const handleIssue = () => {
    if (!cert) return
    issueCertificate(cert.id)
    addLog({ userId: user?.name ?? 'unknown', action: 'cert_issued', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber } })
    setConfirmOpen(false)
    toast.success('Certificate issued')
    navigate('/certificates')
  }

  const downloadPdf = async () => {
    if (!cert) return
    await downloadCertificatePdf(cert)
    addLog({ userId: user?.name ?? 'unknown', action: 'cert_pdf_downloaded', entityType: 'CERTIFICATE', after: { cert: cert.certificateNumber } })
  }

  const downloadExcel = () => {
    if (!cert) return
    exportCertificateToExcel(cert)
    toast.success('Excel exported')
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Confirm & Issue</CardTitle>
            <CertificateStatusBadge value={derived} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Certificate</div>
              <div className="mt-1 font-mono font-semibold">{cert.certificateNumber}</div>
              <div className="text-xs text-muted-foreground">{cert.certificateDate}</div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Product</div>
              <div className="mt-1 font-mono font-semibold">{cert.productSnapshot.sapNo}</div>
              <div className="text-xs text-muted-foreground">
                {cert.productSnapshot.partNo} · {cert.productSnapshot.description}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>{summary.required} required</Badge>
            <Badge variant="secondary">{summary.complete} complete</Badge>
            {summary.failed > 0 ? <Badge variant="destructive">{summary.failed} failed spec</Badge> : null}
            {summary.warnings > 0 ? <Badge variant="outline">{summary.warnings} warnings</Badge> : null}
            <Badge variant="outline">{cert.selectedHeats.length} heat code(s)</Badge>
          </div>

          {hasFailures ? (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20">
              This certificate contains values outside the master specification. Issuing is still
              allowed but should be reviewed with the customer before dispatch.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadPdf}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={downloadExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={handleReview} disabled={cert.reviewed}>
            <ShieldCheck className="h-4 w-4" />
            {cert.reviewed ? 'Reviewed' : 'Mark as Reviewed'}
          </Button>
          <Button onClick={() => setConfirmOpen(true)}>
            <FileCheck2 className="h-4 w-4" />
            Issue Certificate
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="ghost" onClick={() => navigate('/certificates')}>
          Save & Exit
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              Issuing this certificate as <span className="font-semibold">{cert.certificateNumber}</span>{' '}
              and records the issue time. The certificate remains editable and can be issued again if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleIssue} disabled={!ready}>
              {ready ? 'Issue Certificate' : 'Reports Incomplete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
