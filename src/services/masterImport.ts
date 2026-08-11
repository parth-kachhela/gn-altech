import * as XLSX from 'xlsx'
import type { MasterParameter, MasterSection, ProductMaster } from '@/types'
import { createId } from '@/lib/id'
import { parseSpecification } from '@/lib/specParser'
import { createSection } from '@/lib/masterFactory'
import type { RuleType } from '@/types'

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

const GROUP_SECTIONS: Record<string, string> = {
  'chemical analysis': 'CHEMICAL',
  'chemical': 'CHEMICAL',
  'mechanical properties': 'MECHANICAL',
  'mechanical': 'MECHANICAL',
  hardness: 'HARDNESS',
  'micro structure': 'MICRO',
  'micro': 'MICRO',
  tensile: 'TENSILE',
}

const SECTION_DEFAULTS: Record<string, { name: string; required: boolean; fileTypeHint: string }> = {
  CHEMICAL: { name: 'Chemical Analysis', required: true, fileTypeHint: 'PDF' },
  MECHANICAL: { name: 'Mechanical Properties', required: false, fileTypeHint: 'PDF' },
  HARDNESS: { name: 'Hardness', required: true, fileTypeHint: 'PDF' },
  MICRO: { name: 'Micro Structure', required: true, fileTypeHint: 'BMP / PNG / JPG' },
  TENSILE: { name: 'Tensile', required: true, fileTypeHint: 'PDF' },
}

const SECTION_ORDER: Record<string, number> = {
  CHEMICAL: 0,
  MECHANICAL: 1,
  HARDNESS: 2,
  MICRO: 3,
  TENSILE: 4,
}

function parseHeader(header: string): { name: string; unit?: string } {
  const h = header.trim()
  if (!h) return { name: '' }
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
    const key = GROUP_SECTIONS[col.group.toLowerCase()]
    if (!key) continue
    if (!byKey.has(key)) {
      const d = SECTION_DEFAULTS[key]
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

  const headerRow = data[headerRowIdx]
  const groupRow = headerRowIdx > 0 ? data[headerRowIdx - 1] : []

  const cols: GroupCol[] = headerRow.map((h, i) => {
    let group = groupRow[i]?.toString()?.trim() ?? ''
    if (!group) {
      for (let j = i - 1; j >= 0; j--) {
        if (groupRow[j]?.toString()?.trim()) {
          group = groupRow[j].toString().trim()
          break
        }
      }
    }
    return { group, header: h.toString().trim(), idx: i }
  })

  const basicIdx: Record<string, number> = {}
  for (let i = 0; i < cols.length; i++) {
    const h = cols[i].header.toLowerCase()
    if (h.includes('sap')) basicIdx.sapNo = i
    else if (h.includes('part no')) basicIdx.partNo = i
    else if (h.includes('description')) basicIdx.description = i
    else if (h.includes('material')) basicIdx.material = i
    else if (h.includes('customer')) basicIdx.customer = i
    else if (h.includes('grade')) basicIdx.grade = i
  }

  const counts: Record<string, number> = {}
  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r]
    if (!row || row.every((c) => !String(c).trim())) continue
    const sapNo = row[basicIdx.sapNo ?? 0]?.toString().trim()
    if (sapNo) counts[sapNo] = (counts[sapNo] ?? 0) + 1
  }

  for (let r = headerRowIdx + 1; r < data.length; r++) {
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

const REPORT_TYPE_TO_KEY: Record<string, string> = {
  'chemical analysis': 'CHEMICAL',
  'chemical': 'CHEMICAL',
  'mechanical properties': 'MECHANICAL',
  'mechanical': 'MECHANICAL',
  hardness: 'HARDNESS',
  'micro structure': 'MICRO',
  'micro': 'MICRO',
  tensile: 'TENSILE',
}

function parseHeatCodesSheet(ws: XLSX.WorkSheet): ImportedHeatDraft[] {
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  const headerRowIdx = findHeaderRow(data, 'heat id')
  if (headerRowIdx === -1) return []

  const header = data[headerRowIdx].map((h) => h.toString().trim().toLowerCase())
  const idxOf = (name: string) => header.findIndex((h) => h.includes(name))
  const sapIdx = idxOf('sap no')
  const codeIdx = idxOf('heat code')
  const batchIdx = idxOf('batch no')
  const sampleIdx = idxOf('sample')
  const qtyIdx = idxOf('quantity')

  const result: ImportedHeatDraft[] = []
  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r]
    if (!row || row.every((c) => !String(c).trim())) continue
    const sapNo = row[sapIdx]?.toString().trim() ?? ''
    const heatCode = row[codeIdx]?.toString().trim() ?? ''
    if (!sapNo || !heatCode) continue
    result.push({
      id: createId(),
      sapNo,
      heatCode,
      batchNo: batchIdx >= 0 && row[batchIdx] ? row[batchIdx].toString().trim() || undefined : undefined,
      defaultSample: sampleIdx >= 0 && row[sampleIdx] ? row[sampleIdx].toString().trim() || '01' : '01',
      quantity: qtyIdx >= 0 && row[qtyIdx] ? row[qtyIdx].toString().trim() || undefined : undefined,
      demoReports: {},
    })
  }
  return result
}

