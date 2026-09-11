import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ParsedValue } from '@/types'

const IMAGE_EXT = /\.(bmp|png|jpg|jpeg)$/i

export interface ReviewDialogState {
  fileName: string
  file: File | null
  sapCode: string
  heatCode: string
  values: ParsedValue[]
  valueSource: Record<string, 'EXTRACTED' | 'MASTER' | 'MANUAL'>
  message?: string
  demoMatch?: boolean
}

/**
 * Review sheet that opens ON the report (modal) instead of rendering
 * below the table — the table position never shifts.
 */
export function ReportReviewDialog({
  item, onClose, onChange,
}: {
  item: ReviewDialogState | null
  onClose: () => void
  onChange: (patch: Partial<ReviewDialogState>) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newVal, setNewVal] = useState('')
  const isImage = item ? (item.file?.type.startsWith('image/') || IMAGE_EXT.test(item.fileName)) : false

  return (
    <Dialog open={item !== null} onOpenChange={(o) => { if (!o) { onClose(); setPreview(null) } }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate font-mono text-sm">Review — {item?.fileName}</DialogTitle>
          <DialogDescription>
            {item?.message ?? 'Values read from the file — change them if needed.'}
            {item?.demoMatch ? ' SAP / Heat / values were read from the file.' : ''}
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">SAP Code</Label>
                <Input className="h-8 font-mono" value={item.sapCode}
                  onChange={(e) => onChange({ sapCode: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Heat Code</Label>
                <Input className="h-8 font-mono" value={item.heatCode}
                  onChange={(e) => onChange({ heatCode: e.target.value.toUpperCase() })} />
              </div>
            </div>
            {isImage && item.file ? (
              <div>
                {preview
                  ? <img src={preview} alt={item.fileName} className="max-h-64 rounded-md border object-contain" />
                  : (
                    <Button size="sm" variant="outline" onClick={() => setPreview(URL.createObjectURL(item.file!))}>
                      Show image preview
                    </Button>
                  )}
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-3">
              {item.values.map((v, i) => (
                <div key={`${v.name}-${i}`}>
                  <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                    {v.name} {item.valueSource[v.name] === 'MASTER' ? '(from master)' : ''}{v.unit ? ` · ${v.unit}` : ''}
                  </Label>
                  <Input className="h-8" value={v.value} onChange={(e) => {
                    const values = item.values.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                    onChange({ values, valueSource: { ...item.valueSource, [v.name]: 'MANUAL' as const } })
                  }} />
                </div>
              ))}
            </div>
            <div className="flex items-end gap-1">
              <div className="flex-1">
                <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Add parameter</Label>
                <Input className="h-8" placeholder="e.g. C" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="flex-1">
                <Input className="h-8" placeholder="value" value={newVal} onChange={(e) => setNewVal(e.target.value)} />
              </div>
              <Button size="sm" variant="outline" disabled={!newName.trim() || !newVal.trim()} onClick={() => {
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
            {item.values.length === 0 ? (
              <p className="text-xs text-muted-foreground">No values extracted. Confirm SAP + Heat above, add values manually if needed, then Submit.</p>
            ) : null}
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { onClose(); setPreview(null) }}>Done</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
