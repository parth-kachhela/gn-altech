import type { ParsedReportResult, ParsedValue } from '@/types'

export function firstMatch(text: string, pattern: RegExp): string | undefined {
  const m = text.match(pattern)
  return m && m[1] ? m[1].trim() : undefined
}

export function baseResult(text: string): ParsedReportResult {
  return {
    detectedSAPNo: firstMatch(text, /SAP\s*No\.?:\s*(\S+)/i),
    detectedHeatCode: firstMatch(text, /Heat\s*Code:\s*(\S+)/i),
    detectedHeatSample: firstMatch(text, /Heat\s*\/\s*Sample:\s*(\S+)/i),
    detectedPartNo: firstMatch(text, /Part\s*No\.?:\s*(.+?)\s+(?=Item:\s*)/i) ?? firstMatch(text, /Part\s*No\.?:\s*(\S+)/i),
    detectedCustomer: firstMatch(text, /Customer:\s*(.+?)\s+(?=Material:\s*)/i) ?? firstMatch(text, /Customer:\s*(\S+)/i),
    detectedMaterial: firstMatch(text, /Material:\s*(.+?)\s+(?=Heat\s*Code:\s*)/i) ?? firstMatch(text, /Material:\s*(\S+)/i),
    parameters: [],
    rawText: text,
    warnings: [],
    confidence: 0,
  }
}

export function value(name: string, value?: string, unit?: string, confidence?: number): ParsedValue | null {
  if (value === undefined || value.trim() === '') return null
  return { name, value: value.trim(), unit, confidence }
}
