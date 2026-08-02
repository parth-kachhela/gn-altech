export type HeatRecordStatus = 'ACTIVE' | 'USED' | 'ARCHIVED'

export type TestResult = 'PASS' | 'FAIL' | 'CONDITIONAL' | 'PENDING'

export type ReportType = 'CHEMICAL' | 'MECHANICAL' | 'MICRO_STRUCTURE'

export type UploadStatus = 'UPLOADING' | 'PARSING' | 'READY' | 'ERROR'

export type CertificateStatus = 'DRAFT' | 'REPORTS_PENDING' | 'READY' | 'ISSUED'

export interface Client {
  id: string
  name: string
  location?: string
  contactPerson?: string
  email?: string
  phone?: string
  gstin?: string
  address?: string
  createdAt: string
  updatedAt: string
}

export interface Item {
  id: string
  name: string
  partNumber: string
  material: string
  grade: string
  description?: string
  unit?: string
  createdAt: string
  updatedAt: string
}

export interface HeatRecord {
  id: string
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
  status: HeatRecordStatus
  createdAt: string
  updatedAt: string
}

export interface TestParameterRow {
  id: string
  label: string
  minimum?: string
  maximum?: string
  observed?: string
  unit?: string
  result: TestResult
  resultManual?: boolean
}

export interface CertificateItem {
  id: string
  itemId: string
  quantity: number
  heatRecordIds: string[]
}

export interface CertificateHeatRecord {
  id: string
  heatRecordId: string
  itemId: string
  quantity: number
}

export interface AdditionalTestRow {
  id: string
  label: string
  value: string
}

export interface UploadedReport {
  id: string
  reportType: ReportType
  fileName: string
  fileSize: number
  parsedText: string
  parsedValues: Record<string, string>
  status: UploadStatus
  errorMessage?: string
}

export interface OverallOverride {
  value: TestResult
  reason: string
}

export interface Certificate {
  id: string
  certificateNumber: string
  certificateDate: string
  title: string
  companyName: string
  clientId: string
  invoiceNumber?: string
  invoiceDate?: string
  deliveryCondition?: string
  material?: string
  grade?: string
  formatNumber?: string
  revisionText?: string
  standardReference?: string
  licenseNumber?: string
  items: CertificateItem[]
  heatRecords: CertificateHeatRecord[]
  chemicalRows: TestParameterRow[]
  mechanicalRows: TestParameterRow[]
  microStructureRows: TestParameterRow[]
  additionalTests: AdditionalTestRow[]
  remarks?: string
  certificationStatement?: string
  companyAuthorizationText?: string
  testedBy?: string
  reviewedBy?: string
  approvedBy?: string
  signatureImage?: string
  stampImage?: string
  reports: UploadedReport[]
  status: CertificateStatus
  overallResultOverride?: OverallOverride
  createdAt: string
  updatedAt: string
}
