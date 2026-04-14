import { useState, useRef, useCallback, useEffect } from 'react'
import './types'
import Toolbar from './components/Toolbar'
import Spreadsheet, { SpreadsheetHandle } from './components/Spreadsheet'
import SettingsModal from './components/SettingsModal'
import PromptModal from './components/PromptModal'
import { callGemini } from './services/gemini'
import { exportToExcel } from './services/excel'

export default function App() {
  const [columns, setColumns] = useState<string[]>(['열1', '열2', '열3', '열4'])
  const [data, setData] = useState<string[][]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [statusText, setStatusText] = useState('준비')
  const spreadsheetRef = useRef<SpreadsheetHandle>(null)

  // 첫 실행 시 API 키 확인
  useEffect(() => {
    window.electronAPI.getApiKey().then(key => {
      if (!key) {
        setShowSettings(true)
        setStatusText('Gemini API 키를 설정해주세요')
      }
    })
  }, [])

  const handleCapture = useCallback(async () => {
    const apiKey = await window.electronAPI.getApiKey()
    if (!apiKey) {
      setShowSettings(true)
      return
    }

    setStatusText('캡처 영역을 선택하세요...')
    await window.electronAPI.startCapture()
  }, [])

  // ref로 최신값 유지 (리스너 재등록 없이 참조)
  const columnsRef = useRef(columns)
  columnsRef.current = columns
  const promptRef = useRef(customPrompt)
  promptRef.current = customPrompt

  // 캡처 결과 수신 (한 번만 등록)
  const processingRef = useRef(false)
  useEffect(() => {
    window.electronAPI.onCaptureResult(async (base64: string) => {
      if (!base64 || processingRef.current) return
      processingRef.current = true

      setIsLoading(true)
      setStatusText('Gemini AI가 데이터를 분석 중...')

      try {
        const currentColumns = columnsRef.current
        const apiKey = await window.electronAPI.getApiKey()
        if (!apiKey) {
          setShowSettings(true)
          setStatusText('Gemini API 키를 설정해주세요')
          return
        }
        const result = await callGemini(apiKey, base64, currentColumns, promptRef.current)

        if (result.rows && result.rows.length > 0) {
          const newRows = result.rows.map((row: Record<string, string>) =>
            currentColumns.map(col => row[col] || '')
          )
          // 기존 데이터에서 빈 행 제거 후 위에서부터 채우기
          setData(prev => {
            const nonEmpty = prev.filter(row => row.some(cell => (cell ?? '').trim() !== ''))
            return [...nonEmpty, ...newRows]
          })
          setStatusText(`${result.rows.length}개 행이 추가되었습니다`)
        } else {
          setStatusText('추출된 데이터가 없습니다')
        }
      } catch (err: any) {
        setStatusText(`오류: ${err.message}`)
      } finally {
        setIsLoading(false)
        processingRef.current = false
      }
    })
  }, []) // 빈 deps → 한 번만 등록

  const handleExport = useCallback(async () => {
    const currentData = spreadsheetRef.current?.getData() || data
    const filePath = await window.electronAPI.saveFileDialog()
    if (!filePath) return

    try {
      await exportToExcel(columns, currentData, filePath)
      setStatusText(`저장 완료: ${filePath}`)
    } catch (err: any) {
      setStatusText(`저장 오류: ${err.message}`)
    }
  }, [columns, data])

  const handleColumnsChange = useCallback((newColumns: string[]) => {
    setColumns(newColumns)
  }, [])

  return (
    <div className="app-container">
      <Toolbar
        onCapture={handleCapture}
        onExport={handleExport}
        onSettings={() => setShowSettings(true)}
        onAddRow={() => spreadsheetRef.current?.addRow()}
        onRemoveRow={() => spreadsheetRef.current?.removeRow()}
        onAddColumn={() => spreadsheetRef.current?.addColumn()}
        onRemoveColumn={() => spreadsheetRef.current?.removeColumn()}
        onPrompt={() => setShowPrompt(true)}
        isLoading={isLoading}
        hasPrompt={customPrompt.length > 0}
      />
      <Spreadsheet
        ref={spreadsheetRef}
        columns={columns}
        data={data}
        onColumnsChange={handleColumnsChange}
        onDataChange={setData}
      />
      <div className="status-bar">{statusText}</div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner" />
            Gemini AI 분석 중...
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showPrompt && (
        <PromptModal
          value={customPrompt}
          onSave={(p) => { setCustomPrompt(p); setShowPrompt(false) }}
          onClose={() => setShowPrompt(false)}
        />
      )}
    </div>
  )
}
