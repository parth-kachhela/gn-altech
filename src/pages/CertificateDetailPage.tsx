import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  Pencil,
  Trash2,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { NotFoundState } from '@/components/EmptyState'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useClientStore } from '@/stores/clientStore'
import { useItemStore } from '@/stores/itemStore'
import { useCertificatesHydrated } from '@/hooks/useHydrated'
import { downloadCertificatePdf } from '@/services/certificatePdf'
import { exportCertificateToExcel } from '@/services/excelExport'
import { toast } from 'sonner'
import { formatDateDisplay } from '@/lib/id'
import { CertificateStatusBadge } from '@/components/StatusBadge'
import {
  AdditionalTestsEditor,
  TestParameterTable,
} from '@/components/certificate-wizard/TestTables'
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
import type { Certificate } from '@/types'

export function CertificateDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const hydrated = useCertificatesHydrated()
  const certificate = useCertificateStore((s) =>
    hydrated ? s.getCertificate(id) : undefined,
  )
  const deleteCertificate = useCertificateStore((s) => s.deleteCertificate)
  const upsertCertificate = useCertificateStore((s) => s.upsertCertificate)
  const clients = useClientStore((s) => s.clients)
  const items = useItemStore((s) => s.items)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)

  const [draft, setDraft] = useState<Certificate | null>(certificate ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setDraft(certificate ?? null)
  }, [certificate?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const client = clients.find((c) => c.id === certificate.clientId)
  const readyReports = certificate.reports.filter((r) => r.status === 'READY').length

  const handleSave = () => {
    if (!draft) return
    upsertCertificate(draft)
    toast.success('Certificate updated')
  }

  const handleDelete = () => {
    deleteCertificate(certificate.id)
    toast.success('Certificate deleted')
    navigate('/certificates')
  }

  return (
    <div>
      <PageHeader
        title={certificate.certificateNumber}
        description={`Certificate for ${client?.name ?? certificate.clientId}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link to={`/certificates/${certificate.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await downloadCertificatePdf(certificate)
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
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Certificate Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="mt-1"><CertificateStatusBadge value={certificate.status} /></div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Reports Ready</span>
            <div className="mt-1 text-2xl font-bold">{readyReports}/3</div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Overall Result</span>
            <div className="mt-1"><CertificateStatusBadge value={certificate.status} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Key Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-3">
          <div><span className="text-sm text-muted-foreground">Certificate No.</span><div>{certificate.certificateNumber}</div></div>
          <div><span className="text-sm text-muted-foreground">Date</span><div>{formatDateDisplay(certificate.certificateDate)}</div></div>
          <div><span className="text-sm text-muted-foreground">Client</span><div>{client?.name ?? certificate.clientId}</div></div>
          <div><span className="text-sm text-muted-foreground">Material</span><div>{certificate.material ?? '—'}</div></div>
          <div><span className="text-sm text-muted-foreground">Grade</span><div>{certificate.grade ?? '—'}</div></div>
          <div><span className="text-sm text-muted-foreground">Format</span><div>{certificate.formatNumber ?? '—'}</div></div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Items & Heat Records</CardTitle></CardHeader>
        <CardContent>
          {certificate.items.map((item) => {
            const itemData = items.find((i) => i.id === item.itemId)
            return (
              <div key={item.id} className="mb-3 last:mb-0">
                <div className="font-medium">
                  {itemData?.name ?? item.itemId} — {itemData?.partNumber ?? '—'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Material: {itemData?.material ?? '—'} | Grade: {itemData?.grade ?? '—'} | Qty: {item.quantity}
                </div>
                {item.heatRecordIds.map((hrId) => {
                  const hrLink = certificate.heatRecords.find((hr) => hr.id === hrId)
                  if (!hrLink) return null
                  const hr = heatRecords.find((h) => h.id === hrLink.heatRecordId)
                  return (
                    <div key={hrId} className="mt-1 text-sm">
                      • Heat: {hr?.dailyHeatNumber ?? hrLink.heatRecordId} | Qty: {hrLink.quantity}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TestParameterTable
            title="Chemical Analysis"
            rows={draft?.chemicalRows ?? []}
            onChange={(rows) =>
              setDraft((d) => (d ? { ...d, chemicalRows: rows } : d))
            }
          />
          <TestParameterTable
            title="Mechanical Properties"
            rows={draft?.mechanicalRows ?? []}
            onChange={(rows) =>
              setDraft((d) => (d ? { ...d, mechanicalRows: rows } : d))
            }
          />
          <TestParameterTable
            title="Micro Structure"
            rows={draft?.microStructureRows ?? []}
            onChange={(rows) =>
              setDraft((d) => (d ? { ...d, microStructureRows: rows } : d))
            }
          />
          <AdditionalTestsEditor
            rows={draft?.additionalTests ?? []}
            onChange={(rows) =>
              setDraft((d) => (d ? { ...d, additionalTests: rows } : d))
            }
          />
          <div className="flex justify-end">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {certificate.reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <span className="font-medium">{report.fileName}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{Math.round(report.fileSize / 1024)} KB</span>
                </div>
                <Badge variant={report.status === 'READY' ? 'default' : 'secondary'}>{report.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link to="/certificates">
          <FileDown className="h-4 w-4 mr-2" />
          All Certificates
        </Link>
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
