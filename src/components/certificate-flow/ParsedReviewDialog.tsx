import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ParameterResultBadge, SourceBadge } from '@/components/certificate-flow/ReportStatusBadge'
import { validateValue } from '@/lib/validation'
import { matchParameter } from '@/lib/validation'
import type { MasterSection, ParsedValue, SourceType } from '@/types'

export function ParsedReviewDialog({
  open,
  title,
  section,
  values,
  sourceType,
  warnings,
  detected,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  section: MasterSection
  values: ParsedValue[]
  sourceType: SourceType
  warnings: string[]
  detected?: {
    sapNo?: string
    heatCode?: string
    heatSample?: string
    partNo?: string
    customer?: string
    material?: string
  }
  onClose: () => void
  onConfirm: (values: ParsedValue[]) => void
}) {
  const [editable, setEditable] = useState<ParsedValue[]>(values)
  useEffect(() => {
    setEditable(values.map((v) => ({ ...v })))
  }, [values, open])

  const rows = useMemo(() => {
    return editable.map((pv) => {
      const param = section.parameters.find((p) => matchParameter(p, pv.name))
      const outcome = param ? validateValue(param, pv.value) : undefined
      return { pv, param, outcome }
    })
  }, [editable, section])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <SourceBadge value={sourceType} />
            {detected?.sapNo ? (
              <span className="font-mono text-xs">SAP: {detected.sapNo}</span>
            ) : null}
            {detected?.heatCode ? (
              <span className="font-mono text-xs">Heat: {detected.heatCode}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {warnings.length > 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <strong>Parsing warnings:</strong>
            <ul className="mt-1 list-inside list-disc">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="col-span-3">Parameter</div>
            <div className="col-span-2">Master Spec</div>
            <div className="col-span-3">Parsed Value</div>
            <div className="col-span-2">Unit</div>
            <div className="col-span-2">Result</div>
          </div>
          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              No values extracted. Add values manually or enter them below.
            </p>
          ) : (
            rows.map((row, idx) => {
              const { pv, param, outcome } = row
              return (
                <div key={idx} className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-3 text-sm">{pv.name}</div>
                  <div className="col-span-2 font-mono text-xs text-muted-foreground">
                    {param ? specSummary(param.ruleType, param.min, param.max, param.expectedValue) : '—'}
                  </div>
                  <div className="col-span-3">
                    <Input
                      className="h-8 font-mono"
                      value={pv.value}
                      onChange={(e) =>
                        setEditable((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">{pv.unit ?? '—'}</div>
                  <div className="col-span-2">
                    {outcome ? <ParameterResultBadge value={outcome.result} /> : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
              )
            })
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditable((arr) => [...arr, { name: '', value: '', unit: undefined }])}
          >
            + Add Row
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(editable)}>Confirm Parsed Data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function specSummary(
  rule: string,
  min?: string,
  max?: string,
  expected?: string,
): string {
  switch (rule) {
    case 'Range':
      return `${min ?? '?'} - ${max ?? '?'}`
    case 'Minimum':
      return `${min ?? '?'} Min.`
    case 'Maximum':
      return `${max ?? '?'} Max.`
    case 'ExactNumber':
    case 'ExactText':
      return expected ?? '—'
    default:
      return 'Info'
  }
}
