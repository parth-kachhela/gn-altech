import * as XLSX from 'xlsx'
import type { Certificate, MasterSection } from '@/types'
import { sampleContexts, reportFor } from '@/lib/certificateStatus'
import { validateValue } from '@/lib/validation'
import { matchParameter } from '@/lib/validation'
import { certificateFileName } from '@/lib/certificateNo'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'

export function exportCertificateToExcel(certificate: Certificate): void {
  const cert = certificate
  const snap = cert.productSnapshot
  const heatRecords = useHeatRecordStore.getState().heatRecords
  const auditLogs = useAuditStore.getState().getLogs()

  const wb = XLSX.utils.book_new()

  const summary: (string | number)[][] = [
    ['GN ALTECH PRIVATE LIMITED - TEST CERTIFICATE'],
    [],
    ['Field', 'Value'],
    ['Certificate Number', cert.certificateNumber],
    ['Certificate Date', cert.certificateDate],
    ['SAP No.', snap?.sapNo ?? ''],
    ['Part No.', snap?.partNo ?? ''],
    ['Description', snap?.description ?? ''],
    ['Material', snap?.material ?? ''],
    ['Grade', snap?.grade ?? ''],
    ['Customer', snap?.customer ?? ''],
    ['Master Revision', snap?.revision ?? ''],
    ['Invoice / Challan Number', cert.invoiceNumber ?? ''],
    ['Invoice Date', cert.invoiceDate ?? ''],
    ['Delivery Condition', cert.deliveryCondition ?? ''],
    ['Status', cert.status],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Certificate Summary')

  const heatRows: (string | number)[][] = [
    ['Sr. No.', 'SAP No.', 'Part No.', 'Description', 'Heat Code', 'Batch No.', 'Sample', 'Status'],
  ]
  cert.selectedHeats.forEach((selection, i) => {
    const contexts = sampleContexts(selection, heatRecords)
    if (contexts.length === 0) {
      heatRows.push([i + 1, snap?.sapNo ?? '', snap?.partNo ?? '', snap?.description ?? '', selection.heatCode, selection.batchNo ?? '', 'Heat Code Only', selection.heatCodeOnly ? 'Heat Code Only' : ''])
    } else {
      contexts.forEach((ctx) => {
        heatRows.push([i + 1, snap?.sapNo ?? '', snap?.partNo ?? '', snap?.description ?? '', selection.heatCode, selection.batchNo ?? '', ctx.label, selection.heatCodeOnly ? 'Heat Code Only' : ''])
      })
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(heatRows), 'Heat Summary')

  const sections = snap?.sections ?? []
  for (const section of sections) {
    const rows: (string | number)[][] = [
      [section.name.toUpperCase()],
      ['Heat Code', 'Sample', 'Parameter', 'Master Specification', 'Observed', 'Unit', 'Result'],
    ]
    for (const selection of cert.selectedHeats) {
      const contexts = sampleContexts(selection, heatRecords)
      for (const ctx of contexts) {
        const report = reportFor(selection, section.key, ctx.sampleId)
        const parsed = report?.parsedValues ?? []
        section.parameters.forEach((p) => {
          const found = parsed.find((v) => matchParameter(p, v.name))
          const value = found?.value ?? ''
          const outcome = value ? validateValue(p, value) : undefined
          rows.push([
            selection.heatCode,
            selection.heatCodeOnly ? 'Heat Code Only' : ctx.label,
            p.name,
            specFor(p),
            value,
            p.unit ?? '',
            outcome ? outcome.result.replace('_', ' ') : 'PENDING',
          ])
        })
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 26 },
      { wch: 26 },
      { wch: 16 },
      { wch: 8 },
      { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, sheetNameFor(section))
  }

  const auditRows: (string | number)[][] = [
    ['Audit Trail'],
    ['Timestamp', 'User', 'Action', 'Entity'],
  ]
  for (const log of auditLogs) {
    auditRows.push([log.timestamp, log.userId, log.action, log.entityType])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(auditRows), 'Audit')

  XLSX.writeFile(wb, `${certificateFileName(cert)}.xlsx`)
}

function specFor(p: { ruleType: string; min?: string; max?: string; expectedValue?: string; sourceText?: string }): string {
  if (p.sourceText) return p.sourceText
  switch (p.ruleType) {
    case 'Range':
      return `${p.min ?? '?'} - ${p.max ?? '?'}`
    case 'Minimum':
      return `${p.min ?? '?'} Min.`
    case 'Maximum':
      return `${p.max ?? '?'} Max.`
    case 'ExactNumber':
    case 'ExactText':
      return p.expectedValue ?? '—'
    default:
      return 'Info'
  }
}

function sheetNameFor(section: MasterSection): string {
  const name = section.name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31)
  return name || section.key
}
