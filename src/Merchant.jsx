import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { ErrorMessage, State, VideoPlayer } from './shared'
import { useApi } from './data'
import { logoutMerchant, readRole } from './auth'

// 데모는 이 가게가 선택된 상태로 시작한다(가게 번호 입력칸 없음). 다른 가게로 시연하려면 VITE_DEMO_STORE_ID 로 바꾼다.
const DEMO_STORE_ID = Number(import.meta.env.VITE_DEMO_STORE_ID) || 1
const STEPS = ['store_name', 'menus', 'payment', 'hours', 'story']
const stepNames = { store_name: '가게 이름', menus: '메뉴', payment: '결제 수단', hours: '영업시간', story: '가게 이야기' }
const paymentNames = { cash: '현금', card: '카드', foreign_card: '해외 카드', onnuri: '온누리상품권' }
const keyNames = { name_ko: '이름', address: '주소', menus: '메뉴', price: '가격', spicy_level: '매운 정도', payment: '결제 수단', hours: '영업시간', story_ko: '가게 이야기' }
const SpeechRecognition = typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition

function remember(key, value) { try { localStorage.setItem(key, String(value)) } catch { /* Optional persistence. */ } }
function saved(key) { try { return Number(localStorage.getItem(key)) || null } catch { return null } }

function RegistrationPreview({ value }) {
  if (!value) return <p className="notice">번역 미리보기를 준비 중입니다.</p>
  return <article className="registration-preview"><span className="eyebrow">ENGLISH PREVIEW</span>{value.translated === false && <p className="notice" role="status">영어로 번역하고 있어요. 잠시 후 자동으로 바뀌어요.</p>}<h3>{value.name}</h3><p>{value.story}</p><p>{value.hours}</p><div className="tags">{value.payment?.map(p => <span key={p}>{p}</span>)}</div><ul>{value.menus?.map((m, i) => <li key={i}><span>{m.name || m.name_ko}</span><strong>{m.price == null ? 'Ask for price' : `₩${Number(m.price).toLocaleString()}`}</strong></li>)}</ul></article>
}

// 녹음(MediaRecorder). maxSeconds 가 되면 자동으로 멈춘다. 서버가 파일 이름 blob 을 받아 준다.
function VoiceRecorder({ label, maxSeconds, onDone, disabled }) {
  const recorder = useRef(null), stream = useRef(null), timer = useRef(null), [seconds, setSeconds] = useState(0), [recording, setRecording] = useState(false), [error, setError] = useState('')
  useEffect(() => () => { clearInterval(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()) }, [])
  async function start() {
    try {
      setError('')
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('이 브라우저는 녹음을 지원하지 않아요. 글로 적어 주세요.')
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks = [], rec = new MediaRecorder(stream.current)
      recorder.current = rec
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => { clearInterval(timer.current); onDone(new File(chunks, 'blob', { type: rec.mimeType })); stream.current?.getTracks().forEach(t => t.stop()); setRecording(false) }
      rec.start(); setRecording(true); setSeconds(0)
      const began = Date.now()
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - began) / 1000)
        setSeconds(s)
        if (maxSeconds && s >= maxSeconds && rec.state === 'recording') rec.stop()
      }, 250)
    } catch (e) { setError(e.name === 'NotAllowedError' ? '마이크 권한을 허용해 주세요.' : e.message); stream.current?.getTracks().forEach(t => t.stop()) }
  }
  return <div className="audio-input"><button type="button" className="button outline" disabled={disabled} onClick={() => recording ? recorder.current.stop() : start()}>{recording ? `■ 녹음 마치기 · ${seconds}${maxSeconds ? `/${maxSeconds}` : ''}초` : label}</button>{error && <p className="error" role="alert">{error}</p>}</div>
}

