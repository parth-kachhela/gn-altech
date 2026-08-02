import { Save, FileText, FileSpreadsheet, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClientStore } from '@/stores/clientStore'
import { useItemStore } from '@/stores/itemStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import type { Certificate } from '@/types'
import {
  InputField,
  SectionCard,
  SelectField,
  TextAreaField,
} from '@/components/certificate-wizard/WizardFields'
import {
  AdditionalTestsEditor,
  TestParameterTable,
} from '@/components/certificate-wizard/TestTables'

type DraftSetter = (updater: (d: Certificate) => Certificate) => void

interface ReviewStepProps {
  certificate: Certificate
  setDraft: DraftSetter
  onBack: () => void
  onSave: () => void
  onDownloadPdf: () => Promise<void>
  onDownloadExcel: () => void
}

export function ReviewStep({
  certificate,
  setDraft,
  onBack,
  onSave,
  onDownloadPdf,
  onDownloadExcel,
}: ReviewStepProps) {
  const client = useClientStore.getState().getClient(certificate.clientId)
  const readyReports = certificate.reports.filter((r) => r.status === 'READY').length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Cert: {certificate.certificateNumber || '—'}</Badge>
        <Badge variant="secondary">Client: {(client?.name ?? certificate.clientId) || '—'}</Badge>
        <Badge variant="secondary">Items: {certificate.items.length}</Badge>
        <Badge variant="secondary">Heat Records: {certificate.heatRecords.length}</Badge>
        <Badge variant={readyReports === 3 ? 'default' : 'secondary'}>
          Reports: {readyReports}/3
        </Badge>
      </div>

      <ReviewInfo certificate={certificate} setDraft={setDraft} />

      <ReviewItems certificate={certificate} setDraft={setDraft} />

      <ReviewFooter certificate={certificate} setDraft={setDraft} />

      <TestParameterTable
        title="Chemical Analysis"
        rows={certificate.chemicalRows}
        onChange={(rows) => setDraft((d) => ({ ...d, chemicalRows: rows }))}
      />
      <TestParameterTable
        title="Mechanical Properties"
        rows={certificate.mechanicalRows}
        onChange={(rows) => setDraft((d) => ({ ...d, mechanicalRows: rows }))}
      />
      <TestParameterTable
        title="Micro Structure"
        rows={certificate.microStructureRows}
        onChange={(rows) => setDraft((d) => ({ ...d, microStructureRows: rows }))}
      />

      <AdditionalTestsEditor
        rows={certificate.additionalTests}
        onChange={(rows) => setDraft((d) => ({ ...d, additionalTests: rows }))}
      />

      <ReviewReports certificate={certificate} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onDownloadExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={onDownloadPdf}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Certificate
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReviewInfo({
  certificate,
  setDraft,
}: {
  certificate: Certificate
  setDraft: DraftSetter
}) {
  return (
    <SectionCard title="Certificate Information">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField
          label="Certificate Number"
          value={certificate.certificateNumber}
          onChange={(v) => setDraft((d) => ({ ...d, certificateNumber: v }))}
        />
        <InputField
          label="Certificate Date"
          type="date"
          value={certificate.certificateDate}
          onChange={(v) => setDraft((d) => ({ ...d, certificateDate: v }))}
        />
        <SelectField
          label="Client"
          value={certificate.clientId}
          items={useClientStore.getState().getClients().map((c) => ({
            value: c.id,
            label: `${c.name}${c.location ? ` (${c.location})` : ''}`,
          }))}
          onChange={(v) => setDraft((d) => ({ ...d, clientId: v }))}
          placeholder="Select client"
        />
        <InputField
          label="Invoice Number"
          value={certificate.invoiceNumber ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, invoiceNumber: v }))}
        />
        <InputField
          label="Invoice Date"
          type="date"
          value={certificate.invoiceDate ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, invoiceDate: v }))}
        />
        <InputField
          label="Delivery Condition"
          value={certificate.deliveryCondition ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, deliveryCondition: v }))}
        />
        <InputField
          label="Material"
          value={certificate.material ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, material: v }))}
        />
        <InputField
          label="Grade"
          value={certificate.grade ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, grade: v }))}
        />
      </div>
    </SectionCard>
  )
}

