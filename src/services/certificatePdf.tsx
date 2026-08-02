import { pdf } from '@react-pdf/renderer'
import type { Certificate } from '@/types'
import { certificateFileName } from '@/lib/factories'
import { TestCertificateDocument } from '@/components/pdf/TestCertificateDocument'

export async function generateCertificateBlob(
  certificate: Certificate,
): Promise<Blob> {
  const instance = pdf(
    <TestCertificateDocument certificate={certificate} />,
  )
  return instance.toBlob()
}

export async function downloadCertificatePdf(
  certificate: Certificate,
): Promise<void> {
  const blob = await generateCertificateBlob(certificate)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${certificateFileName(certificate)}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
