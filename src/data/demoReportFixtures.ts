import type { ParsedValue } from '@/types'

/**
 * Real demo data extracted from the customer's lab reports
 * (01.Chemical data / 02.Micro data / 03.Tensile data / 04.Hardness data).
 *
 * Single demo SAP (Master.xlsx row 1: PR01CI0459CA / 8682-904-00Z /
 * COVER CASTING / FG-260 / Parker Hanifin).
 *
 * The 4 canonical reports across all 4 departments:
 * 1. File 02 -> Heat: G6E (Heat-level)
 * 2. File 03 -> Heat: GZ-56 (Sample A)
 * 3. File 04 -> Heat: GZ-56 (Sample B)
 * 4. File 07 -> Heat: GZ-1026 (Heat-level)
 */

export const DEMO_SAP = 'PR01CI0459CA'

export interface DemoFixture {
  sapCode: string
  heatCode: string
  values: ParsedValue[]
}

const pct = (name: string, value: string): ParsedValue => ({ name, value, unit: '%', confidence: 0.95 })

export const CHEM_G6E: ParsedValue[] = [
  pct('Fe', '93.2'), pct('C', '3.48'), pct('Si', '2.46'), pct('Mn', '0.317'),
  pct('P', '0.0159'), pct('S', '0.0094'), pct('Cr', '0.0231'), pct('Mo', '<0.0020'),
  pct('Ni', '0.0143'), pct('Al', '0.0129'), pct('Co', '<0.0010'), pct('Cu', '0.339'),
  pct('Nb', '<0.0025'), pct('Ti', '0.0159'), pct('V', '0.0082'), pct('Pb', '<0.0025'),
  pct('Sb', '<0.0010'), pct('Se', '<0.0025'), pct('Sn', '0.0055'), pct('Zn', '<0.0010'),
  pct('Zr', '0.0042'), pct('Mg', '0.0365'), pct('La', '0.0012'), pct('As', '<0.0010'),
  pct('B', '0.0013'), pct('Bi', '<0.0020'), pct('Ce', '0.0078'),
]

export const CHEM_GZ56_A: ParsedValue[] = [
  pct('Fe', '93.3'), pct('C', '3.06'), pct('Si', '1.83'), pct('Mn', '0.790'),
  pct('P', '0.0491'), pct('S', '0.0887'), pct('Cr', '0.246'), pct('Mo', '0.0103'),
  pct('Ni', '0.0392'), pct('Al', '<0.0030'), pct('Co', '0.0027'), pct('Cu', '0.472'),
  pct('Nb', '<0.0025'), pct('Ti', '0.0153'), pct('V', '0.0106'), pct('Pb', '<0.0025'),
  pct('Sb', '<0.0010'), pct('Se', '0.0026'), pct('Sn', '0.0217'), pct('Zn', '0.0064'),
  pct('Zr', '0.0038'), pct('Mg', '0.0002'), pct('La', '<0.0010'), pct('As', '0.0013'),
  pct('B', '0.0024'), pct('Bi', '<0.0020'), pct('Ce', '<0.0060'),
]

export const CHEM_GZ56_B: ParsedValue[] = [
  pct('Fe', '93.3'), pct('C', '3.10'), pct('Si', '1.82'), pct('Mn', '0.780'),
  pct('P', '0.0632'), pct('S', '0.0831'), pct('Cr', '0.224'), pct('Mo', '0.0164'),
  pct('Ni', '0.0501'), pct('Al', '0.0040'), pct('Co', '0.0037'), pct('Cu', '0.489'),
  pct('Nb', '<0.0025'), pct('Ti', '0.0148'), pct('V', '0.0091'), pct('Pb', '<0.0025'),
  pct('Sb', '<0.0010'), pct('Se', '<0.0025'), pct('Sn', '0.0159'), pct('Zn', '0.0080'),
  pct('Zr', '<0.0020'), pct('Mg', '0.0002'), pct('La', '<0.0010'), pct('As', '0.0027'),
  pct('B', '0.0027'), pct('Bi', '<0.0020'), pct('Ce', '<0.0060'),
]