// 말하는 대로 글자 띄우기(Web Speech API). 받아쓰는 중에도 글을 고칠 수 있다.
// 지원하지 않는 브라우저는 녹음 파일로 대신 보낸다.
function SpeechAnswer({ value, onChange, audio, onAudio }) {
  const rec = useRef(null), base = useRef(''), from = useRef(0), seen = useRef(0), [listening, setListening] = useState(false), [error, setError] = useState('')
  useEffect(() => () => rec.current?.abort(), [])
  function start() {
    const r = new SpeechRecognition()
    r.lang = 'ko-KR'; r.interimResults = true; r.continuous = true
    base.current = value.trim() ? `${value.trimEnd()} ` : ''; from.current = 0; seen.current = 0
    r.onresult = e => {
      seen.current = e.results.length
      let said = ''
      for (let i = from.current; i < e.results.length; i++) said += e.results[i][0].transcript
      onChange(base.current + said.trimStart())
    }
    r.onerror = e => { if (!['aborted', 'no-speech'].includes(e.error)) setError(e.error === 'not-allowed' ? '마이크 권한을 허용해 주세요.' : '음성을 알아듣지 못했어요. 다시 말하거나 글로 적어 주세요.') }
    r.onend = () => setListening(false)
    rec.current = r; setError(''); r.start(); setListening(true)
  }
  function edit(text) {
    onChange(text)
    if (listening) { base.current = text; from.current = seen.current }
  }
  return <>
    <label>말하거나 적어 주세요<textarea maxLength={2000} value={value} onChange={e => edit(e.target.value)} placeholder="마이크 버튼을 누르고 말하면 여기에 글자가 떠요." /></label>
    {SpeechRecognition
      ? <div className="audio-input"><button type="button" className={`button outline ${listening ? 'listening' : ''}`} onClick={() => listening ? rec.current.stop() : start()}>{listening ? '■ 그만 말하기' : '● 말로 답하기'}</button>{listening && <span className="listening-hint" role="status">듣고 있어요…</span>}{error && <p className="error" role="alert">{error}</p>}</div>
      : audio ? <p className="notice">녹음한 답변이 준비됐어요. <button type="button" onClick={() => onAudio(null)}>녹음 취소</button></p> : <VoiceRecorder label="● 녹음해서 답하기" onDone={onAudio} />}
  </>
}

