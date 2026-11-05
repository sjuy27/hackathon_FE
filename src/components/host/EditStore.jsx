import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api'
import { ErrorMessage } from '../../shared'
import { paymentNames } from './host-model'

function EditMenu({ menu, onSaved }) {
  const [name, setName] = useState(menu.name_ko), [price, setPrice] = useState(menu.price ?? ''), [spicy, setSpicy] = useState(menu.spicy_level)
  const save = useMutation({ mutationFn: () => api(`/merchant/menus/${menu.menu_id}`, { method: 'PATCH', body: { name_ko: name, price: price === '' ? null : Number(price), spicy_level: Number(spicy) } }), onSuccess: onSaved })
  return <form className="menu-edit" onSubmit={e => { e.preventDefault(); save.mutate() }}><label>메뉴 이름<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label><label>가격<input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} /></label><label>매운 정도<select value={spicy} onChange={e => setSpicy(e.target.value)}>{[0, 1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}</select></label><button disabled={save.isPending}>메뉴 저장</button><ErrorMessage error={save.error} />{save.isSuccess && <p role="status">저장 및 번역이 완료되었습니다.</p>}</form>
}
export default function EditStore({ store }) {
  const qc = useQueryClient(), [values, setValues] = useState({ name: store.name_ko, address: store.address || '', hours: store.hours, story_ko: store.story_ko, payment: store.payment })
  const refresh = () => qc.invalidateQueries({ queryKey: [`/stores/${store.store_id}`] })
  const save = useMutation({ mutationFn: () => api(`/merchant/stores/${store.store_id}`, { method: 'PATCH', body: values }), onSuccess: refresh })
  return <section className="panel"><h2>가게·메뉴 정보 수정</h2><form onSubmit={e => { e.preventDefault(); save.mutate() }}>{[['name', '가게 이름', 100], ['address', '주소', 300], ['hours', '영업시간', 200], ['story_ko', '가게 이야기', 1000]].map(([key, label, max]) => <label key={key}>{label}<input required={key === 'name'} maxLength={max} value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} /></label>)}<fieldset><legend>결제 수단</legend>{Object.entries(paymentNames).map(([code, label]) => <label className="checkbox" key={code}><input type="checkbox" checked={values.payment.includes(code)} onChange={e => setValues(v => ({ ...v, payment: e.target.checked ? [...v.payment, code] : v.payment.filter(p => p !== code) }))} />{label}</label>)}</fieldset><button className="button" disabled={save.isPending}>정보 저장 · 번역 재생성</button><ErrorMessage error={save.error} />{save.isSuccess && <p role="status">가게 정보와 번역을 저장했습니다.</p>}</form><h3>메뉴 관리</h3>{store.menus.map(m => <EditMenu key={m.menu_id} menu={m} onSaved={refresh} />)}</section>
}
