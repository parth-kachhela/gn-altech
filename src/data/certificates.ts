import type {
  AdditionalTestRow,
  Certificate,
  CertificateItem,
  CertificateHeatRecord,
  TestParameterRow,
  UploadedReport,
} from '@/types'
import { createId } from '@/lib/id'
import { DEMO_CLIENTS, DEMO_PARTS } from '@/data/demo'
import {
  DEFAULT_ADDITIONAL_TESTS,
  DEFAULT_CERTIFICATION_STATEMENT,
} from '@/lib/certDefaults'
import { calcRowResult } from '@/lib/result'

const A6A_COMMON = {
  clientId: 'client-001',
  itemId: 'part-001',
  certificateNumber: 'TC-2026-000184',
  certificateDate: '2026-07-28',
  invoiceNumber: 'INV-2026-0814',
  invoiceDate: '2026-07-28',
  deliveryCondition: 'As Cast',
}

const A6A_CHEMICAL: TestParameterRow[] = [
  { id: 'a6a-c-1', label: 'Carbon (C)', minimum: '3.00', maximum: '3.50', observed: '3.070', unit: '%', result: 'PASS' },
  { id: 'a6a-c-2', label: 'Silicon (Si)', minimum: '1.50', maximum: '2.20', observed: '1.700', unit: '%', result: 'PASS' },
  { id: 'a6a-c-3', label: 'Manganese (Mn)', minimum: '0.50', maximum: '0.90', observed: '0.742', unit: '%', result: 'PASS' },
  { id: 'a6a-c-4', label: 'Phosphorus (P)', maximum: '0.10', observed: '0.057', unit: '%', result: 'PASS' },
  { id: 'a6a-c-5', label: 'Sulphur (S)', maximum: '0.10', observed: '0.080', unit: '%', result: 'PASS' },
  { id: 'a6a-c-6', label: 'Chromium (Cr)', maximum: '0.50', observed: '0.320', unit: '%', result: 'PASS' },
  { id: 'a6a-c-7', label: 'Magnesium (Mg)', minimum: '0.03', maximum: '0.06', observed: '0.045', unit: '%', result: 'PASS' },
  { id: 'a6a-c-8', label: 'Copper (Cu)', maximum: '0.80', observed: '0.576', unit: '%', result: 'PASS' },
  { id: 'a6a-c-9', label: 'Tin (Sn)', maximum: '0.10', observed: '0.046', unit: '%', result: 'PASS' },
  { id: 'a6a-c-10', label: 'Molybdenum (Mo)', maximum: '0.10', observed: '0.000', unit: '%', result: 'PASS' },
]

const A6A_MECHANICAL: TestParameterRow[] = [
  { id: 'a6a-m-1', label: '0.2% Yield Limit', minimum: '280', observed: '320', unit: 'N/mm2', result: 'PASS' },
  { id: 'a6a-m-2', label: 'Ultimate Tensile Strength', minimum: '450', observed: '520', unit: 'N/mm2', result: 'PASS' },
  { id: 'a6a-m-3', label: 'Elongation', minimum: '7', observed: '8.5', unit: '%', result: 'PASS' },
  { id: 'a6a-m-4', label: 'Hardness', minimum: '180', maximum: '250', observed: '238', unit: 'BHN', result: 'PASS' },
]

const A6A_MICRO: TestParameterRow[] = [
  { id: 'a6a-x-1', label: 'Average Nodularity', minimum: '80', maximum: '100', observed: '85', unit: '%', result: 'PASS' },
  { id: 'a6a-x-2', label: 'Nodule Count', minimum: '100', observed: '180', unit: 'per mm2', result: 'PASS' },
  { id: 'a6a-x-3', label: 'Pearlite', minimum: '30', maximum: '50', observed: '40', unit: '%', result: 'PASS' },
  { id: 'a6a-x-4', label: 'Ferrite', minimum: '50', maximum: '70', observed: '60', unit: '%', result: 'PASS' },
  { id: 'a6a-x-5', label: 'Carbide', minimum: 'NIL', maximum: 'NIL', observed: 'NIL', unit: 'Text', result: 'PASS' },
]

