import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import Dialog from '../../Dialog'
import { ErrorMessage } from '../../shared'
import { speakQuestion } from '../../merchant-voice'
import { scriptLines } from '../../pages/HostVideoPage'
import { Button, FilterChips, PageHeader } from '../MobileUI'
import SpeechAnswer from './SpeechAnswer'
import useHostPreferences from './use-host-preferences'

const BASE = '/merchant/interviews'
const beats = { origin:'시작한 이야기', years:'옛날 골목', craft:'지키는 것', people:'기억에 남는 손님', message:'손님께 한마디' }

function savedStory() {
  try {
    const id = Number(sessionStorage.getItem('golmok-story'))
    return Number.isSafeInteger(id) && id > 0 ? { id, ...JSON.parse(sessionStorage.getItem('golmok-story-context') || '{}') } : null
  } catch { return null }
}

function rememberStory(storeId, prompt, messages) {
  try {
    sessionStorage.setItem('golmok-story',String(prompt.interview_id))
    sessionStorage.setItem('golmok-story-context',JSON.stringify({ storeId, prompt, messages }))
  } catch { /* The conversation also works without browser storage. */ }
}

async function openStory(storeId, interviewId) {
  const cached = savedStory(), id = interviewId || cached?.id
  if (id) {
    let detail
    try { detail = await api(`${BASE}/${id}`) } catch (error) { if (error.status !== 404) throw error }
    if (detail?.kind === 'story' && detail.store_id === storeId) {
      const turn = detail.turns.length, matches = cached?.id === id && cached.prompt?.turn === turn
      const prompt = { interview_id:id, turn, covered:detail.covered, done:detail.status !== 'active', say_ko:matches ? cached.prompt.say_ko : '이어서 들려주실 이야기가 있나요?', audio_url:matches ? cached.prompt.audio_url : null }
      const messages = matches ? cached.messages || [] : detail.turns.flatMap(item => [{ role:'ai', text:item.question }, { role:'me', text:item.transcript }])
      if (!matches && !prompt.done) messages.push({ role:'ai', text:prompt.say_ko })
      rememberStory(storeId,prompt,messages)
      return { prompt, messages, script:detail.script_ko }
    }
  }
  const prompt = await api(BASE,{method:'POST',body:{kind:'story',store_id:storeId}})
  const messages = [{role:'ai',text:prompt.say_ko}]
  rememberStory(storeId,prompt,messages)
  return { prompt, messages, script:null }
}

