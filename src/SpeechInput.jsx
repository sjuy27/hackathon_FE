import { useEffect, useRef, useState } from 'react'
import RoleIcon from './RoleIcon'
import AudioInput from './AudioInput'

const SpeechRecognition = typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition

// 말하는 대로 글자 띄우기(Web Speech API, ko-KR). 받아쓰는 중에도 글을 고칠 수 있고, 고친 글 뒤로 이어서 받아쓴다.
// 지원하지 않거나 음성 서비스가 안 되는 브라우저는 녹음 파일(AudioInput)로 대신 보낸다.
export default function SpeechInput({ value, onChange, audio, onAudio, disabled = false }) {
  const rec = useRef(null), base = useRef(''), from = useRef(0), seen = useRef(0)
  const [listening, setListening] = useState(false), [typing, setTyping] = useState(false), [error, setError] = useState(''), [recordInstead, setRecordInstead] = useState(!SpeechRecognition)
  useEffect(() => () => rec.current?.abort(), [])
  function start() {
    const r = new SpeechRecognition()
    r.lang = 'ko-KR'; r.interimResults = true; r.continuous = true
    base.current = value.trim() ? `${value.trimEnd()} ` : ''; from.current = 0; seen.current = 0
    r.onresult = event => {
      seen.current = event.results.length
      let said = ''
      for (let i = from.current; i < event.results.length; i++) said += event.results[i][0].transcript
      onChange(base.current + said.trimStart())
    }
    r.onerror = event => {
      if (['aborted', 'no-speech'].includes(event.error)) return
      if (['network', 'service-not-allowed', 'language-not-supported'].includes(event.error)) { setRecordInstead(true); setError('받아쓰기를 쓸 수 없어서 녹음으로 바꿨어요.'); return }
      setError(event.error === 'not-allowed' ? '마이크 권한을 허용하거나 글로 답해주세요.' : '말씀을 알아듣지 못했어요. 다시 말하거나 글로 적어주세요.')
    }
    r.onend = () => setListening(false)
    rec.current = r; setError(''); r.start(); setListening(true)
  }
  function edit(text) {
    onChange(text)
    if (listening) { base.current = text && !/\s$/.test(text) ? `${text} ` : text; from.current = seen.current }
  }
  const showText = typing || listening || !!value
  return <>
    {recordInstead
      ? <AudioInput onChange={onAudio} disabled={disabled || !!audio}/>
      : <div className="audio-input"><button type="button" className="button outline record-button" aria-pressed={listening} disabled={disabled && !listening} onClick={() => listening ? rec.current.stop() : start()}><span className="record-disc"><RoleIcon name="mic"/></span>{listening ? '그만 말하기' : '누르고 말씀하세요'}</button>{listening && <p className="listening-hint" role="status">듣고 있어요. 말씀하시는 대로 아래에 글자가 떠요.</p>}</div>}
    {error && <p className={recordInstead ? 'small' : 'error'} role="alert">{error}</p>}
    {!showText && <button type="button" className="text-button" onClick={() => setTyping(true)}>글로 쓸게요</button>}
    {showText && <label>답변<textarea maxLength={2000} value={value} disabled={disabled} onChange={event => edit(event.target.value)} placeholder="예: 떡볶이 한 접시 사천 원이에요."/></label>}
  </>
}
