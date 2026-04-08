import { useState } from 'react'

interface PromptModalProps {
  value: string
  onSave: (prompt: string) => void
  onClose: () => void
}

export default function PromptModal({ value, onSave, onClose }: PromptModalProps) {
  const [text, setText] = useState(value)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <h2>추가 프롬프트</h2>
        <p className="modal-desc">
          캡처 시 Gemini에게 전달할 추가 지시사항을 입력하세요.
        </p>
        <textarea
          className="prompt-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="예: 금액은 숫자만 추출하고 쉼표를 포함하세요. 날짜는 YYYY-MM-DD 형식으로 변환하세요."
          rows={5}
        />
        <div className="modal-buttons">
          {text.trim() && (
            <button className="btn-clear" onClick={() => { setText(''); onSave('') }}>
              초기화
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={() => onSave(text.trim())}>저장</button>
        </div>
      </div>
    </div>
  )
}
