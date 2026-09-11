import { parseReport } from '@/services/parsers'
import { lookupDemoFixture } from '@/data/demoReportFixtures'
import { normalizeSectionKey } from '@/lib/permissions'
import type { ParsedReportResult, ParsedValue, ProductMaster } from '@/types'

export type IngestStatus = 'QUEUED' | 'UPLOADING' | 'PARSING' | 'MATCHED' | 'REVIEW_REQUIRED' | 'FAILED'

export interface IngestItem {
  id: string
  file: File
  progress: number
  status: IngestStatus
  /** Queue position message, e.g. "Waiting in queue — #2". */
  queueLabel?: string
  /** Current pipeline stage message while processing. */
  stage?: string
  /** True when SAP/heat/values came from the known demo lab files. */
  demoMatch?: boolean
  /**
   * Live preview sample letter (A/B/C…) when this row shares (SAP, heat)
   * with another row. Undefined = heat-level report. Submit reuses it.
   */
  assignedSample?: string
  result?: ParsedReportResult
  sapCode: string
  heatCode: string
  confidence: number
  message: string
  values: ParsedValue[]
  valueSource: Record<string, 'EXTRACTED' | 'MASTER' | 'MANUAL'>
}

function fnHints(name: string): { sap?: string; heat?: string } {
  const upper = name.toUpperCase()
  const sap = upper.match(/(SAP[-_ ]?\d{3,10})/)?.[1]?.replace(/[_ ]/g, '-')
  const heat =
    upper.match(/(HEAT[-_ ]?[\w-]+)/)?.[1]?.replace(/[_ ]/g, '-') ??
    upper.match(/\b(GZ[-\s]?\d+[A-Z]?|G6[A-Z](?:-A)?|A6[A-D]|PR\d+[A-Z]+\d+[A-Z]*)\b/)?.[1]?.replace(/\s+/g, '-')
  return { sap, heat }
}

function textHints(text: string): { sap?: string; heat?: string } {
  const sap = text.match(/SAP\s*(?:No\.?|Code)?\s*[:#]?\s*(SAP[-_ ]?\d{3,10}|\d{5,})/i)?.[1]
  // Heat printed inside the lab reports takes several forms:
  // "Heat No.: GZ-56", "Sample Identification: GZ-56 P-COVER", "Job No GZ 51-59"
  const heat =
    text.match(/Heat\s*(?:No\.?|Code)?\s*[:#]?\s*([A-Z0-9]+[-\s]?[A-Z0-9]+)/i)?.[1] ??
    text.match(/Sample\s*Identification\s*:?\s*([A-Z0-9]+(?:-[A-Z0-9]+)?)/i)?.[1] ??
    text.match(/Job\s*No\s*:?\s*([A-Z]{1,3}\s*\d+[-\s]?\d*)/i)?.[1]
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

  // Micro BMPs are photos — skip the heavy OCR when we already know
  // the file; SAP + heat come from the fixture, values at review.
  if (isImage && fixture && (key === 'MICRO' || key === 'CHEMICAL' || key === 'TENSILE' || key === 'HARDNESS')) {
    onProgress(100)
    const master = masters.find((m) => m.sapNo.toLowerCase() === fixture.sapCode.toLowerCase())
    const fb = applyMasterFallback(fixture.values, master, key)
    return {
      result: {
        detectedSAPNo: fixture.sapCode, detectedHeatCode: fixture.heatCode,
        detectedHeatSample: undefined, detectedPartNo: undefined, detectedCustomer: undefined,
        detectedMaterial: undefined, parameters: fixture.values, rawText: '', warnings: [], confidence: 0.95,
      },
      sapCode: fixture.sapCode, heatCode: fixture.heatCode, confidence: 0.95,
      message: fb.values.length > 0 ? 'Demo file matched' : 'Image attached — enter values at review',
      status: 'MATCHED', values: fb.values, valueSource: fb.source, demoMatch: true,
    }
  }

  let result: ParsedReportResult
  try {
    result = await parseReport(file, key)
  } catch {
    result = {
      detectedSAPNo: undefined, detectedHeatCode: undefined, detectedHeatSample: undefined,
      detectedPartNo: undefined, detectedCustomer: undefined, detectedMaterial: undefined,
      parameters: [], rawText: '', warnings: ['Information could not be automatically extracted. Please review the record.'], confidence: 0,
    }
  }
  onProgress(70)
  const fn = fnHints(file.name)
  const tx = textHints(result.rawText ?? '')
  let sapCode = (result.detectedSAPNo ?? tx.sap ?? fn.sap ?? '').toUpperCase()
  let heatCode = (result.detectedHeatCode ?? tx.heat ?? fn.heat ?? '').toUpperCase()
  let extracted = result.parameters
  let demoMatch = false

  // Known demo lab files: fill gaps from the real measured data.
  // Real parse wins; fixture only fills what the parser missed.
  if (fixture) {
    demoMatch = true
    if (!sapCode) sapCode = fixture.sapCode
    if (!heatCode) heatCode = fixture.heatCode
    if (extracted.length === 0 && fixture.values.length > 0) extracted = fixture.values
  }

  const master = masters.find((m) => m.sapNo.toLowerCase() === sapCode.toLowerCase())
  const fb = applyMasterFallback(extracted, master, key)
  const hasIds = Boolean(sapCode && heatCode)
  const hasValues = fb.values.length > 0
  const confidence = result.confidence && extracted.length > 0 ? result.confidence : demoMatch && hasValues ? 0.95 : hasValues ? 0.7 : 0.2
  let status: IngestItem['status'] = 'MATCHED'
  let message = demoMatch ? 'Demo file matched' : 'Matched'
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
 * Sequential ~10s pipeline for one file: Uploading -> Parsing -> Extracting
 * -> Matching. Only the active file advances; the rest stay QUEUED.
 * Throws nothing — failures resolve to FAILED so the row can be retried.
 */
export async function processQueuedFile(
  file: File,
  sectionKey: string,
  masters: ProductMaster[],
  patch: (p: Partial<IngestItem>) => void,
): Promise<IngestOutcome> {
  const staged = async (from: number, to: number, ms: number, stage: string, status: IngestStatus) => {
    patch({ status, stage, progress: from })
    const steps = 8
    for (let i = 1; i <= steps; i++) {
      await sleep(ms / steps)
      patch({ progress: Math.round(from + ((to - from) * i) / steps), stage, status })
    }
  }
  try {
    await staged(2, 25, 2000, 'Uploading file…', 'UPLOADING')
    patch({ status: 'PARSING', stage: 'Parsing report text…', progress: 28 })
    const out = await processOneFile(file, sectionKey, masters, (p) =>
      patch({ progress: 28 + Math.round(p * 0.3), stage: 'Extracting measured values…', status: 'PARSING' }),
    )
    await staged(60, 82, 2500, 'Extracting measured values…', 'PARSING')
    await staged(82, 100, 2500, 'Matching SAP / Heat code…', 'PARSING')
    return out
  } catch (err) {
    return {
      result: undefined, sapCode: '', heatCode: '', confidence: 0,
      message: err instanceof Error ? err.message : 'Processing failed — retry this file.',
      status: 'FAILED', values: [], valueSource: {},
    }
  }
}
