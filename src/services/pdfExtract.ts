import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

interface ItemLike {
  str?: string
  transform?: number[]
}

export async function extractTextFromArrayBuffer(
  buffer: ArrayBuffer,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const task = pdfjsLib.getDocument({ data: buffer })
  task.onProgress = (data: { loaded: number; total: number }) => {
    if (onProgress && data.total) {
      onProgress(Math.round((data.loaded / data.total) * 100))
    }
  }
  const pdf = await task.promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(textItemsToLines(content.items))
  }
  return pages.join('\n\n')
}

export async function extractTextFromFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const buffer = await file.arrayBuffer()
  return extractTextFromArrayBuffer(buffer, onProgress)
}

function textItemsToLines(items: unknown[]): string {
  const parts: string[] = []
  for (const item of items) {
    const it = item as ItemLike
    if (typeof it.str === 'string') parts.push(it.str)
  }
  return parts.join(' ')
}