const CHEMICAL_RAW_VALUES: Record<string, string> = {
  REPORT_TYPE: 'CHEMICAL_ANALYSIS',
  CUSTOMER: 'Apex Engineering Private Limited',
  PART_NAME: 'Ductile Iron Pump Housing',
  PART_NO: 'PH-801',
  QTY: '801 Nos.',
  DAILY_HEAT_NO: 'A6A',
  MONTHLY_HEAT_NO: 'AY-001',
  YEARLY_HEAT_NO: '2026',
  BATCH_NO: 'B-0726-04',
  C_PERCENT: '3.070',
  SI_PERCENT: '1.700',
  MN_PERCENT: '0.742',
  P_PERCENT: '0.057',
  S_PERCENT: '0.080',
  CR_PERCENT: '0.320',
  MG_PERCENT: '0.045',
  CU_PERCENT: '0.576',
  SN_PERCENT: '0.046',
  MO_PERCENT: '0.000',
  OVERALL_RESULT: 'PASS',
}

const MECHANICAL_RAW_VALUES: Record<string, string> = {
  REPORT_TYPE: 'MECHANICAL_PROPERTIES',
  CUSTOMER: 'Apex Engineering Private Limited',
  PART_NAME: 'Ductile Iron Pump Housing',
  PART_NO: 'PH-801',
  QTY: '801 Nos.',
  DAILY_HEAT_NO: 'A6A',
  MONTHLY_HEAT_NO: 'AY-001',
  YEARLY_HEAT_NO: '2026',
  BATCH_NO: 'B-0726-04',
  YIELD_STRENGTH: '320',
  YIELD_UNIT: 'N/mm2',
  UTS: '520',
  UTS_UNIT: 'N/mm2',
  ELONGATION: '8.5',
  ELONGATION_UNIT: '%',
  HARDNESS: '238',
  HARDNESS_UNIT: 'BHN',
  OVERALL_RESULT: 'PASS',
}

const MICRO_RAW_VALUES: Record<string, string> = {
  REPORT_TYPE: 'MICRO_STRUCTURE',
  CUSTOMER: 'Apex Engineering Private Limited',
  PART_NAME: 'Ductile Iron Pump Housing',
  PART_NO: 'PH-801',
  QTY: '801 Nos.',
  DAILY_HEAT_NO: 'A6A',
  MONTHLY_HEAT_NO: 'AY-001',
  YEARLY_HEAT_NO: '2026',
  BATCH_NO: 'B-0726-04',
  AVERAGE_NODULARITY: '85',
  NODULARITY_UNIT: '%',
  NODULE_COUNT: '180',
  NODULE_COUNT_UNIT: 'per mm2',
  PEARLITE: '40',
  FERRITE: '60',
  CARBIDE: 'NIL',
  OVERALL_RESULT: 'PASS',
}

function kvText(values: Record<string, string>): string {
  const lines = Object.entries(values).map(([k, v]) => `${k}=${v}`)
  return `Demo text-based PDF for frontend PDF extraction testing. Not an official laboratory report.\nMACHINE-READABLE DATA\n${lines.join('\n')}`
}

function makeReport(
  id: string,
  reportType: UploadedReport['reportType'],
  fileName: string,
  fileSize: number,
  values: Record<string, string>,
): UploadedReport {
  return {
    id,
    reportType,
    fileName,
    fileSize,
    parsedText: kvText(values),
    parsedValues: values,
    status: 'READY',
  }
}

const A6A_REPORTS: UploadedReport[] = [
  makeReport('a6a-rpt-1', 'CHEMICAL', '01_Chemical_Analysis_Report_A6A.pdf', 4270, CHEMICAL_RAW_VALUES),
  makeReport('a6a-rpt-2', 'MECHANICAL', '02_Mechanical_Properties_Report_A6A.pdf', 3863, MECHANICAL_RAW_VALUES),
  makeReport('a6a-rpt-3', 'MICRO_STRUCTURE', '03_Micro_Structure_Report_A6A.pdf', 3917, MICRO_RAW_VALUES),
]

function additionalTests(): AdditionalTestRow[] {
  return DEFAULT_ADDITIONAL_TESTS.map((t) => ({ ...t, id: createId() }))
}

const part = DEMO_PARTS.find((p) => p.id === 'part-001')!

