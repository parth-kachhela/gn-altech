import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useCertificateStore } from '@/stores/certificateStore'
import { useUsersStore } from '@/stores/usersStore'
import { departmentForSectionKey } from '@/lib/permissions'
import { createId, nowIso } from '@/lib/id'
import type { ProductMaster, ParsedValue, HeatReportData, HeatReportRequest, HeatSample } from '@/types'
import {
  CHEM_G6E,
  CHEM_GZ56_A,
  CHEM_GZ56_B,
  CHEM_GZ1026,
  TENSILE_VALUES,
  HARDNESS_VALUES,
  MICRO_STANDARD_VALUES,
} from '@/data/demoReportFixtures'

/**
 * Genuine Product Masters derived directly from Master.xlsx
 */
export const GENUINE_PRODUCT_MASTERS: Array<Omit<ProductMaster, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    sapNo: 'PR01CI0459CA',
    partNo: '8682-904-00Z',
    description: 'COVER CASTING',
    material: 'FG-260',
    customer: 'Parker Hanifin',
    grade: 'FG-260',
    revision: 1,
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec-chem-0459',
        name: 'Chemical Analysis',
        key: 'CHEMICAL',
        required: true,
        order: 0,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p-c', name: 'C', unit: '%', min: '3.00', max: '3.50', ruleType: 'Range', required: true, order: 0, aliases: [] },
          { id: 'p-si', name: 'Si', unit: '%', min: '1.60', max: '2.20', ruleType: 'Range', required: true, order: 1, aliases: [] },
          { id: 'p-mn', name: 'Mn', unit: '%', min: '0.40', max: '0.90', ruleType: 'Range', required: true, order: 2, aliases: [] },
          { id: 'p-p', name: 'P', unit: '%', max: '0.20', ruleType: 'Maximum', required: true, order: 3, aliases: [] },
          { id: 'p-s', name: 'S', unit: '%', max: '0.12', ruleType: 'Maximum', required: true, order: 4, aliases: [] },
          { id: 'p-cr', name: 'Cr', unit: '%', max: '0.40', ruleType: 'Maximum', required: true, order: 5, aliases: [] },
          { id: 'p-mg', name: 'Mg', unit: '%', ruleType: 'Informational', required: false, order: 6, aliases: [] },
          { id: 'p-cu', name: 'Cu', unit: '%', max: '0.60', ruleType: 'Maximum', required: true, order: 7, aliases: [] },
          { id: 'p-sn', name: 'Sn', unit: '%', ruleType: 'Informational', required: false, order: 8, aliases: [] },
          { id: 'p-mo', name: 'Mo', unit: '%', ruleType: 'Informational', required: false, order: 9, aliases: [] },
        ],
      },
      {
        id: 'sec-micro-0459',
        name: 'Micro Structure',
        key: 'MICRO',
        required: true,
        order: 1,
        fileTypeHint: 'BMP / PNG / JPG',
        parameters: [
          { id: 'p-nod', name: 'Nodularity', unit: '%', expectedValue: "PRDOMINANTALY TYPE 'A'", ruleType: 'Informational', required: true, order: 0, aliases: [] },
          { id: 'p-nodcnt', name: 'Nodule Count', unit: '/mm2', expectedValue: '4-6', ruleType: 'Informational', required: true, order: 1, aliases: [] },
          { id: 'p-pear', name: 'Pearlite', unit: '%', min: '90', ruleType: 'Minimum', required: true, order: 2, aliases: [] },
          { id: 'p-ferr', name: 'Ferrite', unit: '%', max: '10', ruleType: 'Maximum', required: true, order: 3, aliases: [] },
          { id: 'p-carb', name: 'Carbide', unit: '', expectedValue: 'TRACES', ruleType: 'Informational', required: true, order: 4, aliases: [] },
        ],
      },
      {
        id: 'sec-tens-0459',
        name: 'Tensile',
        key: 'TENSILE',
        required: true,
        order: 2,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p-yield', name: '0.2% Yield Limit', unit: 'N/mm2', ruleType: 'Informational', required: false, order: 0, aliases: [] },
          { id: 'p-uts', name: 'Ultimate Tensile Strength', unit: 'N/mm2', min: '239', ruleType: 'Minimum', required: true, order: 1, aliases: [] },
          { id: 'p-elong', name: 'Elongation', unit: '%', ruleType: 'Informational', required: false, order: 2, aliases: [] },
        ],
      },
      {
        id: 'sec-hard-0459',
        name: 'Hardness',
        key: 'HARDNESS',
        required: true,
        order: 3,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p-hard', name: 'Hardness', unit: 'BHN', min: '197', max: '217', ruleType: 'Range', required: true, order: 0, aliases: [] },
        ],
      },
    ],
  },
  {
    sapNo: 'PR01CI0461CA',
    partNo: '8682-936-00E',
    description: 'PGP620 MOUNTING FLANGE CASTING H3',
    material: 'FG-260',
    customer: 'Parker Hanifin',
    grade: 'FG-260',
    revision: 1,
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec-chem-0461',
        name: 'Chemical Analysis',
        key: 'CHEMICAL',
        required: true,
        order: 0,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p2-c', name: 'C', unit: '%', min: '3.00', max: '3.50', ruleType: 'Range', required: true, order: 0, aliases: [] },
          { id: 'p2-si', name: 'Si', unit: '%', min: '1.60', max: '2.20', ruleType: 'Range', required: true, order: 1, aliases: [] },
          { id: 'p2-mn', name: 'Mn', unit: '%', min: '0.40', max: '0.90', ruleType: 'Range', required: true, order: 2, aliases: [] },
          { id: 'p2-p', name: 'P', unit: '%', max: '0.20', ruleType: 'Maximum', required: true, order: 3, aliases: [] },
          { id: 'p2-s', name: 'S', unit: '%', max: '0.12', ruleType: 'Maximum', required: true, order: 4, aliases: [] },
          { id: 'p2-cr', name: 'Cr', unit: '%', max: '0.40', ruleType: 'Maximum', required: true, order: 5, aliases: [] },
          { id: 'p2-mg', name: 'Mg', unit: '%', ruleType: 'Informational', required: false, order: 6, aliases: [] },
          { id: 'p2-cu', name: 'Cu', unit: '%', max: '0.60', ruleType: 'Maximum', required: true, order: 7, aliases: [] },
        ],
      },
      {
        id: 'sec-micro-0461',
        name: 'Micro Structure',
        key: 'MICRO',
        required: true,
        order: 1,
        fileTypeHint: 'BMP / PNG / JPG',
        parameters: [
          { id: 'p2-nod', name: 'Nodularity', unit: '%', expectedValue: "PRDOMINANTALY TYPE 'A'", ruleType: 'Informational', required: true, order: 0, aliases: [] },
          { id: 'p2-nodcnt', name: 'Nodule Count', unit: '/mm2', expectedValue: '4-6', ruleType: 'Informational', required: true, order: 1, aliases: [] },
          { id: 'p2-pear', name: 'Pearlite', unit: '%', min: '90', ruleType: 'Minimum', required: true, order: 2, aliases: [] },
          { id: 'p2-ferr', name: 'Ferrite', unit: '%', max: '10', ruleType: 'Maximum', required: true, order: 3, aliases: [] },
          { id: 'p2-carb', name: 'Carbide', unit: '', expectedValue: 'TRACES', ruleType: 'Informational', required: true, order: 4, aliases: [] },
        ],
      },
      {
        id: 'sec-tens-0461',
        name: 'Tensile',
        key: 'TENSILE',
        required: true,
        order: 2,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p2-uts', name: 'Ultimate Tensile Strength', unit: 'N/mm2', min: '239', ruleType: 'Minimum', required: true, order: 0, aliases: [] },
        ],
      },
      {
        id: 'sec-hard-0461',
        name: 'Hardness',
        key: 'HARDNESS',
        required: true,
        order: 3,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p2-hard', name: 'Hardness', unit: 'BHN', min: '197', max: '217', ruleType: 'Range', required: true, order: 0, aliases: [] },
        ],
      },
    ],
  },
  {
    sapNo: 'PR01CI1632CA',
    partNo: 'MF012996',
    description: 'HOUSING CASTING',
    material: 'EN-GJL-300',
    customer: 'Parker Hanifin',
    grade: 'EN-GJL-300',
    revision: 1,
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec-chem-1632',
        name: 'Chemical Analysis',
        key: 'CHEMICAL',
        required: true,
        order: 0,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p3-c', name: 'C', unit: '%', min: '3.00', max: '3.25', ruleType: 'Range', required: true, order: 0, aliases: [] },
          { id: 'p3-si', name: 'Si', unit: '%', min: '1.70', max: '1.95', ruleType: 'Range', required: true, order: 1, aliases: [] },
          { id: 'p3-mn', name: 'Mn', unit: '%', min: '0.80', max: '0.90', ruleType: 'Range', required: true, order: 2, aliases: [] },
          { id: 'p3-p', name: 'P', unit: '%', min: '0.04', max: '0.075', ruleType: 'Range', required: true, order: 3, aliases: [] },
          { id: 'p3-s', name: 'S', unit: '%', min: '0.06', max: '0.10', ruleType: 'Range', required: true, order: 4, aliases: [] },
          { id: 'p3-cr', name: 'Cr', unit: '%', min: '0.20', max: '0.25', ruleType: 'Range', required: true, order: 5, aliases: [] },
          { id: 'p3-cu', name: 'Cu', unit: '%', min: '0.55', max: '0.65', ruleType: 'Range', required: true, order: 6, aliases: [] },
        ],
      },
      {
        id: 'sec-micro-1632',
        name: 'Micro Structure',
        key: 'MICRO',
        required: true,
        order: 1,
        fileTypeHint: 'BMP / PNG / JPG',
        parameters: [
          { id: 'p3-nod', name: 'Nodularity', unit: '%', expectedValue: 'A type 80% Min', ruleType: 'Minimum', min: '80', required: true, order: 0, aliases: [] },
          { id: 'p3-nodcnt', name: 'Nodule Count', unit: '/mm2', expectedValue: '3-6', ruleType: 'Informational', required: true, order: 1, aliases: [] },
          { id: 'p3-pear', name: 'Pearlite', unit: '%', min: '90', ruleType: 'Minimum', required: true, order: 2, aliases: [] },
          { id: 'p3-ferr', name: 'Ferrite', unit: '%', max: '10', ruleType: 'Maximum', required: true, order: 3, aliases: [] },
          { id: 'p3-carb', name: 'Carbide', unit: '', expectedValue: 'NIL', ruleType: 'Informational', required: true, order: 4, aliases: [] },
        ],
      },
      {
        id: 'sec-tens-1632',
        name: 'Tensile',
        key: 'TENSILE',
        required: true,
        order: 2,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p3-uts', name: 'Ultimate Tensile Strength', unit: 'N/mm2', min: '283', ruleType: 'Minimum', required: true, order: 0, aliases: [] },
        ],
      },
      {
        id: 'sec-hard-1632',
        name: 'Hardness',
        key: 'HARDNESS',
        required: true,
        order: 3,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p3-hard', name: 'Hardness', unit: 'BHN', min: '187', max: '255', ruleType: 'Range', required: true, order: 0, aliases: [] },
        ],
      },
    ],
  },
  {
    sapNo: 'RX05SG1849CA',
    partNo: 'R908107005',
    description: 'RCS CORPS DE SORTIE BRUT',
    material: 'EN-GJS-500-7',
    customer: 'BOSCH REXROTH',
    grade: 'EN-GJS-500-7',
    revision: 1,
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec-chem-1849',
        name: 'Chemical Analysis',
        key: 'CHEMICAL',
        required: true,
        order: 0,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p4-c', name: 'C', unit: '%', min: '3.0', max: '3.7', ruleType: 'Range', required: true, order: 0, aliases: [] },
          { id: 'p4-si', name: 'Si', unit: '%', min: '2.0', max: '2.8', ruleType: 'Range', required: true, order: 1, aliases: [] },
          { id: 'p4-mn', name: 'Mn', unit: '%', min: '0.3', max: '0.7', ruleType: 'Range', required: true, order: 2, aliases: [] },
          { id: 'p4-p', name: 'P', unit: '%', max: '0.05', ruleType: 'Maximum', required: true, order: 3, aliases: [] },
          { id: 'p4-s', name: 'S', unit: '%', max: '0.02', ruleType: 'Maximum', required: true, order: 4, aliases: [] },
          { id: 'p4-cr', name: 'Cr', unit: '%', max: '0.03', ruleType: 'Maximum', required: true, order: 5, aliases: [] },
          { id: 'p4-mg', name: 'Mg', unit: '%', min: '0.03', max: '0.06', ruleType: 'Range', required: true, order: 6, aliases: [] },
          { id: 'p4-cu', name: 'Cu', unit: '%', max: '0.5', ruleType: 'Maximum', required: true, order: 7, aliases: [] },
        ],
      },
      {
        id: 'sec-micro-1849',
        name: 'Micro Structure',
        key: 'MICRO',
        required: true,
        order: 1,
        fileTypeHint: 'BMP / PNG / JPG',
        parameters: [
          { id: 'p4-nod', name: 'Nodularity', unit: '%', min: '85', ruleType: 'Minimum', required: true, order: 0, aliases: [] },
          { id: 'p4-pear', name: 'Pearlite', unit: '%', max: '60', ruleType: 'Maximum', required: true, order: 1, aliases: [] },
          { id: 'p4-ferr', name: 'Ferrite', unit: '%', expectedValue: 'BALANCED', ruleType: 'Informational', required: true, order: 2, aliases: [] },
          { id: 'p4-carb', name: 'Carbide', unit: '%', max: '0.05', ruleType: 'Maximum', required: true, order: 3, aliases: [] },
        ],
      },
      {
        id: 'sec-tens-1849',
        name: 'Tensile',
        key: 'TENSILE',
        required: true,
        order: 2,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p4-yield', name: '0.2% Yield Limit', unit: 'N/mm2', min: '280', ruleType: 'Minimum', required: true, order: 0, aliases: [] },
          { id: 'p4-uts', name: 'Ultimate Tensile Strength', unit: 'N/mm2', min: '450', ruleType: 'Minimum', required: true, order: 1, aliases: [] },
          { id: 'p4-elong', name: 'Elongation', unit: '%', min: '5', ruleType: 'Minimum', required: true, order: 2, aliases: [] },
        ],
      },
      {
        id: 'sec-hard-1849',
        name: 'Hardness',
        key: 'HARDNESS',
        required: true,
        order: 3,
        fileTypeHint: 'PDF',
        parameters: [
          { id: 'p4-hard', name: 'Hardness', unit: 'BHN', min: '160', max: '230', ruleType: 'Range', required: true, order: 0, aliases: [] },
        ],
      },
    ],
  },
]

