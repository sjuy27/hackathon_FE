import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { ErrorMessage, State, VideoPlayer } from './shared'
import { useApi } from './data'
import { logoutMerchant, readRole } from './auth'

const fieldLabels = { name_ko: '메뉴·가게 이름', name: '이름', address: '주소', menus: '메뉴 목록', price: '가격 (원)', spicy_level: '매운 정도 (0~3)', is_ai_guess: 'AI 추정 정보', payment: '결제 수단 (cash / card / foreign_card / onnuri)', hours: '영업시간', story_ko: '가게 이야기' }
function RegistrationPreview({ value }) {
  if (!value) return <p className="notice">번역 미리보기를 준비 중입니다.</p>
  return <article className="registration-preview"><span className="eyebrow">ENGLISH PREVIEW</span><h3>{value.name}</h3><p>{value.story}</p><p>{value.hours}</p><div className="tags">{value.payment?.map(p => <span key={p}>{p}</span>)}</div><ul>{value.menus?.map((m, i) => <li key={i}><span>{m.name || m.name_ko}</span><strong>{m.price == null ? 'Ask for price' : `₩${Number(m.price).toLocaleString()}`}</strong></li>)}</ul></article>
}

function remember(key, value) { try { localStorage.setItem(key, String(value)) } catch { /* Optional persistence. */ } }
function saved(key) { try { return Number(localStorage.getItem(key)) || null } catch { return null } }
function AudioInput({ onChange }) {
  const recorder = useRef(null), stream = useRef(null), [recording, setRecording] = useState(false), [error, setError] = useState('')
  useEffect(() => () => { if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()) }, [])
  async function start() {
    try {
      setError('')
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('이 브라우저는 녹음을 지원하지 않습니다. 음성 파일이나 글로 답해주세요.')
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks = [], rec = new MediaRecorder(stream.current)
      recorder.current = rec
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => { onChange(new File(chunks, `recording.${rec.mimeType.includes('mp4') ? 'mp4' : 'webm'}`, { type: rec.mimeType })); stream.current?.getTracks().forEach(t => t.stop()); setRecording(false) }
      rec.start(); setRecording(true)
    } catch (e) { setError(e.message); stream.current?.getTracks().forEach(t => t.stop()) }
  }
  return <div className="audio-input"><button type="button" className="button outline" onClick={() => recording ? recorder.current.stop() : start()}>{recording ? '■ 녹음 마치기' : '♩ 음성으로 답하기'}</button><label className="file-label">음성 파일 선택<input type="file" accept="audio/*" onChange={e => onChange(e.target.files[0] || null)} /></label>{error && <p className="error" role="alert">{error}</p>}</div>
}
function ParsedFields({ value, onChange }) {
  return <div className="parsed-fields">{Object.entries(value).map(([key, val]) => <label key={key}>{fieldLabels[key] || key}{Array.isArray(val) && val.some(x => typeof x === 'object') ? val.map((item, i) => <fieldset key={i}><legend>메뉴 {i + 1}</legend>{Object.entries(item).map(([k, v]) => <label key={k}>{fieldLabels[k] || k}{typeof v === 'boolean' ? <input type="checkbox" checked={v} onChange={e => onChange({ ...value, [key]: val.map((x, n) => n === i ? { ...x, [k]: e.target.checked } : x) })} /> : <input type={typeof v === 'number' ? 'number' : 'text'} value={v ?? ''} onChange={e => onChange({ ...value, [key]: val.map((x, n) => n === i ? { ...x, [k]: typeof v === 'number' ? Number(e.target.value) : e.target.value } : x) })} />}</label>)}</fieldset>) : <input value={Array.isArray(val) ? val.join(', ') : val ?? ''} onChange={e => onChange({ ...value, [key]: Array.isArray(val) ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : e.target.value })} />}</label>)}</div>
}
function SummaryStep({ step, value, sessionId, onSaved }) {
  const [edits, setEdits] = useState(value)
  const save = useMutation({ mutationFn: () => api(`/merchant/onboarding/sessions/${sessionId}/confirm`, { method: 'POST', body: { step, accepted: true, edits } }), onSuccess: onSaved })
  return <details><summary>{{ store_name: '가게 이름·주소', menus: '메뉴', payment: '결제 수단', hours: '영업시간', story: '가게 이야기' }[step] || step} · 확인 / 수정</summary><ParsedFields value={edits} onChange={setEdits} /><button disabled={save.isPending} onClick={() => save.mutate()}>수정 내용 저장</button><ErrorMessage error={save.error} />{save.isSuccess && <p role="status">저장했습니다.</p>}</details>
}
function SummarySteps({ steps, sessionId, onSaved }) {
  return <div className="summary-steps">{Object.entries(steps).map(([step, raw]) => {
    const value = raw?.parsed || raw
    return value && typeof value === 'object' ? <SummaryStep key={step} step={step} value={value} sessionId={sessionId} onSaved={onSaved} /> : <p key={step}>{step}: {String(value ?? '')}</p>
  })}</div>
}
function Onboarding({ onPublished }) {
  const [sessionId, setSessionId] = useState(() => saved('golmok-session')), [question, setQuestion] = useState(null), [answer, setAnswer] = useState(null), [edits, setEdits] = useState({}), [input, setInput] = useState(''), [audio, setAudio] = useState(null), [done, setDone] = useState(false), [market, setMarket] = useState('')
  const markets = useApi('/markets')
  const summary = useQuery({ queryKey: ['onboarding-summary', sessionId], enabled: !!sessionId, queryFn: () => api(`/merchant/onboarding/sessions/${sessionId}/summary`) })
  const start = useMutation({ mutationFn: () => api('/merchant/onboarding/sessions', { method: 'POST', body: market ? { market_id: Number(market) } : {} }), onSuccess: data => { setSessionId(data.session_id); remember('golmok-session', data.session_id); setQuestion(data); setDone(false); setAnswer(null); setInput(''); setAudio(null) } })
  const send = useMutation({ mutationFn: () => { if (audio?.size > 10 * 1024 * 1024) throw new Error('음성 파일은 10MB 이하로 선택해주세요.'); const body = new FormData(); if (audio) body.append('audio', audio); else body.append('text', input); return api(`/merchant/onboarding/sessions/${sessionId}/answers`, { method: 'POST', body }) }, onSuccess: data => { setAnswer(data); setEdits(data.parsed) } })
  const confirm = useMutation({ mutationFn: accepted => api(`/merchant/onboarding/sessions/${sessionId}/confirm`, { method: 'POST', body: { step: answer.step, accepted, ...(accepted ? { edits } : {}) } }), onSuccess: data => { setQuestion(data); setAnswer(null); setInput(''); setAudio(null); setDone(data.done); summary.refetch() } })
  const publish = useMutation({ mutationFn: () => api(`/merchant/onboarding/sessions/${sessionId}/publish`, { method: 'POST' }), onSuccess: data => { remember('golmok-store', data.store_id); remember('golmok-session', ''); onPublished(data.store_id) } })
  const isDone = done || (!question && summary.data?.done)
  const active = question || (summary.data && { step: summary.data.step, question_ko: { store_name: '가게 이름과 주소를 알려주세요.', menus: '메뉴와 가격을 알려주세요.', payment: '가능한 결제 수단을 알려주세요.', hours: '영업시간을 알려주세요.', story: '가게만의 이야기를 들려주세요.' }[summary.data.step] })
  return <section className="panel"><span className="eyebrow">STEP BY STEP, TOGETHER</span><h2>대화로 간편하게 가게 등록</h2><p>이름, 메뉴, 결제 수단, 영업시간, 가게 이야기를 차례로 알려주세요.</p>{!sessionId ? <><State query={markets}><label>소속 시장<select value={market} onChange={e => setMarket(e.target.value)}><option value="">첫 번째 시장</option>{markets.data?.map(m => <option key={m.market_id} value={m.market_id}>{m.name}</option>)}</select></label></State><button className="button" disabled={start.isPending || markets.isPending || markets.isError} onClick={() => start.mutate()}>가게 등록 시작 →</button></> : <><div className="steps">{['store_name', 'menus', 'payment', 'hours', 'story'].map((s, i) => <span key={s} className={active?.step === s ? 'current' : ''}>{i + 1}. {['가게', '메뉴', '결제', '시간', '이야기'][i]}</span>)}</div>{!question && <State query={summary} />}{isDone ? <><h3>등록 내용을 확인해주세요</h3>{summary.data && <><SummarySteps steps={summary.data.steps} sessionId={sessionId} onSaved={() => summary.refetch()} /><h3>외국인 화면 미리보기</h3><RegistrationPreview value={summary.data.preview_en} />{summary.data.needs_check.map((n, i) => <p className="notice" key={i}>{n}</p>)}</>}<button className="button" disabled={publish.isPending || summary.isPending} onClick={() => publish.mutate()}>{publish.isPending ? '번역 생성 중…' : '확인하고 가게 올리기 →'}</button></> : answer ? <><h3>{answer.confirm_text_ko}</h3><p>인식한 답변: {answer.transcript}</p>{answer.needs_check.map((n, i) => <p className="notice" key={i}>{n}</p>)}<ParsedFields value={edits} onChange={setEdits} /><div className="actions"><button className="button" disabled={confirm.isPending} onClick={() => confirm.mutate(true)}>맞아요, 다음으로 →</button><button disabled={confirm.isPending} onClick={() => confirm.mutate(false)}>다시 답하기</button></div></> : active && <form onSubmit={e => { e.preventDefault(); send.mutate() }}><h3>{active.question_ko}</h3><p>{active.example_ko}</p><label>글로 답하기<textarea maxLength={2000} value={input} disabled={!!audio} onChange={e => setInput(e.target.value)} placeholder="예시를 참고해서 편하게 적어주세요." /></label><AudioInput onChange={setAudio} />{audio && <p>{audio.name} <button type="button" onClick={() => setAudio(null)}>음성 취소</button></p>}<button className="button" disabled={send.isPending || (!audio && !input.trim())}>{send.isPending ? '답변 분석 중…' : '답변 보내기 →'}</button></form>}<button className="text-button" onClick={() => { setSessionId(null); setQuestion(null); setAnswer(null); setDone(false); setInput(''); setAudio(null); remember('golmok-session', '') }}>처음부터 새로 등록</button></>}{[start.error, send.error, confirm.error, publish.error].map((e, i) => <ErrorMessage key={i} error={e} />)}</section>
}
function GenerateVideo({ storeId }) {
  const [photos, setPhotos] = useState([]), [audio, setAudio] = useState(null), [langs, setLangs] = useState(['en', 'zh']), [menu, setMenu] = useState(''), [jobId, setJobId] = useState(() => saved(`golmok-job-${storeId}`))
  const store = useApi(`/stores/${storeId}`)
  const create = useMutation({ mutationFn: () => { const body = new FormData(); photos.forEach(p => body.append('photos', p)); if (audio) body.append('audio', audio); if (menu) body.append('menu_id', menu); langs.forEach(l => body.append('langs', l)); return api(`/merchant/stores/${storeId}/videos`, { method: 'POST', body }) }, onSuccess: d => { setJobId(d.job_id); remember(`golmok-job-${storeId}`, d.job_id) } })
  const job = useQuery({ queryKey: ['video-job', jobId], enabled: !!jobId, queryFn: () => api(`/merchant/videos/jobs/${jobId}`), refetchInterval: q => ['queued', 'processing'].includes(q.state.data?.status) || !q.state.data ? 2000 : false })
  const result = useApi(`/videos/${job.data?.video_id}`, !!job.data?.video_id && job.data?.status === 'done')
  const busy = !!jobId && (!job.data || ['queued', 'processing'].includes(job.data.status))
  return <section className="panel"><span className="eyebrow">YOUR STORY, IN A SHORT</span><h2>사진으로 만드는 우리 가게 영상</h2><p>사진 3~5장을 올리면 자막이 있는 숏폼 영상을 만들어요.</p><form onSubmit={e => { e.preventDefault(); create.mutate() }}><label className="upload">＋ 가게·음식 사진 3~5장<input required type="file" accept="image/*" multiple disabled={busy} onChange={e => setPhotos(Array.from(e.target.files))} /><span>{photos.map(p => p.name).join(' · ')}</span></label>{photos.length > 0 && (photos.length < 3 || photos.length > 5) && <p className="error">사진을 3~5장 선택해주세요.</p>}<label>소개할 메뉴 (선택)<select value={menu} onChange={e => setMenu(e.target.value)}><option value="">가게 전체 소개</option>{store.data?.menus.map(m => <option key={m.menu_id} value={m.menu_id}>{m.name}</option>)}</select></label><fieldset><legend>자막 언어</legend>{[['ko', '한국어'], ['en', 'English'], ['zh', '中文']].map(([code, label]) => <label className="checkbox" key={code}><input type="checkbox" checked={langs.includes(code)} onChange={e => setLangs(l => e.target.checked ? [...l, code] : l.filter(x => x !== code))} />{label}</label>)}</fieldset><p>음성 설명 (선택)</p><AudioInput onChange={setAudio} />{audio && <p>{audio.name}<button type="button" onClick={() => setAudio(null)}>취소</button></p>}<button className="button full" disabled={busy || create.isPending || photos.length < 3 || photos.length > 5 || !langs.length}>{create.isPending ? '요청 중…' : busy ? '영상 생성 중…' : 'AI 영상 만들기 ✧'}</button></form><ErrorMessage error={create.error} />{jobId && <State query={job}><div className="notice" aria-live="polite"><h3>{({ queued: '생성 대기 중', processing: '영상을 만들고 있어요', done: '영상이 완성되었어요!', failed: '영상 생성에 실패했어요' })[job.data?.status]}</h3><progress value={job.data?.progress || 0} max="100" /><p>{job.data?.progress || 0}%</p>{job.data?.error && <p className="error">{job.data.error}</p>}{job.data?.status === 'failed' && <button onClick={() => { setJobId(null); remember(`golmok-job-${storeId}`, '') }}>다시 만들기</button>}</div></State>}{job.data?.status === 'done' && <State query={result}>{result.data && <VideoPlayer video={result.data} />}</State>}</section>
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
  return <section className="panel"><h2>가게·메뉴 정보 수정</h2><form onSubmit={e => { e.preventDefault(); save.mutate() }}>{[['name', '가게 이름', 100], ['address', '주소', 300], ['hours', '영업시간', 200], ['story_ko', '가게 이야기', 1000]].map(([key, label, max]) => <label key={key}>{label}<input required={key === 'name'} maxLength={max} value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} /></label>)}<fieldset><legend>결제 수단</legend>{[['cash', '현금'], ['card', '카드'], ['foreign_card', '해외 카드'], ['onnuri', '온누리']].map(([code, label]) => <label className="checkbox" key={code}><input type="checkbox" checked={values.payment.includes(code)} onChange={e => setValues(v => ({ ...v, payment: e.target.checked ? [...v.payment, code] : v.payment.filter(p => p !== code) }))} />{label}</label>)}</fieldset><button className="button" disabled={save.isPending}>정보 저장 · 번역 재생성</button><ErrorMessage error={save.error} />{save.isSuccess && <p role="status">가게 정보와 번역을 저장했습니다.</p>}</form><h3>메뉴 관리</h3>{store.menus.map(m => <EditMenu key={m.menu_id} menu={m} onSaved={refresh} />)}</section>
}
export function Merchant() {
  // 탭은 주소(/merchant/register|video|edit)로 정해서 아래 사장님 툴바와 맞춘다.
  const param = useParams()['*'], tab = ['register', 'video', 'edit'].includes(param) ? param : 'register', navigate = useNavigate()
  const [storeId, setStoreId] = useState(() => saved('golmok-store')), [idInput, setIdInput] = useState(() => String(saved('golmok-store') || ''))
  const store = useApi(`/stores/${storeId}`, !!storeId)
  function published(id) { setStoreId(id); setIdInput(String(id)); navigate('/merchant/video') }
  function logout() { logoutMerchant(); navigate('/', { replace: true }) }
  if (readRole() !== 'merchant') return <Navigate to="/merchant/login" replace/>
  if (param !== tab) return <Navigate to={`/merchant/${tab}`} replace/>
  return <><div className="page-heading"><span className="eyebrow">FOR OUR LOCAL MERCHANTS</span><h1>사장님의 이야기를<br/>세계에 들려주세요.</h1><p>가게 등록부터 다국어 소개, AI 영상까지 한곳에서.</p></div><div className="merchant-bar"><span>{{ register: '가게 등록', video: '영상 만들기', edit: '정보 수정' }[tab]}</span><button className="button outline" onClick={logout}>로그아웃</button></div><div className="narrow merchant">{tab === 'register' ? <Onboarding onPublished={published} /> : <><form className="store-selector" onSubmit={e => { e.preventDefault(); setStoreId(Number(idInput)); remember('golmok-store', idInput) }}><label>관리할 가게 번호<input type="number" min="1" required value={idInput} onChange={e => setIdInput(e.target.value)} /></label><button>가게 불러오기</button></form>{storeId ? <State query={store}>{store.data && <><div className="notice"><strong>{store.data.name}</strong> · #{storeId} <Link to={`/stores/${storeId}`}>손님 화면 보기 ↗</Link></div>{tab === 'video' ? <GenerateVideo key={storeId} storeId={storeId} /> : <EditStore key={storeId} store={store.data} />}</>}</State> : <p className="notice">등록된 가게 번호를 입력하거나 먼저 가게를 등록해주세요.</p>}</>}</div></>
}



