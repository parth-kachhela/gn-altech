import type { ParsedReportResult, ParsedValue, ProductMaster } from '@/types'
import { lookupDemoFixture } from '@/data/demoReportFixtures'
import { parseReport } from '@/services/parsers'

export type IngestStatus =
  | 'QUEUED'
  | 'UPLOADING'
  | 'PARSING'
  | 'EXTRACTING'
  | 'MATCHED'
  | 'REVIEW_REQUIRED'
  | 'FAILED'

export interface IngestItem {
  id: string
  file: File
  progress: number
  status: IngestStatus
  queueLabel?: string
  stage?: string
  result?: ParsedReportResult
  sapCode: string
  heatCode: string
  assignedSample?: string
  confidence: number
  message?: string
  values: ParsedValue[]
  valueSource: Record<string, 'EXTRACTED' | 'MASTER' | 'MANUAL'>
  demoMatch?: boolean
}

export function normalizeSectionKey(key: string): string {
  const k = (key ?? '').toUpperCase().trim()
  if (k.includes('CHEM')) return 'CHEMICAL'
  if (k.includes('TENS')) return 'TENSILE'
  if (k.includes('HARD') || k.includes('MECH')) return 'HARDNESS'
  if (k.includes('MICRO')) return 'MICRO'
  return k || 'GENERIC'
}

export function fnHints(fileName: string): { sap?: string; heat?: string } {
  const name = fileName.replace(/\.[^/.]+$/, '')
  const s = name.match(/SAP[_-]?([A-Z0-9]+)/i)
  const h = name.match(/(HEAT[_-]?[A-Z0-9]+|GZ[_-]?\d+|G6[EOA]|G[A-Z0-9]+|\b\d{4,}\b)/i)
  return { sap: s ? s[0].toUpperCase() : undefined, heat: h ? h[0].toUpperCase() : undefined }
}

