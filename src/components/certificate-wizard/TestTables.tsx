import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { calcRowResult } from '@/lib/result'
import { createId } from '@/lib/id'
import type { AdditionalTestRow, TestParameterRow } from '@/types'
import { SectionCard } from '@/components/certificate-wizard/WizardFields'

export function TestParameterTable({
  title,
  rows,
  onChange,
}: {
  title: string
  rows: TestParameterRow[]
  onChange: (rows: TestParameterRow[]) => void
}) {
  const updateRow = (id: string, patch: Partial<TestParameterRow>) => {
    onChange(
      rows.map((r) => {
        if (r.id !== id) return r
        const next = { ...r, ...patch }
        const result = calcRowResult(next.minimum, next.maximum, next.observed)
        return { ...next, result }
      }),
    )
  }

  const addRow = () => {
    onChange([...rows, { id: createId(), label: '', result: 'PENDING' }])
  }

  const removeRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id))
  }

  return (
    <SectionCard title={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-2 py-1.5">Parameter</th>
              <th className="w-24 px-2 py-1.5">Min</th>
              <th className="w-24 px-2 py-1.5">Max</th>
              <th className="w-24 px-2 py-1.5">Observed</th>
              <th className="w-20 px-2 py-1.5">Unit</th>
              <th className="w-24 px-2 py-1.5">Result</th>
              <th className="w-8 px-2 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-input bg-transparent px-2 py-1 text-sm"
                    value={r.label}
                    onChange={(e) => updateRow(r.id, { label: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-input bg-transparent px-2 py-1 text-sm"
                    value={r.minimum ?? ''}
                    onChange={(e) => updateRow(r.id, { minimum: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-input bg-transparent px-2 py-1 text-sm"
                    value={r.maximum ?? ''}
                    onChange={(e) => updateRow(r.id, { maximum: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-input bg-transparent px-2 py-1 text-sm"
                    value={r.observed ?? ''}
                    onChange={(e) => updateRow(r.id, { observed: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-input bg-transparent px-2 py-1 text-sm"
                    value={r.unit ?? ''}
                    onChange={(e) => updateRow(r.id, { unit: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1">
                  <ResultBadge result={r.result} />
                </td>
                <td className="px-2 py-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeRow(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Row
      </Button>
    </SectionCard>
  )
}

export function AdditionalTestsEditor({
  rows,
  onChange,
}: {
  rows: AdditionalTestRow[]
  onChange: (rows: AdditionalTestRow[]) => void
}) {
  const updateRow = (id: string, patch: Partial<AdditionalTestRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    onChange([...rows, { id: createId(), label: '', value: '' }])
  }

  const removeRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id))
  }

  return (
    <SectionCard title="Additional Tests">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <input
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              placeholder="Test name"
              value={r.label}
              onChange={(e) => updateRow(r.id, { label: e.target.value })}
            />
            <input
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              placeholder="Result / value"
              value={r.value}
              onChange={(e) => updateRow(r.id, { value: e.target.value })}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => removeRow(r.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Test
      </Button>
    </SectionCard>
  )
}

function ResultBadge({ result }: { result: TestParameterRow['result'] }) {
  const styles: Record<TestParameterRow['result'], string> = {
    PASS: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    FAIL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    CONDITIONAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    PENDING: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${styles[result]}`}>
      {result}
    </span>
  )
}
