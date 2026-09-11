/**
 * Shared helpers for grouping reports by (SAP, heat): unique groups stay
 * heat-level, repeats sharing SAP + heat become Sample A / B / C…
 */

export function groupByHeatCode<T>(items: T[], heatOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = heatOf(item).trim().toUpperCase()
    const arr = groups.get(key)
    if (arr) arr.push(item)
    else groups.set(key, [item])
  }
  return groups
}

/**
 * Group key is (SAP, heat): same heat under different SAPs lands in
 * different groups so each SAP gets its own heat; repeats sharing both
 * SAP and heat stay together and become Sample A / B / C…
 */
export function groupBySapHeat<T>(
  items: T[],
  sapOf: (item: T) => string,
  heatOf: (item: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = `${sapOf(item).trim().toUpperCase()}::${heatOf(item).trim().toUpperCase()}`
    const arr = groups.get(key)
    if (arr) arr.push(item)
    else groups.set(key, [item])
  }
  return groups
}

/** Next free sample letters (A–Z, then A1, A2…) avoiding `taken` labels. */
export function nextSampleLabels(taken: string[], count: number): string[] {
  const used = new Set(taken.map((t) => t.toUpperCase()))
  const out: string[] = []
  let code = 65 // 'A'
  while (out.length < count && code <= 90) {
    const label = String.fromCharCode(code)
    code++
    if (!used.has(label)) {
      used.add(label)
      out.push(label)
    }
  }
  let n = 1
  while (out.length < count) {
    const label = `A${n++}`
    if (!used.has(label)) {
      used.add(label)
      out.push(label)
    }
  }
  return out
}

export interface PreviewRow {
  id: string
  sapCode: string
  heatCode: string
  status: string
  assignedSample?: string
}

const SUBMITTABLE = new Set(['MATCHED', 'REVIEW_REQUIRED'])

/**
 * Live preview assignment for the bulk review table: rows sharing
 * (SAP, heat) get A / B / C… in row order, unique rows stay heat-level
 * (assignedSample undefined). `takenLabelsOf` reads already-saved sample
 * letters for a (SAP, heat) pair so preview continues past them.
 * Returns the SAME array reference when nothing changed (loop-safe).
 */
export function assignPreviewSamples<T extends PreviewRow>(
  items: T[],
  takenLabelsOf: (sap: string, heat: string) => string[],
): T[] {
  const groups = new Map<string, T[]>()
  for (const it of items) {
    if (!it.sapCode?.trim() || !it.heatCode?.trim()) continue
    if (!SUBMITTABLE.has(it.status)) continue
    const key = `${it.sapCode.trim().toUpperCase()}::${it.heatCode.trim().toUpperCase()}`
    const arr = groups.get(key)
    if (arr) arr.push(it)
    else groups.set(key, [it])
  }
  const want = new Map<string, string | undefined>()
  for (const [key, grp] of groups) {
    if (grp.length < 2) {
      for (const it of grp) want.set(it.id, undefined)
      continue
    }
    const sep = key.lastIndexOf('::')
    const labels = nextSampleLabels(takenLabelsOf(key.slice(0, sep), key.slice(sep + 2)), grp.length)
    grp.forEach((it, i) => want.set(it.id, labels[i]))
  }
  let changed = false
  const next = items.map((it) => {
    if (!want.has(it.id)) return it
    const w = want.get(it.id)
    if (it.assignedSample === w) return it
    changed = true
    return { ...it, assignedSample: w }
  })
  return changed ? next : items
}

/**
 * Submit-time labels: prefer the previewed `assignedSample` when still
 * free, otherwise mint the next free letter. Guarantees review == saved.
 */
export function resolveGroupLabels(
  group: Array<{ assignedSample?: string }>,
  taken: string[],
): string[] {
  const used = [...taken]
  return group.map((it) => {
    if (it.assignedSample && !used.includes(it.assignedSample)) {
      used.push(it.assignedSample)
      return it.assignedSample
    }
    const [label] = nextSampleLabels(used, 1)
    used.push(label)
    return label
  })
}
