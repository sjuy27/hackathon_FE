export const VOICE_SILENCE_MS = 2000

// 질문 읽기와 마이크 수집을 순서대로 실행한다. 취소된 읽기는 다음 수집을 시작하지 않는다.
export function speakQuestion(text, onEnd, onError = () => {}) {
  const synth = window.speechSynthesis
  if (!synth || !window.SpeechSynthesisUtterance) { onError('질문 읽기를 지원하지 않아요. 화면의 질문을 보고 답해 주세요.'); return () => {} }
  let active = true
  const utterance = new window.SpeechSynthesisUtterance(text)
  utterance.lang = 'ko-KR'; utterance.rate = 0.95
  const voice = synth.getVoices().find(voice => voice.lang.toLowerCase().startsWith('ko'))
  if (voice) utterance.voice = voice
  const timeout = setTimeout(() => finish(false), 45000)
  function finish(ok) {
    if (!active) return
    active = false; clearTimeout(timeout)
    if (ok) onEnd?.()
    else { synth.cancel(); onError('질문을 읽지 못했어요. 질문 듣고 답하기를 다시 누르거나 글로 답해 주세요.') }
  }
  utterance.onend = () => finish(true)
  utterance.onerror = () => finish(false)
  synth.cancel(); synth.speak(utterance)
  return () => { active = false; clearTimeout(timeout); utterance.onend = null; utterance.onerror = null; synth.cancel() }
}

// 안내와 질문을 차례로 읽는다. 취소하면 다음 문장과 듣기를 시작하지 않는다.
export function speakSequence(texts, onEnd, onError = () => {}) {
  const queue = texts.filter(text => typeof text === 'string' && text.trim())
  let active = true, index = 0, cancelCurrent = null
  function next() {
    if (!active) return
    if (index === queue.length) { active = false; onEnd?.(); return }
    cancelCurrent = speakQuestion(queue[index++], () => queueMicrotask(next), message => {
      if (!active) return
      active = false; onError(message)
    })
  }
  next()
  return () => { active = false; cancelCurrent?.() }
}

// 받아쓰기를 쓸 수 없으면 기기의 소리 크기를 확인해 녹음을 마친다.
export function watchSilence(stream, onSilence, onUnavailable = () => {}) {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) { onUnavailable(); return () => {} }
  let context, source, timer, active = true
  try {
    context = new AudioContext()
    source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser(); analyser.fftSize = 512; source.connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    let heard = false, lastSound = 0
    Promise.resolve(context.resume()).catch(() => { if (active) onUnavailable() })
    timer = setInterval(() => {
      if (!active || context.state !== 'running') return
      analyser.getFloatTimeDomainData(samples)
      const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length)
      if (rms > 0.025) { heard = true; lastSound = Date.now() }
      else if (heard && Date.now() - lastSound >= VOICE_SILENCE_MS) { heard = false; onSilence() }
    }, 100)
  } catch { onUnavailable() }
  return () => { active = false; clearInterval(timer); source?.disconnect(); if (context && context.state !== 'closed') context.close().catch(() => {}) }
}

export function confirmationChoice(text) {
  const normalized = text.replace(/[\s.!?,。！？]/g, '')
  if (/^(다시|다시답하기|아니요|아니에요|틀렸어요|아니야)$/.test(normalized)) return false
  if (/^(네|예|맞아요|맞습니다|맞아|네맞아요|다음|다음으로)$/.test(normalized)) return true
  return null
}
