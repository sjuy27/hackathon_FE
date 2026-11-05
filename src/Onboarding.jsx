import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './api'
import { useApi } from './data'
import { ErrorMessage, State } from './shared'
import { remember, saved } from './merchant-storage'
import { HostTitle } from './HostHome'
import RoleIcon from './RoleIcon'
import AudioInput from './AudioInput'

const steps = [['store_name', '가게 이름'], ['menus', '메뉴·가격'], ['payment', '결제 방법'], ['hours', '영업시간'], ['story', '가게 이야기']]
const questions = { store_name: '가게 이름과 주소를 알려주세요.', menus: '대표 메뉴와 가격을 말씀해 주세요.', payment: '가능한 결제 수단을 알려주세요.', hours: '영업시간을 알려주세요.', story: '가게만의 이야기를 들려주세요.' }
const fieldLabels = { name_ko: '이름', name: '이름', address: '주소', menus: '메뉴', price: '가격 (원)', spicy_level: '매운 정도 (0~3)', is_ai_guess: 'AI 추정 정보', payment: '결제 수단', hours: '영업시간', story_ko: '가게 이야기' }

function Fields({ value, onChange }) {
  return <div className="parsed-fields">{Object.entries(value).map(([key, val]) => <div key={key}>
    {Array.isArray(val) && val.some(item => item && typeof item === 'object') ? <fieldset><legend>{fieldLabels[key] || key}</legend>{val.map((item, index) => <Fields key={index} value={item} onChange={next => onChange({ ...value, [key]: val.map((old, i) => i === index ? next : old) })}/>)}</fieldset> : <label>{fieldLabels[key] || key}{typeof val === 'boolean' ? <input type="checkbox" checked={val} onChange={event => onChange({ ...value, [key]: event.target.checked })}/> : <input type={typeof val === 'number' ? 'number' : 'text'} min={typeof val === 'number' ? 0 : undefined} max={key === 'spicy_level' ? 3 : undefined} value={Array.isArray(val) ? val.join(', ') : val ?? ''} onChange={event => onChange({ ...value, [key]: Array.isArray(val) ? event.target.value.split(',').map(item => item.trim()).filter(Boolean) : typeof val === 'number' ? Number(event.target.value) : event.target.value })}/>}</label>}
  </div>)}</div>
}

function display(value) {
  if (Array.isArray(value)) return value.map(display).join(' · ')
  if (value && typeof value === 'object') return Object.entries(value).filter(([key]) => !['is_ai_guess', 'spicy_level'].includes(key)).map(([key, val]) => key === 'price' && val != null ? `${Number(val).toLocaleString('ko-KR')}원` : display(val)).join(' ')
  return value == null ? '미입력' : String(value)
}

function SummaryCard({ step, value, sessionId, onSaved }) {
  const [edits, setEdits] = useState(value)
  const save = useMutation({ mutationFn: () => api(`/merchant/onboarding/sessions/${sessionId}/confirm`, { method: 'POST', body: { step, accepted: true, edits } }), onSuccess: onSaved })
  return <details className="summary-card"><summary><span>고치기</span><small>{steps.find(([key]) => key === step)?.[1] || step}</small>{display(value)}</summary><Fields value={edits} onChange={setEdits}/><button disabled={save.isPending} onClick={() => save.mutate()}>수정 내용 저장</button><ErrorMessage error={save.error}/>{save.isSuccess && <p role="status">저장했습니다.</p>}</details>
}

function SummaryPreview({ value }) {
  if (!value) return <p>번역 미리보기를 준비 중입니다.</p>
  return <article className="registration-preview" lang="en"><h3>{value.name}</h3><p>{value.story}</p><p>{value.hours}</p><div className="tags">{value.payment?.map(method => <span key={method}>{method}</span>)}</div><ul>{value.menus?.map((menu, index) => <li key={index}><span>{menu.name || menu.name_ko}</span><strong>{menu.price == null ? 'Ask for price' : `₩${Number(menu.price).toLocaleString()}`}</strong></li>)}</ul></article>
}

