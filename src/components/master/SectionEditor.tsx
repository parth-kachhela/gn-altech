import type { MasterParameter, MasterSection } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ParameterRowEditor } from '@/components/master/ParameterRowEditor'
import { createParameter } from '@/lib/masterFactory'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

export function SectionEditor({
  section,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onDelete,
}: {
  section: MasterSection
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (patch: Partial<MasterSection>) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
}) {
  const updateParameter = (id: string, patch: Partial<MasterParameter>) => {
    onChange({
      parameters: section.parameters.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })
  }

  const addParameter = () => {
    const next = createParameter(`Parameter ${section.parameters.length + 1}`, {
      order: section.parameters.length,
    })
    onChange({ parameters: [...section.parameters, next] })
  }

  const deleteParameter = (id: string) => {
    onChange({
      parameters: section.parameters
        .filter((p) => p.id !== id)
        .map((p, i) => ({ ...p, order: i })),
    })
  }

  const moveParameter = (id: string, dir: -1 | 1) => {
    const idx = section.parameters.findIndex((p) => p.id === id)
    const target = idx + dir
    if (idx === -1 || target < 0 || target >= section.parameters.length) return
    const next = [...section.parameters]
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    onChange({ parameters: next.map((p, i) => ({ ...p, order: i })) })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="text-base">
          {section.name || section.key}
          <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
            {section.key}
          </span>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveUp} onClick={() => onMove(-1)} title="Move section up">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveDown} onClick={() => onMove(1)} title="Move section down">
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Delete section">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-12 items-end gap-2">
          <div className="col-span-4">
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Section Name</Label>
            <Input value={section.name} onChange={(e) => onChange({ name: e.target.value })} className="h-8" />
          </div>
          <div className="col-span-2">
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Key</Label>
            <Input value={section.key} onChange={(e) => onChange({ key: e.target.value })} className="h-8" />
          </div>
          <div className="col-span-2">
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Required</Label>
            <Select
              value={section.required ? 'yes' : 'no'}
              onValueChange={(v) => onChange({ required: v === 'yes' })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-4">
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">File Type Hint</Label>
            <Input
              value={section.fileTypeHint ?? ''}
              onChange={(e) => onChange({ fileTypeHint: e.target.value || undefined })}
              placeholder="PDF / BMP / PNG"
              className="h-8"
            />
          </div>
        </div>

        <div className="space-y-2">
          {section.parameters.map((p, i) => (
            <ParameterRowEditor
              key={p.id}
              parameter={p}
              canMoveUp={i > 0}
              canMoveDown={i < section.parameters.length - 1}
              onChange={(patch) => updateParameter(p.id, patch)}
              onMove={(dir) => moveParameter(p.id, dir)}
              onDelete={() => deleteParameter(p.id)}
            />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addParameter}>
            <Plus className="h-3.5 w-3.5" />
            Add Parameter
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