function buildA6ACertificate(): Certificate {
  const item: CertificateItem = {
    id: 'a6a-item-1',
    itemId: 'part-001',
    quantity: 801,
    heatRecordIds: ['heat-a6a'],
  }
  const heatRec: CertificateHeatRecord = {
    id: 'a6a-hr-1',
    heatRecordId: 'heat-a6a',
    itemId: 'part-001',
    quantity: 801,
  }
  return {
    id: 'cert-a6a',
    certificateNumber: A6A_COMMON.certificateNumber,
    certificateDate: A6A_COMMON.certificateDate,
    title: 'TEST CERTIFICATE',
    companyName: 'GN ALTECH PRIVATE LIMITED',
    clientId: A6A_COMMON.clientId,
    invoiceNumber: A6A_COMMON.invoiceNumber,
    invoiceDate: A6A_COMMON.invoiceDate,
    deliveryCondition: A6A_COMMON.deliveryCondition,
    material: part.material,
    grade: part.grade,
    formatNumber: 'F QA 39',
    revisionText: '03 / 15.09.2025',
    standardReference: 'IS 1865',
    licenseNumber: '',
    items: [item],
    heatRecords: [heatRec],
    chemicalRows: A6A_CHEMICAL.map((r) => ({ ...r })),
    mechanicalRows: A6A_MECHANICAL.map((r) => ({ ...r })),
    microStructureRows: A6A_MICRO.map((r) => ({ ...r })),
    additionalTests: additionalTests(),
    remarks: DEFAULT_CERTIFICATION_STATEMENT,
    certificationStatement: DEFAULT_CERTIFICATION_STATEMENT,
    companyAuthorizationText: 'For GN ALTECH PRIVATE LIMITED',
    testedBy: 'Lab Technician',
    reviewedBy: 'Quality Manager',
    approvedBy: 'Plant Head',
    reports: A6A_REPORTS.map((r) => ({ ...r })),
    status: 'READY',
    createdAt: '2026-07-28T10:00:00.000Z',
    updatedAt: '2026-07-28T10:00:00.000Z',
  }
}

interface OtherCertSeed {
  id: string
  clientId: string
  itemId: string
  certificateNumber: string
  certificateDate: string
  invoiceNumber: string
  material: string
  grade: string
  status: Certificate['status']
  withReports: boolean
  heatRecordId: string
  quantity: number
}