function makeChemValues(c: string, si: string, mn: string, p: string, s: string, cr: string, cu: string, mg = '0.0002'): ParsedValue[] {
  return [
    { name: 'Fe', value: '93.3', unit: '%', confidence: 0.95 },
    { name: 'C', value: c, unit: '%', confidence: 0.95 },
    { name: 'Si', value: si, unit: '%', confidence: 0.95 },
    { name: 'Mn', value: mn, unit: '%', confidence: 0.95 },
    { name: 'P', value: p, unit: '%', confidence: 0.95 },
    { name: 'S', value: s, unit: '%', confidence: 0.95 },
    { name: 'Cr', value: cr, unit: '%', confidence: 0.95 },
    { name: 'Mg', value: mg, unit: '%', confidence: 0.95 },
    { name: 'Cu', value: cu, unit: '%', confidence: 0.95 },
  ]
}

function makeTensileValues(uts: string, yieldVal?: string, elong?: string): ParsedValue[] {
  const vals: ParsedValue[] = []
  if (yieldVal) vals.push({ name: '0.2% Yield Limit', value: yieldVal, unit: 'N/mm2', confidence: 0.95 })
  vals.push({ name: 'Ultimate Tensile Strength', value: uts, unit: 'N/mm2', confidence: 0.95 })
  if (elong) vals.push({ name: 'Elongation', value: elong, unit: '%', confidence: 0.95 })
  return vals
}

