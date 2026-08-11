export function isNumeric(value?: string): boolean {
  if (value === undefined || value === null) return false
  const t = String(value).trim()
  if (t === '') return false
  return !Number.isNaN(Number(t))
}
