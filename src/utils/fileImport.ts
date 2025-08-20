import * as XLSX from 'xlsx'

export type SupportedFile = 'xlsx' | 'xls' | 'csv' | 'txt'

export async function readFileAsText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'txt' || ext === 'csv') {
    return await file.text()
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheetName]
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]
    // Convert table rows to text by rows (glue cells through tabs)
    const lines = rows.map(cells => (cells ?? []).map(v => (v ?? '')).join('\t'))
    return lines.join('\n')
  }
  throw new Error('Unsupported file type')
}