const OTHER_SEEDS: OtherCertSeed[] = [
  { id: 'cert-002', clientId: 'client-002', itemId: 'part-002', certificateNumber: 'TC-2026-000183', certificateDate: '2026-07-24', invoiceNumber: 'INV-2026-0802', material: 'Grey Cast Iron', grade: 'IS 210 FG 260', status: 'ISSUED', withReports: true, heatRecordId: 'heat-004', quantity: 250 },
  { id: 'cert-003', clientId: 'client-004', itemId: 'part-004', certificateNumber: 'TC-2026-000182', certificateDate: '2026-07-20', invoiceNumber: 'INV-2026-0804', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 450/10', status: 'READY', withReports: true, heatRecordId: 'heat-008', quantity: 40 },
  { id: 'cert-004', clientId: 'client-003', itemId: 'part-011', certificateNumber: 'TC-2026-000181', certificateDate: '2026-07-17', invoiceNumber: 'INV-2026-0811', material: 'Grey Cast Iron', grade: 'IS 210 FG 260', status: 'ISSUED', withReports: true, heatRecordId: 'heat-011', quantity: 75 },
  { id: 'cert-005', clientId: 'client-007', itemId: 'part-007', certificateNumber: 'TC-2026-000180', certificateDate: '2026-07-12', invoiceNumber: 'INV-2026-0807', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 500/7', status: 'READY', withReports: false, heatRecordId: 'heat-016', quantity: 140 },
  { id: 'cert-006', clientId: 'client-006', itemId: 'part-006', certificateNumber: 'TC-2026-000179', certificateDate: '2026-07-10', invoiceNumber: 'INV-2026-0806', material: 'SG Iron / Ductile Iron', grade: 'IS 1865 SG 600/3', status: 'DRAFT', withReports: false, heatRecordId: 'heat-018', quantity: 265 },
  { id: 'cert-007', clientId: 'client-008', itemId: 'part-008', certificateNumber: 'TC-2026-000178', certificateDate: '2026-07-08', invoiceNumber: 'INV-2026-0813', material: 'Grey Cast Iron', grade: 'IS 3989 Grade 4', status: 'REPORTS_PENDING', withReports: false, heatRecordId: 'heat-020', quantity: 85 },
]

function deriveRowsFor(
  base: TestParameterRow[],
  observedOverrides: Record<string, string>,
): TestParameterRow[] {
  return base.map((r) => {
    const observed = observedOverrides[r.label]
    const result = observed === undefined ? r.result : calcRowResult(r.minimum, r.maximum, observed)
    return {
      ...r,
      id: createId(),
      observed: observed ?? r.observed,
      result,
    }
  })
}

const ALT_CHEMICAL_OBSERVED: Record<string, string> = {
  'Carbon (C)': '3.210',
  'Silicon (Si)': '1.880',
  'Manganese (Mn)': '0.660',
  'Phosphorus (P)': '0.048',
  'Sulphur (S)': '0.072',
  'Chromium (Cr)': '0.210',
  'Magnesium (Mg)': '0.041',
  'Copper (Cu)': '0.380',
  'Tin (Sn)': '0.038',
  'Molybdenum (Mo)': '0.010',
}

const ALT_MECHANICAL_OBSERVED: Record<string, string> = {
  '0.2% Yield Limit': '330',
  'Ultimate Tensile Strength': '535',
  'Elongation': '9.2',
  'Hardness': '242',
}

const ALT_MICRO_OBSERVED: Record<string, string> = {
  'Average Nodularity': '88',
  'Nodule Count': '190',
  'Pearlite': '35',
  'Ferrite': '65',
  'Carbide': 'NIL',
}

function buildOtherCertificate(seed: OtherCertSeed): Certificate {
  const item: CertificateItem = {
    id: createId(),
    itemId: seed.itemId,
    quantity: seed.quantity,
    heatRecordIds: [seed.heatRecordId],
  }
  const heatRec: CertificateHeatRecord = {
    id: createId(),
    heatRecordId: seed.heatRecordId,
    itemId: seed.itemId,
    quantity: seed.quantity,
  }

  const chemical = deriveRowsFor(
    [
      { id: '', label: 'Carbon (C)', minimum: '3.00', maximum: '3.50', unit: '%', result: 'PENDING' },
      { id: '', label: 'Silicon (Si)', minimum: '1.50', maximum: '2.20', unit: '%', result: 'PENDING' },
      { id: '', label: 'Manganese (Mn)', minimum: '0.50', maximum: '0.90', unit: '%', result: 'PENDING' },
      { id: '', label: 'Phosphorus (P)', maximum: '0.10', unit: '%', result: 'PENDING' },
      { id: '', label: 'Sulphur (S)', maximum: '0.10', unit: '%', result: 'PENDING' },
      { id: '', label: 'Chromium (Cr)', maximum: '0.50', unit: '%', result: 'PENDING' },
      { id: '', label: 'Magnesium (Mg)', minimum: '0.03', maximum: '0.06', unit: '%', result: 'PENDING' },
      { id: '', label: 'Copper (Cu)', maximum: '0.80', unit: '%', result: 'PENDING' },
      { id: '', label: 'Tin (Sn)', maximum: '0.10', unit: '%', result: 'PENDING' },
      { id: '', label: 'Molybdenum (Mo)', maximum: '0.10', unit: '%', result: 'PENDING' },
    ],
    ALT_CHEMICAL_OBSERVED,
  )
  const mechanical = deriveRowsFor(
    [
      { id: '', label: '0.2% Yield Limit', minimum: '280', unit: 'N/mm2', result: 'PENDING' },
      { id: '', label: 'Ultimate Tensile Strength', minimum: '450', unit: 'N/mm2', result: 'PENDING' },
      { id: '', label: 'Elongation', minimum: '7', unit: '%', result: 'PENDING' },
      { id: '', label: 'Hardness', minimum: '180', maximum: '250', unit: 'BHN', result: 'PENDING' },
    ],
    ALT_MECHANICAL_OBSERVED,
  )
  const micro = deriveRowsFor(
    [
      { id: '', label: 'Average Nodularity', minimum: '80', maximum: '100', unit: '%', result: 'PENDING' },
      { id: '', label: 'Nodule Count', minimum: '100', unit: 'per mm2', result: 'PENDING' },
      { id: '', label: 'Pearlite', minimum: '30', maximum: '50', unit: '%', result: 'PENDING' },
      { id: '', label: 'Ferrite', minimum: '50', maximum: '70', unit: '%', result: 'PENDING' },
      { id: '', label: 'Carbide', minimum: 'NIL', maximum: 'NIL', unit: 'Text', result: 'PENDING' },
    ],
    ALT_MICRO_OBSERVED,
  )

  const part = DEMO_PARTS.find((p) => p.id === seed.itemId)!
  const client = DEMO_CLIENTS.find((c) => c.id === seed.clientId)!

  const reports: UploadedReport[] = seed.withReports
    ? [
        makeReport(`${seed.id}-rpt-1`, 'CHEMICAL', '01_Chemical_Analysis_Report.pdf', 4270, {
          REPORT_TYPE: 'CHEMICAL_ANALYSIS',
          CUSTOMER: client.name,
          PART_NAME: part.name,
          PART_NO: part.partNumber,
          QTY: `${seed.quantity} Nos.`,
          DAILY_HEAT_NO: 'A6A',
          MONTHLY_HEAT_NO: 'AY-001',
          YEARLY_HEAT_NO: '2026',
          BATCH_NO: 'B-0726-04',
          ...chemical.reduce<Record<string, string>>((acc, r) => {
            acc[`${r.label}OBS`] = r.observed ?? ''
            return acc
          }, {}),
          OVERALL_RESULT: 'PASS',
        }),
        makeReport(`${seed.id}-rpt-2`, 'MECHANICAL', '02_Mechanical_Properties_Report.pdf', 3863, {
          REPORT_TYPE: 'MECHANICAL_PROPERTIES',
          CUSTOMER: client.name,
          PART_NAME: part.name,
          PART_NO: part.partNumber,
          QTY: `${seed.quantity} Nos.`,
          DAILY_HEAT_NO: 'A6A',
          MONTHLY_HEAT_NO: 'AY-001',
          YEARLY_HEAT_NO: '2026',
          BATCH_NO: 'B-0726-04',
          YIELD_STRENGTH: ALT_MECHANICAL_OBSERVED['0.2% Yield Limit'],
          YIELD_UNIT: 'N/mm2',
          UTS: ALT_MECHANICAL_OBSERVED['Ultimate Tensile Strength'],
          UTS_UNIT: 'N/mm2',
          ELONGATION: ALT_MECHANICAL_OBSERVED['Elongation'],
          ELONGATION_UNIT: '%',
          HARDNESS: ALT_MECHANICAL_OBSERVED['Hardness'],
          HARDNESS_UNIT: 'BHN',
          OVERALL_RESULT: 'PASS',
        }),
        makeReport(`${seed.id}-rpt-3`, 'MICRO_STRUCTURE', '03_Micro_Structure_Report.pdf', 3917, {
          REPORT_TYPE: 'MICRO_STRUCTURE',
          CUSTOMER: client.name,
          PART_NAME: part.name,
          PART_NO: part.partNumber,
          QTY: `${seed.quantity} Nos.`,
          DAILY_HEAT_NO: 'A6A',
          MONTHLY_HEAT_NO: 'AY-001',
          YEARLY_HEAT_NO: '2026',
          BATCH_NO: 'B-0726-04',
          AVERAGE_NODULARITY: ALT_MICRO_OBSERVED['Average Nodularity'],
          NODULARITY_UNIT: '%',
          NODULE_COUNT: ALT_MICRO_OBSERVED['Nodule Count'],
          NODULE_COUNT_UNIT: 'per mm2',
          PEARLITE: ALT_MICRO_OBSERVED['Pearlite'],
          FERRITE: ALT_MICRO_OBSERVED['Ferrite'],
          CARBIDE: ALT_MICRO_OBSERVED['Carbide'],
          OVERALL_RESULT: 'PASS',
        }),
      ]
    : []

  return {
    id: seed.id,
    certificateNumber: seed.certificateNumber,
    certificateDate: seed.certificateDate,
    title: 'TEST CERTIFICATE',
    companyName: 'GN ALTECH PRIVATE LIMITED',
    clientId: seed.clientId,
    invoiceNumber: seed.invoiceNumber,
    invoiceDate: seed.certificateDate,
    deliveryCondition: 'As Cast',
    material: seed.material,
    grade: seed.grade,
    formatNumber: 'F QA 39',
    revisionText: '03 / 15.09.2025',
    standardReference: 'IS 1865',
    licenseNumber: '',
    items: [item],
    heatRecords: [heatRec],
    chemicalRows: chemical,
    mechanicalRows: mechanical,
    microStructureRows: micro,
    additionalTests: additionalTests(),
    remarks: DEFAULT_CERTIFICATION_STATEMENT,
    certificationStatement: DEFAULT_CERTIFICATION_STATEMENT,
    companyAuthorizationText: 'For GN ALTECH PRIVATE LIMITED',
    testedBy: 'Lab Technician',
    reviewedBy: 'Quality Manager',
    approvedBy: 'Plant Head',
    reports,
    status: seed.status,
    createdAt: `${seed.certificateDate}T10:00:00.000Z`,
    updatedAt: `${seed.certificateDate}T10:00:00.000Z`,
  }
}

export function buildDemoCertificates(): Certificate[] {
  const certs = OTHER_SEEDS.map(buildOtherCertificate)
  return [buildA6ACertificate(), ...certs]
}

export function buildA6ACertificateRecord(): Certificate {
  return buildA6ACertificate()
}

export const A6A_RAW_VALUES = {
  chemical: CHEMICAL_RAW_VALUES,
  mechanical: MECHANICAL_RAW_VALUES,
  micro: MICRO_RAW_VALUES,
}