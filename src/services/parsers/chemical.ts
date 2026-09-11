import type { ParsedReportResult } from '@/types'
import { baseResult, value } from '@/services/parsers/common'

const ELEMENTS = [
  'C', 'Si', 'Mn', 'P', 'S', 'Cr', 'Mg', 'Cu', 'Sn', 'Mo',
  'Ni', 'Al', 'Co', 'Nb', 'Ti', 'V', 'Pb', 'Sb', 'Se', 'Zn',
  'Zr', 'La', 'As', 'B', 'Bi', 'Ce', 'Fe',
]

function isNum(tok: string): boolean {
  return /^<?-?\d(\.\d+)?$/.test(tok.trim())
}

// Average-row markers: pdfjs decodes Ø differently per embedded font.
const AVG_MARKS = new Set(['Ø', 'ø', 'Φ', 'φ', '∅', '⌀', 'Ã˜', 'Ã¸'])

export function parseChemicalReport(text: string): ParsedReportResult {
  const result = baseResult(text)
  // GN Altech spectrometer layout: "Fe [%] C [%] ... 1 93.2 3.48 ... Ø 93.2 ..."
  // in repeating blocks (Fe..Cr / Mo..Ti / V..Zr / Mg..Ce).
  // The Ø row holds the average — prefer it when present.
  const clean = text.replace(/\[%\]/g, '%')
  const tokens = clean.split(/\s+/)

  // Collect every header run: consecutive "ELEMENT %" pairs.
  const blocks: Array<{ headers: string[]; after: number }> = []
  let i = 0
  while (i < tokens.length - 1) {
    if (tokens[i + 1] === '%' && ELEMENTS.includes(tokens[i])) {
      const headers: string[] = []
      let j = i
      while (j + 1 < tokens.length && tokens[j + 1] === '%' && ELEMENTS.includes(tokens[j])) {
        headers.push(tokens[j])
        j += 2
      }
      blocks.push({ headers, after: j })
      i = j
    } else {
      i++
    }
  }

  if (blocks.length === 0) {
    result.warnings.push('No chemical element table found in text.')
    return result
  }

  let parsed = 0
  for (const block of blocks) {
    const { headers, after } = block
    // End of this block's data region = start of the next header block (or EOF).
    let regionEnd = tokens.length
    for (let k = after; k < tokens.length - 1; k++) {
      if (tokens[k + 1] === '%' && ELEMENTS.includes(tokens[k])) { regionEnd = k; break }
    }
    // Look for an average-row marker belonging to this block ("Ø" + N numbers).
    // pdfjs can decode Ø differently per font/encoding — accept variants.
    let chosen: string[] | null = null
    for (let k = after; k < regionEnd; k++) {
      const tok = tokens[k]
      if (AVG_MARKS.has(tok) || (tok.length > 1 && AVG_MARKS.has(tok[0]) && isNum(tok.slice(1)))) {
        const rest = tok.length > 1 ? [tok.slice(1)] : []
        const cand = [...rest, ...tokens.slice(k + 1, k + 1 + headers.length - rest.length)]
        if (cand.length === headers.length && cand.every(isNum)) {
          chosen = cand
          break
        }
      }
    }
    // Fallback: the average row prints LAST (rows "1", "2", then "Ø"),
    // so take the last N numerics — leading row indices fall away.
    if (!chosen) {
      const nums = tokens.slice(after, regionEnd).filter(isNum)
      if (nums.length >= headers.length) chosen = nums.slice(nums.length - headers.length)
    }
    if (!chosen) continue
    headers.forEach((h, idx) => {
      const raw = chosen![idx]
      const v = value(h, raw === 'N/A' ? undefined : raw, '%', 0.95)
      if (v) {
        v.normalizedName = h.toLowerCase()
        result.parameters.push(v)
        parsed++
      }
    })
  }

  result.confidence = parsed > 0 ? 0.92 : 0.3
  if (parsed === 0) result.warnings.push('Element headers found but no values parsed.')
  return result
}
