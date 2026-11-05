import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './api'
import { ErrorMessage, State } from './shared'
import { remember, saved } from './merchant-storage'
import { HostTitle } from './HostHome'
import RoleIcon from './RoleIcon'
import SpeechInput from './SpeechInput'

const steps = [['store_name', '가게 이름'], ['menus', '메뉴·가격'], ['payment', '결제 방법'], ['hours', '영업시간'], ['story', '가게 이야기']]
const questions = { store_name: '가게 이름과 주소를 알려주세요.', menus: '대표 메뉴와 가격을 말씀해 주세요.', payment: '가능한 결제 수단을 알려주세요.', hours: '영업시간을 알려주세요.', story: '가게만의 이야기를 들려주세요.' }
const paymentNames = { cash: '현금', card: '카드', foreign_card: '해외 카드', onnuri: '온누리상품권' }
const spicyNames = ['안 매워요', '조금 매워요', '매워요', '아주 매워요']
const keyNames = { name_ko: '이름', address: '주소', menus: '메뉴', price: '가격', spicy_level: '매운 정도', payment: '결제 수단', hours: '영업시간', story_ko: '가게 이야기' }

function won(price) { return price == null ? '가격 미정' : `${Number(price).toLocaleString('ko-KR')}원` }

// 확인 화면은 그 단계 항목만 보여준다(가게 이름 단계에서 주소는 보여주지 않는다).
function stepRows(step, value) {
  if (step === 'store_name') return [['가게 이름', value.name_ko || '미입력']]
  if (step === 'menus') return (value.menus || []).map(menu => ['메뉴 이름', `${menu.name_ko || '미입력'} · ${won(menu.price)}${menu.spicy_level ? ` · ${spicyNames[menu.spicy_level]}` : ''}${menu.is_ai_guess ? ' · AI 추정' : ''}`])
  if (step === 'payment') return [['결제 방법', (value.payment || []).map(code => paymentNames[code] || code).join(' · ') || '미입력']]
  if (step === 'hours') return [['영업시간', value.hours || '미입력']]
  if (step === 'story') return [['가게 이야기', value.story_ko || '미입력']]
  return Object.entries(value).map(([key, val]) => [keyNames[key] || key, String(val ?? '')])
}

// needs_check 항목(예: name_ko, menus[1].price)을 사장님이 읽을 수 있는 말로 바꾼다.
function needsCheckText(item, step) {
  return item
    .replace(/menus\[(\d+)\]\.name_ko/g, (_, n) => `메뉴 ${Number(n) + 1} 이름`)
    .replace(/menus\[(\d+)\]\.?/g, (_, n) => `메뉴 ${Number(n) + 1} `)
    .replace(/name_ko/g, step === 'menus' ? '메뉴 이름' : '가게 이름')
    .replace(/[a-z_]+/g, key => keyNames[key] || key)
    .trim()
}
function NeedsCheck({ items, step }) {
  return items?.map((notice, i) => <p className="summary-warning" key={i}>확인 필요 · {needsCheckText(notice, step)}</p>) || null
}

function StepFields({ step, value, onChange }) {
  const set = patch => onChange({ ...value, ...patch })
  if (step === 'store_name') return <div className="parsed-fields"><label>가게 이름<input value={value.name_ko ?? ''} onChange={event => set({ name_ko: event.target.value })}/></label></div>
  if (step === 'hours') return <div className="parsed-fields"><label>영업시간<input value={value.hours ?? ''} onChange={event => set({ hours: event.target.value })}/></label></div>
  if (step === 'story') return <div className="parsed-fields"><label>가게 이야기<textarea value={value.story_ko ?? ''} onChange={event => set({ story_ko: event.target.value })}/></label></div>
  if (step === 'payment') {
    const list = value.payment || []
    return <fieldset className="parsed-fields"><legend>결제 방법</legend>{Object.entries(paymentNames).map(([code, name]) => <label className="checkbox" key={code}><input type="checkbox" checked={list.includes(code)} onChange={event => set({ payment: event.target.checked ? [...list, code] : list.filter(item => item !== code) })}/>{name}</label>)}</fieldset>
  }
  if (step === 'menus') {
    const menus = value.menus || [], change = (index, patch) => set({ menus: menus.map((menu, i) => i === index ? { ...menu, ...patch } : menu) })
    return <div className="parsed-fields">{menus.map((menu, index) => <fieldset key={index}><legend>메뉴 {index + 1}</legend><label>메뉴 이름<input value={menu.name_ko ?? ''} onChange={event => change(index, { name_ko: event.target.value })}/></label><label>가격 (원)<input type="number" min="0" value={menu.price ?? ''} placeholder="모르면 비워 두세요" onChange={event => change(index, { price: event.target.value === '' ? null : Number(event.target.value) })}/></label><label>매운 정도<select value={menu.spicy_level ?? 0} onChange={event => change(index, { spicy_level: Number(event.target.value) })}>{spicyNames.map((name, level) => <option key={level} value={level}>{name}</option>)}</select></label><button type="button" className="text-button" onClick={() => set({ menus: menus.filter((_, i) => i !== index) })}>이 메뉴 빼기</button></fieldset>)}<button type="button" onClick={() => set({ menus: [...menus, { name_ko: '', price: null, spicy_level: 0, is_ai_guess: false }] })}>＋ 메뉴 추가</button></div>
  }
  return null
}

