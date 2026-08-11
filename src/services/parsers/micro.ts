import type { ParsedReportResult, ParsedValue } from '@/types'
import { firstMatch, value } from '@/services/parsers/common'

let ocrPromise: Promise<typeof import('tesseract.js')> | null = null

function getTesseract(): Promise<typeof import('tesseract.js')> {
  if (!ocrPromise) {
    ocrPromise = import('tesseract.js')
  }
  return ocrPromise
}

function numNear(text: string, label: RegExp): string | undefined {
  const m = text.match(label)
  if (!m) return undefined
  const idx = m.index ?? 0
  const n = text.slice(idx).match(/(-?\d+(?:\.\d+)?)\s*%?/)
  return n ? n[1] : undefined
}

export async function parseMicroStructureImage(blob: Blob): Promise<ParsedReportResult> {
  const { createWorker } = await getTesseract()
  const worker = await createWorker('eng')
  let text = ''
  try {
    const { data } = await worker.recognize(blob)
    text = data.text ?? ''
  } finally {
    await worker.terminate()
  }

  const result: ParsedReportResult = {
    detectedSAPNo: firstMatch(text, /SAP\s*No\.?\s*[:=]?\s*(\S+)/i),
    detectedHeatCode: firstMatch(text, /Heat\s*Code\s*[:=]?\s*(\S+)/i),
    detectedHeatSample: firstMatch(text, /Heat\s*\/\s*Sample\s*[:=]?\s*(\S+)/i),
    detectedPartNo: firstMatch(text, /Part\s*No\.?\s*[:=]?\s*(\S+)/i),
    detectedCustomer: firstMatch(text, /Customer\s*[:=]?\s*(\S+)/i),
    detectedMaterial: firstMatch(text, /Material\s*[:=]?\s*(\S+)/i),
    parameters: [],
    rawText: text,
    warnings: [],
    confidence: 0.5,
  }

  const candidates: Array<[string, string | undefined, string]> = [
    ['Average Nodularity', numNear(text, /Nodularity/i), '%'],
    ['Nodule Count', numNear(text, /Nodule\s*Count/i), ''],
    ['Pearlite', numNear(text, /Pearlite/i), '%'],
    ['Ferrite', numNear(text, /Ferrite/i), '%'],
    ['Carbide', numNear(text, /Carbide/i), '%'],
  ]

  for (const [name, v, unit] of candidates) {
    const pv: ParsedValue | null = value(name, v, unit, 0.5)
    if (pv) result.parameters.push(pv)
  }

  if (result.parameters.length === 0) {
    result.warnings.push(
      'OCR did not extract any values from the image. Please review and enter the values manually.',
    )
  }

  return result
}
