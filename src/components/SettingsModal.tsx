import { useState, useEffect } from 'react'

interface SettingsModalProps {
  onClose: () => void
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    window.electronAPI.getApiKey().then(key => setApiKey(key || '')).catch(() => {})
  }, [])

  const handleSave = async () => {
    try {
      await window.electronAPI.setApiKey(apiKey.trim())
      onClose()
    } catch {
      setError('API 키 저장에 실패했습니다')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>설정</h2>
        <label>Gemini API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => { setApiKey(e.target.value); setError('') }}
          placeholder="AIzaSy..."
        />
        {error && <p style={{ color: '#e74c3c', margin: '4px 0 0', fontSize: '13px' }}>{error}</p>}
        <div className="modal-buttons">
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  )
}
