import { useEffect, useRef, useState } from 'react'
import RoleIcon from './RoleIcon'

export default function AudioInput({ onChange, disabled = false, compact = false }) {
  const recorder = useRef(null), stream = useRef(null), mounted = useRef(false)
  const [recording, setRecording] = useState(false), [requesting, setRequesting] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (recorder.current?.state === 'recording') recorder.current.stop()
      stream.current?.getTracks().forEach(track => track.stop())
    }
  }, [])
  async function start() {
    try {
      setError(''); setRequesting(true)
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('녹음이 지원되지 않는 환경입니다. 음성 파일이나 글로 답해주세요.')
      const source = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mounted.current) { source.getTracks().forEach(track => track.stop()); return }
      stream.current = source
      const chunks = [], rec = new MediaRecorder(source)
      recorder.current = rec
      rec.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      rec.onstop = () => {
        source.getTracks().forEach(track => track.stop())
        if (!mounted.current) return
        onChange(new File(chunks, `recording.${rec.mimeType.includes('mp4') ? 'mp4' : 'webm'}`, { type: rec.mimeType }))
        setRecording(false)
      }
      rec.start(); setRecording(true)
    } catch (err) {
      stream.current?.getTracks().forEach(track => track.stop())
      if (mounted.current) setError(err.name === 'NotAllowedError' ? '마이크 권한을 허용하거나 글로 답해주세요.' : err.message)
    } finally { if (mounted.current) setRequesting(false) }
  }
  return <div className="audio-input">
    <button type="button" className="button outline record-button" aria-pressed={recording} disabled={requesting || (disabled && !recording)} onClick={() => recording ? recorder.current.stop() : start()}><span className="record-disc"><RoleIcon name="mic"/></span>{recording ? '녹음 마치기' : requesting ? '마이크 연결 중…' : compact ? '글 대신 말로 하기' : '누르고 말씀하세요'}</button>
    <details className="audio-file-option"><summary>음성 파일로 올리기</summary><label className="file-label">음성 파일 선택<input type="file" accept="audio/*" disabled={disabled || recording || requesting} onChange={event => onChange(event.target.files[0] || null)}/></label></details>
    {error && <p className="error" role="alert">{error}</p>}
  </div>
}
