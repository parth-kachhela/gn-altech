import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  FilePlus2,
  FileText,
  Factory,
  FlaskConical,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { CertificateStatusBadge } from '@/components/StatusBadge'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useClientStore } from '@/stores/clientStore'
import { useItemStore } from '@/stores/itemStore'
import { useStoresHydrated } from '@/hooks/useHydrated'
import { LoadingPage } from '@/components/EmptyState'
import { toast } from 'sonner'

export function DashboardPage() {
  const navigate = useNavigate()
  const hydrated = useStoresHydrated()
  const certificates = useCertificateStore((s) => s.certificates)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const loadA6ADemo = useCertificateStore((s) => s.loadA6ADemo)

  const stats = useMemo(() => {
    const activeHeat = heatRecords.filter((h) => h.status === 'ACTIVE').length
    const usedHeat = heatRecords.filter((h) => h.status === 'USED').length
    const readyCerts = certificates.filter((c) => c.status === 'READY').length
    const issuedCerts = certificates.filter((c) => c.status === 'ISSUED').length
    const draftCerts = certificates.filter((c) => c.status === 'DRAFT').length
    const reports = certificates.reduce(
      (acc, c) => acc + c.reports.filter((r) => r.status === 'READY').length,
      0,
    )
    return {
      heatTotal: heatRecords.length,
      activeHeat,
      usedHeat,
      certTotal: certificates.length,
      readyCerts,
      issuedCerts,
      draftCerts,
      reports,
    }
  }, [heatRecords, certificates])

  if (!hydrated) return <LoadingPage label="Loading dashboard…" />

  const handleA6A = () => {
    const id = loadA6ADemo()
    toast.success('A6A demo certificate opened')
    navigate(`/certificates/${id}`)
  }

  const recent = [...certificates].slice(0, 6)

  const kpis = [
    {
      label: 'Heat Records',
      value: stats.heatTotal,
      sub: `${stats.activeHeat} active · ${stats.usedHeat} used`,
      icon: Factory,
    },
    {
      label: 'Certificates',
      value: stats.certTotal,
      sub: `${stats.draftCerts} draft · ${stats.readyCerts} ready · ${stats.issuedCerts} issued`,
      icon: FileText,
    },
    {
      label: 'Reports Uploaded',
      value: stats.reports,
      sub: 'chemical / mechanical / micro',
      icon: UploadCloud,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of heat records, certificates and test reports."
        actions={
          <>
            <Button variant="outline" onClick={handleA6A}>
              <Sparkles className="h-4 w-4 text-amber-500" />
              Load A6A Demo
            </Button>
            <Button asChild>
              <Link to="/heat-records/new">
                <Factory className="h-4 w-4" />
                New Heat Record
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/certificates/new">
                <FilePlus2 className="h-4 w-4" />
                New Certificate
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <kpi.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-semibold">{kpi.value}</div>
                <div className="truncate text-sm font-medium">{kpi.label}</div>
                <div className="truncate text-xs text-muted-foreground">{kpi.sub}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent Certificates</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/certificates">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Part</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((c) => {
                const client = useClientStore.getState().getClient(c.clientId)
                const firstItem = c.items?.[0]
                const itemData = firstItem ? useItemStore.getState().getItem(firstItem.itemId) : undefined
                return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/certificates/${c.id}`)}
                >
                  <TableCell className="font-medium">{c.certificateNumber || '—'}</TableCell>
                  <TableCell>{client?.name ?? c.clientId}</TableCell>
                  <TableCell>{itemData?.name ?? firstItem?.itemId ?? '—'}</TableCell>
                  <TableCell>{c.certificateDate}</TableCell>
                  <TableCell>
                    <CertificateStatusBadge value={c.status} />
                  </TableCell>
                </TableRow>
                )
              })}
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No certificates yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demo workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="flex gap-2">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              1. Open the A6A demo certificate (Load A6A Demo).
            </p>
            <p className="flex gap-2">
              <UploadCloud className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              2. Upload the three A6A PDF reports or use the bundled demo reports.
            </p>
            <p className="flex gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              3. Review extracted data, then preview and download PDF / Excel.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">DRAFT</span> — created, awaiting work.
            </p>
            <p>
              <span className="font-medium text-foreground">REPORTS PENDING</span> — one or more
              test reports are missing.
            </p>
            <p>
              <span className="font-medium text-foreground">READY</span> — all three reports parsed.
            </p>
            <p>
              <span className="font-medium text-foreground">ISSUED</span> — certificate issued to
              customer.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