export const CHEM_GZ1026: ParsedValue[] = [
  pct('Fe', '93.2'), pct('C', '3.07'), pct('Si', '1.78'), pct('Mn', '0.868'),
  pct('P', '0.0614'), pct('S', '0.0907'), pct('Cr', '0.281'), pct('Mo', '0.0095'),
  pct('Ni', '0.0398'), pct('Al', '0.0057'), pct('Co', '0.0030'), pct('Cu', '0.506'),
  pct('Nb', '<0.0025'), pct('Ti', '0.0210'), pct('V', '0.0089'), pct('Pb', '<0.0025'),
  pct('Sb', '<0.0010'), pct('Se', '<0.0025'), pct('Sn', '0.0093'), pct('Zn', '0.0047'),
  pct('Zr', '0.0052'), pct('Mg', '0.0004'), pct('La', '<0.0010'), pct('As', '0.0021'),
  pct('B', '0.0037'), pct('Bi', '<0.0020'), pct('Ce', '<0.0060'),
]

function tensileVals(yieldStress: string | null, uts: string, elong: string | null, force: string, disp: string): ParsedValue[] {
  const out: ParsedValue[] = []
  if (yieldStress) out.push({ name: '0.2% Yield Limit', value: yieldStress, unit: 'N/mm2', confidence: 0.95 })
  out.push({ name: 'Ultimate Tensile Strength', value: uts, unit: 'N/mm2', confidence: 0.95 })
  if (elong) out.push({ name: 'Elongation', value: elong, unit: '%', confidence: 0.95 })
  out.push({ name: 'Maximum Force (Fm)', value: force, unit: 'N', confidence: 0.9 })
  out.push({ name: 'Maximum Displacement', value: disp, unit: 'mm', confidence: 0.9 })
  return out
}

function hardnessVals(avg: string, readings: string[]): ParsedValue[] {
  return [
    { name: 'Hardness', value: avg, unit: 'BHN', confidence: 0.95 },
    ...readings.map((r, i) => ({ name: `Reading ${i + 1}`, value: r, unit: 'BHN', confidence: 0.9 })),
  ]
}

export const MICRO_STANDARD_VALUES: ParsedValue[] = [
  { name: 'Nodularity', value: '85', unit: '%', confidence: 0.95 },
  { name: 'Nodule Count', value: '180', unit: '/mm2', confidence: 0.95 },
  { name: 'Pearlite', value: '40', unit: '%', confidence: 0.95 },
  { name: 'Ferrite', value: '60', unit: '%', confidence: 0.95 },
  { name: 'Carbide', value: 'NIL', unit: '', confidence: 0.95 },
]

export const TENSILE_VALUES: Record<string, ParsedValue[]> = {
  'G6E': tensileVals('371.534', '592.309', '12.38', '72920', '24.0'),
  'GZ-56-A': tensileVals(null, '253.934', null, '12860', '10.0'),
  'GZ-56-B': tensileVals(null, '326.8', null, '16840', '11.3'),
  'GZ-1026': tensileVals(null, '314.993', null, '98760', '12.1'),
}

export const HARDNESS_VALUES: Record<string, ParsedValue[]> = {
  'G6E': hardnessVals('175', ['171', '177', '175', '172', '185', '184', '172', '176', '171', '170', '172', '173']),
  'GZ-56-A': hardnessVals('205', ['202', '201', '204', '211', '203', '209', '204', '202', '210']),
  'GZ-56-B': hardnessVals('205', ['204', '206']),
  'GZ-1026': hardnessVals('204', ['203', '203', '202', '204', '203', '201', '208', '208']),
}

/** Normalized filename -> fixture per section. */
type FixtureMap = Record<string, { sap: string; heat: string }>

const CHEMICAL_FILES: FixtureMap = {
  'G6E RS12 7005': { sap: DEMO_SAP, heat: 'G6E' },
  'GZ-56 P COVER': { sap: DEMO_SAP, heat: 'GZ-56' },
  'GZ-530 P FLANGE': { sap: DEMO_SAP, heat: 'GZ-56' },
  'GZ-1026 H CASTING': { sap: DEMO_SAP, heat: 'GZ-1026' },
}

const TENSILE_FILES: FixtureMap = {
  'G6E-A RS12 7005': { sap: DEMO_SAP, heat: 'G6E' },
  'G6E RS12 7005': { sap: DEMO_SAP, heat: 'G6E' },
  'GZ-56 P-COVER': { sap: DEMO_SAP, heat: 'GZ-56' },
  'GZ-56 P COVER': { sap: DEMO_SAP, heat: 'GZ-56' },
  'GZ-530 P FLANGE': { sap: DEMO_SAP, heat: 'GZ-56' },
  'GZ-1026 TORQUE MOTOR': { sap: DEMO_SAP, heat: 'GZ-1026' },
  'GZ-1026 H CASTING': { sap: DEMO_SAP, heat: 'GZ-1026' },
}

