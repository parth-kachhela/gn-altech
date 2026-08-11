import type { MasterSection, ProductMaster } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SectionEditor } from '@/components/master/SectionEditor'
import { createSection } from '@/lib/masterFactory'
import { Plus } from 'lucide-react'

export function MasterEditorDialog({
  open,
  title,
  master,
  onChange,
  onCancel,
  onSave,
  saveLabel = 'Save',
}: {
  open: boolean
  title: string
  master: ProductMaster | null
  onChange: (master: ProductMaster) => void
  onCancel: () => void
  onSave: () => void
  saveLabel?: string
}) {
  if (!master) return null

  const setBasic = (patch: Partial<ProductMaster>) => onChange({ ...master, ...patch })

  const updateSection = (id: string, patch: Partial<MasterSection>) => {
    onChange({
      ...master,
      sections: master.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = master.sections.findIndex((s) => s.id === id)
    const target = idx + dir
    if (idx === -1 || target < 0 || target >= master.sections.length) return
    const next = [...master.sections]
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    onChange({ ...master, sections: next.map((s, i) => ({ ...s, order: i })) })
  }

  const addSection = () => {
    const key = `CUSTOM_${(master.sections.length + 1).toString().padStart(2, '0')}`
    const section = createSection('Custom Section', key, { order: master.sections.length })
    onChange({ ...master, sections: [...master.sections, section] })
  }

  const deleteSection = (id: string) => {
    onChange({
      ...master,
      sections: master.sections
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">SAP No.</Label>
            <Input value={master.sapNo} onChange={(e) => setBasic({ sapNo: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Part No.</Label>
            <Input value={master.partNo} onChange={(e) => setBasic({ partNo: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Description</Label>
            <Input value={master.description} onChange={(e) => setBasic({ description: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Material</Label>
            <Input value={master.material} onChange={(e) => setBasic({ material: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Customer</Label>
            <Input value={master.customer} onChange={(e) => setBasic({ customer: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Grade</Label>
            <Input value={master.grade ?? ''} onChange={(e) => setBasic({ grade: e.target.value || undefined })} />
          </div>
        </div>

        <div className="space-y-3">
          {master.sections.map((s, i) => (
            <SectionEditor
              key={s.id}
              section={s}
              canMoveUp={i > 0}
              canMoveDown={i < master.sections.length - 1}
              onChange={(patch) => updateSection(s.id, patch)}
              onMove={(dir) => moveSection(s.id, dir)}
              onDelete={() => deleteSection(s.id)}
            />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addSection}>
            <Plus className="h-3.5 w-3.5" />
            Add Section
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave}>
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