function makeHardnessValues(avg: string, readings: string[]): ParsedValue[] {
  return [
    { name: 'Hardness', value: avg, unit: 'BHN', confidence: 0.95 },
    ...readings.map((r, i) => ({ name: `Reading ${i + 1}`, value: r, unit: 'BHN', confidence: 0.9 })),
  ]
}

interface DemoHeatConfig {
  sap: string
  heat: string
  samples?: string[]
  completedSections?: Array<'CHEMICAL' | 'MICRO' | 'TENSILE' | 'HARDNESS'>
  chemValues?: ParsedValue[]
  tensileValues?: ParsedValue[]
  hardnessValues?: ParsedValue[]
}

export function seedDeptDemo(_userName = 'Demo'): { heats: number; masters: number } {
  useUsersStore.getState().seedDefaultAccounts()
  const pm = useProductMasterStore.getState()
  const hr = useHeatRecordStore.getState()
  const now = nowIso()

  // Wipe previous data
  useHeatRecordStore.setState({ heatRecords: [] })
  useCertificateStore.setState({ certificates: [] })
  useProductMasterStore.setState({ masters: [] })

  // Save genuine masters from Master.xlsx
  for (const m of GENUINE_PRODUCT_MASTERS) {
    pm.saveMaster({
      ...m,
      id: createId(),
      createdAt: now,
      updatedAt: now,
    })
  }

  // Diverse demo heats across genuine SAP product masters
  const DEMO_HEATS: DemoHeatConfig[] = [
    // 1. Primary demo heats matching the 4 lab folders under PR01CI0459CA
    {
      sap: 'PR01CI0459CA',
      heat: 'G6E',
      completedSections: ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'],
      chemValues: CHEM_G6E,
      tensileValues: TENSILE_VALUES['G6E'],
      hardnessValues: HARDNESS_VALUES['G6E'],
    },
    {
      sap: 'PR01CI0459CA',
      heat: 'GZ-56',
      samples: ['A', 'B'],
      completedSections: ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'],
      chemValues: CHEM_GZ56_A,
      tensileValues: TENSILE_VALUES['GZ-56-A'],
      hardnessValues: HARDNESS_VALUES['GZ-56-A'],
    },
    {
      sap: 'PR01CI0459CA',
      heat: 'GZ-1026',
      completedSections: ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'],
      chemValues: CHEM_GZ1026,
      tensileValues: TENSILE_VALUES['GZ-1026'],
      hardnessValues: HARDNESS_VALUES['GZ-1026'],
    },
    {
      sap: 'PR01CI0459CA',
      heat: 'G6F',
      samples: ['A', 'B'],
      completedSections: ['CHEMICAL', 'MICRO'],
      chemValues: makeChemValues('3.35', '1.92', '0.62', '0.042', '0.078', '0.21', '0.45'),
    },
    {
      sap: 'PR01CI0459CA',
      heat: 'GZ-720',
      samples: ['A', 'B', 'C'],
      completedSections: ['CHEMICAL'],
      chemValues: makeChemValues('3.28', '1.85', '0.68', '0.038', '0.082', '0.19', '0.42'),
    },

    // 2. PR01CI0461CA (PGP620 MOUNTING FLANGE CASTING H3)
    {
      sap: 'PR01CI0461CA',
      heat: 'G6G',
      samples: ['A', 'B', 'C', 'D'],
      completedSections: ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'],
      chemValues: makeChemValues('3.30', '1.95', '0.65', '0.035', '0.085', '0.22', '0.48'),
      tensileValues: makeTensileValues('265.4'),
      hardnessValues: makeHardnessValues('208', ['205', '210', '208']),
    },
    {
      sap: 'PR01CI0461CA',
      heat: 'GZ-840',
      samples: ['A', 'B'],
      completedSections: ['CHEMICAL', 'HARDNESS'],
      chemValues: makeChemValues('3.22', '1.90', '0.71', '0.040', '0.090', '0.25', '0.50'),
      hardnessValues: makeHardnessValues('202', ['200', '204']),
    },

    // 3. PR01CI1632CA (HOUSING CASTING - EN-GJL-300)
    {
      sap: 'PR01CI1632CA',
      heat: 'G6H',
      completedSections: ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'],
      chemValues: makeChemValues('3.12', '1.82', '0.85', '0.055', '0.082', '0.22', '0.58'),
      tensileValues: makeTensileValues('305.2'),
      hardnessValues: makeHardnessValues('215', ['212', '218', '215']),
    },
    {
      sap: 'PR01CI1632CA',
      heat: 'GZ-910',
      samples: ['A', 'B'],
      completedSections: ['CHEMICAL'],
      chemValues: makeChemValues('3.15', '1.80', '0.82', '0.058', '0.080', '0.21', '0.60'),
    },

    // 4. RX05SG1849CA (BOSCH REXROTH - RCS CORPS DE SORTIE BRUT - EN-GJS-500-7)
    {
      sap: 'RX05SG1849CA',
      heat: 'RX-701',
      samples: ['A', 'B'],
      completedSections: ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'],
      chemValues: makeChemValues('3.45', '2.35', '0.45', '0.028', '0.012', '0.022', '0.38', '0.042'),
      tensileValues: makeTensileValues('540.5', '345.2', '8.4'),
      hardnessValues: makeHardnessValues('195', ['192', '198', '195']),
    },
    {
      sap: 'RX05SG1849CA',
      heat: 'RX-702',
      samples: ['A', 'B', 'C'],
      completedSections: ['CHEMICAL', 'MICRO'],
      chemValues: makeChemValues('3.50', '2.40', '0.48', '0.030', '0.014', '0.025', '0.35', '0.045'),
    },
  ]

  const FOUR_SECTIONS = ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] as const
  const SECTION_NAMES: Record<string, string> = {
    CHEMICAL: 'Chemical Analysis',
    MICRO: 'Micro Structure',
    TENSILE: 'Tensile',
    HARDNESS: 'Hardness',
  }

  for (const dh of DEMO_HEATS) {
    const samples: HeatSample[] = (dh.samples ?? []).map((label) => ({
      id: createId(),
      label,
      quantity: undefined,
    }))

    const id = hr.addHeatRecord({
      sapNo: dh.sap,
      heatCode: dh.heat,
      heats: samples,
      demoReports: {},
    })

    const completed = new Set(dh.completedSections ?? [])
    const reports: HeatReportData[] = []
    const requests: HeatReportRequest[] = []

    for (const secKey of FOUR_SECTIONS) {
      const isDone = completed.has(secKey)
      const dept = departmentForSectionKey(secKey)

      if (samples.length === 0) {
        // Heat-level request & report
        requests.push({
          id: createId(),
          sectionKey: secKey,
          sectionName: SECTION_NAMES[secKey],
          department: dept,
          status: isDone ? 'REVIEWED' : 'PENDING',
        })

        if (isDone) {
          let vals: ParsedValue[] = []
          if (secKey === 'CHEMICAL') vals = dh.chemValues ?? CHEM_G6E
          else if (secKey === 'MICRO') vals = MICRO_STANDARD_VALUES
          else if (secKey === 'TENSILE') vals = dh.tensileValues ?? TENSILE_VALUES['G6E']
          else if (secKey === 'HARDNESS') vals = dh.hardnessValues ?? HARDNESS_VALUES['G6E']

          reports.push({
            id: createId(),
            sectionKey: secKey,
            sectionName: SECTION_NAMES[secKey],
            parsedValues: vals,
            confirmed: true,
            warnings: [],
            fileMetadata: {
              fileName: `${secKey.toLowerCase()}_${dh.heat}.pdf`,
              fileSize: 45000,
              mimeType: 'application/pdf',
              storedKey: `demo-${dh.heat}-${secKey}`,
            },
            uploadedBy: secKey === 'CHEMICAL' ? 'Chemical Operator' : `${secKey} Operator`,
            uploadedAt: now,
            status: 'COMPLETE',
          })
        }
      } else {
        // Multi-sample requests & reports for each sample
        for (const sample of samples) {
          requests.push({
            id: createId(),
            sectionKey: secKey,
            sectionName: SECTION_NAMES[secKey],
            sampleId: sample.id,
            sampleLabel: sample.label,
            department: dept,
            status: isDone ? 'REVIEWED' : 'PENDING',
          })

          if (isDone) {
            let vals: ParsedValue[] = []
            if (secKey === 'CHEMICAL') {
              vals = sample.label === 'B' ? (CHEM_GZ56_B ?? dh.chemValues) : (dh.chemValues ?? CHEM_GZ56_A)
            } else if (secKey === 'MICRO') {
              vals = MICRO_STANDARD_VALUES
            } else if (secKey === 'TENSILE') {
              vals = sample.label === 'B' ? (TENSILE_VALUES['GZ-56-B'] ?? dh.tensileValues!) : (dh.tensileValues ?? TENSILE_VALUES['GZ-56-A'])
            } else if (secKey === 'HARDNESS') {
              vals = sample.label === 'B' ? (HARDNESS_VALUES['GZ-56-B'] ?? dh.hardnessValues!) : (dh.hardnessValues ?? HARDNESS_VALUES['GZ-56-A'])
            }

            reports.push({
              id: createId(),
              sectionKey: secKey,
              sectionName: SECTION_NAMES[secKey],
              sampleId: sample.id,
              sampleLabel: sample.label,
              parsedValues: vals,
              confirmed: true,
              warnings: [],
              fileMetadata: {
                fileName: `${secKey.toLowerCase()}_${dh.heat}_sample_${sample.label}.pdf`,
                fileSize: 45000,
                mimeType: 'application/pdf',
                storedKey: `demo-${dh.heat}-${secKey}-${sample.label}`,
              },
              uploadedBy: secKey === 'CHEMICAL' ? 'Chemical Operator' : `${secKey} Operator`,
              uploadedAt: now,
              status: 'COMPLETE',
            })
          }
        }
      }
    }

    useHeatRecordStore.setState((prev) => ({
      heatRecords: prev.heatRecords.map((h) =>
        h.id === id
          ? {
              ...h,
              requests,
              reports,
            }
          : h,
      ),
    }))
  }

  // Issue a clean demo certificate for heat G6E (Parker Hanifin)
  const cert = useCertificateStore.getState()
  if (cert.certificates.length === 0) {
    const master = useProductMasterStore.getState().getActiveMasterBySap('PR01CI0459CA')
    const heatG6E = useHeatRecordStore.getState().heatRecords.find((h) => h.heatCode === 'G6E')
    if (master && heatG6E) {
      const cid = cert.createDraft('TC-2026-000184', '28.07.2026')
      cert.setProductSnapshot(cid, master)
      const secByKey = new Map(master.sections.map((s) => [s.key, s]))
      cert.addHeatSelection(cid, {
        id: createId(),
        heatRecordId: heatG6E.id,
        heatCode: heatG6E.heatCode,
        heatCodeOnly: true,
        includeHeatLevel: true,
        selectedSamples: [],
        reportRecords: heatG6E.reports.map((r) => {
          const sec = secByKey.get(r.sectionKey) ?? master.sections[0]
          return {
            id: createId(),
            sectionId: sec.id,
            sectionKey: sec.key,
            sectionName: sec.name,
            parsedValues: r.parsedValues,
            confirmed: true,
            sourceType: 'DEPARTMENT',
            warnings: [],
            status: 'COMPLETE',
            uploadedBy: r.uploadedBy,
            uploadedAt: r.uploadedAt,
          }
        }),
      })
      cert.markReviewed(cid)
      cert.issueCertificate(cid)
    }
  }

  return { heats: DEMO_HEATS.length, masters: GENUINE_PRODUCT_MASTERS.length }
}
