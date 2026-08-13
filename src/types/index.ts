export type RuleType =
  | 'Range'
  | 'Minimum'
  | 'Maximum'
  | 'ExactNumber'
  | 'ExactText'
  | 'Informational'

export const STANDARD_SECTION_KEYS = [
  'CHEMICAL',
  'MECHANICAL',
  'HARDNESS',
  'MICRO',
  'TENSILE',
] as const

export type StandardSectionKey = (typeof STANDARD_SECTION_KEYS)[number]

export type ParameterResult =
  | 'PASS'
  | 'FAIL'
  | 'NOT_VALIDATED'
  | 'TEXT_MATCH'
  | 'PENDING'
  | 'WARNING'

export type SourceType = 'UPLOADED' | 'REPEATED' | 'SUGGESTED' | 'MANUAL' | 'DEPARTMENT' | 'DEMO'

export type ReportStatus =
  | 'NOT_STARTED'
  | 'REQUESTED'
  | 'UPLOADED'
  | 'PARSING'
  | 'NEEDS_REVIEW'
  | 'COMPLETE'
  | 'WARNING'
  | 'FAILED_SPEC'
  | 'OPTIONAL'

export type CertificateStatus =
  | 'DRAFT'
  | 'REPORTS_PENDING'
  | 'WAITING_FOR_DEPARTMENT'
  | 'READY_FOR_REVIEW'
  | 'REVIEWED'
  | 'ISSUED'

export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'UPLOADED' | 'REVIEWED' | 'CANCELLED'

export type HeatRecordStatus = 'ACTIVE' | 'INACTIVE'

export interface MasterParameter {
  id: string
  name: string
  aliases: string[]
  ruleType: RuleType
  min?: string
  max?: string
  expectedValue?: string
  unit?: string
  sourceText?: string
  required: boolean
  order: number
}

export interface MasterSection {
  id: string
  name: string
  key: string
  required: boolean
  order: number
  fileTypeHint?: string
  parameters: MasterParameter[]
}

export interface ProductMaster {
  id: string
  sapNo: string
  partNo: string
  description: string
  material: string
  customer: string
  grade?: string
  revision: number
  status: 'ACTIVE' | 'INACTIVE'
  sections: MasterSection[]
  createdAt: string
  updatedAt: string
}

export interface HeatSample {
  id: string
  label: string
  quantity?: string
}

export interface HeatReportRequest {
  id: string
  sectionKey: string
  sectionName: string
  department: string
  sampleId?: string
  sampleLabel?: string
  status: RequestStatus
}

export interface HeatReportData {
  id: string
  sectionKey: string
  sectionName: string
  sampleId?: string
  sampleLabel?: string
  parsedValues: ParsedValue[]
  confirmed: boolean
  fileMetadata?: ReportFileMetadata
  warnings: string[]
  uploadedBy?: string
  uploadedAt?: string
  status?: ReportStatus
}

export interface HeatRecord {
  id: string
  sapNo: string
  heatCode: string
  batchNo?: string
  quantity?: string
  date?: string
  status: HeatRecordStatus
  heats: HeatSample[]
  demoReports: Record<string, string>
  requests: HeatReportRequest[]
  reports: HeatReportData[]
  createdAt: string
  updatedAt: string
}

export interface ParsedValue {
  name: string
  normalizedName?: string
  value: string
  unit?: string
  originalLabel?: string
  confidence?: number
}

export interface ReportFileMetadata {
  fileName: string
  fileSize: number
  mimeType: string
  storedKey: string
}

export interface ParsedReportResult {
  detectedSAPNo?: string
  detectedHeatCode?: string
  detectedHeatSample?: string
  detectedPartNo?: string
  detectedCustomer?: string
  detectedMaterial?: string
  parameters: ParsedValue[]
  rawText: string
  warnings: string[]
  confidence: number
}

export interface ReportRecord {
  id: string
  sectionId: string
  sectionKey: string
  sectionName: string
  heatSampleId?: string
  heatSampleLabel?: string
  fileMetadata?: ReportFileMetadata
  demoPath?: string
  parsedValues: ParsedValue[]
  confirmed: boolean
  sourceType: SourceType
  sourceRef?: {
    certificateId: string
    heatCode: string
    heatSampleId?: string
    sectionKey: string
    reportId: string
  }
  suggestedValues?: ParsedValue[]
  warnings: string[]
  status?: ReportStatus
  uploadedBy?: string
  uploadedAt?: string
  departmentRequestId?: string
}

export interface CertificateHeatSelection {
  id: string
  heatRecordId: string
  heatCode: string
  batchNo?: string
  heatCodeOnly: boolean
  includeHeatLevel?: boolean
  selectedSamples: string[]
  reportRecords: ReportRecord[]
}

export interface Certificate {
  id: string
  certificateNumber: string
  certificateDate: string
  invoiceNumber?: string
  invoiceDate?: string
  deliveryCondition?: string
  remarks?: string
  productMasterId: string
  productMasterRevision: number
  productSnapshot: ProductMaster
  selectedHeats: CertificateHeatSelection[]
  status: CertificateStatus
  reviewed: boolean
  testedBy?: string
  reviewedBy?: string
  approvedBy?: string
  issuedAt?: string
  createdAt: string
  updatedAt: string
}

export interface RequestComment {
  id: string
  text: string
  user: string
  at: string
}

export interface DepartmentRequest {
  id: string
  certificateId: string
  certificateNo: string
  sapNo: string
  partNo?: string
  heatCode: string
  heatSample?: string
  sectionKey: string
  sectionName: string
  reportType: string
  department: string
  requestedBy: string
  requestedAt: string
  priority?: string
  comment?: string
  status: RequestStatus
  reportRecordId?: string
  comments: RequestComment[]
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId?: string
  timestamp: string
  before?: unknown
  after?: unknown
}

export type AppRole = 'SUPER_ADMIN' | 'QA_ADMIN' | 'DEPARTMENT_UPLOADER'

export interface AppUser {
  id: string
  name: string
  role: AppRole
  department?: string
}