export default function StoryInterview({ storeId, onClose, onUse, onWrite }) {
  const { largeText } = useHostPreferences()
  const [interview,setInterview] = useState(null), [messages,setMessages] = useState([]), [phase,setPhase] = useState('chat')
  const [input,setInput] = useState(''), [pending,setPending] = useState(null), [manual,setManual] = useState(false)
  const [busy,setBusy] = useState(true), [error,setError] = useState(null), [script,setScript] = useState('')
  const [composing,setComposing] = useState(false), [pollVersion,setPollVersion] = useState(0), [voiceVersion,setVoiceVersion] = useState(0)
  const [reviewingConversation,setReviewingConversation] = useState(false), [replaying,setReplaying] = useState(false)
  const startup = useRef(null), mounted = useRef(false), requesting = useRef(false), retryAction = useRef({kind:'load'})
  const end = useRef(null), spoken = useRef(null), edited = useRef(false)

  function applyLoaded(data) {
    setInterview(data.prompt); setMessages(data.messages); setInput(''); setPending(null); setManual(false); setError(null)
    setVoiceVersion(value => value + 1)
    if (data.script != null) { setScript(data.script.slice(0,1000)); edited.current = false }
    setComposing(data.prompt.done && data.script == null)
    setReviewingConversation(false); setReplaying(false)
    setPhase(data.prompt.done ? 'result' : 'chat')
  }

  useEffect(() => {
    let active = true
    mounted.current = true
    if (!startup.current) startup.current = openStory(storeId)
    startup.current.then(data => {
      if (!active) return
      setInterview(data.prompt); setMessages(data.messages)
      if (data.script != null) setScript(data.script.slice(0,1000))
      setComposing(data.prompt.done && data.script == null)
      setPhase(data.prompt.done ? 'result' : 'chat')
    }).catch(error => { if (active) setError(error) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false; mounted.current = false; spoken.current?.() }
  },[storeId])

  useEffect(() => { end.current?.scrollIntoView({block:'end'}) },[messages,input,pending,error])

  useEffect(() => {
    if (phase !== 'result' || !interview?.interview_id) return
    let stopped = false, timer
    const controller = new AbortController()
    function fail(error) {
      if (stopped) return
      stopped = true; clearTimeout(timer); clearTimeout(deadline); controller.abort()
      retryAction.current = {kind:'result'}; setComposing(false); setError(error)
    }
    const deadline = setTimeout(() => fail(new Error('이야기를 정리하는 데 시간이 걸리고 있어요. 다시 시도하거나 직접 적어 주세요.')),20000)
    async function poll() {
      try {
        const detail = await api(`${BASE}/${interview.interview_id}`,{signal:controller.signal})
        if (stopped) return
        if (detail.script_ko != null) {
          stopped = true; clearTimeout(deadline); setComposing(false)
          if (!edited.current) setScript(detail.script_ko.slice(0,1000))
        } else timer = setTimeout(poll,1500)
      } catch (error) { if (!stopped) fail(error) }
    }
    poll()
    return () => { stopped = true; clearTimeout(timer); clearTimeout(deadline); controller.abort() }
  },[phase,interview?.interview_id,pollVersion])

  function acceptResponse(data, payload) {
    const next = [...messages]
    if (payload && data.heard !== false) next.push({role:'me',text:data.transcript || payload.text || '(녹음한 답변)'})
    if (data.say_ko) next.push({role:'ai',text:data.say_ko})
    rememberStory(storeId,data,next)
    setInterview(data); setMessages(next); setPending(null); setInput(''); setManual(false)
    setReviewingConversation(false)
    setVoiceVersion(value => value + 1)
  }

  async function perform(kind, payload) {
    if (requesting.current) return
    requesting.current = true; setBusy(true); setError(null); spoken.current?.()
    retryAction.current = {kind,payload}
    if (kind === 'turn') { setPending(payload); setInput('') }
    try {
      if (kind === 'load') {
        const data = await openStory(storeId)
        if (mounted.current) applyLoaded(data)
      } else {
        let data
        if (kind === 'turn') {
          if (payload.audio?.size > 10*1024*1024) throw new Error('음성 파일은 10MB 이하로 보내주세요.')
          const body = new FormData()
          body.append('turn',String(payload.turn))
          if (payload.audio) body.append('audio',payload.audio,'blob'); else body.append('text',payload.text)
          data = await api(`${BASE}/${interview.interview_id}/turns`,{method:'POST',body})
        } else data = await api(`${BASE}/${interview.interview_id}/finish`,{method:'POST'})
        // Closing the window must not discard a response that the server already saved.
        if (!mounted.current) {
          const next = [...messages]
          if (payload && data.heard !== false) next.push({role:'me',text:data.transcript || payload.text || '(녹음한 답변)'})
          if (data.say_ko) next.push({role:'ai',text:data.say_ko})
          rememberStory(storeId,data,next)
          return
        }
        acceptResponse(data,kind === 'turn' ? payload : null)
      }
    } catch (error) {
      if (!mounted.current) return
      if (error.code === 'TURN_MISMATCH') {
        try { const data = await openStory(storeId,interview.interview_id); if (mounted.current) applyLoaded(data) }
        catch (reloadError) { if (mounted.current) { retryAction.current = {kind:'load'}; setError(reloadError) } }
      } else setError(error)
    } finally { requesting.current = false; if (mounted.current) setBusy(false) }
  }

  function submit(payload) {
    if (busy || error || !interview || interview.done || (!payload.audio && !payload.text?.trim())) return
    perform('turn',{...payload,turn:interview.turn})
  }
  function showResult() { setComposing(!script.trim()); setPhase('result'); setError(null) }
  function retry() {
    const action = retryAction.current
    if (action.kind === 'result') { setError(null); setComposing(true); setPollVersion(value => value + 1) }
    else perform(action.kind,action.payload)
  }
  function showConversation() {
    spoken.current?.(); setError(null); setReviewingConversation(!!interview?.done); setReplaying(false); setPhase('chat')
  }
  function replayQuestion() {
    if (reviewingConversation) setReplaying(true)
    setVoiceVersion(value => value + 1)
  }
  const liveText = pending ? pending.text || '(녹음한 답변)' : input
  const lastAI = messages.findLastIndex(message => message.role === 'ai')
  const lines = scriptLines(script)
  return <Dialog label={phase === 'result' ? '영상에 들어갈 말' : '영상 이야기 나누기'} onClose={onClose}>
    <div className={`mobile-page host-page host-story-interview${largeText ? ' host-large-text' : ''}`} lang="ko">
      <PageHeader title={phase === 'result' ? '영상에 들어갈 말' : '영상 이야기 나누기'} onBack={phase === 'result' ? showConversation : onClose} showLanguage={false}/>
      <div className="host-story-thread">
        {phase === 'chat' ? <>
          <p className="host-muted">편하게 말씀하시면 AI가 영상에 넣을 말로 엮어 드려요</p>
          {messages.map((message,index) => message.role === 'ai' ? <div className="host-question-card" key={index}><p>{message.text}</p>{index === lastAI && <Button disabled={busy} onClick={replayQuestion}>다시 듣기</Button>}</div> : <p className="host-answer-bubble" key={index}>{message.text}</p>)}
          {liveText && <p className="host-answer-bubble" aria-live="polite">{liveText}</p>}
          {busy && <p className="host-muted" role="status">{interview ? '정리하고 있어요…' : '이야기를 준비하고 있어요…'}</p>}
        </> : <>
          <p>AI가 사장님 이야기를 엮었어요</p>
          <h2>대화에서 뽑은 이야기</h2><FilterChips label="대화에서 뽑은 이야기" options={(interview?.covered || []).filter(beat => beats[beat]).map(beat => [beat,beats[beat]])}/>
          {composing && <p className="host-muted" role="status">사장님 이야기를 엮고 있어요…</p>}
          <label className="host-fields">영상에 들어갈 사장님 말<textarea maxLength={1000} value={script} onChange={event => { edited.current = true; setScript(event.target.value) }}/></label>
          <p className="host-muted">약 {lines*5}초 · 자막 {lines}줄 (20~30초 권장)</p>
          {lines*5 > 30 && <p className="host-muted">조금 줄이면 영상에 다 들어가요</p>}
          <Button disabled={!script.trim()} onClick={() => { spoken.current?.(); spoken.current = speakQuestion(script,() => {},message => setError(new Error(message))) }}>읽어 주기</Button>
        </>}
        {error && <div className="host-inline-errors"><ErrorMessage error={error}/><Button disabled={busy} onClick={retry}>다시 시도</Button><Button onClick={onWrite}>직접 쓸게요</Button></div>}
        <div ref={end}/>
      </div>
      <div className="host-footer">
        {phase === 'chat' ? <>
          <p className="host-muted">{reviewingConversation ? '완료된 대화예요. 정리한 말은 결과 화면에서 고칠 수 있어요.' : '듣고 있어요 · 말을 멈추면 다음 질문으로 넘어가요'}</p>
          {interview && !busy && !error && (!reviewingConversation || replaying) && <SpeechAnswer key={voiceVersion} presentation="host" prompt={interview.say_ko} promptAudio={interview.audio_url} listenAfterPrompt={!interview.done} onPromptEnd={() => { if (reviewingConversation) setReplaying(false); else if (interview.done) showResult() }} autoStart value={input} onChange={setInput} onAutoSubmit={text => submit({text})} onAudio={audio => submit({audio})} onManualInput={() => setManual(true)}/>}
          {manual && input.trim() && <Button disabled={busy} onClick={() => submit({text:input})}>답변 보내기</Button>}
          {reviewingConversation ? <Button onClick={showResult}>정리한 말 보기</Button> : <Button disabled={busy || !interview || interview.done} onClick={() => perform('finish')}>이야기 끝내고 정리하기</Button>}
        </> : <>
          <Button primary disabled={!script.trim()} onClick={() => { spoken.current?.(); onUse(script) }}>이 말로 영상 만들기</Button>
          <Button onClick={showConversation}>대화 다시 보기</Button>
        </>}
      </div>
    </div>
  </Dialog>
}
