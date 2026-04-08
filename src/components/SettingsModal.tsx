import { useState, useEffect } from 'react'

interface SettingsModalProps {
  onClose: () => void
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    window.electronAPI.getApiKey().then(key => setApiKey(key || ''))
  }, [])

  const handleSave = async () => {
    await window.electronAPI.setApiKey(apiKey.trim())
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>설정</h2>
        <label>Gemini API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="AIzaSy..."
        />
        <div className="modal-buttons">
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  )
}
