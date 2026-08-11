import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, FileSpreadsheet, History, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'
import { LoadingPage } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MasterEditorDialog } from '@/components/master/MasterEditorDialog'
import { toast } from 'sonner'
import { parseMasterWorkbook, type ImportDraft, type ImportedHeatDraft } from '@/services/masterImport'
import {
  saveImportDraft,
  getImportDraft,
  deleteImportDraft,
  type ImportDecision,
} from '@/lib/importDraftStorage'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { useAuthStore } from '@/stores/authStore'
import type { ProductMaster } from '@/types'
import { createId, nowIso } from '@/lib/id'

type Decision = ImportDecision

export function MasterImportPage() {
  const navigate = useNavigate()
  const masters = useProductMasterStore((s) => s.masters)
  const saveMaster = useProductMasterStore((s) => s.saveMaster)
  const heatRecords = useHeatRecordStore((s) => s.heatRecords)
  const addHeatRecord = useHeatRecordStore((s) => s.addHeatRecord)
  const addLog = useAuditStore((s) => s.addLog)
  const user = useAuthStore((s) => s.user)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<ImportDraft | null>(null)
  const [parsing, setParsing] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [restored, setRestored] = useState(false)
  const [fileName, setFileName] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingMaster, setEditingMaster] = useState<ProductMaster | null>(null)
  const decisionsRef = useRef<Record<string, Decision>>({})
  const [, forceRender] = useState(0)

  useEffect(() => {
    let cancelled = false
    getImportDraft().then((saved) => {
      if (cancelled) return
      if (saved) {
        setDraft(saved.draft)
        setFileName(saved.fileName)
        decisionsRef.current = saved.decisions ?? {}
        setRestored(true)
      }
      setRestoring(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const persist = (nextDraft: ImportDraft, nextDecisions: Record<string, Decision>) => {
    setDraft(nextDraft)
    decisionsRef.current = nextDecisions
    void saveImportDraft(fileName, nextDraft, nextDecisions)
  }

  const handleFile = async (file: File) => {
    setParsing(true)
    setFileName(file.name)
    try {
      const buffer = await file.arrayBuffer()
      const result = parseMasterWorkbook(buffer, masters)
      const defaultDecisions: Record<string, Decision> = {}
      for (const m of result.masters) {
        defaultDecisions[m.sapNo] = 'import'
      }
      persist(result, defaultDecisions)
      toast.success(`Parsed ${result.masters.length} product master(s)`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to parse workbook. Please check the file format.')
      setDraft(null)
    } finally {
      setParsing(false)
    }
  }

  const handleStartOver = () => {
    setDraft(null)
    setFileName('')
    setRestored(false)
    decisionsRef.current = {}
    void deleteImportDraft()
  }

  const summary = useMemo(() => {
    if (!draft) return null
    const total = draft.masters.length
    const dupes = new Set(draft.masters.filter((m) => draft.meta[m.sapNo]?.inFileDuplicate).map((m) => m.sapNo)).size
    const warnings = draft.masters.reduce((acc, m) => acc + (draft.meta[m.sapNo]?.warnings.length ?? 0), 0)
    const existing = draft.masters.filter((m) => draft.meta[m.sapNo]?.existing).length
    const fresh = total - existing
    return { total, dupes, warnings, existing, fresh, heats: draft.heats.length }
  }, [draft])

  const decisionFor = (sapNo: string): Decision => decisionsRef.current[sapNo] ?? 'import'

  const setDecision = (sapNo: string, d: Decision) => {
    if (!draft) return
    const next = { ...decisionsRef.current, [sapNo]: d }
    persist(draft, next)
    forceRender((n) => n + 1)
  }

  const openEditor = (idx: number) => {
    if (!draft) return
    setEditingIndex(idx)
    setEditingMaster(JSON.parse(JSON.stringify(draft.masters[idx])))
  }

  const saveEditedMaster = () => {
    if (!draft || editingIndex === null || !editingMaster) return
    const next = { ...draft, masters: draft.masters.map((m, i) => (i === editingIndex ? editingMaster : m)) }
    persist(next, decisionsRef.current)
    setEditingMaster(null)
    setEditingIndex(null)
    toast.success('Master updated in import')
  }

  const updateHeat = (id: string, patch: Partial<ImportedHeatDraft>) => {
    if (!draft) return
    persist(
      {
        ...draft,
        heats: draft.heats.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      },
      decisionsRef.current,
    )
  }

  const removeHeat = (id: string) => {
    if (!draft) return
    persist({ ...draft, heats: draft.heats.filter((h) => h.id !== id) }, decisionsRef.current)
  }

  const addHeat = () => {
    if (!draft) return
    persist(
      {
        ...draft,
        heats: [
          ...draft.heats,
          { id: createId(), sapNo: '', heatCode: '', demoReports: {} },
        ],
      },
      decisionsRef.current,
    )
  }

  const confirmImport = () => {
    if (!draft) return
    const importedSaps = new Set<string>()
    let updated = 0
    let added = 0
    let revisions = 0

    for (const master of draft.masters) {
      const decision = decisionFor(master.sapNo)
      const meta = draft.meta[master.sapNo]
      if (decision === 'skip') continue
      importedSaps.add(master.sapNo)

      if (decision === 'revision' && meta?.existing) {
        const existing = meta.existing
        const copy: ProductMaster = {
          ...master,
          id: createId(),
          revision: (existing.revision ?? 1) + 1,
          status: 'INACTIVE',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        saveMaster(copy)
        revisions++
      } else if (decision === 'import' && meta?.existing) {
        const existing = meta.existing
        saveMaster({
          ...master,
          id: existing.id,
          revision: (existing.revision ?? 1) + 1,
          status: 'ACTIVE',
          createdAt: existing.createdAt,
          updatedAt: nowIso(),
        })
        updated++
      } else {
        saveMaster({ ...master, status: 'ACTIVE', revision: 1 })
        added++
      }
    }

    let heatAdded = 0
    for (const heat of draft.heats) {
      if (!importedSaps.has(heat.sapNo)) continue
      const exists = heatRecords.some(
        (h) =>
          h.sapNo.toLowerCase() === heat.sapNo.toLowerCase() &&
          h.heatCode.toLowerCase() === heat.heatCode.toLowerCase(),
      )
      if (exists) continue
      addHeatRecord({
        sapNo: heat.sapNo,
        heatCode: heat.heatCode,
        batchNo: heat.batchNo,
        quantity: heat.quantity,
        heats: heat.defaultSample
          ? [{ id: createId(), label: heat.defaultSample, quantity: heat.quantity }]
          : [],
        demoReports: heat.demoReports,
      })
      heatAdded++
    }

    addLog({
      userId: user?.name ?? 'unknown',
      action: 'master_import',
      entityType: 'PRODUCT_MASTER',
      after: {
        added,
        updated,
        revisions,
        skipped: draft.masters.length - (added + updated + revisions),
        heatsAdded: heatAdded,
      },
    })

    toast.success(`Import complete: ${added} added, ${updated} updated, ${revisions} new revisions`)
    void deleteImportDraft()
    navigate('/product-masters')
  }

  if (parsing) return <LoadingPage label="Parsing workbook…" />
  if (restoring) return <LoadingPage label="Restoring saved import…" />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Import Product Master"
        description="Upload the GN ALTECH Master Excel workbook. Review and confirm before it is saved."
        actions={
          draft ? (
            <>
              <Button variant="outline" onClick={handleStartOver}>
                <ArrowLeft className="h-4 w-4" />
                Start Over
              </Button>
              <Button onClick={confirmImport}>
                <Check className="h-4 w-4" />
                Confirm & Import
              </Button>
            </>
          ) : undefined
        }
      />

      {restored && draft ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <History className="h-4 w-4 shrink-0" />
          Resuming your saved import from <span className="font-medium">{fileName}</span>.
          Edits and decisions are saved in your browser until you confirm or start over.
        </div>
      ) : null}

      {!draft ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
          <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Upload Master Workbook</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Select <span className="font-medium">GN_Altech_Demo_Master.xlsx</span> containing the
            Product Master, Heat Codes and Report Index sheets. Your review progress is saved
            automatically, so you can leave this page and come back later.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ''
              }}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Choose File
            </Button>
          </div>
          {fileName ? <p className="mt-3 text-xs text-muted-foreground">{fileName}</p> : null}
        </div>
      ) : (
        <>
          {summary ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Total SAP" value={summary.total} />
              <StatCard label="New Masters" value={summary.fresh} />
              <StatCard label="Existing" value={summary.existing} />
              <StatCard label="Duplicate in file" value={summary.dupes} />
              <StatCard label="Warnings" value={summary.warnings} />
              <StatCard label="Heat Codes" value={summary.heats} />
            </div>
          ) : null}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SAP No.</TableHead>
                  <TableHead>Part No.</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40">Import Action</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.masters.map((m, idx) => {
                  const meta = draft.meta[m.sapNo]
                  const decision = decisionFor(m.sapNo)
                  return (
                    <TableRow key={`${m.sapNo}-${idx}`} className={decision === 'skip' ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-xs">{m.sapNo}</TableCell>
                      <TableCell>{m.partNo || '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{m.description || '—'}</TableCell>
                      <TableCell>{m.material || '—'}</TableCell>
                      <TableCell>{m.customer || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {meta?.existing ? (
                            <Badge variant="secondary">Existing v{(meta.existing as { revision?: number }).revision ?? 1}</Badge>
                          ) : (
                            <Badge>New</Badge>
                          )}
                          {meta?.inFileDuplicate ? <Badge variant="destructive">Dup</Badge> : null}
                          {meta?.warnings.length ? <Badge variant="outline" title={meta.warnings.join('\n')}>⚠</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={decision} onValueChange={(v) => setDecision(m.sapNo, v as Decision)}>
                          <SelectTrigger className="h-8 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="import">Update / Import</SelectItem>
                            <SelectItem value="revision">New Revision</SelectItem>
                            <SelectItem value="skip">Skip</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditor(idx)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Heat Codes</h3>
                <p className="text-xs text-muted-foreground">
                  Review heat records that will be created along with the masters.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addHeat}>
                Add Heat Code
              </Button>
            </div>
            <div className="divide-y">
              {draft.heats.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">No heat codes found.</p>
              ) : (
                draft.heats.map((h) => (
                  <div key={h.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                    <Input
                      value={h.sapNo}
                      onChange={(e) => updateHeat(h.id, { sapNo: e.target.value })}
                      placeholder="SAP No."
                      className="h-8 w-48"
                    />
                    <Input
                      value={h.heatCode}
                      onChange={(e) => updateHeat(h.id, { heatCode: e.target.value })}
                      placeholder="Heat Code"
                      className="h-8 w-32"
                    />
                    <Input
                      value={h.batchNo ?? ''}
                      onChange={(e) => updateHeat(h.id, { batchNo: e.target.value || undefined })}
                      placeholder="Batch No."
                      className="h-8 w-32"
                    />
                    <Input
                      value={h.quantity ?? ''}
                      onChange={(e) => updateHeat(h.id, { quantity: e.target.value || undefined })}
                      placeholder="Qty"
                      className="h-8 w-24"
                    />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {Object.keys(h.demoReports).length} demo report(s)
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeHeat(h.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <MasterEditorDialog
        open={editingMaster !== null}
        title={`Edit ${editingMaster?.sapNo ?? 'Master'}`}
        master={editingMaster}
        onChange={setEditingMaster}
        onCancel={() => {
          setEditingMaster(null)
          setEditingIndex(null)
        }}
        onSave={saveEditedMaster}
        saveLabel="Apply to Import"
      />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
