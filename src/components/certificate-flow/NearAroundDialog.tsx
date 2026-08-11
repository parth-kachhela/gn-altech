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
import { ParameterResultBadge } from '@/components/certificate-flow/ReportStatusBadge'
import { suggestValuesForSection } from '@/lib/nearAround'
import { validateValue } from '@/lib/validation'
import { matchParameter } from '@/lib/validation'
import type { MasterSection, ParsedValue } from '@/types'

export function NearAroundDialog({
  open,
  section,
  onClose,
  onApply,
}: {
  open: boolean
  section: MasterSection
  onClose: () => void
  onApply: (values: ParsedValue[]) => void
}) {
  const [editable, setEditable] = useState<ParsedValue[]>([])
  useEffect(() => {
    if (open) setEditable(suggestValuesForSection(section))
  }, [open, section])

  const rows = useMemo(() => {
    return editable.map((pv) => {
      const param = section.parameters.find((p) => matchParameter(p, pv.name))
      const outcome = param ? validateValue(param, pv.value) : undefined
      return { pv, param, outcome }
    })
  }, [editable, section])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Near Around — Suggested Values</DialogTitle>
          <DialogDescription>
            Values are generated near the master specification for review only. They are marked{' '}
            <strong>Near Around</strong>, never treated as verified, and must be confirmed before use.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No numeric parameters in this section to suggest values for.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="col-span-3">Parameter</div>
              <div className="col-span-3">Spec</div>
              <div className="col-span-3">Suggested</div>
              <div className="col-span-3">Check</div>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-3 text-sm">{row.pv.name}</div>
                <div className="col-span-3 font-mono text-xs text-muted-foreground">
                  {row.param ? specSummary(row.param) : '—'}
                </div>
                <div className="col-span-3">
                  <Input
                    className="h-8 font-mono"
                    value={row.pv.value}
                    onChange={(e) =>
                      setEditable((arr) =>
                        arr.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div className="col-span-3">
                  {row.outcome ? <ParameterResultBadge value={row.outcome.result} /> : <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={rows.length === 0} onClick={() => onApply(editable)}>
            Apply for Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function specSummary(p: { ruleType: string; min?: string; max?: string; expectedValue?: string }): string {
  switch (p.ruleType) {
    case 'Range':
      return `${p.min ?? '?'} - ${p.max ?? '?'}`
    case 'Minimum':
      return `${p.min ?? '?'} Min.`
    case 'Maximum':
      return `${p.max ?? '?'} Max.`
    case 'ExactNumber':
    case 'ExactText':
      return p.expectedValue ?? '—'
    default:
      return 'Info'
  }
}
