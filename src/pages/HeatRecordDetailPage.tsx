import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FilePlus2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/PageHeader'
import { NotFoundState, LoadingPage } from '@/components/EmptyState'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordsHydrated } from '@/hooks/useHydrated'
import { toast } from 'sonner'

function DetailRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  )
}

export function HeatRecordDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const hydrated = useHeatRecordsHydrated()
  const record = useHeatRecordStore((s) => (hydrated ? s.getHeatRecord(id) : undefined))
  const masters = useProductMasterStore((s) => s.masters)
  const master = record
    ? masters.find((m) => m.sapNo.toLowerCase() === record.sapNo.toLowerCase())
    : undefined

  if (!hydrated) return <LoadingPage label="Loading heat record…" />

  if (!record) {
    return (
      <NotFoundState
        backTo="/heat-records"
        backLabel="Back to Heat Records"
        title="Heat Record Not Found"
      />
    )
  }

  const demoCount = Object.keys(record.demoReports ?? {}).length

  const sampleGroups: Array<{ sampleId?: string; label: string; quantity?: string }> = [
    { sampleId: undefined, label: 'Heat Code Only', quantity: undefined },
    ...record.heats.map((s) => ({ sampleId: s.id, label: s.label, quantity: s.quantity })),
  ]

  const knownSampleIds = new Set(record.heats.map((s) => s.id))
  const unlinkedIds = Array.from(
    new Set(
      (record.reports ?? [])
        .map((r) => r.sampleId)
        .filter((id): id is string => id !== undefined && !knownSampleIds.has(id)),
    ),
  )
  for (const sid of unlinkedIds) {
    const label = record.reports?.find((r) => r.sampleId === sid)?.sampleLabel ?? sid
    sampleGroups.push({ sampleId: sid, label, quantity: undefined })
  }

  const sectionList = (() => {
    const map = new Map<string, string>()
    for (const s of master?.sections ?? []) map.set(s.key, s.name)
    for (const r of record.reports ?? []) if (!map.has(r.sectionKey)) map.set(r.sectionKey, r.sectionName)
    for (const r of record.requests ?? []) if (!map.has(r.sectionKey)) map.set(r.sectionKey, r.sectionName)
    return Array.from(map.entries()).map(([key, name]) => ({ key, name }))
  })()

  return (
    <div>
      <PageHeader
        title={`${record.sapNo} / ${record.heatCode}`}
        description={master ? `${master.partNo} · ${master.description} · ${master.material}` : ''}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                toast.info('Create a certificate and search this SAP to select this heat.')
                navigate('/certificates/new')
              }}
            >
              <FilePlus2 className="h-4 w-4" />
              Use in Certificate
            </Button>
            <Button asChild>
              <Link to={`/heat-records/${record.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Product</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="SAP No." value={record.sapNo} mono />
            <DetailRow label="Part No." value={master?.partNo} />
            <DetailRow label="Description" value={master?.description} />
            <DetailRow label="Material" value={master?.material} />
            <DetailRow label="Customer" value={master?.customer} />
            <DetailRow label="Master Rev" value={master ? `v${master.revision}` : undefined} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Heat</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Heat Code" value={record.heatCode} mono />
            <DetailRow label="Batch No." value={record.batchNo} mono />
            <DetailRow label="Quantity" value={record.quantity} />
            <DetailRow label="Date" value={record.date} />
            <div className="flex items-center justify-between border-b py-2 last:border-0">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={record.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {record.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <DetailRow label="Demo Reports" value={demoCount ? `${demoCount} linked` : undefined} />
            <DetailRow label="Created" value={new Date(record.createdAt).toLocaleDateString()} />
            <DetailRow label="Updated" value={new Date(record.updatedAt).toLocaleDateString()} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Heat Samples</CardTitle>
        </CardHeader>
        <CardContent>
          {record.heats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No samples added.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {record.heats.map((s) => (
                <Badge key={s.id} variant="outline" className="px-3 py-1 font-mono">
                  {record.heatCode}-{s.label}
                  {s.quantity ? ` · ${s.quantity}` : ''}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Department Report Requests</CardTitle>
          <p className="text-xs text-muted-foreground">Organized by heat code and sample.</p>
        </CardHeader>
        <CardContent>
          {record.requests?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No department requests configured.</p>
          ) : (
            <div className="space-y-3">
              {sampleGroups.map((group) => {
                const reqs = (record.requests ?? []).filter((r) => r.sampleId === group.sampleId)
                if (reqs.length === 0) return null
                return (
                  <div key={group.sampleId ?? 'only'} className="rounded-md border">
                    <div className="flex items-center justify-between border-b bg-muted/40 px-2.5 py-1.5">
                      <span className="font-mono text-xs font-medium">
                        {group.sampleId ? `Sample ${record.heatCode}-${group.label}` : 'Heat Code Only'}
                      </span>
                      <span className="text-xs text-muted-foreground">{reqs.length} request(s)</span>
                    </div>
                    <div className="space-y-1.5 p-2.5">
                      {reqs.map((r) => (
                        <div
                          key={r.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border bg-muted/30 px-2 py-1 text-sm"
                        >
                          <span className="truncate">
                            {r.sectionName} → {r.department}
                          </span>
                          <Badge variant={r.status === 'UPLOADED' || r.status === 'REVIEWED' ? 'default' : 'outline'}>
                            {r.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Report Data</CardTitle>
          <p className="text-xs text-muted-foreground">Organized by heat code and sample.</p>
        </CardHeader>
        <CardContent>
          {(record.reports?.length ?? 0) === 0 && (record.requests?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No report data submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {sampleGroups.map((group) => {
                const reports = (record.reports ?? []).filter((r) => r.sampleId === group.sampleId)
                const requests = (record.requests ?? []).filter((r) => r.sampleId === group.sampleId)
                if (reports.length === 0 && requests.length === 0) return null
                const groupSections = sectionList.filter(({ key }) => {
                  const hasData =
                    reports.some((r) => r.sectionKey === key) ||
                    requests.some((r) => r.sectionKey === key)
                  const required = master?.sections.some((s) => s.key === key && s.required)
                  return hasData || Boolean(required)
                })
                return (
                  <div key={group.sampleId ?? 'only'} className="rounded-md border bg-background">
                    <div className="flex items-center justify-between border-b bg-muted/40 px-2.5 py-1.5">
                      <span className="font-mono text-xs font-medium">
                        {group.sampleId ? `Sample ${record.heatCode}-${group.label}` : 'Heat Code Only'}
                        {group.quantity ? (
                          <span className="ml-1 font-normal text-muted-foreground">· {group.quantity}</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">{reports.length} report(s)</span>
                    </div>
                    <div className="space-y-2.5 p-2.5">
                      {groupSections.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No sections configured.</p>
                      ) : (
                        groupSections.map((section) => {
                          const rep = reports.find((r) => r.sectionKey === section.key)
                          const req = requests.find((r) => r.sectionKey === section.key)
                          const hasValues = rep && rep.parsedValues.length > 0
                          return (
                            <div key={section.key}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {section.name}
                                </p>
                                {hasValues ? (
                                  <Badge variant={rep.confirmed ? 'default' : 'outline'}>
                                    {rep.confirmed ? 'Confirmed' : (rep.status ?? 'Pending').replace('_', ' ')}
                                  </Badge>
                                ) : req ? (
                                  <Badge variant="outline">{req.status.replace('_', ' ')}</Badge>
                                ) : (
                                  <span className="text-[10px] uppercase text-muted-foreground">No data</span>
                                )}
                              </div>
                              {hasValues ? (
                                <>
                                  <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                                    {rep.parsedValues.map((pv, i) => (
                                      <div key={i} className="flex items-baseline justify-between gap-2 text-xs">
                                        <dt className="truncate text-muted-foreground">{pv.name}</dt>
                                        <dd className="font-mono font-medium">
                                          {pv.value}
                                          {pv.unit ? ` ${pv.unit}` : ''}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                  {rep.uploadedBy || rep.fileMetadata ? (
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                      {rep.fileMetadata?.fileName ?? 'Report'}
                                      {rep.uploadedBy ? ` by ${rep.uploadedBy}` : ''}
                                      {rep.uploadedAt ? ` · ${new Date(rep.uploadedAt).toLocaleString()}` : ''}
                                    </p>
                                  ) : null}
                                </>
                              ) : req ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Requested from {req.department}
                                </p>
                              ) : null}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-5">
        <Button variant="ghost" asChild>
          <Link to="/heat-records">
            <ArrowLeft className="h-4 w-4" />
            Back to Heat Records
          </Link>
        </Button>
      </div>
    </div>
  )
}
