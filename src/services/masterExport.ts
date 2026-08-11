import * as XLSX from 'xlsx'
import type { ProductMaster } from '@/types'

export function exportMasterExcel(masters: ProductMaster[]): void {
  const wb = XLSX.utils.book_new()

  const header: string[] = ['SAP No.', 'Part No.', 'Description', 'Material', 'Customer', 'Grade']
  const groupHeader: string[] = ['Basic Details', '', '', '', '', '']
  const groups: Array<{ key: string; name: string }> = []

  for (const m of masters) {
    for (const section of m.sections) {
      if (groups.find((g) => g.key === section.key)) continue
      groups.push({ key: section.key, name: section.name })
    }
  }

  for (const g of groups) {
    const section = masters[0]?.sections.find((s) => s.key === g.key)
    for (const p of section?.parameters ?? []) {
      header.push(`${p.name}${p.unit ? ` (${p.unit})` : ''}`)
      groupHeader.push(g.name)
    }
  }

  const rows: unknown[][] = []
  for (const m of masters) {
    const row: unknown[] = [m.sapNo, m.partNo, m.description, m.material, m.customer, m.grade ?? '']
    for (const g of groups) {
      const section = m.sections.find((s) => s.key === g.key)
      for (const p of section?.parameters ?? []) {
        row.push(p.sourceText ?? '')
      }
    }
    rows.push(row)
  }

  const ws = XLSX.utils.aoa_to_sheet([groupHeader, header, ...rows])
  ws['!cols'] = header.map((h) => ({ wch: Math.max(12, h.length + 2) }))
  XLSX.utils.book_append_sheet(wb, ws, 'Product Master')
  XLSX.writeFile(wb, 'ProductMaster_Export.xlsx')
}
