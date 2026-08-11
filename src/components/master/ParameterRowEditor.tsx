import type { MasterParameter } from '@/types'
import type { RuleType } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'

const RULE_TYPES: RuleType[] = [
  'Range',
  'Minimum',
  'Maximum',
  'ExactNumber',
  'ExactText',
  'Informational',
]

export function ParameterRowEditor({
  parameter,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onDelete,
}: {
  parameter: MasterParameter
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (patch: Partial<MasterParameter>) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
}) {
  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded-md border bg-background p-2">
      <div className="col-span-3">
        <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Name</Label>
        <Input
          value={parameter.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Parameter name"
          className="h-8"
        />
      </div>
      <div className="col-span-2">
        <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Rule</Label>
        <Select
          value={parameter.ruleType}
          onValueChange={(v) => onChange({ ruleType: v as RuleType })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Rule" />
          </SelectTrigger>
          <SelectContent>
            {RULE_TYPES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-1">
        <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Min</Label>
        <Input
          value={parameter.min ?? ''}
          onChange={(e) => onChange({ min: e.target.value || undefined })}
          placeholder="—"
          className="h-8"
        />
      </div>
      <div className="col-span-1">
        <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Max</Label>
        <Input
          value={parameter.max ?? ''}
          onChange={(e) => onChange({ max: e.target.value || undefined })}
          placeholder="—"
          className="h-8"
        />
      </div>
      <div className="col-span-2">
        <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Expected</Label>
        <Input
          value={parameter.expectedValue ?? ''}
          onChange={(e) => onChange({ expectedValue: e.target.value || undefined })}
          placeholder="—"
          className="h-8"
        />
      </div>
      <div className="col-span-1">
        <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Unit</Label>
        <Input
          value={parameter.unit ?? ''}
          onChange={(e) => onChange({ unit: e.target.value || undefined })}
          placeholder="—"
          className="h-8"
        />
      </div>
      <div className="col-span-1">
        <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Required</Label>
        <Select
          value={parameter.required ? 'yes' : 'no'}
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
      <div className="col-span-1 flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveUp} onClick={() => onMove(-1)} title="Move up">
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canMoveDown} onClick={() => onMove(1)} title="Move down">
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
