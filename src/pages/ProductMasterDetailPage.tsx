import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionEditor } from '@/components/master/SectionEditor'
import { EmptyState, NotFoundState } from '@/components/EmptyState'
import { toast } from 'sonner'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import { useProductMastersHydrated } from '@/hooks/useHydrated'
import type { MasterParameter, MasterSection, ProductMaster } from '@/types'
import { createSection } from '@/lib/masterFactory'
import { nowIso } from '@/lib/id'

export function ProductMasterDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const hydrated = useProductMastersHydrated()
  const getMaster = useProductMasterStore((s) => s.getMaster)
  const saveMaster = useProductMasterStore((s) => s.saveMaster)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)

  const isEdit = location.pathname.endsWith('/edit')
  const master = hydrated ? (id ? getMaster(id) : undefined) : undefined
  const [editing, setEditing] = useState<ProductMaster | null>(null)

  useEffect(() => {
    if (!master) return
    setEditing(JSON.parse(JSON.stringify(master)) as ProductMaster)
  }, [master?.id, master?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const heatList = useMemo(() => {
    if (!master) return []
    return heatRecords.filter((h) => h.sapNo.toLowerCase() === master.sapNo.toLowerCase())
  }, [heatRecords, master])

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="Product Master" />
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!master) {
    return <NotFoundState backTo="/product-masters" backLabel="Back to Product Master" />
  }

  const setBasic = (patch: Partial<ProductMaster>) => {
    if (!editing) return
    setEditing({ ...editing, ...patch })
  }

  const updateSection = (sectionId: string, patch: Partial<MasterSection>) => {
    if (!editing) return
    setEditing({
      ...editing,
      sections: editing.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    })
  }

  const moveSection = (sectionId: string, dir: -1 | 1) => {
    if (!editing) return
    const idx = editing.sections.findIndex((s) => s.id === sectionId)
    const target = idx + dir
    if (idx === -1 || target < 0 || target >= editing.sections.length) return
    const next = [...editing.sections]
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    setEditing({ ...editing, sections: next.map((s, i) => ({ ...s, order: i })) })
  }

  const addSection = () => {
    if (!editing) return
    const key = `CUSTOM_${(editing.sections.length + 1).toString().padStart(2, '0')}`
    const section = createSection('Custom Section', key, { order: editing.sections.length })
    setEditing({ ...editing, sections: [...editing.sections, section] })
  }

  const deleteSection = (sectionId: string) => {
    if (!editing) return
    setEditing({
      ...editing,
      sections: editing.sections
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, order: i })),
    })
  }

  const saveEdits = () => {
    if (!editing) return
    saveMaster({ ...editing, updatedAt: nowIso() })
    addLog({
      userId: user?.name ?? 'unknown',
      action: 'master_edited',
      entityType: 'PRODUCT_MASTER',
      after: { sapNo: editing.sapNo, revision: editing.revision },
    })
    toast.success('Master saved')
    navigate(`/product-masters/${master.id}`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={master.sapNo || 'Product Master'}
        description={`${master.description || 'No description'} · ${master.material || '—'} · ${master.customer || '—'}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/product-masters">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            {isEdit ? (
              <>
                <Button variant="outline" onClick={() => navigate(`/product-masters/${master.id}`)}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={saveEdits}>
                  <Save className="h-4 w-4" />
                  Save Master
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate(`/product-masters/${master.id}/edit`)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge>v{master.revision ?? 1}</Badge>
        <Badge variant={master.status === 'ACTIVE' ? 'default' : 'secondary'}>
          {master.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
        <span className="text-muted-foreground">
          Part No: <span className="font-medium text-foreground">{master.partNo || '—'}</span>
        </span>
        <span className="text-muted-foreground">
          Grade: <span className="font-medium text-foreground">{master.grade || '—'}</span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isEdit ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Basic Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">SAP No.</Label>
                      <Input value={editing?.sapNo ?? ''} onChange={(e) => setBasic({ sapNo: e.target.value })} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Part No.</Label>
                      <Input value={editing?.partNo ?? ''} onChange={(e) => setBasic({ partNo: e.target.value })} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Description</Label>
                      <Input value={editing?.description ?? ''} onChange={(e) => setBasic({ description: e.target.value })} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Material</Label>
                      <Input value={editing?.material ?? ''} onChange={(e) => setBasic({ material: e.target.value })} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Customer</Label>
                      <Input value={editing?.customer ?? ''} onChange={(e) => setBasic({ customer: e.target.value })} />
                    </div>
                    <div>
                      <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Grade</Label>
                      <Input value={editing?.grade ?? ''} onChange={(e) => setBasic({ grade: e.target.value || undefined })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {editing?.sections.map((s, i) => (
                <SectionEditor
                  key={s.id}
                  section={s}
                  canMoveUp={i > 0}
                  canMoveDown={i < (editing?.sections.length ?? 1) - 1}
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
          ) : (
            <div className="space-y-3">
              {master.sections.length === 0 ? (
                <EmptyState
                  title="No sections yet"
                  description="Add sections and parameters by editing this master."
                  action={
                    <Button onClick={() => navigate(`/product-masters/${master.id}/edit`)}>
                      <Pencil className="h-4 w-4" />
                      Edit Master
                    </Button>
                  }
                />
              ) : (
                master.sections.map((s) => (
                  <Card key={s.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{s.name || s.key}</CardTitle>
                        <Badge variant="outline" className="font-mono">{s.key}</Badge>
                        <Badge variant={s.required ? 'default' : 'secondary'} className="ml-auto">
                          {s.required ? 'Required' : 'Optional'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {s.parameters.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No parameters defined.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                                <th className="py-2 pr-2 font-medium">Parameter</th>
                                <th className="py-2 pr-2 font-medium">Rule</th>
                                <th className="py-2 pr-2 font-medium">Spec</th>
                                <th className="py-2 pr-2 font-medium">Unit</th>
                                <th className="py-2 font-medium">Required</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.parameters.map((p) => (
                                <tr key={p.id} className="border-b last:border-0">
                                  <td className="py-1.5 pr-2 font-medium">{p.name}</td>
                                  <td className="py-1.5 pr-2">{p.ruleType}</td>
                                  <td className="py-1.5 pr-2 font-mono text-xs">{specText(p)}</td>
                                  <td className="py-1.5 pr-2">{p.unit ?? '—'}</td>
                                  <td className="py-1.5">{p.required ? 'Yes' : 'No'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Heat Codes</CardTitle>
            </CardHeader>
            <CardContent>
              {heatList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No heat codes linked to this SAP.</p>
              ) : (
                <ul className="space-y-2">
                  {heatList.map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <div className="font-mono text-sm font-medium">{h.heatCode}</div>
                        <div className="text-xs text-muted-foreground">
                          {h.heats.length} sample(s) · {h.batchNo ? `Batch ${h.batchNo}` : 'No batch'}
                        </div>
                      </div>
                      {Object.keys(h.demoReports).length > 0 ? (
                        <Badge variant="outline">{Object.keys(h.demoReports).length} demo</Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/heat-records">Manage Heat Records</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function specText(p: MasterParameter): string {
  if (p.sourceText) return p.sourceText
  if (p.ruleType === 'Range') return `${p.min ?? '?'} - ${p.max ?? '?'}`
  if (p.ruleType === 'Minimum') return `${p.min ?? '?'} Min.`
  if (p.ruleType === 'Maximum') return `${p.max ?? '?'} Max.`
  if (p.ruleType === 'ExactNumber' || p.ruleType === 'ExactText') return p.expectedValue ?? '—'
  return 'Informational'
}
