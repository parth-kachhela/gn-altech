import * as XLSX from 'xlsx'
import type { MasterParameter, MasterSection, ProductMaster, RuleType } from '@/types'
import { createId } from '@/lib/id'
import { parseSpecification } from '@/lib/specParser'
import { createSection } from '@/lib/masterFactory'

export interface ImportedHeatDraft {
  id: string
  sapNo: string
  heatCode: string
  batchNo?: string
  defaultSample?: string
  quantity?: string
  demoReports: Record<string, string>
}

export interface MasterMeta {
  sapNo: string
  inFileDuplicate: boolean
  existing?: ProductMaster
  warnings: string[]
}

export interface ImportDraft {
  masters: ProductMaster[]
  heats: ImportedHeatDraft[]
  meta: Record<string, MasterMeta>
  sectionsConfig: Array<{ key: string; name: string; required: boolean; fileTypeHint: string }>
}

interface GroupCol {
  group: string
  header: string
  idx: number
}

const SECTION_DEFAULTS: Record<string, { name: string; required: boolean; fileTypeHint: string }> = {
  CHEMICAL: { name: 'Chemical Analysis', required: true, fileTypeHint: 'PDF' },
  HARDNESS: { name: 'Hardness', required: true, fileTypeHint: 'PDF' },
  MICRO: { name: 'Micro Structure', required: true, fileTypeHint: 'BMP / PNG / JPG' },
  TENSILE: { name: 'Tensile', required: true, fileTypeHint: 'PDF' },
}

const SECTION_ORDER: Record<string, number> = {
  CHEMICAL: 0,
  MICRO: 1,
  TENSILE: 2,
  HARDNESS: 3,
}

function resolveSectionKey(group: string, header: string): string | null {
  const g = group.toLowerCase().trim()
  const h = header.toLowerCase().trim()

  if (g.includes('chem')) return 'CHEMICAL'
  if (g.includes('micro')) return 'MICRO'
  if (g.includes('tens')) return 'TENSILE'
  if (g.includes('hard')) return 'HARDNESS'
  if (g.includes('mech')) {
    if (h.includes('yield') || h.includes('tens') || h.includes('tesil') || h.includes('elong')) {
      return 'TENSILE'
    }
    if (h.includes('hard') || h.includes('bhn')) {
      return 'HARDNESS'
    }
    return 'TENSILE'
  }
  return null
}

function parseHeader(header: string): { name: string; unit?: string } {
  const h = header.trim()
  if (!h) return { name: '' }

  if (/nodul/i.test(h)) {
    if (/count/i.test(h)) return { name: 'Nodule Count', unit: '/mm2' }
    return { name: 'Nodularity', unit: '%' }
  }
  if (/pearlite/i.test(h)) return { name: 'Pearlite', unit: '%' }
  if (/ferrite/i.test(h)) return { name: 'Ferrite', unit: '%' }
  if (/carbide/i.test(h)) return { name: 'Carbide', unit: '' }

  if (/yield/i.test(h)) return { name: '0.2% Yield Limit', unit: 'N/mm2' }
  if (/tens|tesil/i.test(h)) return { name: 'Ultimate Tensile Strength', unit: 'N/mm2' }
  if (/elong/i.test(h)) return { name: 'Elongation', unit: '%' }
  if (/hard|bhn/i.test(h)) return { name: 'Hardness', unit: 'BHN' }

  if (/N\s*\/\s*mm2/i.test(h)) {
    let name = h.replace(/N\s*\/\s*mm2/gi, '').trim()
    name = name.replace(/\s+in\s*$/i, '').trim()
    return { name, unit: 'N/mm2' }
  }
  if (/mm2/i.test(h)) {
    return { name: h.replace(/\/mm2.*/i, '').trim(), unit: 'mm2' }
  }
  if (h.includes('%')) {
    let name = h.replace(/%/g, ' ')
    name = name.split('/')[0]
    name = name.replace(/\s+in\s*$/i, '').replace(/\s+/g, ' ').trim()
    return { name, unit: '%' }
  }
  if (/BHN/i.test(h)) {
    return { name: h.replace(/BHN/gi, '').trim(), unit: 'BHN' }
  }
  return { name: h.trim(), unit: undefined }
}

function buildSections(
  cols: GroupCol[],
  row: string[],
): { sections: MasterSection[]; warnings: string[] } {
  const byKey = new Map<
    string,
    { name: string; required: boolean; fileTypeHint?: string; params: MasterParameter[] }
  >()
  const warnings: string[] = []

  for (const col of cols) {
    const key = resolveSectionKey(col.group, col.header)
    if (!key) continue
    if (!byKey.has(key)) {
      const d = SECTION_DEFAULTS[key] ?? { name: key, required: true, fileTypeHint: 'PDF' }
      byKey.set(key, { name: d.name, required: d.required, fileTypeHint: d.fileTypeHint, params: [] })
    }
    const { name, unit } = parseHeader(col.header)
    if (!name) continue
    const cell = (row[col.idx] ?? '').toString().trim()
    if (!cell) continue
    const spec = parseSpecification(cell)
    const group = byKey.get(key)!
    const param: MasterParameter = {
      id: createId(),
      name,
      aliases: [],
      ruleType: spec.ruleType as RuleType,
      min: spec.min,
      max: spec.max,
      expectedValue: spec.expectedValue,
      unit: spec.unit ?? unit,
      sourceText: spec.sourceText,
      required: true,
      order: group.params.length,
    }
    if (spec.warning) warnings.push(`${key}/${name}: ${spec.warning}`)
    group.params.push(param)
  }

  const sections: MasterSection[] = []
  for (const [key, data] of byKey.entries()) {
    sections.push(
      createSection(data.name, key, {
        required: data.required,
        fileTypeHint: data.fileTypeHint,
        order: SECTION_ORDER[key] ?? 99,
        parameters: data.params.sort((a, b) => a.order - b.order),
      }),
    )
  }
  sections.sort((a, b) => a.order - b.order)
  return { sections, warnings }
}

