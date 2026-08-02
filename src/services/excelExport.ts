import * as XLSX from 'xlsx'
import type { Certificate } from '@/types'
import { certificateFileName, getCertificateDisplayParts } from '@/lib/factories'
import { useClientStore } from '@/stores/clientStore'

function headerRows(cert: Certificate): string[][] {
  const client = useClientStore.getState().getClient(cert.clientId)
  return [
    ['GN ALTECH PRIVATE LIMITED - TEST CERTIFICATE'],
    [],
    ['Field', 'Value'],
    ['Certificate Number', cert.certificateNumber],
    ['Certificate Date', cert.certificateDate],
    ['Customer / Client', client?.name ?? cert.clientId],
    ['Invoice / Challan Number', cert.invoiceNumber ?? ''],
    ['Invoice Date', cert.invoiceDate ?? ''],
    ['Delivery Condition', cert.deliveryCondition ?? ''],
    ['Material', cert.material ?? ''],
    ['Grade', cert.grade ?? ''],
    ['Format Number', cert.formatNumber ?? ''],
    ['Revision No. & Date', cert.revisionText ?? ''],
    ['Standard Reference', cert.standardReference ?? ''],
    ['License Number', cert.licenseNumber ?? ''],
    ['Status', cert.status],
  ]
}

function partsRows(cert: Certificate): string[][] {
  const rows: string[][] = [
    ['Sr. No.', 'Qty.', 'Part No.', 'Description', 'Daily Heat No.', 'Monthly Heat No.', 'Yearly Heat No.', 'Batch No.'],
  ]
  const displayParts = getCertificateDisplayParts(cert)
  displayParts.forEach((p, i) => {
    rows.push([
      String(i + 1),
      p.quantity,
      p.partNumber,
      p.description,
      p.dailyHeatNumber,
      p.monthlyHeatNumber ?? '',
      p.yearlyHeatNumber ?? '',
      p.batchNumber ?? '',
    ])
  })
  return rows
}

function sectionRows(title: string, rows: Certificate['chemicalRows']): string[][] {
  const out: string[][] = [[title]]
  out.push(['Parameter', 'Specified Minimum', 'Specified Maximum', 'Observed', 'Unit', 'Result'])
  for (const r of rows) {
    out.push([
      r.label,
      r.minimum ?? '',
      r.maximum ?? '',
      r.observed ?? '',
      r.unit ?? '',
      r.result,
    ])
  }
  return out
}

export function exportCertificateToExcel(certificate: Certificate): void {
  const wb = XLSX.utils.book_new()

  const header = XLSX.utils.aoa_to_sheet(headerRows(certificate))
  header['!cols'] = [{ wch: 28 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, header, 'Certificate')

  const parts = XLSX.utils.aoa_to_sheet(partsRows(certificate))
  parts['!cols'] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 32 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, parts, 'Parts')

  const chemical = XLSX.utils.aoa_to_sheet(sectionRows('CHEMICAL ANALYSIS', certificate.chemicalRows))
  chemical['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, chemical, 'Chemical')

  const mechanical = XLSX.utils.aoa_to_sheet(sectionRows('MECHANICAL PROPERTIES', certificate.mechanicalRows))
  mechanical['!cols'] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, mechanical, 'Mechanical')

  const micro = XLSX.utils.aoa_to_sheet(sectionRows('MICRO STRUCTURE', certificate.microStructureRows))
  micro['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, micro, 'Micro Structure')

  const additional = XLSX.utils.aoa_to_sheet([
    ['Additional Test', 'Result'],
    ...certificate.additionalTests.map((t) => [t.label, t.value]),
  ])
  additional['!cols'] = [{ wch: 40 }, { wch: 34 }]
  XLSX.utils.book_append_sheet(wb, additional, 'Additional Tests')

  const remarks = XLSX.utils.aoa_to_sheet([
    ['Remarks'],
    [certificate.remarks ?? ''],
    [],
    ['Certification Statement'],
    [certificate.certificationStatement ?? ''],
    [],
    ['Tested By', certificate.testedBy ?? ''],
    ['Reviewed By', certificate.reviewedBy ?? ''],
    ['Approved By', certificate.approvedBy ?? ''],
  ])
  remarks['!cols'] = [{ wch: 30 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, remarks, 'Remarks')

  XLSX.writeFile(wb, `${certificateFileName(certificate)}.xlsx`)
}