function SummaryCard({ step, value, sessionId, onSaved }) {
  const [edits, setEdits] = useState(value)
  const save = useMutation({ mutationFn: () => api(`/merchant/onboarding/sessions/${sessionId}/confirm`, { method: 'POST', body: { step, accepted: true, edits } }), onSuccess: onSaved })
  return <details className="summary-card"><summary><span>고치기</span><small>{steps.find(([key]) => key === step)?.[1] || step}</small>{stepRows(step, value).map(([, text]) => text).join(' · ')}</summary><StepFields step={step} value={edits} onChange={setEdits}/><button disabled={save.isPending} onClick={() => save.mutate()}>수정 내용 저장</button><ErrorMessage error={save.error}/>{save.isSuccess && <p role="status">저장했습니다.</p>}</details>
}

function SummaryPreview({ value }) {
  if (!value) return <p>번역 미리보기를 준비 중입니다.</p>
  return <article className="registration-preview" lang="en">{value.translated === false && <p className="small" role="status" lang="ko">영어로 번역하고 있어요. 잠시 후 자동으로 바뀌어요.</p>}<h3>{value.name}</h3><p>{value.story}</p><p>{value.hours}</p><div className="tags">{value.payment?.map(method => <span key={method}>{method}</span>)}</div><ul>{value.menus?.map((menu, index) => <li key={index}><span>{menu.name || menu.name_ko}</span><strong>{menu.price == null ? 'Ask for price' : `₩${Number(menu.price).toLocaleString()}`}</strong></li>)}</ul></article>
}

