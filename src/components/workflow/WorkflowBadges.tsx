import { Badge } from '@/components/ui/badge'

export function DeptBadge({ value }: { value: string }) {
  const done = value === 'COMPLETED'
  const review = value === 'NEEDS_REVIEW'
  return (
    <Badge variant={done ? 'default' : 'outline'}>
      {done ? '✓ Completed' : review ? 'Review Required' : '⏳ Pending'}
    </Badge>
  )
}

export function IngestBadge({ status }: { status: string }) {
  if (status === 'MATCHED') return <Badge variant="default">Matched</Badge>
  if (status === 'REVIEW_REQUIRED') return <Badge variant="outline">Review Required</Badge>
  if (status === 'FAILED') return <Badge variant="destructive">Failed</Badge>
  if (status === 'QUEUED') return <Badge variant="secondary">Queued</Badge>
  if (status === 'UPLOADING') return <Badge variant="secondary">Uploading…</Badge>
  if (status === 'PARSING') return <Badge variant="secondary">Processing…</Badge>
  return <Badge variant="secondary">{status}</Badge>
}