function ReviewItems({
  certificate,
  setDraft,
}: {
  certificate: Certificate
  setDraft: DraftSetter
}) {
  const itemStore = useItemStore.getState()

  const updateItemQty = (itemId: string, qty: number) => {
    setDraft((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === itemId ? { ...i, quantity: qty || 0 } : i)),
    }))
  }

  const updateLinkQty = (linkId: string, qty: number) => {
    setDraft((d) => ({
      ...d,
      heatRecords: d.heatRecords.map((h) => (h.id === linkId ? { ...h, quantity: qty || 0 } : h)),
    }))
  }

  const removeItem = (itemId: string) => {
    setDraft((d) => {
      const target = d.items.find((i) => i.id === itemId)
      if (!target) return d
      const removed = new Set(target.heatRecordIds)
      return {
        ...d,
        items: d.items.filter((i) => i.id !== itemId),
        heatRecords: d.heatRecords.filter((h) => !removed.has(h.id)),
      }
    })
  }

  const removeLink = (itemId: string, linkId: string) => {
    setDraft((d) => ({
      ...d,
      heatRecords: d.heatRecords.filter((h) => h.id !== linkId),
      items: d.items.map((i) =>
        i.id === itemId
          ? { ...i, heatRecordIds: i.heatRecordIds.filter((id) => id !== linkId) }
          : i,
      ),
    }))
  }

  if (certificate.items.length === 0) {
    return (
      <SectionCard title="Items & Heat Records">
        <p className="text-sm text-muted-foreground">No items added.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Items & Heat Records">
      {certificate.items.map((item) => {
        const itemData = itemStore.getItem(item.itemId)
        return (
          <div key={item.id} className="rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
              <div>
                <span className="font-medium">{itemData?.name ?? item.itemId}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {itemData?.partNumber ?? ''} | {itemData?.material ?? ''} | {itemData?.grade ?? ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  Qty
                  <input
                    type="number"
                    min={1}
                    className="w-20 rounded-md border border-input px-2 py-1 text-sm"
                    value={item.quantity}
                    onChange={(e) => updateItemQty(item.id, Number(e.target.value))}
                  />
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2 p-4">
              {item.heatRecordIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No heat records attached.</p>
              ) : (
                item.heatRecordIds.map((linkId) => {
                  const link = certificate.heatRecords.find((h) => h.id === linkId)
                  if (!link) return null
                  const hr = useHeatRecordStore.getState().getHeatRecord(link.heatRecordId)
                  return (
                    <div
                      key={linkId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{hr?.dailyHeatNumber ?? link.heatRecordId}</Badge>
                        {hr?.batchNumber ? (
                          <span className="text-xs text-muted-foreground">Batch: {hr.batchNumber}</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-sm">
                          Qty
                          <input
                            type="number"
                            min={1}
                            className="w-16 rounded-md border border-input px-2 py-1 text-sm"
                            value={link.quantity}
                            onChange={(e) => updateLinkQty(link.id, Number(e.target.value))}
                          />
                        </label>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeLink(item.id, link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </SectionCard>
  )
}

function ReviewFooter({
  certificate,
  setDraft,
}: {
  certificate: Certificate
  setDraft: DraftSetter
}) {
  return (
    <SectionCard title="Remarks, Certification & Authorization">
      <TextAreaField
        label="Remarks"
        value={certificate.remarks ?? ''}
        onChange={(v) => setDraft((d) => ({ ...d, remarks: v }))}
      />
      <TextAreaField
        label="Certification Statement"
        value={certificate.certificationStatement ?? ''}
        onChange={(v) => setDraft((d) => ({ ...d, certificationStatement: v }))}
      />
      <TextAreaField
        label="Company Authorization Text"
        value={certificate.companyAuthorizationText ?? ''}
        onChange={(v) => setDraft((d) => ({ ...d, companyAuthorizationText: v }))}
        rows={2}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InputField label="Tested By" value={certificate.testedBy ?? ''} onChange={(v) => setDraft((d) => ({ ...d, testedBy: v }))} />
        <InputField label="Reviewed By" value={certificate.reviewedBy ?? ''} onChange={(v) => setDraft((d) => ({ ...d, reviewedBy: v }))} />
        <InputField label="Approved By" value={certificate.approvedBy ?? ''} onChange={(v) => setDraft((d) => ({ ...d, approvedBy: v }))} />
      </div>
    </SectionCard>
  )
}

function ReviewReports({ certificate }: { certificate: Certificate }) {
  return (
    <SectionCard title="Uploaded Reports">
      {certificate.reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports uploaded.</p>
      ) : (
        <div className="space-y-2">
          {certificate.reports.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.fileName}</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(r.fileSize / 1024)} KB
                </span>
              </div>
              <Badge variant={r.status === 'READY' ? 'default' : 'secondary'}>{r.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
