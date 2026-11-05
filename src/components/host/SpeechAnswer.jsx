import { useEffect, useRef, useState } from 'react'
import { NavIcon } from '../../Profile'
import { Button } from '../MobileUI'
import { confirmationChoice, speakSequence, watchSilence, VOICE_SILENCE_MS } from '../../merchant-voice'
import useHostPreferences from './use-host-preferences'
import { mediaUrl } from '../../api'
const SpeechRecognition = typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition

function playPromptAudio(url, onEnd, onFallback) {
  let active = true, audio, timer
  function cleanup() {
    clearTimeout(timer)
    if (audio) { audio.onended = null; audio.onerror = null; audio.pause() }
  }
  function finish(fallback) {
    if (!active) return
    active = false; cleanup()
    if (fallback) onFallback(); else onEnd()
  }
  try {
    const src = mediaUrl(url)
    if (!src) throw new Error('음성 주소를 읽을 수 없어요.')
    audio = new Audio(src)
    audio.onended = () => finish(false)
    audio.onerror = () => finish(true)
    timer = setTimeout(() => finish(true), 45000)
    Promise.resolve(audio.play()).catch(() => finish(true))
  } catch { queueMicrotask(() => finish(true)) }
  return () => { active = false; cleanup() }
}

export function VoiceRecorder({ label, maxSeconds, onDone, disabled, onRecordingChange, autoStart = false, round = false }) {
  const recorder = useRef(null), stream = useRef(null), timer = useRef(null), mounted = useRef(false), starting = useRef(false), stopWatching = useRef(null), commands = useRef(null)
  const [seconds, setSeconds] = useState(0), [recording, setRecording] = useState(false), [requesting, setRequesting] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false; clearInterval(timer.current); stopWatching.current?.()
      if (recorder.current) { recorder.current.onstop = null; if (recorder.current.state === 'recording') recorder.current.stop() }
      stream.current?.getTracks().forEach(t => t.stop())
    }
  }, [])
  async function start() {
    if (starting.current || recorder.current?.state === 'recording') return
    starting.current = true; setRequesting(true); onRecordingChange?.(true)
    try {
      setError('')
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('이 브라우저는 녹음을 지원하지 않아요. 글로 적어 주세요.')
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mounted.current) { acquired.getTracks().forEach(t => t.stop()); return }
      stream.current = acquired
      const chunks = [], rec = new MediaRecorder(acquired)
      let delivered = false
      recorder.current = rec
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => {
        if (delivered) return
        delivered = true; clearInterval(timer.current); stopWatching.current?.(); acquired.getTracks().forEach(t => t.stop())
        if (!mounted.current) return
        setRecording(false); onRecordingChange?.(false)
        onDone(new File(chunks, 'blob', { type: rec.mimeType }))
      }
      rec.start(); setRecording(true); setSeconds(0)
      stopWatching.current = watchSilence(acquired, () => { if (rec.state === 'recording') rec.stop() }, () => setError('무음 감지를 지원하지 않아요. 답변을 마치면 녹음 마치기를 눌러 주세요.'))
      const began = Date.now()
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - began) / 1000)
        setSeconds(s)
        if (maxSeconds && s >= maxSeconds && rec.state === 'recording') rec.stop()
      }, 250)
    } catch (e) {
      stream.current?.getTracks().forEach(t => t.stop())
      if (mounted.current) { setError(e.name === 'NotAllowedError' ? '마이크 권한을 허용해 주세요.' : e.message); setRecording(false); onRecordingChange?.(false) }
    } finally { starting.current = false; if (mounted.current) setRequesting(false) }
  }
  useEffect(() => { commands.current = start })
  useEffect(() => {
    if (autoStart && !disabled) { const timer = setTimeout(() => commands.current(), 0); return () => clearTimeout(timer) }
  }, [autoStart, disabled])
  return <div className="audio-input"><button type="button" className={round ? "host-mic-button" : "button outline"} aria-pressed={recording} disabled={disabled || requesting} onClick={() => recording ? recorder.current?.state === 'recording' && recorder.current.stop() : start()}>{round && <span className="host-mic-disc"><NavIcon type="mic"/></span>}{requesting ? '마이크를 준비하고 있어요…' : recording ? `■ 녹음 마치기 · ${seconds}${maxSeconds ? `/${maxSeconds}` : ''}초` : label}</button>{error && <p className="error" role="alert">{error}</p>}</div>
}

