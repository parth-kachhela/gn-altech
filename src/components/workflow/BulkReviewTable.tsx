import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IngestBadge } from '@/components/workflow/WorkflowBadges'
import { ReportReviewDialog } from '@/components/workflow/ReportReviewDialog'
import type { IngestItem } from '@/services/bulkIngest'

export function BulkReviewTable({
  items, onChange, onAcceptAll, onSubmitAll, submitting, onRetry,
}: {
  items: IngestItem[]
  onChange: (id: string, patch: Partial<IngestItem>) => void
  onAcceptAll: () => void
  onSubmitAll: () => void
  submitting: boolean
  onRetry?: (id: string) => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  if (items.length === 0) return null
  const done = items.filter((i) => i.status === 'MATCHED' || i.status === 'REVIEW_REQUIRED').length
  const active = editing ? items.find((i) => i.id === editing) ?? null : null
  // Heats appearing more than once (same SAP + heat) read as one heat with samples.
  const dupKeys = new Set(
    items
      .filter((i) => i.sapCode && i.heatCode)
      .map((i) => `${i.sapCode.toUpperCase()}::${i.heatCode.toUpperCase()}`),
  )
  const counts = new Map<string, number>()
  for (const k of dupKeys) counts.set(k, items.filter((i) => `${i.sapCode.toUpperCase()}::${i.heatCode.toUpperCase()}` === k).length)
  const isDup = (sap: string, heat: string) => (counts.get(`${sap.toUpperCase()}::${heat.toUpperCase()}`) ?? 0) > 1
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onAcceptAll}>Accept all matched</Button>
        <Button size="sm" onClick={onSubmitAll} disabled={submitting}>
          {submitting ? 'Submitting…' : `Submit all (${done}/${items.length} ready)`}
        </Button>
        <span className="text-xs text-muted-foreground">Files process one by one (~10s each) — the rest wait in queue.</span>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>SAP Code</TableHead>
              <TableHead>Heat Code</TableHead>
              <TableHead>Sample</TableHead>
              <TableHead>Values</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow key={it.id}>
                <TableCell className="max-w-[180px]">
                  <div className="truncate font-mono text-xs">{it.file.name}</div>
                  {(it.status === 'PARSING' || it.status === 'UPLOADING') ? (
                    <div className="mt-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${it.progress}%` }} />
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">{it.stage ?? 'Processing…'} {it.progress}%</div>
                    </div>
                  ) : null}
                  {it.status === 'QUEUED' ? (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">Waiting in queue — #{idx + 1}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs">{it.sapCode || '—'}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs">{it.heatCode || '—'}</span>
                </TableCell>
                <TableCell>
                  {it.assignedSample ? (
                    <Badge variant="default" title={`Sample ${it.assignedSample} of heat ${it.heatCode}`}>{it.assignedSample}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground" title={it.sapCode && it.heatCode && isDup(it.sapCode, it.heatCode) ? 'Waiting for codes…' : 'Heat-level report'}>
                      {it.status === 'QUEUED' || it.status === 'UPLOADING' || it.status === 'PARSING' ? '…' : '—'}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {it.status === 'QUEUED' ? 'Pending…' : it.values.length > 0
                    ? `${it.values.length} values · ${Math.round(it.confidence * 100)}%${it.demoMatch ? ' · demo file' : ''}`
                    : it.status === 'FAILED' ? 'Failed — retry' : 'No values — enter manually'}
                </TableCell>
                <TableCell><IngestBadge status={it.status} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {it.status === 'FAILED' && onRetry ? (
                      <Button size="sm" variant="outline" onClick={() => onRetry(it.id)}>Retry</Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={it.status === 'QUEUED' || it.status === 'PARSING' || it.status === 'UPLOADING'}
                        onClick={() => setEditing(it.id)}>
                        Review
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Review opens as a dialog ON the report — table stays in place. */}
      <ReportReviewDialog
        item={active ? {
          fileName: active.file.name, file: active.file,
          sapCode: active.sapCode, heatCode: active.heatCode,
          values: active.values, valueSource: active.valueSource,
          message: active.message, demoMatch: active.demoMatch,
        } : null}
        onClose={() => {
          // Mark reviewed rows with confirmed ids as MATCHED
          if (active && active.sapCode && active.heatCode && active.status === 'REVIEW_REQUIRED') {
            onChange(active.id, { status: 'MATCHED' })
          }
          setEditing(null)
        }}
        onChange={(p) => {
          if (!active) return
          const next = { ...active, ...p }
          onChange(active.id, {
            sapCode: next.sapCode, heatCode: next.heatCode,
            values: next.values, valueSource: next.valueSource,
            status: next.sapCode && next.heatCode ? 'MATCHED' as const : active.status,
          })
        }}
      />
    </div>
  )
}
