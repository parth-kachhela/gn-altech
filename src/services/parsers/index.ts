import type { ParsedReportResult } from '@/types'
import { extractTextFromFile } from '@/services/pdfExtract'
import { parseChemicalReport } from '@/services/parsers/chemical'
import { parseHardnessReport } from '@/services/parsers/hardness'
import { parseTensileReport } from '@/services/parsers/tensile'
import { parseMicroStructureImage } from '@/services/parsers/micro'
import { parseGenericText } from '@/services/parsers/generic'

export type ParserKind = 'chemical' | 'hardness' | 'tensile' | 'micro' | 'generic'

export function parserKindForSection(sectionKey: string): ParserKind {
  const k = sectionKey.toLowerCase()
  if (k.includes('chem')) return 'chemical'
  if (k.includes('hard') || k.includes('mech')) return 'hardness'
  if (k.includes('tens')) return 'tensile'
  if (k.includes('micro')) return 'micro'
  return 'generic'
}

export async function parseReport(
  file: File,
  sectionKey: string,
  onProgress?: (percent: number) => void,
): Promise<ParsedReportResult> {
  const kind = parserKindForSection(sectionKey)

  if (kind === 'micro' || file.type.startsWith('image/')) {
    return parseMicroStructureImage(file)
  }

  const text = await extractTextFromFile(file, onProgress)
  switch (kind) {
    case 'chemical':
      return parseChemicalReport(text)
    case 'hardness':
      return parseHardnessReport(text)
    case 'tensile':
      return parseTensileReport(text)
    default:
      return parseGenericText(text)
  }
}