function parseReportIndexSheet(ws: XLSX.WorkSheet, heats: ImportedHeatDraft[]): void {
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  const headerRowIdx = findHeaderRow(data, 'report type')
  if (headerRowIdx === -1) return
  const header = data[headerRowIdx].map((h) => h.toString().trim().toLowerCase())
  const sapIdx = header.findIndex((h) => h.includes('sap'))
  const codeIdx = header.findIndex((h) => h.includes('heat code'))
  const typeIdx = header.findIndex((h) => h.includes('report type'))
  const pathIdx = header.findIndex((h) => h.includes('relative path'))

  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r]
    if (!row || row.every((c) => !String(c).trim())) continue
    const sapNo = row[sapIdx]?.toString().trim() ?? ''
    const heatCode = row[codeIdx]?.toString().trim() ?? ''
    const reportType = row[typeIdx]?.toString().trim().toLowerCase() ?? ''
    const relPath = row[pathIdx]?.toString().trim() ?? ''
    const key = REPORT_TYPE_TO_KEY[reportType]
    if (!key || !relPath) continue
    const heat = heats.find((h) => h.sapNo === sapNo && h.heatCode === heatCode)
    if (!heat) continue
    heat.demoReports[key] = '/demo-reports/' + relPath.replace(/^Demo Reports\//i, '')
  }
}

export function parseMasterWorkbook(
  arrayBuffer: ArrayBuffer,
  existingMasters: ProductMaster[],
): ImportDraft {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })

  const sectionsConfig: ImportDraft['sectionsConfig'] = [
    { key: 'CHEMICAL', name: 'Chemical Analysis', required: true, fileTypeHint: 'PDF' },
    { key: 'MECHANICAL', name: 'Mechanical Properties', required: false, fileTypeHint: 'PDF' },
    { key: 'HARDNESS', name: 'Hardness', required: true, fileTypeHint: 'PDF' },
    { key: 'MICRO', name: 'Micro Structure', required: true, fileTypeHint: 'BMP / PNG / JPG' },
    { key: 'TENSILE', name: 'Tensile', required: true, fileTypeHint: 'PDF' },
  ]

  const masterSheet = wb.Sheets['Product Master'] ?? wb.Sheets[wb.SheetNames[0]]
  const { masters, meta } = parseProductMasterSheet(masterSheet, existingMasters)

  let heats: ImportedHeatDraft[] = []
  const heatSheet = wb.Sheets['Heat Codes']
  if (heatSheet) heats = parseHeatCodesSheet(heatSheet)

  const reportSheet = wb.Sheets['Report Index']
  if (reportSheet) parseReportIndexSheet(reportSheet, heats)

  return { masters, heats, meta, sectionsConfig }
}
