import { paymentNames, needsCheckText } from './host-model'

export function StepFields({ step, value, onChange }) {
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
export function NeedsCheck({ items, step }) {
  return items?.length ? <ul className="needs-check">{items.map((n, i) => <li key={i}><span className="check-badge">확인 필요</span>{needsCheckText(n, step)}</li>)}</ul> : null
}