function needsCheckText(item) { return item.replace(/[a-z_]+/g, k => keyNames[k] || k) }
// 확인 화면: 그 단계 항목만 보여준다.
function StepFields({ step, value, onChange }) {
  const set = patch => onChange({ ...value, ...patch })
  if (step === 'store_name') return <label>가게 이름<input value={value.name_ko ?? ''} onChange={e => set({ name_ko: e.target.value })} /></label>
  if (step === 'hours') return <label>영업시간<input value={value.hours ?? ''} onChange={e => set({ hours: e.target.value })} /></label>
  if (step === 'story') return <label>가게 이야기<textarea value={value.story_ko ?? ''} onChange={e => set({ story_ko: e.target.value })} /></label>
  if (step === 'payment') {
    const list = value.payment || []
    return <fieldset><legend>결제 수단</legend>{Object.entries(paymentNames).map(([code, name]) => <label className="checkbox" key={code}><input type="checkbox" checked={list.includes(code)} onChange={e => set({ payment: e.target.checked ? [...list, code] : list.filter(p => p !== code) })} />{name}</label>)}</fieldset>
  }
  if (step === 'menus') {
    const menus = value.menus || [], change = (i, patch) => set({ menus: menus.map((m, n) => n === i ? { ...m, ...patch } : m) })
    return <>{menus.map((m, i) => <fieldset key={i}><legend>메뉴 {i + 1}{m.is_ai_guess && <span className="check-badge">AI 추정</span>}</legend><label>메뉴 이름<input value={m.name_ko ?? ''} onChange={e => change(i, { name_ko: e.target.value })} /></label><label>가격 (원)<input type="number" min="0" value={m.price ?? ''} placeholder="모르면 비워 두세요" onChange={e => change(i, { price: e.target.value === '' ? null : Number(e.target.value) })} /></label><label>매운 정도<select value={m.spicy_level ?? 0} onChange={e => change(i, { spicy_level: Number(e.target.value) })}>{['안 매워요', '조금 매워요', '매워요', '아주 매워요'].map((name, n) => <option key={n} value={n}>{name}</option>)}</select></label><button type="button" className="text-button" onClick={() => set({ menus: menus.filter((_, n) => n !== i) })}>이 메뉴 빼기</button></fieldset>)}<button type="button" onClick={() => set({ menus: [...menus, { name_ko: '', price: null, spicy_level: 0, is_ai_guess: false }] })}>＋ 메뉴 추가</button></>
  }
  return null
}
function NeedsCheck({ items }) {
  return items?.length ? <ul className="needs-check">{items.map((n, i) => <li key={i}><span className="check-badge">확인 필요</span>{needsCheckText(n)}</li>)}</ul> : null
}
function SummaryStep({ step, value, sessionId, onSaved }) {
  const [edits, setEdits] = useState(value)
  const save = useMutation({ mutationFn: () => api(`/merchant/onboarding/sessions/${sessionId}/confirm`, { method: 'POST', body: { step, accepted: true, edits } }), onSuccess: onSaved })
  return <details><summary>{stepNames[step] || step} · 확인 / 수정</summary><StepFields step={step} value={edits} onChange={setEdits} /><button disabled={save.isPending} onClick={() => save.mutate()}>수정 내용 저장</button><ErrorMessage error={save.error} />{save.isSuccess && <p role="status">저장했습니다.</p>}</details>
}
function SummarySteps({ steps, sessionId, onSaved }) {
  return <div className="summary-steps">{STEPS.filter(s => steps[s]).map(step => {
    const raw = steps[step], value = raw?.parsed || raw
    return value && typeof value === 'object' ? <SummaryStep key={step} step={step} value={value} sessionId={sessionId} onSaved={onSaved} /> : <p key={step}>{stepNames[step]}: {String(value ?? '')}</p>
  })}</div>
}
const fallbackQuestions = { store_name: '가게 이름을 알려주세요.', menus: '메뉴와 가격을 알려주세요.', payment: '가능한 결제 수단을 알려주세요.', hours: '영업시간을 알려주세요.', story: '가게만의 이야기를 들려주세요.' }
function Onboarding({ storeId, onPublished }) {
  const [sessionId, setSessionId] = useState(() => saved('golmok-session')), [question, setQuestion] = useState(null), [answer, setAnswer] = useState(null), [edits, setEdits] = useState({}), [input, setInput] = useState(''), [audio, setAudio] = useState(null), [sent, setSent] = useState(''), [done, setDone] = useState(false)
  // 요약의 영어 미리보기가 아직 번역 중(translated=false)이면 1.5초 뒤 다시 불러온다.
  const summary = useQuery({ queryKey: ['onboarding-summary', sessionId], enabled: !!sessionId, queryFn: () => api(`/merchant/onboarding/sessions/${sessionId}/summary`), refetchInterval: q => q.state.data?.preview_en?.translated === false ? 1500 : false })
  function reset(data) { setQuestion(data); setAnswer(null); setInput(''); setAudio(null); setSent('') }
  const start = useMutation({ mutationFn: () => api('/merchant/onboarding/sessions', { method: 'POST', body: { store_id: storeId } }), onSuccess: data => { setSessionId(data.session_id); remember('golmok-session', data.session_id); reset(data); setDone(false) } })
  const send = useMutation({
    mutationFn: () => { const body = new FormData(); if (input.trim()) body.append('text', input.trim()); else body.append('audio', audio, 'blob'); return api(`/merchant/onboarding/sessions/${sessionId}/answers`, { method: 'POST', body }) },
    onMutate: () => setSent(input.trim() || '(녹음한 답변)'),
    onSuccess: data => { setAnswer(data); setEdits(data.parsed) },
    onError: () => setSent(''),
  })
  const confirm = useMutation({ mutationFn: accepted => api(`/merchant/onboarding/sessions/${sessionId}/confirm`, { method: 'POST', body: { step: answer.step, accepted, ...(accepted ? { edits } : {}) } }), onSuccess: data => { reset(data); setDone(data.done); summary.refetch() } })
  const publish = useMutation({ mutationFn: () => api(`/merchant/onboarding/sessions/${sessionId}/publish`, { method: 'POST' }), onSuccess: data => { remember('golmok-store', data.store_id); remember('golmok-session', ''); onPublished(data.store_id) } })
  const isDone = done || (!question && summary.data?.done)
  const active = question || (summary.data && { step: summary.data.step, question_ko: fallbackQuestions[summary.data.step] })
  return <section className="panel"><span className="eyebrow">STEP BY STEP, TOGETHER</span><h2>말로 간편하게 가게 등록</h2><p>가게 이름, 메뉴, 결제 수단, 영업시간, 가게 이야기를 차례로 말해 주세요.</p>{!sessionId ? <button className="button" disabled={start.isPending} onClick={() => start.mutate()}>{start.isPending ? '준비 중…' : '가게 등록 시작 →'}</button> : <><div className="steps">{STEPS.map((s, i) => <span key={s} className={active?.step === s ? 'current' : ''}>{i + 1}. {['가게', '메뉴', '결제', '시간', '이야기'][i]}</span>)}</div>{!question && <State query={summary} />}{isDone ? <><h3>등록 내용을 확인해주세요</h3>{summary.data && <><SummarySteps steps={summary.data.steps} sessionId={sessionId} onSaved={() => summary.refetch()} /><NeedsCheck items={summary.data.needs_check} /><h3>외국인 화면 미리보기</h3><RegistrationPreview value={summary.data.preview_en} /></>}<button className="button" disabled={publish.isPending || summary.isPending} onClick={() => publish.mutate()}>{publish.isPending ? '번역 생성 중…' : '확인하고 가게 올리기 →'}</button></> : active && <>
    <div className="chat" aria-live="polite">
      <div className="bubble bot"><strong>{active.question_ko}</strong>{active.example_ko && <small>예: {active.example_ko}</small>}</div>
      {sent && <div className="bubble me">{sent}</div>}
      {send.isPending && <div className="bubble bot thinking">정리하고 있어요<span className="dots" aria-hidden="true"><i/><i/><i/></span></div>}
      {answer && <div className="bubble bot confirm"><strong>{answer.confirm_text_ko}</strong><NeedsCheck items={answer.needs_check} /><StepFields step={answer.step} value={edits} onChange={setEdits} /><div className="actions"><button className="button" disabled={confirm.isPending} onClick={() => confirm.mutate(true)}>맞아요, 다음으로 →</button><button disabled={confirm.isPending} onClick={() => confirm.mutate(false)}>다시 답하기</button></div></div>}
    </div>
    {!answer && !send.isPending && <form onSubmit={e => { e.preventDefault(); send.mutate() }}><SpeechAnswer value={input} onChange={setInput} audio={audio} onAudio={setAudio} /><button className="button" disabled={!input.trim() && !audio}>보내기 →</button></form>}
  </>}<button className="text-button" onClick={() => { setSessionId(null); reset(null); setDone(false); remember('golmok-session', '') }}>처음부터 새로 등록</button></>}{[start.error, send.error, confirm.error, publish.error].map((e, i) => <ErrorMessage key={i} error={e} />)}</section>
}

