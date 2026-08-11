import type { Certificate } from '@/types'

export function suggestCertificateNumber(certificates: Certificate[]): string {
  const year = new Date().getFullYear()
  let max = 0
  for (const c of certificates) {
    const m = c.certificateNumber.match(/TC-\d{4}-(\d{6})$/)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `TC-${year}-${String(max + 1).padStart(6, '0')}`
}

export function certificateFileName(cert: Certificate): string {
  const safeNo = (cert.certificateNumber || 'CERTIFICATE').replace(/[^a-zA-Z0-9-]+/g, '-')
  const sap = cert.productSnapshot?.sapNo?.replace(/[^a-zA-Z0-9-]+/g, '-') ?? ''
  const part = cert.productSnapshot?.partNo?.replace(/[^a-zA-Z0-9-]+/g, '-') ?? ''
  const suffix = [sap, part].filter(Boolean).join('_')
  return `${safeNo}${suffix ? `_${suffix}` : ''}`
}
