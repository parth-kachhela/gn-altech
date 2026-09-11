import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  FilePlus2,
  FileText,
  Factory,
  ShieldCheck,
  Boxes,
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
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCertificateStore } from '@/stores/certificateStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useDepartmentRequestStore } from '@/stores/departmentRequestStore'
import { useAuthStore } from '@/stores/authStore'
import { getCapabilities, ROLES, ROLE_LABELS } from '@/lib/permissions'
import { useStoresHydrated } from '@/hooks/useHydrated'
import { LoadingPage } from '@/components/EmptyState'
import { deriveCertificateStatus } from '@/lib/certificateStatus'
import { getHeatWorkflow, workflowCounts } from '@/lib/heatWorkflow'
import { DeptBadge } from '@/components/workflow/WorkflowBadges'
import { seedDeptDemo } from '@/data/deptDemoSeed'
import { CertificateStatusBadge } from '@/components/certificate-flow/ReportStatusBadge'
import { toast } from 'sonner'

export function DashboardPage() {
  const navigate = useNavigate()
  const hydrated = useStoresHydrated()
  const certificates = useCertificateStore((s) => s.certificates)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const masters = useProductMasterStore((s) => s.masters)
  const departmentRequests = useDepartmentRequestStore((s) => s.requests)
  const user = useAuthStore((s) => s.user)
  const switchRole = useAuthStore((s) => s.switchRole)
  const caps = getCapabilities(user?.role)

  const stats = useMemo(() => {
    const activeMasters = masters.filter((m) => m.status === 'ACTIVE').length
    const activeHeat = heatRecords.filter((h) => h.status === 'ACTIVE').length
    const statuses = certificates.map((c) => deriveCertificateStatus(c, heatRecords))
    const issued = statuses.filter((s) => s === 'ISSUED').length
    const reviewed = statuses.filter((s) => s === 'REVIEWED').length
    const draft = statuses.filter((s) => s === 'DRAFT').length
    const pending = statuses.filter((s) => s === 'REPORTS_PENDING' || s === 'WAITING_FOR_DEPARTMENT').length
    const reports = certificates.reduce(
      (acc, c) => acc + c.selectedHeats.reduce((a, s) => a + s.reportRecords.length, 0),
      0,
    )
    const openRequests = departmentRequests.filter((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length
    return {
      masterTotal: masters.length,
      activeMasters,
      heatTotal: heatRecords.length,
      activeHeat,
      certTotal: certificates.length,
      issued,
      reviewed,
      draft,
      pending,
      reports,
      openRequests,
    }
  }, [masters, heatRecords, certificates, departmentRequests])

  if (!hydrated) return <LoadingPage label="Loading dashboard…" />

  const recent = [...certificates].slice(0, 6)
  const wf = workflowCounts(heatRecords)
  const isSuper = user?.role === 'SUPER_ADMIN'

  const kpis = [
    {
      label: 'Product Masters',
      value: stats.masterTotal,
      sub: `${stats.activeMasters} active`,
      icon: Boxes,
    },
    {
      label: 'Heat Records',
      value: stats.heatTotal,
      sub: `${stats.activeHeat} active`,
      icon: Factory,
    },
    {
      label: 'Certificates',
      value: stats.certTotal,
      sub: `${stats.draft} draft · ${stats.reviewed} reviewed · ${stats.issued} issued`,
      icon: FileText,
    },
    {
      label: 'Reports',
      value: stats.reports,
      sub: `${stats.openRequests} dept. requests open`,
      icon: UploadCloud,
    },
  ]

  const departments = [
    {
      name: 'Chemical Lab',
      desc: 'Creates heats & parses spectro data',
      statusText: `${wf.chemicalDone} heat(s) entered`,
      home: '/chemical',
      actionLabel: '+ Add Heat',
      actionUrl: '/chemical/add-heat',
      secondaryAction: 'Bulk Upload',
      secondaryUrl: '/chemical/bulk-upload',
      pending: 0,
    },
    {
      name: 'Micro Lab',
      desc: 'Microstructure BMP/PDF analysis',
      statusText: wf.microPending > 0 ? `${wf.microPending} pending reports` : 'All completed',
      home: '/micro',
      actionLabel: 'Upload Reports',
      actionUrl: '/micro/upload',
      secondaryAction: 'View Lab',
      secondaryUrl: '/micro',
      pending: wf.microPending,
    },
    {
      name: 'Tensile Lab',
      desc: 'UTS, Yield & Elongation tests',
      statusText: wf.tensilePending > 0 ? `${wf.tensilePending} pending reports` : 'All completed',
      home: '/tensile',
      actionLabel: 'Upload Reports',
      actionUrl: '/tensile/upload',
      secondaryAction: 'View Lab',
      secondaryUrl: '/tensile',
      pending: wf.tensilePending,
    },
    {
      name: 'Hardness Lab',
      desc: 'BHN hardness measurements',
      statusText: wf.hardnessPending > 0 ? `${wf.hardnessPending} pending reports` : 'All completed',
      home: '/hardness',
      actionLabel: 'Upload Reports',
      actionUrl: '/hardness/upload',
      secondaryAction: 'View Lab',
      secondaryUrl: '/hardness',
      pending: wf.hardnessPending,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of product masters, heat records, certificates and test reports."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ShieldCheck className="h-4 w-4" />
                  {user ? ROLE_LABELS[user.role] : 'Role'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Switch role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ROLES.map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => {
                      switchRole(r)
                      toast.success(`Switched to ${ROLE_LABELS[r]}`)
                    }}
                    className="gap-2"
                  >
                    {user?.role === r ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                    {ROLE_LABELS[r]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {caps.manageProductMaster ? (
              <Button asChild variant="outline">
                <Link to="/product-masters/import">
                  <UploadCloud className="h-4 w-4" />
                  Import Master
                </Link>
              </Button>
            ) : null}
            {caps.createCertificate ? (
              <Button asChild>
                <Link to="/certificates/new">
                  <FilePlus2 className="h-4 w-4" />
                  New Certificate
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Department Workspaces Grid */}
      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Testing Departments</h2>
            <p className="text-xs text-muted-foreground">Direct access to upload and review lab reports</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/departments">
              Department Testing View <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {departments.map((dept) => (
            <Card key={dept.name} className="flex flex-col justify-between transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{dept.name}</CardTitle>
                  {dept.pending > 0 ? (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400 text-[10px]">
                      {dept.pending} pending
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{dept.desc}</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="text-xs font-medium">{dept.statusText}</div>
                <div className="flex items-center gap-1.5 pt-1">
                  <Button asChild size="sm" className="h-7 text-xs flex-1">
                    <Link to={dept.actionUrl}>{dept.actionLabel}</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link to={dept.secondaryUrl}>{dept.secondaryAction}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="mt-5">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Heat Workflow — Chemical → Micro / Tensile / Hardness → Certificate</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/heat-records">View all <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isSuper ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Total {wf.total} · Chemical done {wf.chemicalDone} · Micro pending {wf.microPending} · Tensile pending {wf.tensilePending} · Hardness pending {wf.hardnessPending} · Ready {wf.ready} · Issued {stats.issued}</span>
              {wf.total === 0 ? (
                <Button size="sm" variant="outline" onClick={() => { seedDeptDemo(user?.name ?? 'admin'); toast.success('Demo data loaded'); }}>Load demo data</Button>
              ) : null}
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Heat Code</TableHead>
                <TableHead>SAP Code</TableHead>
                <TableHead>Chemical</TableHead>
                <TableHead>Micro</TableHead>
                <TableHead>Tensile</TableHead>
                <TableHead>Hardness</TableHead>
                <TableHead>Certificate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heatRecords.slice(0, 12).map((h) => {
                const w = getHeatWorkflow(h)
                return (
                  <TableRow key={h.id} className="cursor-pointer" onClick={() => navigate(`/heat-records/${h.id}`)}>
                    <TableCell className="font-mono font-medium">{h.heatCode}</TableCell>
                    <TableCell className="font-mono text-xs">{h.sapNo}</TableCell>
                    <TableCell><DeptBadge value={w.chemical} /></TableCell>
                    <TableCell><DeptBadge value={w.micro} /></TableCell>
                    <TableCell><DeptBadge value={w.tensile} /></TableCell>
                    <TableCell><DeptBadge value={w.hardness} /></TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold ${w.certificateReady ? 'text-green-700' : 'text-muted-foreground'}`}>
                        {w.certificateReady ? 'Ready' : 'Waiting'}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
              {heatRecords.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No heats yet. Chemical creates the first heat, or load demo data above.</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                <TableHead>SAP No.</TableHead>
                <TableHead>Part / Description</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((c) => {
                const status = deriveCertificateStatus(c, heatRecords)
                const snap = c.productSnapshot
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/certificates/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.certificateNumber || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{snap?.sapNo || '—'}</TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {snap?.partNo} · {snap?.description}
                    </TableCell>
                    <TableCell>{snap?.customer || '—'}</TableCell>
                    <TableCell>{c.certificateDate}</TableCell>
                    <TableCell>
                      <CertificateStatusBadge value={status} />
                    </TableCell>
                  </TableRow>
                )
              })}
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No certificates yet. Import the master workbook and create one to get started.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
