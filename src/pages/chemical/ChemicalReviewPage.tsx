import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useStoresHydrated } from '@/hooks/useHydrated'
import { LoadingPage } from '@/components/EmptyState'
import { DeptBadge } from '@/components/workflow/WorkflowBadges'
import { getHeatWorkflow } from '@/lib/heatWorkflow'

export function ChemicalReviewPage({ mode }: { mode: 'review' | 'completed' }) {
  const hydrated = useStoresHydrated()
  const heats = useHeatRecordStore((s) => s.heatRecords)
  if (!hydrated) return <LoadingPage label="Loading…" />
  const list = heats.filter((h) => {
    const w = getHeatWorkflow(h)
    return mode === 'completed' ? w.chemical === 'COMPLETED' : w.chemical !== 'COMPLETED'
  })
  return (
    <div>
      <PageHeader title={mode === 'completed' ? 'Completed Heats' : 'Pending Review'}
        description={mode === 'completed' ? 'Chemical completed — waiting on other departments.' : 'Heats needing chemical review.'}
        actions={<Button asChild variant="outline"><Link to="/chemical/bulk-upload">Bulk upload</Link></Button>} />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Heat</TableHead><TableHead>SAP</TableHead><TableHead>Chemical</TableHead><TableHead>Open</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-mono">{h.heatCode}</TableCell>
                <TableCell className="font-mono text-xs">{h.sapNo}</TableCell>
                <TableCell><DeptBadge value={getHeatWorkflow(h).chemical} /></TableCell>
                <TableCell><Button size="sm" variant="outline" asChild><Link to={`/heat-records/${h.id}`}>View</Link></Button></TableCell>
              </TableRow>
            ))}
            {list.length === 0 ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nothing here.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
