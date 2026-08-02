import type {
  Certificate,
  CertificateItem,
  CertificateHeatRecord,
  HeatRecord,
  TestParameterRow,
  Item,
  ReportType,
  UploadedReport,
} from '@/types'
import { createId, nowIso } from '@/lib/id'
import {
  defaultAdditionalTests,
  defaultChemicalRows,
  defaultMechanicalRows,
  defaultMicroStructureRows,
  DEFAULT_CERTIFICATION_STATEMENT,
  DEFAULT_REMARKS,
} from '@/lib/certDefaults'
import { useSettingsStore } from '@/stores/settingsStore'
import { useClientStore } from '@/stores/clientStore'
import { useItemStore } from '@/stores/itemStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'

export interface HeatRecordInput {
  itemId: string
  dailyHeatNumber: string
  monthlyHeatNumber?: string
  yearlyHeatNumber?: string
  batchNumber?: string
  quantity: number
  quantityUnit: string
  invoiceNumber?: string
  invoiceDate?: string
  deliveryCondition?: string
  productionDate?: string
  remarks?: string
}

export function createHeatRecord(input: HeatRecordInput): HeatRecord {
  const now = nowIso()
  return {
    id: createId(),
    itemId: input.itemId,
    dailyHeatNumber: input.dailyHeatNumber,
    monthlyHeatNumber: input.monthlyHeatNumber,
    yearlyHeatNumber: input.yearlyHeatNumber,
    batchNumber: input.batchNumber,
    quantity: input.quantity,
    quantityUnit: input.quantityUnit || 'Nos.',
    invoiceNumber: input.invoiceNumber,
    invoiceDate: input.invoiceDate,
    deliveryCondition: input.deliveryCondition,
    productionDate: input.productionDate,
    remarks: input.remarks,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  }
}

export interface CertificateInput {
  certificateNumber?: string
  certificateDate?: string
  clientId?: string
}

function getItem(itemId?: string): Item | undefined {
  if (!itemId) return undefined
  return useItemStore.getState().getItem(itemId)
}

export function createCertificate(input: CertificateInput = {}): Certificate {
  const settings = useSettingsStore.getState()
  const now = nowIso()
  return {
    id: createId(),
    certificateNumber: input.certificateNumber ?? '',
    certificateDate: input.certificateDate ?? new Date().toISOString().slice(0, 10),
    title: 'TEST CERTIFICATE',
    companyName: settings.companyName,
    clientId: input.clientId ?? '',
    invoiceNumber: '',
    invoiceDate: '',
    deliveryCondition: '',
    material: '',
    grade: '',
    formatNumber: settings.formatNumber,
    revisionText: settings.revisionText,
    standardReference: settings.standardReference,
    licenseNumber: settings.licenseNumber,
    items: [],
    heatRecords: [],
    chemicalRows: defaultChemicalRows(),
    mechanicalRows: defaultMechanicalRows(),
    microStructureRows: defaultMicroStructureRows(),
    additionalTests: defaultAdditionalTests(),
    remarks: DEFAULT_REMARKS,
    certificationStatement: DEFAULT_CERTIFICATION_STATEMENT,
    companyAuthorizationText: `For ${settings.companyName}`,
    testedBy: '',
    reviewedBy: '',
    approvedBy: '',
    reports: [],
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now,
  }
}

export function createCertificateItem(itemId: string, quantity: number): CertificateItem {
  return {
    id: createId(),
    itemId,
    quantity,
    heatRecordIds: [],
  }
}

export function createCertificateHeatRecord(
  heatRecordId: string,
  itemId: string,
  quantity: number,
): CertificateHeatRecord {
  return {
    id: createId(),
    heatRecordId,
    itemId,
    quantity,
  }
}

export function newTestRow(label = '', observed = ''): TestParameterRow {
  return {
    id: createId(),
    label,
    observed,
    result: 'PENDING',
  }
}

export interface UploadedReportInput {
  reportType: ReportType
  fileName: string
  fileSize: number
  parsedText: string
  parsedValues: Record<string, string>
}

export function createUploadedReport(input: UploadedReportInput): UploadedReport {
  return {
    id: createId(),
    reportType: input.reportType,
    fileName: input.fileName,
    fileSize: input.fileSize,
    parsedText: input.parsedText,
    parsedValues: input.parsedValues,
    status: 'READY',
  }
}

export function suggestCertificateNumber(
  certificates: Certificate[],
): string {
  const year = new Date().getFullYear()
  let max = 0
  for (const c of certificates) {
    const m = c.certificateNumber.match(/(\d+)\s*$/)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `TC-${year}-${String(max + 1).padStart(6, '0')}`
}

export function certificateFileName(cert: Certificate): string {
  const clientName = cert.clientId
    ? useClientStore.getState().getClient(cert.clientId)?.name ?? 'Customer'
    : 'Customer'
  const safeCustomer = clientName
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const safeNo = (cert.certificateNumber || 'CERTIFICATE').replace(/[^a-zA-Z0-9-]+/g, '-')
  return `${safeNo}_${safeCustomer}`
}

export function getCertificateDisplayParts(cert: Certificate): Array<{
  id: string
  quantity: string
  partNumber: string
  description: string
  dailyHeatNumber: string
  monthlyHeatNumber?: string
  yearlyHeatNumber?: string
  batchNumber?: string
}> {
  const parts = []
  for (const item of cert.items) {
    const itemData = getItem(item.itemId)
    for (const hrId of item.heatRecordIds) {
      const hrLink = cert.heatRecords.find((hr) => hr.id === hrId)
      if (!hrLink) continue
      const heatRecord = useHeatRecordStore.getState().getHeatRecord(hrLink.heatRecordId)
      if (!heatRecord) continue
      parts.push({
        id: hrLink.id,
        quantity: `${hrLink.quantity} ${heatRecord.quantityUnit}`,
        partNumber: itemData?.partNumber ?? '',
        description: itemData?.name ?? '',
        dailyHeatNumber: heatRecord.dailyHeatNumber,
        monthlyHeatNumber: heatRecord.monthlyHeatNumber,
        yearlyHeatNumber: heatRecord.yearlyHeatNumber,
        batchNumber: heatRecord.batchNumber,
      })
    }
  }
  return parts
}