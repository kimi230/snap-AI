interface ToolbarProps {
  onCapture: () => void
  onExport: () => void
  onSettings: () => void
  onAddRow: () => void
  onRemoveRow: () => void
  onAddColumn: () => void
  onRemoveColumn: () => void
  onPrompt: () => void
  isLoading: boolean
  hasPrompt: boolean
}

export default function Toolbar({
  onCapture, onExport, onSettings,
  onAddRow, onRemoveRow, onAddColumn, onRemoveColumn,
  onPrompt, isLoading, hasPrompt
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <button className="btn-capture" onClick={onCapture} disabled={isLoading}>
        {isLoading ? '분석 중...' : '캡처'}
      </button>
      <button className={`btn-prompt ${hasPrompt ? 'btn-prompt-active' : ''}`} onClick={onPrompt}>
        프롬프트
      </button>

      <div className="toolbar-divider" />

      <button className="btn-grid" onClick={onAddRow}>+ 행</button>
      <button className="btn-grid btn-grid-danger" onClick={onRemoveRow}>- 행</button>
      <button className="btn-grid" onClick={onAddColumn}>+ 열</button>
      <button className="btn-grid btn-grid-danger" onClick={onRemoveColumn}>- 열</button>

      <div className="toolbar-spacer" />

      <button className="btn-settings" onClick={onSettings} title="설정">
        ⚙
      </button>
      <button className="btn-export" onClick={onExport}>
        내보내기
      </button>
    </div>
  )
}
