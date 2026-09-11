import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IngestBadge } from '@/components/workflow/WorkflowBadges'
import type { IngestItem } from '@/services/bulkIngest'

const IMAGE_EXT = /\.(bmp|png|jpg|jpeg)$/i

export function BulkReviewTable({
  items,
  onChange,
  onAcceptAll,
  onSubmitAll,
  onSubmitOne,
  submitting,
  onRetry,
}: {
  items: IngestItem[]
  onChange: (id: string, patch: Partial<IngestItem>) => void
  onAcceptAll: () => void
  onSubmitAll: () => void
  onSubmitOne?: (id: string) => void
  submitting: boolean
  onRetry?: (id: string) => void
  pendingHeats?: Array<{ heatCode: string; sapNo: string; partName?: string }>
  sectionKey?: string
}) {
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({})
  const [newParams, setNewParams] = useState<Record<string, { name: string; value: string }>>({})

  if (items.length === 0) return null

  const done = items.filter((i) => i.status === 'MATCHED' || i.status === 'REVIEW_REQUIRED').length

  const toggleImagePreview = (id: string, file: File) => {
    setImagePreviews((prev) => {
      if (prev[id]) {
        URL.revokeObjectURL(prev[id])
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: URL.createObjectURL(file) }
    })
  }

  const handleParamValueChange = (itemId: string, paramIndex: number, newValue: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const updatedValues = item.values.map((v, idx) => (idx === paramIndex ? { ...v, value: newValue } : v))
    onChange(itemId, {
      values: updatedValues,
      valueSource: { ...item.valueSource, [item.values[paramIndex].name]: 'MANUAL' },
    })
  }

  const handleAddCustomParam = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    const np = newParams[itemId]
    if (!item || !np || !np.name.trim() || !np.value.trim()) return

    onChange(itemId, {
      values: [...item.values, { name: np.name.trim(), value: np.value.trim(), confidence: 0.9 }],
      valueSource: { ...item.valueSource, [np.name.trim()]: 'MANUAL' },
    })

    setNewParams((prev) => ({ ...prev, [itemId]: { name: '', value: '' } }))
  }

  const handleRemoveParam = (itemId: string, paramIndex: number) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    onChange(itemId, {
      values: item.values.filter((_, idx) => idx !== paramIndex),
    })
  }

  return (
    <div className="space-y-4">
      {/* Top action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onAcceptAll}>
            Accept All Matched
          </Button>
          <Button
            size="sm"
            onClick={onSubmitAll}
            disabled={submitting || done === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {submitting ? 'Submitting…' : `Submit All Reports (${done}/${items.length} Ready)`}
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          Auto-extracted data is editable directly below. Verify values and click <strong>Submit</strong>.
        </span>
      </div>

      {/* Inline Editable Cards List */}
      <div className="space-y-4">
        {items.map((it, idx) => {
          const isImage = it.file.type.startsWith('image/') || IMAGE_EXT.test(it.file.name)
          const previewUrl = imagePreviews[it.id]
          const isReadyToSubmit = Boolean(it.heatCode && (it.status === 'MATCHED' || it.status === 'REVIEW_REQUIRED'))
          const np = newParams[it.id] || { name: '', value: '' }

          return (
            <Card key={it.id} className="border transition-all shadow-sm hover:border-primary/40">
              <CardContent className="p-4 space-y-3">
                {/* Header Row: File Name, Sample Tag, Status, Submit Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-muted-foreground font-mono">#{idx + 1}</span>
                    <span className="font-mono text-sm font-semibold truncate text-foreground" title={it.file.name}>
                      {it.file.name}
                    </span>
                    {it.assignedSample ? (
                      <Badge variant="default" className="bg-blue-600 text-white font-bold text-xs">
                        Sample {it.assignedSample}
                      </Badge>
                    ) : null}
                    {it.demoMatch ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400 bg-amber-50">
                        Lab Match
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <IngestBadge status={it.status} />

                    {it.status === 'FAILED' && onRetry ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRetry(it.id)}>
                        Retry
                      </Button>
                    ) : null}

                    {onSubmitOne && isReadyToSubmit ? (
                      <Button
                        size="sm"
                        disabled={submitting}
                        onClick={() => onSubmitOne(it.id)}
                        className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3"
                      >
                        Submit Report
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Progress bar if parsing */}
                {(it.status === 'PARSING' || it.status === 'UPLOADING') ? (
                  <div className="space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${it.progress}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground">{it.stage ?? 'Extracting values from document…'} {it.progress}%</div>
                  </div>
                ) : null}

                {it.status === 'QUEUED' ? (
                  <div className="text-xs text-muted-foreground italic py-2">Waiting in queue to process…</div>
                ) : null}

                {/* Main Content: Auto-detected Identifiers + Direct Editable Values */}
                {it.status !== 'QUEUED' ? (
                  <div className="space-y-3">
                    {/* Identifiers (SAP & Heat Code) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-muted/30 p-2.5 rounded-md border">
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Detected Heat Code
                        </Label>
                        <Input
                          className="h-8 font-mono text-xs font-bold mt-1 bg-background"
                          value={it.heatCode}
                          placeholder="e.g. GZ-56"
                          onChange={(e) =>
                            onChange(it.id, {
                              heatCode: e.target.value.toUpperCase(),
                              status: e.target.value ? 'MATCHED' : 'REVIEW_REQUIRED',
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          SAP Product Master
                        </Label>
                        <Input
                          className="h-8 font-mono text-xs mt-1 bg-background"
                          value={it.sapCode}
                          placeholder="e.g. PR01CI0459CA"
                          onChange={(e) => onChange(it.id, { sapCode: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="flex items-end">
                        {isImage ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs w-full"
                            onClick={() => toggleImagePreview(it.id, it.file)}
                          >
                            {previewUrl ? 'Hide Micro Image' : 'View Micro Image'}
                          </Button>
                        ) : (
                          <div className="text-[11px] text-muted-foreground self-center">
                            Confidence: <span className="font-semibold text-foreground">{Math.round(it.confidence * 100)}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Image Preview if toggled */}
                    {previewUrl ? (
                      <div className="rounded-md border p-2 bg-muted/10 text-center">
                        <img
                          src={previewUrl}
                          alt={it.file.name}
                          className="max-h-48 rounded border mx-auto object-contain"
                        />
                      </div>
                    ) : null}

                    {/* Editable Observed Values Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          Measured &amp; Extracted Parameters ({it.values.length}):
                        </Label>
                        <span className="text-[10px] text-muted-foreground">Click any box to edit values inline</span>
                      </div>

                      {it.values.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {it.values.map((v, pIdx) => (
                            <div
                              key={`${v.name}-${pIdx}`}
                              className="group relative rounded border bg-card p-1.5 shadow-2xs hover:border-primary/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="block truncate text-[10px] font-semibold text-muted-foreground uppercase" title={v.name}>
                                  {v.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveParam(it.id, pIdx)}
                                  className="text-[10px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove parameter"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <Input
                                  className="h-7 px-1.5 text-xs font-semibold text-foreground bg-background"
                                  value={v.value}
                                  onChange={(e) => handleParamValueChange(it.id, pIdx, e.target.value)}
                                />
                                {v.unit ? (
                                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                    {v.unit}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">
                          No parameters extracted yet. Enter parameters below.
                        </div>
                      )}
                    </div>

                    {/* Inline Quick Add Parameter */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Input
                        className="h-7 w-36 text-xs"
                        placeholder="New Param (e.g. C)"
                        value={np.name}
                        onChange={(e) =>
                          setNewParams((prev) => ({
                            ...prev,
                            [it.id]: { ...np, name: e.target.value },
                          }))
                        }
                      />
                      <Input
                        className="h-7 w-28 text-xs"
                        placeholder="Value"
                        value={np.value}
                        onChange={(e) =>
                          setNewParams((prev) => ({
                            ...prev,
                            [it.id]: { ...np, value: e.target.value },
                          }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={!np.name.trim() || !np.value.trim()}
                        onClick={() => handleAddCustomParam(it.id)}
                      >
                        + Add Param
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