// 말하는 대로 글자 띄우기. 종료 이벤트에서 편집을 포함한 최신 답변을 한 번만 보낸다.
export default function SpeechAnswer({ value, onChange, onAutoSubmit, onAudio, onManualInput, onRecordingChange, prompt = '', promptAudio, intro = '', onIntroDone, onPromptEnd, listenAfterPrompt = true, autoStart = false, onEnableVoice, maxSeconds, maxLength = 2000, disabled = false, presentation = 'default' }) {
  const { readQuestions } = useHostPreferences()
  const rec = useRef(null), base = useRef(''), from = useRef(0), seen = useRef(0), latestText = useRef(value)
  const silence = useRef(null), limit = useRef(null), submitted = useRef(false), stopping = useRef(false), cancelled = useRef(false), spoken = useRef(null), startedPrompt = useRef(null)
  const controls = useRef(null), callbacks = useRef(null)
  const [typing, setTyping] = useState(false)
  const [listening, setListening] = useState(false), [speaking, setSpeaking] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState(''), [recordInstead, setRecordInstead] = useState(!SpeechRecognition)
  useEffect(() => { latestText.current = value }, [value])
  useEffect(() => { callbacks.current = { onChange, onAutoSubmit, onRecordingChange } })
  useEffect(() => () => {
    cancelled.current = true; clearTimeout(silence.current); clearTimeout(limit.current); spoken.current?.()
    if (rec.current) { rec.current.onend = null; rec.current.onresult = null; rec.current.onerror = null; rec.current.abort() }
  }, [])
  function pause() {
    cancelled.current = true; clearTimeout(silence.current); clearTimeout(limit.current); spoken.current?.(); spoken.current = null
    if (rec.current) { rec.current.onend = null; rec.current.abort(); rec.current = null }
    setSpeaking(false); setListening(false); setReady(false); onRecordingChange?.(false)
  }
  function deliver() {
    if (cancelled.current || submitted.current) return
    const text = latestText.current.trim()
    if (!text) { setError('다시 말씀해 주세요'); return }
    submitted.current = true; callbacks.current.onAutoSubmit(text)
  }
  function stop() {
    clearTimeout(silence.current)
    if (stopping.current || !rec.current) return
    stopping.current = true; rec.current.stop()
  }
  function startListening() {
    if (!listenAfterPrompt) return
    if (recordInstead) { setReady(true); return }
    if (rec.current || cancelled.current) return
    const r = new SpeechRecognition()
    r.lang = 'ko-KR'; r.interimResults = true; r.continuous = true
    base.current = latestText.current.trim() ? `${latestText.current.trimEnd()} ` : ''; from.current = 0; seen.current = 0
    submitted.current = false; stopping.current = false
    r.onresult = e => {
      if (cancelled.current || submitted.current) return
      clearTimeout(silence.current); seen.current = e.results.length
      let said = ''
      for (let i = from.current; i < e.results.length; i++) said += e.results[i][0].transcript
      latestText.current = (base.current + said.trimStart()).slice(0, maxLength)
      callbacks.current.onChange(latestText.current)
      // 중간 결과도 말하고 있다는 신호다. 최종 결과만 기다리지 않는다.
      if (latestText.current.trim()) silence.current = setTimeout(stop, VOICE_SILENCE_MS)
    }
    r.onerror = e => {
      if (['aborted', 'no-speech'].includes(e.error)) return
      clearTimeout(silence.current); clearTimeout(limit.current)
      if (['network', 'service-not-allowed', 'language-not-supported'].includes(e.error) && onAudio) {
        cancelled.current = true; r.onend = null; r.abort(); rec.current = null; setListening(false)
        setRecordInstead(true); setReady(true); setError('받아쓰기 대신 녹음으로 듣고 있어요. 말한 뒤 2초간 쉬면 전송돼요.'); return
      }
      cancelled.current = true; setError(e.error === 'not-allowed' ? '마이크 권한을 허용해 주세요.' : '음성을 알아듣지 못했어요. 다시 말하거나 글로 적어 주세요.')
    }
    r.onend = () => {
      if (rec.current !== r) return
      if (!cancelled.current && !stopping.current && latestText.current.trim()) {
        // 모바일이 먼저 수집을 끝내도 2초 침묵 타이머를 유지하며 다시 듣는다.
        base.current = `${latestText.current.trimEnd()} `; from.current = 0; seen.current = 0
        try { r.start(); return } catch { /* 아래에서 수집을 종료하고 최신 답변을 보낸다. */ }
      }
      clearTimeout(silence.current); clearTimeout(limit.current); rec.current = null; setListening(false); callbacks.current.onRecordingChange?.(false)
      deliver()
    }
    rec.current = r; setError('')
    try {
      r.start(); setListening(true); callbacks.current.onRecordingChange?.(true)
      if (maxSeconds) limit.current = setTimeout(stop, maxSeconds * 1000)
    } catch { cancelled.current = true; rec.current = null; setError('음성을 시작하지 못했어요. 질문 듣고 답하기를 다시 눌러 주세요.'); callbacks.current.onRecordingChange?.(false) }
  }
  function afterPrompt() {
    spoken.current = null
    if (intro) onIntroDone?.()
    setSpeaking(false)
    onPromptEnd?.()
    if (listenAfterPrompt) startListening(); else onRecordingChange?.(false)
  }
  function begin() {
    pause(); cancelled.current = false; submitted.current = false; startedPrompt.current = prompt; onEnableVoice?.(); setError('')
    if ((!intro && !prompt && !promptAudio) || !readQuestions) { afterPrompt(); return }
    setSpeaking(true); onRecordingChange?.(true)
    const onError = message => { setSpeaking(false); onRecordingChange?.(false); setError(message); if (!listenAfterPrompt) onPromptEnd?.() }
    if (promptAudio) {
      let cancelFallback
      const cancelAudio = playPromptAudio(promptAudio, afterPrompt, () => { cancelFallback = speakSequence([intro, prompt], afterPrompt, onError) })
      spoken.current = () => { cancelAudio(); cancelFallback?.() }
    } else spoken.current = speakSequence([intro, prompt], afterPrompt, onError)
  }
  useEffect(() => { controls.current = { begin, pause } })
  useEffect(() => {
    if (autoStart && !disabled && startedPrompt.current !== prompt) {
      const timer = setTimeout(() => controls.current.begin(), 0)
      return () => clearTimeout(timer)
    }
    if (disabled) controls.current.pause()
  }, [autoStart, prompt, disabled])
  function edit(text) {
    latestText.current = text; onChange(text); onManualInput?.()
    if (listening) { base.current = text && !/\s$/.test(text) ? `${text} ` : text; from.current = seen.current }
  }
  if (presentation !== 'default') return <div className="host-voice">
    {!(recordInstead && ready) && <button type="button" aria-pressed={listening || ready} disabled={disabled} className="host-mic-button" onClick={() => speaking ? (spoken.current?.(), afterPrompt()) : listening ? stop() : begin()}><span className="host-mic-disc"><NavIcon type="mic"/></span><span>{speaking ? '질문을 듣고 있어요' : listening ? '답변 마치기' : presentation === 'compact' ? '글 대신 말로 하기' : '누르고 말씀하세요'}</span></button>}
    {recordInstead && ready && <VoiceRecorder label="녹음해서 답하기" round autoStart maxSeconds={maxSeconds} disabled={disabled} onDone={file => { setReady(false); onAudio?.(file) }} onRecordingChange={onRecordingChange}/>}
    {(speaking || listening || ready) && <button className="host-voice-pause" type="button" onClick={() => { pause(); startedPrompt.current = prompt }}>대화 일시정지</button>}
    {presentation === 'host' && listenAfterPrompt && <button className="host-manual-toggle" type="button" disabled={disabled} onClick={() => { pause(); setTyping(open => !open) }}>{typing ? '글 입력 닫기' : '글로 쓸게요'}</button>}
    {typing && <label className="host-fields">답변<textarea maxLength={maxLength} disabled={disabled} value={value} onChange={event => edit(event.target.value)} placeholder="답변을 입력해주세요."/></label>}
    {error && <p className="host-muted" role="status">{error}</p>}
  </div>
  return <>
    <label>말하거나 적어 주세요<textarea maxLength={maxLength} disabled={disabled} value={value} onChange={e => edit(e.target.value)} placeholder="질문을 듣고 답해 주세요. 2초간 말이 없으면 자동으로 전송돼요." /></label>
    <div className="audio-input">
      {!(recordInstead && ready) && <button type="button" disabled={disabled} className={`button outline ${listening ? 'listening' : ''}`} onClick={() => speaking ? (spoken.current?.(), afterPrompt()) : listening ? stop() : begin()}>{speaking ? '질문 건너뛰고 답하기' : listening ? '■ 답변 마치기' : '● 질문 듣고 답하기'}</button>}
      {(speaking || listening || ready) && <button type="button" onClick={() => { pause(); startedPrompt.current = prompt }}>대화 일시정지</button>}
      <span className="listening-hint" role="status">{speaking ? '질문을 읽고 있어요…' : listening || ready ? '듣고 있어요 · 2초간 쉬면 자동 전송' : ''}</span>
      {error && <><p className="small" role="status">{error}</p><button type="button" disabled={disabled} onClick={() => { pause(); cancelled.current = false; startListening() }}>질문 없이 답하기</button></>}
    </div>
    {recordInstead && ready && <VoiceRecorder label="● 녹음해서 답하기" autoStart maxSeconds={maxSeconds} onDone={file => { setReady(false); onAudio?.(file) }} onRecordingChange={onRecordingChange} />}
  </>
}

export function VoiceConfirmation({ prompt, enabled, onConfirm }) {
  const [text, setText] = useState(''), [attempt, setAttempt] = useState(0)
  function submit(value) {
    const choice = confirmationChoice(value)
    if (choice === null) { setText(''); setAttempt(n => n + 1); return }
    onConfirm(choice)
  }
  return <form onSubmit={event => { event.preventDefault(); submit(text) }}><SpeechAnswer presentation="host" key={attempt} value={text} onChange={setText} prompt={`${prompt} 맞으면 맞아요, 고치려면 다시라고 말씀해 주세요.`} autoStart={enabled} onAutoSubmit={submit}/>{text.trim() && <Button type="submit">답변 보내기</Button>}</form>
}
