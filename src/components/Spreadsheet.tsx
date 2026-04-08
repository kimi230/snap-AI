import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.min.css'

export interface SpreadsheetHandle {
  getData: () => string[][]
  addRow: () => void
  removeRow: () => void
  addColumn: () => void
  removeColumn: () => void
}

interface SpreadsheetProps {
  columns: string[]
  data: string[][]
  onColumnsChange: (columns: string[]) => void
  onDataChange: (data: string[][]) => void
}

const Spreadsheet = forwardRef<SpreadsheetHandle, SpreadsheetProps>(
  ({ columns, data, onColumnsChange, onDataChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const hotRef = useRef<Handsontable | null>(null)
    // 프로그래밍 방식 변경 시 훅 무시용 플래그
    const suppressSync = useRef(false)

    // Handsontable → React 상태 동기화 유틸
    const syncToReact = useCallback(() => {
      const hot = hotRef.current
      if (!hot) return
      const allData = hot.getData()
      const newCols = allData[0].slice(1) as string[]
      const newData = allData.slice(1).map(row => row.slice(1) as string[])
      suppressSync.current = true
      onColumnsChange(newCols)
      onDataChange(newData)
      // 다음 tick에서 플래그 해제 (useEffect가 실행된 후)
      setTimeout(() => { suppressSync.current = false }, 0)
    }, [onColumnsChange, onDataChange])

    // 행 번호 재정렬
    const renumberRows = useCallback(() => {
      const hot = hotRef.current
      if (!hot) return
      const rowCount = hot.countRows()
      const changes: [number, number, string][] = []
      for (let r = 1; r < rowCount; r++) {
        changes.push([r, 0, String(r)])
      }
      if (changes.length > 0) {
        hot.setDataAtCell(changes, 'internal')
      }
    }, [])

    useImperativeHandle(ref, () => ({
      getData: () => {
        if (!hotRef.current) return data
        const allData = hotRef.current.getData()
        return allData.slice(1).map(row => row.slice(1))
      },
      addRow: () => {
        const hot = hotRef.current
        if (!hot) return
        suppressSync.current = true
        const rowCount = hot.countRows()
        const colCount = hot.countCols()
        // 새 행 데이터: [행번호, 빈칸들...]
        const newRow = [String(rowCount), ...Array(colCount - 1).fill('')]
        hot.alter('insert_row_below', rowCount - 1, 1)
        hot.setDataAtCell(
          newRow.map((val, col) => [rowCount, col, val]),
          'internal'
        )
        syncToReact()
      },
      removeRow: () => {
        const hot = hotRef.current
        if (!hot) return
        const rowCount = hot.countRows()
        if (rowCount <= 2) return // 헤더 + 최소 1행

        suppressSync.current = true
        const selected = hot.getSelected()
        if (selected) {
          const rows = new Set<number>()
          for (const [r1, , r2] of selected) {
            for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
              if (r > 0) rows.add(r)
            }
          }
          const sorted = [...rows].sort((a, b) => b - a)
          for (const r of sorted) {
            hot.alter('remove_row', r)
          }
        } else {
          hot.alter('remove_row', rowCount - 1)
        }
        renumberRows()
        syncToReact()
      },
      addColumn: () => {
        const hot = hotRef.current
        if (!hot) return
        suppressSync.current = true
        const colCount = hot.countCols()
        hot.alter('insert_col_end', colCount - 1, 1)
        hot.setDataAtCell(0, colCount, `열${colCount}`, 'internal')
        syncToReact()
      },
      removeColumn: () => {
        const hot = hotRef.current
        if (!hot) return
        const colCount = hot.countCols()
        if (colCount <= 2) return // #열 + 최소 1개 데이터 열

        suppressSync.current = true
        const selected = hot.getSelected()
        if (selected) {
          const cols = new Set<number>()
          for (const [, c1, , c2] of selected) {
            for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
              if (c > 0) cols.add(c)
            }
          }
          if (cols.size >= colCount - 1) return // 전부 지우면 안됨
          const sorted = [...cols].sort((a, b) => b - a)
          for (const c of sorted) {
            hot.alter('remove_col', c)
          }
        } else {
          hot.alter('remove_col', colCount - 1)
        }
        syncToReact()
      }
    }))

    const buildTableData = useCallback(() => {
      const headerRow = ['#', ...columns]
      const rows = data.length > 0
        ? data.map((row, i) => [
            String(i + 1),
            ...columns.map((_, ci) => row[ci] ?? '')
          ])
        : Array.from({ length: 20 }, (_, i) => [
            '',
            ...Array(columns.length).fill('')
          ])
      return [headerRow, ...rows]
    }, [columns, data])

    // 초기 마운트 시 Handsontable 생성
    useEffect(() => {
      if (!containerRef.current) return

      const tableData = buildTableData()

      const hot = new Handsontable(containerRef.current, {
        data: tableData,
        rowHeaders: false,
        colHeaders: false,
        width: '100%',
        height: '100%',
        stretchH: 'all',
        manualColumnResize: true,
        manualRowResize: true,
        contextMenu: true,
        copyPaste: true,
        fillHandle: true,
        undo: true,
        autoWrapRow: true,
        autoWrapCol: true,
        licenseKey: 'non-commercial-and-evaluation',

        cells(row, col) {
          const cellProperties: Handsontable.CellProperties = {} as any
          if (row === 0 && col > 0) {
            cellProperties.className = 'column-header-cell'
          }
          if (col === 0) {
            cellProperties.className = 'row-number-cell'
            if (row > 0) cellProperties.readOnly = true
          }
          if (row === 0 && col === 0) {
            cellProperties.readOnly = true
            cellProperties.className = 'row-number-cell'
          }
          return cellProperties
        },

        afterChange(changes, source) {
          if (!changes || source === 'loadData' || source === 'internal') return
          if (suppressSync.current) return

          const hot = hotRef.current
          if (!hot) return

          let columnsChanged = false
          let dataChanged = false

          for (const [row, col] of changes) {
            if (row === 0 && (col as number) > 0) columnsChanged = true
            else if (row > 0 && (col as number) > 0) dataChanged = true
          }

          if (columnsChanged || dataChanged) {
            const allData = hot.getData()
            if (columnsChanged) {
              suppressSync.current = true
              onColumnsChange(allData[0].slice(1) as string[])
            }
            if (dataChanged) {
              suppressSync.current = true
              onDataChange(allData.slice(1).map(row => row.slice(1) as string[]))
            }
            setTimeout(() => { suppressSync.current = false }, 0)
          }
        }
      })

      hotRef.current = hot

      return () => {
        hot.destroy()
        hotRef.current = null
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // React state → Handsontable 동기화 (외부에서 data가 변경된 경우만)
    useEffect(() => {
      if (!hotRef.current || suppressSync.current) return
      const tableData = buildTableData()
      hotRef.current.loadData(tableData)
    }, [data, columns, buildTableData])

    return <div ref={containerRef} className="spreadsheet-container" />
  }
)

Spreadsheet.displayName = 'Spreadsheet'
export default Spreadsheet