export function textHints(rawText: string): { sap?: string; heat?: string } {
  const sap = rawText.match(/\b(PR\d{2}[A-Z]{2}\d{4}[A-Z]{2}|SAP[_-]?\d{4,})\b/i)?.[1]
  const heat = rawText.match(/(?:Heat\s*(?:No\.?|Code)|Job\s*No\.?)\s*[:#-]?\s*([A-Z0-9-]+)/i)?.[1]
  return { sap: sap?.replace(/[_ ]/g, '-').toUpperCase(), heat: heat?.replace(/\s+/g, '-').toUpperCase() }
}

export function applyMasterFallback(
  extracted: ParsedValue[],
  master: ProductMaster | undefined,
  sectionKey: string,
): { values: ParsedValue[]; source: Record<string, 'EXTRACTED' | 'MASTER' | 'MANUAL'> } {
  const key = normalizeSectionKey(sectionKey)
  const values = [...extracted]
  const source: Record<string, 'EXTRACTED' | 'MASTER' | 'MANUAL'> = {}
  for (const v of values) source[v.name] = 'EXTRACTED'
  const section = master?.sections.find((s) => normalizeSectionKey(s.key) === key)
  if (section) {
    for (const p of section.parameters) {
      const exists = values.some((v) => v.name.toLowerCase() === p.name.toLowerCase())
      if (!exists) {
        const fallback = p.expectedValue ?? p.min ?? p.max ?? ''
        if (fallback) {
          values.push({ name: p.name, value: fallback, unit: p.unit, confidence: 0.4 })
          source[p.name] = 'MASTER'
        }
      }
    }
  }
  return { values, source }
}

export type IngestOutcome = Pick<IngestItem, 'result' | 'sapCode' | 'heatCode' | 'confidence' | 'message' | 'status' | 'values' | 'valueSource' | 'demoMatch'>

const IMAGE_EXT = /\.(bmp|png|jpg|jpeg)$/i

export async function processOneFile(
  file: File,
  sectionKey: string,
  masters: ProductMaster[],
  onProgress: (p: number) => void,
): Promise<IngestOutcome> {
  onProgress(25)
  const key = normalizeSectionKey(sectionKey)
  const isImage = file.type.startsWith('image/') || IMAGE_EXT.test(file.name)
  const fixture = lookupDemoFixture(file.name, key)

  // Demo file lookup match
  if (fixture) {
    onProgress(100)
    const master = masters.find((m) => m.sapNo.toLowerCase() === fixture.sapCode.toLowerCase())
    const fb = applyMasterFallback(fixture.values, master, key)
    return {
      result: {
        detectedSAPNo: fixture.sapCode,
        detectedHeatCode: fixture.heatCode,
        detectedHeatSample: undefined,
        detectedPartNo: undefined,
        detectedCustomer: undefined,
        detectedMaterial: undefined,
        parameters: fixture.values,
        rawText: '',
        warnings: [],
        confidence: 0.98,
      },
      sapCode: fixture.sapCode,
      heatCode: fixture.heatCode,
      confidence: 0.98,
      message: 'Demo file auto-matched',
      status: 'MATCHED',
      values: fb.values,
      valueSource: fb.source,
      demoMatch: true,
    }
  }

  let result: ParsedReportResult
  try {
    result = await parseReport(file, key)
  } catch {
    result = {
      detectedSAPNo: undefined,
      detectedHeatCode: undefined,
      detectedHeatSample: undefined,
      detectedPartNo: undefined,
      detectedCustomer: undefined,
      detectedMaterial: undefined,
      parameters: [],
      rawText: '',
      warnings: ['Information could not be automatically extracted. Please review the record.'],
      confidence: 0,
    }
  }
  onProgress(70)
  const fn = fnHints(file.name)
  const tx = textHints(result.rawText ?? '')
  const sapCode = (result.detectedSAPNo ?? tx.sap ?? fn.sap ?? '').toUpperCase()
  const heatCode = (result.detectedHeatCode ?? tx.heat ?? fn.heat ?? '').toUpperCase()
  const extracted = result.parameters
  const demoMatch = false

  const master = masters.find((m) => m.sapNo.toLowerCase() === sapCode.toLowerCase())
  const fb = applyMasterFallback(extracted, master, key)
  const hasIds = Boolean(sapCode && heatCode)
  const hasValues = fb.values.length > 0
  const confidence = result.confidence && extracted.length > 0 ? result.confidence : hasValues ? 0.7 : 0.2
  let status: IngestItem['status'] = 'MATCHED'
  let message = 'Matched'
  if (isImage && !hasValues) {
    message = 'Image attached — enter values at review'
  } else if (!hasIds || !hasValues || confidence < 0.45 || result.warnings.length > 0) {
    status = 'REVIEW_REQUIRED'
    message = !hasIds && !hasValues
      ? 'Information could not be automatically extracted. Please review the record.'
      : 'Review Required'
  }
  onProgress(100)
  return { result, sapCode, heatCode, confidence, message, status, values: fb.values, valueSource: fb.source, demoMatch }
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Sequential pipeline for one file: Uploading -> Parsing -> Extracting
 */
export async function processQueuedFile(
  file: File,
  sectionKey: string,
  masters: ProductMaster[],
  onPatch: (p: Partial<IngestItem>) => void,
): Promise<IngestOutcome> {
  const isImage = file.type.startsWith('image/') || IMAGE_EXT.test(file.name)
  const fast = isImage || lookupDemoFixture(file.name, sectionKey) !== undefined
  const scale = fast ? 0.05 : 1

  onPatch({ status: 'UPLOADING', stage: 'Uploading document…', progress: 10 })
  await sleep(150 * scale)
  onPatch({ progress: 25 })
  await sleep(150 * scale)

  onPatch({ status: 'PARSING', stage: 'Parsing contents & OCR…', progress: 40 })
  await sleep(250 * scale)
  onPatch({ progress: 65 })
  await sleep(250 * scale)

  onPatch({ status: 'EXTRACTING', stage: 'Extracting test parameters…', progress: 85 })
  const outcome = await processOneFile(file, sectionKey, masters, (p) => onPatch({ progress: Math.min(95, p) }))

  return outcome
}