// 예상 길이: 자막 한 줄(줄바꿈이나 문장 끝으로 나눔)마다 5초
function scriptSeconds(script) { return script.split(/\n|(?<=[.!?。！？])\s+/).map(s => s.trim()).filter(Boolean).length * 5 }
const SLOW_AFTER_MS = 30000
function GenerateVideo({ storeId, store }) {
  const [photos, setPhotos] = useState([]), [script, setScript] = useState(''), [audio, setAudio] = useState(null), [langs, setLangs] = useState(['en', 'zh']), [menu, setMenu] = useState(''), [jobId, setJobId] = useState(() => saved(`golmok-job-${storeId}`)), [slow, setSlow] = useState(false)
  const scriptBox = useRef(null)
  const create = useMutation({ mutationFn: () => { const body = new FormData(); photos.forEach(p => body.append('photos', p)); if (script.trim()) body.append('script', script.trim()); if (audio) body.append('audio', audio, 'blob'); if (menu) body.append('menu_id', menu); langs.forEach(l => body.append('langs', l)); return api(`/merchant/stores/${storeId}/videos`, { method: 'POST', body }) }, onSuccess: d => { setSlow(false); setJobId(d.job_id); remember(`golmok-job-${storeId}`, d.job_id) } })
  const job = useQuery({ queryKey: ['video-job', jobId], enabled: !!jobId, queryFn: () => api(`/merchant/videos/jobs/${jobId}`), refetchInterval: q => ['queued', 'processing'].includes(q.state.data?.status) || !q.state.data ? 2000 : false })
  const status = job.data?.status, busy = !!jobId && (!job.data || ['queued', 'processing'].includes(status))
  // 30초 안에 끝나지 않으면 기존 영상(대체 영상)을 먼저 보여준다. 실패하면 서버가 준 fallback_video_id 를 쓴다.
  useEffect(() => {
    if (!busy) return
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [busy, jobId])
  const fallbackId = status === 'failed' ? job.data.fallback_video_id : busy && slow ? store.videos[0]?.video_id : null
  const result = useApi(`/videos/${job.data?.video_id}`, !!job.data?.video_id && status === 'done')
  const fallback = useApi(`/videos/${fallbackId}`, !!fallbackId)
  function resetJob() { setJobId(null); setSlow(false); remember(`golmok-job-${storeId}`, '') }
  const seconds = scriptSeconds(script), photoError = photos.length > 5 ? '사진은 5장까지 올릴 수 있어요.' : ''
  return <section className="panel"><span className="eyebrow">YOUR STORY, IN A SHORT</span><h2>사진으로 만드는 우리 가게 영상</h2><p>사진 1~5장을 올리면 자막이 있는 숏폼 영상을 만들어요.</p><form onSubmit={e => { e.preventDefault(); create.mutate() }}>
    <label className="upload">＋ 가게·음식 사진 1~5장<input required type="file" accept="image/*" multiple disabled={busy} onChange={e => setPhotos(Array.from(e.target.files))} /><span>{photos.map(p => p.name).join(' · ')}</span></label>{photoError && <p className="error">{photoError}</p>}
    <label>소개할 메뉴 (선택)<select value={menu} onChange={e => setMenu(e.target.value)}><option value="">가게 전체 소개</option>{store.menus.map(m => <option key={m.menu_id} value={m.menu_id}>{m.name_ko || m.name}</option>)}</select></label>
    <label>영상에 넣을 말 (선택)<textarea ref={scriptBox} maxLength={1000} value={script} disabled={busy} onChange={e => setScript(e.target.value)} placeholder={'한 줄이 자막 한 장면이 돼요.\n예) 40년 동안 같은 자리에서 떡볶이를 만들었어요.'} /></label>
    {script.trim() && <p className={seconds > 30 ? 'error' : 'small'}>예상 길이 약 {seconds}초{seconds > 30 ? ' · 30초가 넘어요. 조금 줄여 주세요.' : ''}</p>}
    <p className="small">글 대신 말로 녹음해도 돼요 (최대 30초). 녹음은 자막을 만드는 데만 쓰고, 영상에는 소리가 들어가지 않아요.</p>
    {audio ? <p className="notice">녹음이 준비됐어요. <button type="button" onClick={() => setAudio(null)}>녹음 취소</button></p> : <VoiceRecorder label="● 녹음하기" maxSeconds={30} onDone={setAudio} disabled={busy} />}
    <fieldset><legend>자막 언어 <span className="small">(한국어는 항상 만들어져요)</span></legend>{[['en', 'English'], ['zh', '中文']].map(([code, label]) => <label className="checkbox" key={code}><input type="checkbox" checked={langs.includes(code)} onChange={e => setLangs(l => e.target.checked ? [...l, code] : l.filter(x => x !== code))} />{label}</label>)}</fieldset>
    <button className="button full" disabled={busy || create.isPending || !photos.length || photos.length > 5}>{create.isPending ? '요청 중…' : busy ? '영상 생성 중…' : 'AI 영상 만들기'}</button>
  </form><ErrorMessage error={create.error} />
    {jobId && <State query={job}><div className="notice" aria-live="polite"><h3>{({ queued: '생성 대기 중이에요', processing: '영상을 만들고 있어요', done: '영상이 완성되었어요!', failed: '영상 생성에 실패했어요' })[status]}</h3>{busy && <><progress value={job.data?.progress || 0} max="100" /><p>생성 중 · {job.data?.progress || 0}%</p></>}{busy && slow && <p>시간이 조금 걸려서 기존 영상을 먼저 보여드려요. 완성되면 바로 바뀌어요.</p>}{status === 'failed' && <>{job.data.error && <p className="error">{job.data.error}</p>}<div className="actions">{job.data.error_code === 'RECORDING_TOO_LONG' ? <><button onClick={() => { resetJob(); setAudio(null) }}>다시 녹음</button><button onClick={() => { resetJob(); setAudio(null); setTimeout(() => scriptBox.current?.focus()) }}>글로 입력하기</button></> : job.data.error_code === 'VIDEO_FAILED' ? <button onClick={() => { resetJob(); create.mutate() }}>다시 시도</button> : <button onClick={resetJob}>다시 만들기</button>}</div>{fallbackId && <p>대신 기존 영상을 보여드려요.</p>}</>}</div></State>}
    {status === 'done' ? <State query={result}>{result.data && <><VideoPlayer video={result.data} /><p className="small">미리보기예요. 손님 피드에는 올라가지 않아요.</p></>}</State> : fallbackId && <State query={fallback}>{fallback.data && <VideoPlayer video={fallback.data} />}</State>}
  </section>
}
function EditMenu({ menu, onSaved }) {
  const [name, setName] = useState(menu.name_ko), [price, setPrice] = useState(menu.price ?? ''), [spicy, setSpicy] = useState(menu.spicy_level)
  const save = useMutation({ mutationFn: () => api(`/merchant/menus/${menu.menu_id}`, { method: 'PATCH', body: { name_ko: name, price: price === '' ? null : Number(price), spicy_level: Number(spicy) } }), onSuccess: onSaved })
  return <form className="menu-edit" onSubmit={e => { e.preventDefault(); save.mutate() }}><label>메뉴 이름<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label><label>가격<input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} /></label><label>매운 정도<select value={spicy} onChange={e => setSpicy(e.target.value)}>{[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}</select></label><button disabled={save.isPending}>메뉴 저장</button><ErrorMessage error={save.error} />{save.isSuccess && <p role="status">저장 및 번역이 완료되었습니다.</p>}</form>
}
function EditStore({ store }) {
  const qc = useQueryClient(), [values, setValues] = useState({ name: store.name_ko, address: store.address || '', hours: store.hours, story_ko: store.story_ko, payment: store.payment })
  const refresh = () => qc.invalidateQueries({ queryKey: [`/stores/${store.store_id}`] })
  const save = useMutation({ mutationFn: () => api(`/merchant/stores/${store.store_id}`, { method: 'PATCH', body: values }), onSuccess: refresh })
  return <section className="panel"><h2>가게·메뉴 정보 수정</h2><form onSubmit={e => { e.preventDefault(); save.mutate() }}>{[['name', '가게 이름', 100], ['address', '주소', 300], ['hours', '영업시간', 200], ['story_ko', '가게 이야기', 1000]].map(([key, label, max]) => <label key={key}>{label}<input required={key === 'name'} maxLength={max} value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} /></label>)}<fieldset><legend>결제 수단</legend>{Object.entries(paymentNames).map(([code, label]) => <label className="checkbox" key={code}><input type="checkbox" checked={values.payment.includes(code)} onChange={e => setValues(v => ({ ...v, payment: e.target.checked ? [...v.payment, code] : v.payment.filter(p => p !== code) }))} />{label}</label>)}</fieldset><button className="button" disabled={save.isPending}>정보 저장 · 번역 재생성</button><ErrorMessage error={save.error} />{save.isSuccess && <p role="status">가게 정보와 번역을 저장했습니다.</p>}</form><h3>메뉴 관리</h3>{store.menus.map(m => <EditMenu key={m.menu_id} menu={m} onSaved={refresh} />)}</section>
}
export function Merchant() {
  // 탭은 주소(/merchant/register|video|edit)로 정해서 아래 사장님 툴바와 맞춘다.
  const param = useParams()['*'], tab = ['register', 'video', 'edit'].includes(param) ? param : 'register', navigate = useNavigate()
  const [storeId, setStoreId] = useState(() => saved('golmok-store') || DEMO_STORE_ID)
  const store = useApi(`/stores/${storeId}`)
  function published(id) { setStoreId(id); navigate('/merchant/video') }
  function logout() { logoutMerchant(); navigate('/', { replace: true }) }
  if (readRole() !== 'merchant') return <Navigate to="/merchant/login" replace/>
  if (param !== tab) return <Navigate to={`/merchant/${tab}`} replace/>
  return <><div className="page-heading"><span className="eyebrow">FOR OUR LOCAL MERCHANTS</span><h1>사장님의 이야기를<br/>세계에 들려주세요.</h1><p>가게 등록부터 다국어 소개, AI 영상까지 한곳에서.</p></div><div className="merchant-bar"><span>{{ register: '가게 등록', video: '영상 만들기', edit: '정보 수정' }[tab]}</span><button className="button outline" onClick={logout}>로그아웃</button></div><div className="narrow merchant"><State query={store}>{store.data && <><div className="notice"><strong>{store.data.name_ko || store.data.name}</strong> <Link to={`/stores/${storeId}`}>손님 화면 보기 ↗</Link></div>{tab === 'register' ? <Onboarding storeId={storeId} onPublished={published} /> : tab === 'video' ? <GenerateVideo key={storeId} storeId={storeId} store={store.data} /> : <EditStore key={storeId} store={store.data} />}</>}</State></div></>
}
