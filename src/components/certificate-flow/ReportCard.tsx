import { useRef, useState } from 'react'
import { AlertTriangle, FileUp, FlaskConical, Loader2, Repeat, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportStatusBadge, SourceBadge } from '@/components/certificate-flow/ReportStatusBadge'
import { validateValue } from '@/lib/validation'
import { matchParameter } from '@/lib/validation'
import type { MasterSection, ParsedValue, ReportRecord } from '@/types'

export interface ReportCardProps {
  section: MasterSection
  report?: ReportRecord
  heatCode: string
  sampleLabel?: string
  onUpload: (file: File) => void
  onRequestDepartment: () => void
  onRepeatPrevious: () => void
  onNearAround: () => void
  onOpenReview: (report: ReportRecord) => void
  onEditValues: (report: ReportRecord) => void
  onRepeatUpper?: () => void
  parsing?: boolean
  canRepeatPrevious?: boolean
}

export function ReportCard({
  section,
  report,
  heatCode,
  sampleLabel,
  onUpload,
  onRequestDepartment,
  onRepeatPrevious,
  onNearAround,
  onOpenReview,
  onEditValues,
  onRepeatUpper,
  parsing,
  canRepeatPrevious = true,
}: ReportCardProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setBusy(true)
    try {
      await onUpload(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process report')
    } finally {
      setBusy(false)
    }
  }

  const status = report?.status ?? (section.required && section.parameters.length > 0 ? 'NOT_STARTED' : 'OPTIONAL')

  const specFailures =
    report && report.confirmed
      ? report.parsedValues.filter((pv) => {
          const param = section.parameters.find((p) => matchParameter(p, pv.name))
          return param ? validateValue(param, pv.value).result === 'FAIL' : false
        }).length
      : 0

  return (
    <Card className={report?.status === 'FAILED_SPEC' ? 'border-destructive/60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">{section.name || section.key}</CardTitle>
            <Badge variant="outline" className="font-mono text-[10px]">{section.key}</Badge>
            {sampleLabel ? <Badge variant="secondary" className="font-mono text-[10px]">{sampleLabel}</Badge> : null}
          </div>
          <ReportStatusBadge value={status} />
        </div>
        {heatCode ? <p className="text-xs text-muted-foreground">Heat: <span className="font-mono">{heatCode}</span></p> : null}
      </CardHeader>

      <CardContent className="space-y-2">
        {error ? (
          <p className="flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700">
            <AlertTriangle className="h-3 w-3" /> {error}
          </p>
        ) : null}

        {parsing || busy ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Parsing report…
          </div>
        ) : null}

        {report ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <SourceBadge value={report.sourceType} />
              {report.fileMetadata ? (
                <span className="truncate text-xs text-muted-foreground">{report.fileMetadata.fileName}</span>
              ) : null}
            </div>

            {report.confirmed && report.parsedValues.length > 0 ? (
              <div className="space-y-1">
                {report.parsedValues.map((pv, i) => (
                  <ValueRow key={i} pv={pv} section={section} />
                ))}
              </div>
            ) : report.parsedValues.length > 0 ? (
              <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenReview(report)}>
                Review {report.parsedValues.length} parsed value(s)
              </Button>
            ) : null}

            {report.confirmed && report.parsedValues.length > 0 ? (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onEditValues(report)}>
                Edit values
              </Button>
            ) : null}

            {specFailures > 0 ? (
              <p className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/20">
                <AlertTriangle className="h-3 w-3" />
                {specFailures} value(s) out of specification
              </p>
            ) : null}
          </div>
        ) : null}

        {!report && section.required && section.parameters.length > 0 ? (
          <p className="text-xs text-muted-foreground">No report uploaded yet.</p>
        ) : null}
        {!section.required || section.parameters.length === 0 ? (
          <p className="text-xs text-muted-foreground">Optional section — no report required.</p>
        ) : null}

        <div className="flex flex-wrap gap-1.5 pt-1">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={section.fileTypeHint?.toLowerCase().includes('bmp') ? '.bmp,.png,.jpg,.jpeg' : '.pdf,.bmp,.png,.jpg,.jpeg'}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={parsing}>
            <FileUp className="h-3.5 w-3.5" />
            Upload
          </Button>
          {canRepeatPrevious ? (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRepeatPrevious} disabled={parsing}>
              <Repeat className="h-3.5 w-3.5" />
              Repeat Previous
            </Button>
          ) : null}
          {onRepeatUpper ? (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRepeatUpper} disabled={parsing}>
              <Repeat className="h-3.5 w-3.5" />
              Repeat Upper
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onNearAround} disabled={parsing}>
            <Sparkles className="h-3.5 w-3.5" />
            Near Around
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onRequestDepartment} disabled={parsing}>
            <Send className="h-3.5 w-3.5" />
            Request to Department
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ValueRow({ pv, section }: { pv: ParsedValue; section: MasterSection }) {
  const param = section.parameters.find((p) => matchParameter(p, pv.name))
  const outcome = param ? validateValue(param, pv.value) : undefined
  const result = outcome?.result ?? 'NOT_VALIDATED'
  const color =
    result === 'PASS' || result === 'TEXT_MATCH'
      ? 'text-emerald-600'
      : result === 'FAIL'
        ? 'text-red-600'
        : result === 'WARNING'
          ? 'text-amber-600'
          : 'text-muted-foreground'
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1 text-xs">
      <span className="font-medium">{pv.name}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono">{pv.value}</span>
        {pv.unit ? <span className="text-muted-foreground">{pv.unit}</span> : null}
        <span className={`font-semibold ${color}`}>{result}</span>
      </span>
    </div>
  )
}
