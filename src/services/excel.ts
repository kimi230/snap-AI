import * as XLSX from 'xlsx'

export async function exportToExcel(
  columns: string[],
  data: string[][],
  filePath: string
): Promise<void> {
  const wsData = [columns, ...data]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 열 너비 자동 조정
  const colWidths = columns.map((col, i) => {
    const maxLen = Math.max(
      col.length,
      ...data.map(row => (row[i] || '').length)
    )
    return { wch: Math.max(maxLen + 2, 10) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  // ArrayBuffer로 생성 (renderer에서 fs 접근 불가)
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  const uint8 = Array.from(new Uint8Array(buffer))

  // IPC를 통해 main process에서 파일 저장
  await window.electronAPI.writeFile(filePath, uint8)
}
