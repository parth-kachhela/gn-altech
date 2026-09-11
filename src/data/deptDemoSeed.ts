import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useCertificateStore } from '@/stores/certificateStore'
import { useUsersStore } from '@/stores/usersStore'
import { departmentForSectionKey } from '@/lib/permissions'
import { createId, nowIso } from '@/lib/id'
import type { ProductMaster } from '@/types'

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

  // 3 Demo Heats matching customer lab files under PR01CI0459CA
  const DEMO_HEATS = [
    { sap: 'PR01CI0459CA', heat: 'G6E' },
    { sap: 'PR01CI0459CA', heat: 'GZ-56' },
    { sap: 'PR01CI0459CA', heat: 'GZ-1026' },
  ]

  const FOUR_SECTIONS = ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] as const
  const SECTION_NAMES: Record<string, string> = {
    CHEMICAL: 'Chemical Analysis',
    MICRO: 'Micro Structure',
    TENSILE: 'Tensile',
    HARDNESS: 'Hardness',
  }

  for (const dh of DEMO_HEATS) {
    const id = hr.addHeatRecord({
      sapNo: dh.sap,
      heatCode: dh.heat,
      heats: [],
      demoReports: {},
    })

    useHeatRecordStore.setState((prev) => ({
      heatRecords: prev.heatRecords.map((h) =>
        h.id === id
          ? {
              ...h,
              requests: FOUR_SECTIONS.map((k) => ({
                id: createId(),
                sectionKey: k,
                sectionName: SECTION_NAMES[k],
                department: departmentForSectionKey(k),
                status: 'PENDING' as const,
              })),
              reports: [],
            }
          : h,
      ),
    }))
  }

  return { heats: DEMO_HEATS.length, masters: GENUINE_PRODUCT_MASTERS.length }
}