export default function Onboarding({ onPublished }) {
  const [sessionId, setSessionId] = useState(() => saved('golmok-session'))
  const [question, setQuestion] = useState(null), [answer, setAnswer] = useState(null), [edits, setEdits] = useState({})
  const [input, setInput] = useState(''), [audio, setAudio] = useState(null), [done, setDone] = useState(false), [market, setMarket] = useState(''), [typing, setTyping] = useState(false)
  const markets = useApi('/markets')
  const summary = useQuery({ queryKey: ['onboarding-summary', sessionId], enabled: !!sessionId, queryFn: () => api(`/merchant/onboarding/sessions/${sessionId}/summary`) })
  const start = useMutation({ mutationFn: () => api('/merchant/onboarding/sessions', { method: 'POST', body: market ? { market_id: Number(market) } : {} }), onSuccess: data => { setSessionId(data.session_id); remember('golmok-session', data.session_id); setQuestion(data); setDone(false); setAnswer(null); setInput(''); setAudio(null) } })
  const send = useMutation({ mutationFn: () => {
    if (audio?.size > 10 * 1024 * 1024) throw new Error('음성 파일은 10MB 이하로 선택해주세요.')
    const body = new FormData()
    if (audio) body.append('audio', audio); else body.append('text', input)
    return api(`/merchant/onboarding/sessions/${sessionId}/answers`, { method: 'POST', body })
  }, onSuccess: data => { setAnswer(data); setEdits(data.parsed) } })
  const confirm = useMutation({ mutationFn: accepted => api(`/merchant/onboarding/sessions/${sessionId}/confirm`, { method: 'POST', body: { step: answer.step, accepted, ...(accepted ? { edits } : {}) } }), onSuccess: data => { setQuestion(data); setAnswer(null); setInput(''); setAudio(null); setDone(data.done); summary.refetch() } })
  const publish = useMutation({ mutationFn: () => api(`/merchant/onboarding/sessions/${sessionId}/publish`, { method: 'POST' }), onSuccess: data => { remember('golmok-store', data.store_id); remember('golmok-session', ''); onPublished(data.store_id) } })
  const isDone = done || (!question && summary.data?.done)
  const active = question || (summary.data && { step: summary.data.step, question_ko: questions[summary.data.step] })
  const stepIndex = Math.max(0, steps.findIndex(([key]) => key === active?.step))
  const busy = send.isPending || confirm.isPending || publish.isPending
  useEffect(() => () => window.speechSynthesis?.cancel(), [])
  function speak() {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return
    const utterance = new SpeechSynthesisUtterance(active.question_ko)
    utterance.lang = 'ko-KR'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance)
  }
  function reset() {
    setSessionId(null); setQuestion(null); setAnswer(null); setDone(false); setInput(''); setAudio(null); remember('golmok-session', '')
    start.reset(); send.reset(); confirm.reset(); publish.reset()
  }
  return <div className="onboarding-page">
    <HostTitle title={isDone ? <>AI가 정리했어요<span className="host-title-note">틀린 곳만 눌러서 고치세요</span></> : '말로 가게 등록'}>{!isDone && <strong>{sessionId ? stepIndex + 1 : 1} / 5</strong>}</HostTitle>
    {!isDone && <div className="onboarding-steps">{steps.map(([key, label], i) => <span key={key} className={stepIndex === i ? 'current' : i < stepIndex ? 'complete' : ''} aria-current={stepIndex === i ? 'step' : undefined}>{label}{i < stepIndex ? ' ✓' : ''}</span>)}</div>}
    <div className="host-content"><div className="panel">
      {!sessionId ? <><div className="question-bubble"><h2>우리 가게의 이야기를 들려주세요.</h2><p>이름부터 메뉴, 결제 방법, 영업시간, 이야기까지.<br/>질문에 답하시면 AI가 정리해요.</p></div><State query={markets}><label>소속 시장<select value={market} onChange={event => setMarket(event.target.value)}><option value="">첫 번째 시장</option>{markets.data?.map(item => <option key={item.market_id} value={item.market_id}>{item.name}</option>)}</select></label></State><button className="role-button primary" disabled={start.isPending || markets.isPending || markets.isError || !markets.data?.length} onClick={() => start.mutate()}>{start.isPending ? '준비 중…' : '가게 등록 시작'}</button></> : <>
        {!question && <State query={summary}/>}
        {isDone ? <State query={summary}>{summary.data && <>
          {Object.entries(summary.data.steps).map(([step, raw]) => { const value = raw?.parsed || raw; return value && typeof value === 'object' ? <SummaryCard key={`${step}-${JSON.stringify(value)}`} step={step} value={value} sessionId={sessionId} onSaved={() => summary.refetch()}/> : null })}
          {summary.data.needs_check.map((notice, i) => <p className="summary-warning" key={i}>확인 필요 · {notice}</p>)}
          <div className="summary-preview-title">외국인 손님에게는 이렇게 보여요<span>EN</span></div><SummaryPreview value={summary.data.preview_en}/>
        </>}</State> : active && <>
          <div className="question-bubble"><h2>{active.question_ko}</h2>{active.example_ko && <p>{active.example_ko}</p>}<button type="button" onClick={speak} disabled={!window.speechSynthesis}><RoleIcon name="sound"/>다시 듣기</button></div>
          {answer ? <><p className="answer-bubble">{answer.transcript}</p><div className="answer-card"><h2>{answer.confirm_text_ko || '이렇게 정리했어요. 맞나요?'}</h2><dl className="answer-values">{Object.entries(edits).map(([key, value]) => <div key={key}><dt>{fieldLabels[key] || key}</dt><dd>{display(value)}</dd></div>)}</dl>{answer.needs_check.map((notice, i) => <p className="summary-warning" key={i}>{notice}</p>)}<details><summary>인식 내용 직접 고치기</summary><Fields value={edits} onChange={setEdits}/></details><div className="actions"><button className="role-button primary" disabled={busy} onClick={() => confirm.mutate(true)}>맞아요</button><button className="role-button" disabled={busy} onClick={() => confirm.mutate(false)}>다시 말할게요</button></div></div></> : <form className="voice-answer" onSubmit={event => { event.preventDefault(); send.mutate() }}>
            <AudioInput onChange={setAudio} disabled={busy}/>
            <button type="button" className="text-button" onClick={() => setTyping(value => !value)}>{typing ? '글 입력 닫기' : '글로 쓸게요'}</button>
            {typing && <label>답변<textarea autoFocus maxLength={2000} value={input} disabled={!!audio || busy} onChange={event => setInput(event.target.value)} placeholder="예: 떡볶이 한 접시 사천 원이에요."/></label>}
            {audio && <p>{audio.name} <button type="button" disabled={busy} onClick={() => setAudio(null)}>음성 취소</button></p>}
            {(typing || audio) && <button className="role-button primary" disabled={busy || (!audio && !input.trim())}>{send.isPending ? '답변 분석 중…' : '답변 보내기'}</button>}
          </form>}
        </>}
        <button className="text-button onboarding-reset" disabled={busy} onClick={reset}>처음부터 새로 등록</button>
      </>}
      {[start.error, send.error, confirm.error, publish.error].map((error, i) => <ErrorMessage key={i} error={error}/>)}
    </div></div>
    {isDone && <div className="host-sticky-action"><button className="role-button primary" disabled={publish.isPending || !summary.data || summary.isFetching || summary.isError} onClick={() => publish.mutate()}>{publish.isPending ? '가게 정보를 올리고 있어요…' : '가게 정보 올리기'}</button></div>}
  </div>
}