// storeId: 데모 가게. 등록은 이 가게가 선택된 상태로 시작한다.
export default function Onboarding({ storeId, onPublished }) {
  const [sessionId, setSessionId] = useState(() => saved('golmok-session'))
  const [question, setQuestion] = useState(null), [answer, setAnswer] = useState(null), [edits, setEdits] = useState({})
  const [input, setInput] = useState(''), [audio, setAudio] = useState(null), [sent, setSent] = useState(''), [done, setDone] = useState(false)
  // 영어 미리보기가 아직 번역 중(translated=false)이면 1.5초 뒤 요약을 다시 불러온다.
  const summary = useQuery({ queryKey: ['onboarding-summary', sessionId], enabled: !!sessionId, queryFn: () => api(`/merchant/onboarding/sessions/${sessionId}/summary`), refetchInterval: query => query.state.data?.preview_en?.translated === false ? 1500 : false })
  const translating = summary.data?.preview_en?.translated === false
  function clearAnswer() { setAnswer(null); setInput(''); setAudio(null); setSent('') }
  const start = useMutation({ mutationFn: () => api('/merchant/onboarding/sessions', { method: 'POST', body: { store_id: storeId } }), onSuccess: data => { setSessionId(data.session_id); remember('golmok-session', data.session_id); setQuestion(data); setDone(false); clearAnswer() } })
  const send = useMutation({
    mutationFn: () => {
      if (audio?.size > 10 * 1024 * 1024) throw new Error('녹음은 10MB 이하여야 해요. 조금 짧게 다시 녹음해주세요.')
      const body = new FormData()
      if (input.trim()) body.append('text', input.trim()); else body.append('audio', audio, 'blob')
      return api(`/merchant/onboarding/sessions/${sessionId}/answers`, { method: 'POST', body })
    },
    // 보낸 문장을 말풍선으로 먼저 띄운다.
    onMutate: () => setSent(input.trim() || '녹음한 답변'),
    onSuccess: data => { setAnswer(data); setEdits(data.parsed) },
    onError: () => setSent(''),
  })
  const confirm = useMutation({ mutationFn: accepted => api(`/merchant/onboarding/sessions/${sessionId}/confirm`, { method: 'POST', body: { step: answer.step, accepted, ...(accepted ? { edits } : {}) } }), onSuccess: data => { setQuestion(data); clearAnswer(); setDone(data.done); summary.refetch() } })
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
    setSessionId(null); setQuestion(null); setDone(false); clearAnswer(); remember('golmok-session', '')
    start.reset(); send.reset(); confirm.reset(); publish.reset()
  }
  return <div className="onboarding-page">
    <HostTitle title={isDone ? <>AI가 정리했어요<span className="host-title-note">틀린 곳만 눌러서 고치세요</span></> : '말로 가게 등록'}>{!isDone && <strong>{sessionId ? stepIndex + 1 : 1} / 5</strong>}</HostTitle>
    {!isDone && <div className="onboarding-steps">{steps.map(([key, label], i) => <span key={key} className={stepIndex === i ? 'current' : i < stepIndex ? 'complete' : ''} aria-current={stepIndex === i ? 'step' : undefined}>{label}{i < stepIndex ? ' ✓' : ''}</span>)}</div>}
    <div className="host-content"><div className="panel">
      {!sessionId ? <><div className="question-bubble"><h2>우리 가게의 이야기를 들려주세요.</h2><p>이름부터 메뉴, 결제 방법, 영업시간, 이야기까지.<br/>질문에 답하시면 AI가 정리해요.</p></div><button className="role-button primary" disabled={start.isPending || !storeId} onClick={() => start.mutate()}>{start.isPending ? '준비 중…' : '가게 등록 시작'}</button></> : <>
        {!question && <State query={summary}/>}
        {isDone ? <State query={summary}>{summary.data && <>
          {steps.map(([step]) => { const raw = summary.data.steps[step], value = raw?.parsed || raw; return value && typeof value === 'object' ? <SummaryCard key={`${step}-${JSON.stringify(value)}`} step={step} value={value} sessionId={sessionId} onSaved={() => summary.refetch()}/> : null })}
          <NeedsCheck items={summary.data.needs_check}/>
          <div className="summary-preview-title">외국인 손님에게는 이렇게 보여요<span>EN</span></div><SummaryPreview value={summary.data.preview_en}/>
        </>}</State> : active && <>
          <div className="question-bubble"><h2>{active.question_ko}</h2>{active.example_ko && <p>{active.example_ko}</p>}<button type="button" onClick={speak} disabled={!window.speechSynthesis}><RoleIcon name="sound"/>다시 듣기</button></div>
          {sent && <p className="answer-bubble">{answer?.transcript || sent}</p>}
          {send.isPending && <p className="thinking-bubble" role="status">정리하고 있어요<span className="dots" aria-hidden="true"><i/><i/><i/></span></p>}
          {answer ? <div className="answer-card"><h2>{answer.confirm_text_ko || '이렇게 정리했어요. 맞나요?'}</h2><dl className="answer-values">{stepRows(answer.step, edits).map(([label, text], i) => <div key={i}><dt>{label}</dt><dd>{text}</dd></div>)}</dl><NeedsCheck items={answer.needs_check} step={answer.step}/><details><summary>인식 내용 직접 고치기</summary><StepFields step={answer.step} value={edits} onChange={setEdits}/></details><div className="actions"><button className="role-button primary" disabled={busy} onClick={() => confirm.mutate(true)}>맞아요</button><button className="role-button" disabled={busy} onClick={() => confirm.mutate(false)}>다시 말할게요</button></div></div> : !send.isPending && <form className="voice-answer" onSubmit={event => { event.preventDefault(); send.mutate() }}>
            <SpeechInput value={input} onChange={setInput} audio={audio} onAudio={setAudio} disabled={busy}/>
            {audio && <p>녹음한 답변이 준비됐어요 <button type="button" disabled={busy} onClick={() => setAudio(null)}>녹음 취소</button></p>}
            {(input.trim() || audio) && <button className="role-button primary" disabled={busy}>답변 보내기</button>}
          </form>}
        </>}
        <button className="text-button onboarding-reset" disabled={busy} onClick={reset}>처음부터 새로 등록</button>
      </>}
      {[start.error, send.error, confirm.error, publish.error].map((error, i) => <ErrorMessage key={i} error={error}/>)}
    </div></div>
    {isDone && <div className="host-sticky-action"><button className="role-button primary" disabled={publish.isPending || !summary.data || summary.isError || (summary.isFetching && !translating)} onClick={() => publish.mutate()}>{publish.isPending ? '가게 정보를 올리고 있어요…' : '가게 정보 올리기'}</button></div>}
  </div>
}