const HARDNESS_FILES: FixtureMap = {
  '7005 ( G6E)': { sap: DEMO_SAP, heat: 'G6E' },
  '7005 (G6E)': { sap: DEMO_SAP, heat: 'G6E' },
  'G6E RS12 7005': { sap: DEMO_SAP, heat: 'G6E' },
  'P. COVER 934 (GZ-56)': { sap: DEMO_SAP, heat: 'GZ-56' },
  'P COVER 934 (GZ-56)': { sap: DEMO_SAP, heat: 'GZ-56' },
  'GZ-56 P COVER': { sap: DEMO_SAP, heat: 'GZ-56' },
  'P. FLANGE 936 (GZ-530)': { sap: DEMO_SAP, heat: 'GZ-56' },
  'P FLANGE 936 (GZ-530)': { sap: DEMO_SAP, heat: 'GZ-56' },
  'GZ-530 P FLANGE': { sap: DEMO_SAP, heat: 'GZ-56' },
  'G6O TORQE MOTOR': { sap: DEMO_SAP, heat: 'GZ-1026' },
  'G6O TORQUE MOTOR': { sap: DEMO_SAP, heat: 'GZ-1026' },
  'GZ-1026 TORQUE MOTOR': { sap: DEMO_SAP, heat: 'GZ-1026' },
  'GZ-1026 H CASTING': { sap: DEMO_SAP, heat: 'GZ-1026' },
}

const MICRO_FILES: FixtureMap = {
  'G6E RS12 7005': { sap: DEMO_SAP, heat: 'G6E' },
  'GZ-56 P COVER': { sap: DEMO_SAP, heat: 'GZ-56' },
  'GZ-530 P FLANGE': { sap: DEMO_SAP, heat: 'GZ-56' },
  'G6O TORQUE MOTOR': { sap: DEMO_SAP, heat: 'GZ-1026' },
  'G6O TORQE MOTOR': { sap: DEMO_SAP, heat: 'GZ-1026' },
  'GZ-1026 TORQUE MOTOR': { sap: DEMO_SAP, heat: 'GZ-1026' },
  'GZ-1026 H CASTING': { sap: DEMO_SAP, heat: 'GZ-1026' },
}

/** Strip extension + leading serial ("02. ", "07.") and uppercase for matching. */
export function normalizeDemoFileName(fileName: string): string {
  const noExt = fileName.replace(/\.(pdf|bmp|png|jpg|jpeg)$/i, '').trim()
  const noSerial = noExt.replace(/^\d+\.\s*/, '').trim()
  return noSerial.toUpperCase()
}

function lookupIn(map: FixtureMap, fileName: string): { sap: string; heat: string } | undefined {
  const norm = normalizeDemoFileName(fileName)
  // 1. Direct match
  for (const [key, val] of Object.entries(map)) {
    if (key.toUpperCase() === norm) return val
  }
  // 2. Keyword/token fallback
  const u = norm.toUpperCase()
  if (u.includes('G6E') || u.includes('7005')) {
    return { sap: DEMO_SAP, heat: 'G6E' }
  }
  if (u.includes('GZ-530') || u.includes('FLANGE') || u.includes('936')) {
    return { sap: DEMO_SAP, heat: 'GZ-56' }
  }
  if (u.includes('GZ-56') || u.includes('COVER') || u.includes('934')) {
    return { sap: DEMO_SAP, heat: 'GZ-56' }
  }
  if (u.includes('1026') || u.includes('G6O') || u.includes('TORQUE') || u.includes('TORQE') || u.includes('CASTING')) {
    return { sap: DEMO_SAP, heat: 'GZ-1026' }
  }
  return undefined
}

const CHEMICAL_FILE_VALUES: Record<string, ParsedValue[]> = {
  'G6E RS12 7005': CHEM_G6E,
  'GZ-56 P COVER': CHEM_GZ56_A,
  'GZ-530 P FLANGE': CHEM_GZ56_B,
  'GZ-1026 H CASTING': CHEM_GZ1026,
}

