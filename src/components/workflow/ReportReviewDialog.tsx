import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ParsedValue } from '@/types'

const IMAGE_EXT = /\.(bmp|png|jpg|jpeg)$/i

export interface PendingHeatOption {
  heatCode: string
  sapNo: string
  partName?: string
}

export interface ReviewDialogState {
  fileName: string
  file: File | null
  sapCode: string
  heatCode: string
  values: ParsedValue[]
  valueSource: Record<string, 'EXTRACTED' | 'MASTER' | 'MANUAL'>
  message?: string
  demoMatch?: boolean
  sectionKey?: string
}

const MICRO_DEFAULTS: ParsedValue[] = [
  { name: 'Nodularity', value: '85', unit: '%', confidence: 0.9 },
  { name: 'Nodule Count', value: '180', unit: '/mm2', confidence: 0.9 },
  { name: 'Pearlite', value: '40', unit: '%', confidence: 0.9 },
  { name: 'Ferrite', value: '60', unit: '%', confidence: 0.9 },
  { name: 'Carbide', value: 'NIL', confidence: 0.9 },
]

/**
 * Review sheet that opens ON the report (modal) instead of rendering
 * below the table — the table position never shifts.
 */
export function ReportReviewDialog({
  item, onClose, onChange, pendingHeats = [],
}: {
  item: ReviewDialogState | null
  onClose: () => void
  onChange: (patch: Partial<ReviewDialogState>) => void
  pendingHeats?: PendingHeatOption[]
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newVal, setNewVal] = useState('')
  const isImage = item ? (item.file?.type.startsWith('image/') || IMAGE_EXT.test(item.fileName)) : false
  const isMicro = Boolean(item?.sectionKey?.toUpperCase().includes('MICRO') || isImage)

  const handleSelectPendingHeat = (hCode: string) => {
    const found = pendingHeats.find((h) => h.heatCode.toUpperCase() === hCode.toUpperCase())
    if (found) {
      onChange({
        heatCode: found.heatCode,
        sapCode: found.sapNo,
      })
    }
  }

  const handleApplyMicroDefaults = () => {
    if (!item) return
    const source: Record<string, 'EXTRACTED' | 'MASTER' | 'MANUAL'> = {}
    MICRO_DEFAULTS.forEach((d) => { source[d.name] = 'MANUAL' })
    onChange({
      values: MICRO_DEFAULTS,
      valueSource: source,
    })
  }

  return (
    <Dialog open={item !== null} onOpenChange={(o) => { if (!o) { onClose(); setPreview(null) } }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate font-mono text-sm">Review &amp; Edit — {item?.fileName}</DialogTitle>
          <DialogDescription>
            {item?.message ?? 'Values extracted from report — edit or verify below.'}
            {item?.demoMatch ? ' SAP / Heat / values were matched to lab data.' : ''}
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <div className="space-y-4">
            {/* Quick pending heat selector */}
            {pendingHeats.length > 0 ? (
              <div className="rounded-md border bg-muted/40 p-3">
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Match with Pending Heat in Queue:
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {pendingHeats.map((h) => {
                    const isSelected = item.heatCode.toUpperCase() === h.heatCode.toUpperCase()
                    return (
                      <Button
                        key={`${h.sapNo}-${h.heatCode}`}
                        type="button"
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        className="h-7 font-mono text-xs"
                        onClick={() => handleSelectPendingHeat(h.heatCode)}
                      >
                        {h.heatCode}
                        {h.partName ? ` (${h.partName.slice(0, 15)}…)` : ''}
                      </Button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">SAP Code</Label>
                <Input className="h-8 font-mono" value={item.sapCode}
                  placeholder="e.g. PR01CI0459CA"
                  onChange={(e) => onChange({ sapCode: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Heat Code</Label>
                <Input className="h-8 font-mono" value={item.heatCode}
                  placeholder="e.g. GZ-56"
                  onChange={(e) => onChange({ heatCode: e.target.value.toUpperCase() })} />
              </div>
            </div>

            {isImage && item.file ? (
              <div className="rounded-md border p-2">
                {preview ? (
                  <div className="space-y-2">
                    <img src={preview} alt={item.fileName} className="max-h-64 rounded-md border object-contain mx-auto" />
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setPreview(null)}>Hide Image</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setPreview(URL.createObjectURL(item.file!))}>
                    Show attached image preview
                  </Button>
                )}
              </div>
            ) : null}

            {/* Micro Quick Defaults Button */}
            {isMicro && item.values.length === 0 ? (
              <div className="flex items-center justify-between rounded-md border border-dashed p-3 bg-muted/20">
                <span className="text-xs text-muted-foreground">No microstructure parameters extracted from image.</span>
                <Button size="sm" variant="secondary" onClick={handleApplyMicroDefaults}>
                  Fill Standard Micro Spec Values
                </Button>
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Extracted &amp; Measured Values ({item.values.length})</Label>
                {isMicro && item.values.length > 0 ? (
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={handleApplyMicroDefaults}>
                    Reset to Standard Specs
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {item.values.map((v, i) => (
                  <div key={`${v.name}-${i}`} className="rounded border bg-card p-1.5 shadow-sm">
                    <Label className="mb-1 block truncate text-[10px] uppercase tracking-wide text-muted-foreground" title={v.name}>
                      {v.name} {item.valueSource[v.name] === 'MASTER' ? '(from master)' : ''}{v.unit ? ` · ${v.unit}` : ''}
                    </Label>
                    <Input className="h-7 text-xs font-medium" value={v.value} onChange={(e) => {
                      const values = item.values.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                      onChange({ values, valueSource: { ...item.valueSource, [v.name]: 'MANUAL' as const } })
                    }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-2 rounded-md border p-2 bg-muted/10">
              <div className="flex-1">
                <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Add Custom Parameter</Label>
                <Input className="h-8 text-xs" placeholder="e.g. Tensile, Hardness, C" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="flex-1">
                <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Observed Value</Label>
                <Input className="h-8 text-xs" placeholder="e.g. 250" value={newVal} onChange={(e) => setNewVal(e.target.value)} />
              </div>
              <Button size="sm" variant="outline" className="h-8" disabled={!newName.trim() || !newVal.trim()} onClick={() => {
                onChange({
                  values: [...item.values, { name: newName.trim(), value: newVal.trim(), confidence: 0.5 }],
                  valueSource: { ...item.valueSource, [newName.trim()]: 'MANUAL' as const },
                })
                setNewName('')
                setNewVal('')
              }}>
                Add
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button size="sm" onClick={() => { onClose(); setPreview(null) }}>Confirm &amp; Done</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
