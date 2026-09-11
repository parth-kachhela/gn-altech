import type { ParsedValue } from '@/types'

/**
 * Real demo data extracted from the customer's lab reports
 * (01.Chemical data / 02.Micro data / 03.Tensile data / 04.Hardness data).
 *
 * Single demo SAP (Master.xlsx row 1: PR01CI0459CA / 8682-904-00Z /
 * COVER CASTING / FG-260 / Parker Hanifin): every demo lab file maps to
 * this master so one SAP carries multiple heats. Heat codes stay distinct
 * per file and are the ones printed INSIDE each file.
 */

/**
 * Single demo SAP: every demo lab file maps to this master so one SAP
 * carries multiple heats (each heat code stays distinct per file).
 */
export const DEMO_SAP = 'PR01CI0459CA'

export interface DemoFixture {
  sapCode: string
  heatCode: string
  values: ParsedValue[]
}

const pct = (name: string, value: string): ParsedValue => ({ name, value, unit: '%', confidence: 0.95 })

const CHEM_GZ319: ParsedValue[] = [
  pct('Fe', '93.2'), pct('C', '3.48'), pct('Si', '2.46'), pct('Mn', '0.317'),
  pct('P', '0.0159'), pct('S', '0.0094'), pct('Cr', '0.0231'), pct('Mo', '<0.0020'),
  pct('Ni', '0.0143'), pct('Al', '0.0129'), pct('Co', '<0.0010'), pct('Cu', '0.339'),
  pct('Nb', '<0.0025'), pct('Ti', '0.0159'), pct('V', '0.0082'), pct('Pb', '<0.0025'),
  pct('Sb', '<0.0010'), pct('Se', '<0.0025'), pct('Sn', '0.0055'), pct('Zn', '<0.0010'),
  pct('Zr', '0.0042'), pct('Mg', '0.0365'), pct('La', '0.0012'), pct('As', '<0.0010'),
  pct('B', '0.0013'), pct('Bi', '<0.0020'), pct('Ce', '0.0078'),
]

const CHEM_GZ56: ParsedValue[] = [
  pct('Fe', '93.3'), pct('C', '3.06'), pct('Si', '1.83'), pct('Mn', '0.790'),
  pct('P', '0.0491'), pct('S', '0.0887'), pct('Cr', '0.246'), pct('Mo', '0.0103'),
  pct('Ni', '0.0392'), pct('Al', '<0.0030'), pct('Co', '0.0027'), pct('Cu', '0.472'),
  pct('Nb', '<0.0025'), pct('Ti', '0.0153'), pct('V', '0.0106'), pct('Pb', '<0.0025'),
  pct('Sb', '<0.0010'), pct('Se', '0.0026'), pct('Sn', '0.0217'), pct('Zn', '0.0064'),
  pct('Zr', '0.0038'), pct('Mg', '0.0002'), pct('La', '<0.0010'), pct('As', '0.0013'),
  pct('B', '0.0024'), pct('Bi', '<0.0020'), pct('Ce', '<0.0060'),
]

const CHEM_GZ530: ParsedValue[] = [
  pct('Fe', '93.3'), pct('C', '3.10'), pct('Si', '1.82'), pct('Mn', '0.780'),
  pct('P', '0.0632'), pct('S', '0.0831'), pct('Cr', '0.224'), pct('Mo', '0.0164'),
  pct('Ni', '0.0501'), pct('Al', '0.0040'), pct('Co', '0.0037'), pct('Cu', '0.489'),
  pct('Nb', '<0.0025'), pct('Ti', '0.0148'), pct('V', '0.0091'), pct('Pb', '<0.0025'),
  pct('Sb', '<0.0010'), pct('Se', '<0.0025'), pct('Sn', '0.0159'), pct('Zn', '0.0080'),
  pct('Zr', '<0.0020'), pct('Mg', '0.0002'), pct('La', '<0.0010'), pct('As', '0.0027'),
  pct('B', '0.0027'), pct('Bi', '<0.0020'), pct('Ce', '<0.0060'),
]

