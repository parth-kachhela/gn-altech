import { useRef, useState } from 'react'
import { FileUp, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { extractTextFromFile } from '@/services/pdfExtract'
import { parseReport } from '@/services/reportParser'
import { mergeReportIntoCertificate } from '@/services/reportMerge'
import { createUploadedReport } from '@/lib/factories'
import type { Certificate, ReportType, UploadedReport } from '@/types'
import { SectionCard, StepNav } from '@/components/certificate-wizard/WizardFields'

type DraftSetter = (updater: (d: Certificate) => Certificate) => void

interface UploadStepProps {
  certificate: Certificate
  setDraft: DraftSetter
  onBack: () => void
  onNext: () => void
}

const REPORT_TYPES: Array<{ type: ReportType; label: string; description: string }> = [
  {
    type: 'CHEMICAL',
    label: 'Chemical Analysis',
    description: 'Carbon, Silicon, Manganese, Phosphorus, Sulphur and other elements.',
  },
  {
    type: 'MECHANICAL',
    label: 'Mechanical Properties',
    description: 'Yield, Ultimate Tensile Strength, Elongation and Hardness.',
  },
  {
    type: 'MICRO_STRUCTURE',
    label: 'Micro Structure',
    description: 'Nodularity, Nodule Count, Pearlite / Ferrite and Carbide.',
  },
]

export function UploadStep({ certificate, setDraft, onBack, onNext }: UploadStepProps) {
  const [progress, setProgress] = useState<Record<ReportType, number>>({
    CHEMICAL: 0,
    MECHANICAL: 0,
    MICRO_STRUCTURE: 0,
  })

  const upsertReport = (report: UploadedReport) => {
    setDraft((d) => ({
      ...d,
      reports: [...d.reports.filter((r) => r.reportType !== report.reportType), report],
    }))
  }

  const handleFile = async (file: File, reportType: ReportType) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Please select a PDF file')
      return
    }
    const tempId = `upload-${Date.now()}`
    upsertReport({
      id: tempId,
      reportType,
      fileName: file.name,
      fileSize: file.size,
      parsedText: '',
      parsedValues: {},
      status: 'UPLOADING',
    })
    setProgress((p) => ({ ...p, [reportType]: 0 }))

    try {
      const text = await extractTextFromFile(file, (pct) => {
        setProgress((p) => ({ ...p, [reportType]: pct }))
      })
      setProgress((p) => ({ ...p, [reportType]: 100 }))
      const parsed = parseReport(text)
      const report = createUploadedReport({
        reportType: parsed.reportType,
        fileName: file.name,
        fileSize: file.size,
        parsedText: text,
        parsedValues: parsed.values,
      })
      setDraft((d) => {
        const withReport: Certificate = {
          ...d,
          reports: [...d.reports.filter((r) => r.reportType !== reportType), report],
        }
        return mergeReportIntoCertificate(withReport, parsed)
      })
      toast.success(`${parsed.reportType} report parsed successfully`)
    } catch {
      setDraft((d) => ({
        ...d,
        reports: d.reports.map((r) =>
          r.id === tempId
            ? { ...r, status: 'ERROR', errorMessage: 'Failed to read or parse this PDF.' }
            : r,
        ),
      }))
      toast.error('Failed to parse PDF')
    }
  }

  const removeReport = (id: string) => {
    setDraft((d) => ({ ...d, reports: d.reports.filter((r) => r.id !== id) }))
  }

  const readyCount = REPORT_TYPES.filter(({ type }) =>
    certificate.reports.some((r) => r.reportType === type && r.status === 'READY'),
  ).length

  return (
    <div className="space-y-4">
      {REPORT_TYPES.map(({ type, label, description }) => (
        <ReportCard
          key={type}
          label={label}
          description={description}
          report={certificate.reports.find((r) => r.reportType === type)}
          progress={progress[type]}
          onFile={(file) => handleFile(file, type)}
          onRemove={removeReport}
        />
      ))}

      <StepNav
        onBack={onBack}
        onNext={onNext}
        canNext={readyCount === REPORT_TYPES.length}
        nextLabel="Next: Review & Generate"
      />
    </div>
  )
}

interface ReportCardProps {
  label: string
  description: string
  report?: UploadedReport
  progress: number
  onFile: (file: File) => void
  onRemove: (id: string) => void
}

function ReportCard({ label, description, report, progress, onFile, onRemove }: ReportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <SectionCard title={label} description={description}>
      {!report ? (
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFile(file)
              e.target.value = ''
            }}
          />
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <FileUp className="h-4 w-4 mr-1.5" />
            Upload PDF
          </Button>
          <span className="text-xs text-muted-foreground">Select the {label.toLowerCase()} PDF report.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{report.fileName}</span>
              <span className="text-xs text-muted-foreground">
                {Math.round(report.fileSize / 1024)} KB
              </span>
              <Badge variant={report.status === 'READY' ? 'default' : 'secondary'}>
                {report.status === 'UPLOADING'
                  ? `Uploading ${progress}%`
                  : report.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {report.status === 'READY' || report.status === 'ERROR' ? (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) onFile(file)
                      e.target.value = ''
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                    Replace
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onRemove(report.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Remove
                  </Button>
                </>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {(report.status === 'UPLOADING' || report.status === 'PARSING') && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}

          {report.status === 'ERROR' && report.errorMessage ? (
            <p className="text-sm text-destructive">{report.errorMessage}</p>
          ) : null}

          {report.status === 'READY' && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Show parsed values ({Object.keys(report.parsedValues).length})
              </summary>
              <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {Object.entries(report.parsedValues).map(([k, v]) => (
                  <div key={k} className="rounded border px-2 py-1 text-xs">
                    <span className="font-medium">{k}</span>: {v}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </SectionCard>
  )
}
