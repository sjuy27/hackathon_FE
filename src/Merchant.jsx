import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { ErrorMessage, State } from './shared'
import { useApi } from './data'
import HostHome, { HostMetrics, HostNav, HostTitle } from './HostHome'
import Onboarding from './Onboarding'
import GenerateVideo from './VideoBuilder'
import { remember, saved } from './merchant-storage'

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
  const { pathname } = useLocation(), navigate = useNavigate()
  const tab = pathname.split('/')[2] || 'home'
  const [storeId, setStoreId] = useState(() => saved('golmok-store')), [idInput, setIdInput] = useState(() => String(saved('golmok-store') || ''))
  const [sessionId] = useState(() => saved('golmok-session'))
  const summary = useQuery({ queryKey: ['onboarding-summary', sessionId], enabled: !!sessionId && tab === 'home', queryFn: () => api(`/merchant/onboarding/sessions/${sessionId}/summary`) })
  const store = useApi(`/stores/${storeId}`, !!storeId)
  function published(id) { setStoreId(id); setIdInput(String(id)); navigate('/host/video') }
  if (tab === 'register') return <div lang="ko"><Onboarding onPublished={published}/></div>
  if (!['home', 'video', 'edit', 'stats'].includes(tab)) return <div className="host-page" lang="ko"><HostTitle title="페이지를 찾을 수 없어요"/><div className="host-content"><Link to="/host">사장님 홈으로 돌아가기</Link></div></div>
  return <div className="host-page" lang="ko">
    {tab === 'home' ? <HostHome store={store} summary={summary}/> : <>
      <HostTitle title={{ video: '영상 만들기', edit: '가게 정보 · 메뉴 수정', stats: '우리 가게 통계' }[tab]}/>
      {tab === 'stats' ? <div className="host-statistics"><h2>우리 가게를 찾은 손님들</h2><HostMetrics/><p className="small">통계 서비스가 준비되면 이곳에서 조회와 주문 화면 방문 수를 확인할 수 있어요.</p></div> : <div className="host-content">
        <details className="host-store-picker" open={!storeId}><summary>{storeId ? `관리할 가게 변경 · #${storeId}` : '이미 등록한 가게 불러오기'}</summary><form className="store-selector" onSubmit={e => { e.preventDefault(); setStoreId(Number(idInput)); remember('golmok-store', idInput) }}><label>가게 번호<input type="number" min="1" step="1" required value={idInput} onChange={e => setIdInput(e.target.value)}/></label><button>불러오기</button></form></details>
        {storeId ? <State query={store}>{store.data && (tab === 'video' ? <GenerateVideo key={storeId} storeId={storeId}/> : <EditStore key={storeId} store={store.data}/>)}</State> : <div className="host-empty"><h2>먼저 우리 가게를 등록해주세요</h2><p>가게를 등록하면 {tab === 'video' ? '사진으로 영상을 만들 수 있어요.' : '메뉴와 가격을 수정할 수 있어요.'}</p><Link className="role-button primary" to="/host/register">말로 가게 등록하기</Link></div>}
      </div>}
    </>}
    {tab !== 'video' && <HostNav/>}
  </div>
}