const CHEM_GZ1026: ParsedValue[] = [
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

/** Normalized filename (no extension, no leading serial) -> fixture per section. */
type FixtureMap = Record<string, { sap: string; heat: string }>

const CHEMICAL_FILES: FixtureMap = {
  'G6E RS12 7005': { sap: DEMO_SAP, heat: 'GZ-319' },
  'GZ-56 P COVER': { sap: DEMO_SAP, heat: 'GZ-56' },
  // Paired with GZ-56 P COVER: same heat, second report -> Sample B
  // (printed Heat No. inside this PDF was rewritten to GZ-56).
  'GZ-530 P FLANGE': { sap: DEMO_SAP, heat: 'GZ-56' },
  'GZ-1026 H CASTING': { sap: DEMO_SAP, heat: 'GZ-1026' },
}

const CHEMICAL_VALUES: Record<string, ParsedValue[]> = {
  'GZ-319': CHEM_GZ319,
  'GZ-56': CHEM_GZ56,
  'GZ-530': CHEM_GZ530,
  'GZ-1026': CHEM_GZ1026,
}

const TENSILE_FILES: FixtureMap = {
  'G6E-A RS12 7005': { sap: DEMO_SAP, heat: 'G6E-A' },
  'GZ-56 P-COVER': { sap: DEMO_SAP, heat: 'GZ-56' },
  // Paired with GZ-56 P-COVER: same heat, second report -> Sample B.
  'GZ-530 P FLANGE': { sap: DEMO_SAP, heat: 'GZ-56' },
  'GZ-1026 TORQUE MOTOR': { sap: DEMO_SAP, heat: 'GZ-1026' },
}

const TENSILE_VALUES: Record<string, ParsedValue[]> = {
  'G6E-A': tensileVals('371.534', '592.309', '12.38', '72920', '24.0'),
  'GZ-56': tensileVals(null, '253.934', null, '12860', '10.0'),
  'GZ-530': tensileVals(null, '326.8', null, '16840', '11.3'),
  'GZ-1026': tensileVals(null, '314.993', null, '98760', '12.1'),
}

const HARDNESS_FILES: FixtureMap = {
  '7005 ( G6E)': { sap: DEMO_SAP, heat: 'G6E' },
  '7005 (G6E)': { sap: DEMO_SAP, heat: 'G6E' },
  'P. COVER 934 (GZ-56)': { sap: DEMO_SAP, heat: 'GZ-56' },
  'P COVER 934 (GZ-56)': { sap: DEMO_SAP, heat: 'GZ-56' },
  // Paired with P. Cover 934: same heat, second report -> Sample B
  // (printed Job No. inside this PDF was rewritten to GZ 56).
  'P. FLANGE 936 (GZ-530)': { sap: DEMO_SAP, heat: 'GZ-56' },
  'P FLANGE 936 (GZ-530)': { sap: DEMO_SAP, heat: 'GZ-56' },
  'G6O TORQE MOTOR': { sap: DEMO_SAP, heat: 'G6O' },
  'G6O TORQUE MOTOR': { sap: DEMO_SAP, heat: 'G6O' },
}

const HARDNESS_VALUES: Record<string, ParsedValue[]> = {
  'G6E': hardnessVals('175', ['171', '177', '175', '172', '185', '184', '172', '176', '171', '170', '172', '173']),
  'GZ-56': hardnessVals('205', ['202', '201', '204', '211', '203', '209', '204', '202', '210']),
  'GZ-530': hardnessVals('205', ['204', '206']),
  'G6O': hardnessVals('204', ['203', '203', '202', '204', '203', '201', '208', '208']),
}

const MICRO_FILES: FixtureMap = {
  'G6E RS12 7005': { sap: DEMO_SAP, heat: 'G6E' },
  'GZ-56 P COVER': { sap: DEMO_SAP, heat: 'GZ-56' },
  // Paired with GZ-56 P COVER: same heat, second report -> Sample B.
  'GZ-530 P FLANGE': { sap: DEMO_SAP, heat: 'GZ-56' },
  'G6O TORQUE MOTOR': { sap: DEMO_SAP, heat: 'G6O' },
}

/** Strip extension + leading serial ("02. ", "07.") and uppercase for matching. */
export function normalizeDemoFileName(fileName: string): string {
  const noExt = fileName.replace(/\.(pdf|bmp|png|jpg|jpeg)$/i, '').trim()
  const noSerial = noExt.replace(/^\d+\.\s*/, '').trim()
  return noSerial.toUpperCase()
}

function lookupIn(map: FixtureMap, fileName: string): { sap: string; heat: string } | undefined {
  const norm = normalizeDemoFileName(fileName)
  for (const [key, val] of Object.entries(map)) {
    if (key.toUpperCase() === norm) return val
  }
  return undefined
}

/**
 * Fallback values are keyed by FILE name first, heat second: paired files
 * share a heat (e.g. GZ-56 P COVER + GZ-530 P FLANGE -> GZ-56) but must
 * still show their own distinct measured values in the review table.
 */
function valuesForFile(table: Record<string, ParsedValue[]>, fileName: string, heat: string): ParsedValue[] {
  const norm = normalizeDemoFileName(fileName)
  for (const [key, vals] of Object.entries(table)) {
    if (key.toUpperCase() === norm) return vals
  }
  return table[heat] ?? []
}

const CHEMICAL_FILE_VALUES: Record<string, ParsedValue[]> = {
  'G6E RS12 7005': CHEM_GZ319,
  'GZ-56 P COVER': CHEM_GZ56,
  'GZ-530 P FLANGE': CHEM_GZ530,
  'GZ-1026 H CASTING': CHEM_GZ1026,
}

const TENSILE_FILE_VALUES: Record<string, ParsedValue[]> = {
  'G6E-A RS12 7005': TENSILE_VALUES['G6E-A'],
  'GZ-56 P-COVER': TENSILE_VALUES['GZ-56'],
  'GZ-530 P FLANGE': TENSILE_VALUES['GZ-530'],
  'GZ-1026 TORQUE MOTOR': TENSILE_VALUES['GZ-1026'],
}

const HARDNESS_FILE_VALUES: Record<string, ParsedValue[]> = {
  '7005 ( G6E)': HARDNESS_VALUES['G6E'],
  '7005 (G6E)': HARDNESS_VALUES['G6E'],
  'P. COVER 934 (GZ-56)': HARDNESS_VALUES['GZ-56'],
  'P COVER 934 (GZ-56)': HARDNESS_VALUES['GZ-56'],
  'P. FLANGE 936 (GZ-530)': HARDNESS_VALUES['GZ-530'],
  'P FLANGE 936 (GZ-530)': HARDNESS_VALUES['GZ-530'],
  'G6O TORQE MOTOR': HARDNESS_VALUES['G6O'],
  'G6O TORQUE MOTOR': HARDNESS_VALUES['G6O'],
}

/**
 * Demo fallback for the known lab files. Returns SAP + heat printed
 * inside the file plus the real measured values, so the review table
 * shows data even when the filename carries no SAP/heat.
 * Returns undefined for unknown files (real parse path is used).
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
    // BMPs are microstructure photos — no numeric values inside.
    // SAP + heat come from the file; values are entered at review.
    return { sapCode: hit.sap, heatCode: hit.heat, values: [] }
  }
  return undefined
}
