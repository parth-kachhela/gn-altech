import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { LoadLabDemoButton } from '@/components/workflow/LoadLabDemoButton'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useStoresHydrated } from '@/hooks/useHydrated'
import { LoadingPage } from '@/components/EmptyState'
import { DeptBadge } from '@/components/workflow/WorkflowBadges'
import { getHeatWorkflow } from '@/lib/heatWorkflow'

export function ChemicalDashboardPage() {
  const hydrated = useStoresHydrated()
  const heats = useHeatRecordStore((s) => s.heatRecords)
  const stats = useMemo(() => {
    let done = 0, pending = 0
    for (const h of heats) {
      if (getHeatWorkflow(h).chemical === 'COMPLETED') done++
      else pending++
    }
    return { total: heats.length, done, pending }
  }, [heats])
  if (!hydrated) return <LoadingPage label="Loading chemical dashboard…" />
  return (
    <div>
      <PageHeader title="Chemical Department" description="Create heats first — Micro, Tensile and Hardness receive automatic pending requests."
        actions={<><LoadLabDemoButton /><Button asChild variant="outline"><Link to="/chemical/add-heat">Add Heat</Link></Button><Button asChild><Link to="/chemical/bulk-upload">Bulk Chemical Upload</Link></Button></>} />
      <div className="grid gap-4 sm:grid-cols-3">
        {[{ label: 'Total Heats', value: stats.total }, { label: 'Chemical Completed', value: stats.done }, { label: 'Pending Review', value: stats.pending }].map((k) => (
          <Card key={k.label}><CardContent className="p-4"><div className="text-2xl font-semibold">{k.value}</div><div className="text-sm text-muted-foreground">{k.label}</div></CardContent></Card>
        ))}
      </div>
      <Card className="mt-4"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Heat Code</TableHead><TableHead>SAP Code</TableHead><TableHead>Chemical</TableHead><TableHead>Micro / Tensile / Hardness</TableHead></TableRow></TableHeader>
          <TableBody>
            {heats.slice(0, 30).map((h) => {
              const w = getHeatWorkflow(h)
              return (
                <TableRow key={h.id}>
                  <TableCell className="font-mono font-medium">{h.heatCode}</TableCell>
                  <TableCell className="font-mono text-xs">{h.sapNo}</TableCell>
                  <TableCell><DeptBadge value={w.chemical} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {w.micro === 'COMPLETED' ? '✓' : '⏳'} Micro · {w.tensile === 'COMPLETED' ? '✓' : '⏳'} Tensile · {w.hardness === 'COMPLETED' ? '✓' : '⏳'} Hardness
                  </TableCell>
                </TableRow>
              )
            })}
            {heats.length === 0 ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No heats yet. Add one or bulk-upload chemical PDFs.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