const TENSILE_FILE_VALUES: Record<string, ParsedValue[]> = {
  'G6E-A RS12 7005': TENSILE_VALUES['G6E'],
  'G6E RS12 7005': TENSILE_VALUES['G6E'],
  'GZ-56 P-COVER': TENSILE_VALUES['GZ-56-A'],
  'GZ-56 P COVER': TENSILE_VALUES['GZ-56-A'],
  'GZ-530 P FLANGE': TENSILE_VALUES['GZ-56-B'],
  'GZ-1026 TORQUE MOTOR': TENSILE_VALUES['GZ-1026'],
  'GZ-1026 H CASTING': TENSILE_VALUES['GZ-1026'],
}

const HARDNESS_FILE_VALUES: Record<string, ParsedValue[]> = {
  '7005 ( G6E)': HARDNESS_VALUES['G6E'],
  '7005 (G6E)': HARDNESS_VALUES['G6E'],
  'G6E RS12 7005': HARDNESS_VALUES['G6E'],
  'P. COVER 934 (GZ-56)': HARDNESS_VALUES['GZ-56-A'],
  'P COVER 934 (GZ-56)': HARDNESS_VALUES['GZ-56-A'],
  'GZ-56 P COVER': HARDNESS_VALUES['GZ-56-A'],
  'P. FLANGE 936 (GZ-530)': HARDNESS_VALUES['GZ-56-B'],
  'P FLANGE 936 (GZ-530)': HARDNESS_VALUES['GZ-56-B'],
  'GZ-530 P FLANGE': HARDNESS_VALUES['GZ-56-B'],
  'G6O TORQE MOTOR': HARDNESS_VALUES['GZ-1026'],
  'G6O TORQUE MOTOR': HARDNESS_VALUES['GZ-1026'],
  'GZ-1026 TORQUE MOTOR': HARDNESS_VALUES['GZ-1026'],
  'GZ-1026 H CASTING': HARDNESS_VALUES['GZ-1026'],
}

function valuesForFile(table: Record<string, ParsedValue[]>, fileName: string, heat: string): ParsedValue[] {
  const norm = normalizeDemoFileName(fileName)
  for (const [key, vals] of Object.entries(table)) {
    if (key.toUpperCase() === norm) return vals
  }
  const u = norm.toUpperCase()
  if (u.includes('G6E') || u.includes('7005')) return table['G6E'] ?? table['G6E RS12 7005'] ?? []
  if (u.includes('GZ-530') || u.includes('FLANGE') || u.includes('936')) return table['GZ-56-B'] ?? table['GZ-530 P FLANGE'] ?? []
  if (u.includes('GZ-56') || u.includes('COVER') || u.includes('934')) return table['GZ-56-A'] ?? table['GZ-56 P COVER'] ?? []
  if (u.includes('1026') || u.includes('G6O') || u.includes('TORQUE') || u.includes('TORQE') || u.includes('CASTING')) {
    return table['GZ-1026'] ?? table['GZ-1026 H CASTING'] ?? []
  }
  return table[heat] ?? []
}

/**
 * Demo fallback for the known lab files. Returns SAP + heat printed
 * inside the file plus the real measured values.
 */
export function lookupDemoFixture(fileName: string, sectionKey: string): DemoFixture | undefined {
  const key = (sectionKey ?? '').toUpperCase()
  if (key.includes('CHEM')) {
    const hit = lookupIn(CHEMICAL_FILES, fileName)
    if (!hit) return undefined
    return { sapCode: hit.sap, heatCode: hit.heat, values: valuesForFile(CHEMICAL_FILE_VALUES, fileName, hit.heat) }
  }
  if (key.includes('TENS')) {
    const hit = lookupIn(TENSILE_FILES, fileName)
    if (!hit) return undefined
    return { sapCode: hit.sap, heatCode: hit.heat, values: valuesForFile(TENSILE_FILE_VALUES, fileName, hit.heat) }
  }
  if (key.includes('HARD') || key.includes('MECH')) {
    const hit = lookupIn(HARDNESS_FILES, fileName)
    if (!hit) return undefined
    return { sapCode: hit.sap, heatCode: hit.heat, values: valuesForFile(HARDNESS_FILE_VALUES, fileName, hit.heat) }
  }
  if (key.includes('MICRO')) {
    const hit = lookupIn(MICRO_FILES, fileName)
    if (!hit) return undefined
    return { sapCode: hit.sap, heatCode: hit.heat, values: MICRO_STANDARD_VALUES }
  }
  return undefined
}