function findHeaderRow(data: string[][], match: string): number {
  for (let i = 0; i < data.length; i++) {
    if (data[i].some((c) => String(c).toLowerCase().includes(match))) return i
  }
  return -1
}

function parseProductMasterSheet(
  ws: XLSX.WorkSheet,
  existingMasters: ProductMaster[],
): { masters: ProductMaster[]; meta: Record<string, MasterMeta> } {
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  const meta: Record<string, MasterMeta> = {}
  const masters: ProductMaster[] = []

  const headerRowIdx = findHeaderRow(data, 'sap no')
  if (headerRowIdx === -1) return { masters, meta }

  const row0 = data[headerRowIdx] || []
  const row1 = headerRowIdx + 1 < data.length ? data[headerRowIdx + 1] : []

  // Detect compound 2-row header if row 1 contains parameter subheaders
  const isTwoRowHeader = row1.some((c) => /%|yield|tens|bhn|nodul|count|pearlite|ferrite|carbide/i.test(String(c)))

  const basicIdx: Record<string, number> = {}
  let currentGroup = ''
  const cols: GroupCol[] = []

  const maxCols = Math.max(row0.length, row1.length)
  for (let i = 0; i < maxCols; i++) {
    const topCell = (row0[i] || '').toString().trim()
    const subCell = isTwoRowHeader ? (row1[i] || '').toString().trim() : ''

    const topLower = topCell.toLowerCase()
    if (topLower.includes('sap')) basicIdx.sapNo = i
    else if (topLower.includes('part no')) basicIdx.partNo = i
    else if (topLower.includes('description')) basicIdx.description = i
    else if (topLower.includes('material')) basicIdx.material = i
    else if (topLower.includes('customer')) basicIdx.customer = i
    else if (topLower.includes('grade')) basicIdx.grade = i
    else if (topCell && !['sap no.', 'part no.', 'description', 'material', 'customer', 'grade'].includes(topLower)) {
      currentGroup = topCell
    }

    const header = subCell || topCell
    cols.push({ group: currentGroup, header, idx: i })
  }

  const dataStartRow = isTwoRowHeader ? headerRowIdx + 2 : headerRowIdx + 1

  const counts: Record<string, number> = {}
  for (let r = dataStartRow; r < data.length; r++) {
    const row = data[r]
    if (!row || row.every((c) => !String(c).trim())) continue
    const sapNo = row[basicIdx.sapNo ?? 0]?.toString().trim()
    if (sapNo) counts[sapNo] = (counts[sapNo] ?? 0) + 1
  }

  for (let r = dataStartRow; r < data.length; r++) {
    const row = data[r]
    if (!row || row.every((c) => !String(c).trim())) continue
    const sapNo = row[basicIdx.sapNo ?? 0]?.toString().trim()
    if (!sapNo) continue
    const existing = existingMasters.find(
      (m) => m.status === 'ACTIVE' && m.sapNo.toLowerCase() === sapNo.toLowerCase(),
    )
    const warnings: string[] = []
    const { sections, warnings: sectionWarnings } = buildSections(cols, row)
    warnings.push(...sectionWarnings)
    const now = new Date().toISOString()
    const master: ProductMaster = {
      id: createId(),
      sapNo,
      partNo: row[basicIdx.partNo ?? 1]?.toString().trim() ?? '',
      description: row[basicIdx.description ?? 2]?.toString().trim() ?? '',
      material: row[basicIdx.material ?? 3]?.toString().trim() ?? '',
      customer: row[basicIdx.customer ?? 4]?.toString().trim() ?? '',
      grade: basicIdx.grade !== undefined ? row[basicIdx.grade]?.toString().trim() || undefined : undefined,
      revision: existing ? (existing.revision ?? 1) + 1 : 1,
      status: 'ACTIVE',
      sections,
      createdAt: now,
      updatedAt: now,
    }
    masters.push(master)
    meta[sapNo] = {
      sapNo,
      inFileDuplicate: (counts[sapNo] ?? 0) > 1,
      existing,
      warnings,
    }
  }

  return { masters, meta }
}

export function parseMasterWorkbook(
  buffer: ArrayBuffer,
  existingMasters: ProductMaster[],
): ImportDraft {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const { masters, meta } = parseProductMasterSheet(ws, existingMasters)

  // Pre-configured heats for the 4 demo files
  const heats: ImportedHeatDraft[] = [
    {
      id: createId(),
      sapNo: 'PR01CI0459CA',
      heatCode: 'G6E',
      defaultSample: undefined,
      demoReports: {},
    },
    {
      id: createId(),
      sapNo: 'PR01CI0459CA',
      heatCode: 'GZ-56',
      defaultSample: 'A',
      demoReports: {},
    },
    {
      id: createId(),
      sapNo: 'PR01CI0459CA',
      heatCode: 'GZ-1026',
      defaultSample: undefined,
      demoReports: {},
    },
  ]

  const sectionsConfig = [
    { key: 'CHEMICAL', name: 'Chemical Analysis', required: true, fileTypeHint: 'PDF' },
    { key: 'MICRO', name: 'Micro Structure', required: true, fileTypeHint: 'BMP / PNG / JPG' },
    { key: 'TENSILE', name: 'Tensile', required: true, fileTypeHint: 'PDF' },
    { key: 'HARDNESS', name: 'Hardness', required: true, fileTypeHint: 'PDF' },
  ]

  return { masters, heats, meta, sectionsConfig }
}
