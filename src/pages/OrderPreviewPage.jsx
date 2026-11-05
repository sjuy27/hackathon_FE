import { menuImage, menuPhoto } from '../menu-photos'
import { useContext, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Language, useApi } from '../data'
import { api } from '../api'
import { Empty, Money, State } from '../shared'
import { copy } from '../locale'
import { Button, MediaSlot, PageHeader } from '../components/MobileUI'
import SelectionBar from '../components/SelectionBar'
import { mobileCopy } from '../components/mobile-copy'

function parseItems(params) {
  const values = params.get('items') || `${params.get('menu') || ''}:${params.get('qty') || 1}`
  return Object.fromEntries(values.split(',').map(value => value.split(':').map(Number)).filter(([id,qty]) => Number.isSafeInteger(id) && id > 0 && Number.isSafeInteger(qty) && qty > 0).map(([id,qty]) => [id,Math.min(qty,50)]))
}
export default function OrderPreviewPage() {
  const { id } = useParams(), [params] = useSearchParams(), lang = useContext(Language), t = mobileCopy[lang], q = useApi(`/stores/${id}`)
  const [quantities, setQuantities] = useState(() => parseItems(params)), [confirmed, setConfirmed] = useState(false)
  const items = q.data?.menus.filter(menu => quantities[menu.menu_id] > 0) || []
  const requestItems = items.map(menu => ({ menu_id: menu.menu_id, qty: quantities[menu.menu_id] }))
  const preview = useQuery({ queryKey: ['order-preview',id,lang,requestItems], enabled: !!items.length, retry: 1, queryFn: ({ signal }) => api('/orders/preview', { method: 'POST', body: { store_id: Number(id), lang, items: requestItems }, signal }) })
  const total = items.every(menu => menu.price != null) ? items.reduce((sum,menu) => sum + menu.price * quantities[menu.menu_id],0) : null
  function change(menuId, delta) { setConfirmed(false); setQuantities(previous => ({ ...previous, [menuId]: Math.max(1,Math.min(50,previous[menuId] + delta)) })) }
  return <div className="mobile-page order-preview-page"><PageHeader title={q.data?.name || t.menu} back={`/stores/${id}`}/><State query={q}>{q.data && <>
    <p className="store-location">{q.data.address || q.data.market.name}</p><h2>{t.menu}</h2>
    {items.map(menu => <section className="order-menu-section" key={menu.menu_id}><div className="order-menu-identity"><MediaSlot src={menuImage(menu)} fallback={menuPhoto(menu)} alt={menu.name}/><div><strong>{menu.name_ko} · {menu.name}</strong><p><Money value={menu.price}/> / {lang === 'ko' ? '1인분' : 'serving'}</p></div></div>{menu.how_to_eat && <div className="order-how"><h3>{t.how}{menu.is_ai_guess && <small>{copy[lang].ai}</small>}</h3><p>{menu.how_to_eat}</p></div>}<div className="order-quantity"><strong>{t.servings}</strong><div className="order-stepper"><button disabled={quantities[menu.menu_id] <= 1} aria-label={`${menu.name} -1`} onClick={() => change(menu.menu_id,-1)}>−</button><output aria-live="polite">{quantities[menu.menu_id]}</output><button disabled={quantities[menu.menu_id] >= 50} aria-label={`${menu.name} +1`} onClick={() => change(menu.menu_id,1)}>+</button></div></div></section>)}
    {!items.length ? <><Empty/><Button to={`/stores/${id}`}>{t.back}</Button></> : <>
      <State query={preview}>{preview.data && <article className="order-preview-card" aria-live="polite"><span>{t.merchant}</span><h2 lang="ko">{preview.data.ko_message}</h2>{preview.data.translated_lines.map((line,index) => <p key={index}>{line}</p>)}<div className="order-item-tags">{items.map(menu => <small key={menu.menu_id} lang="ko">{menu.name_ko} {quantities[menu.menu_id]}개 · <Money value={menu.price == null ? null : menu.price * quantities[menu.menu_id]}/></small>)}</div></article>}</State>
      <section className="pay-at-shop"><h2>{t.pay}</h2><p>{t.payNote}</p><div><span>Payment · Owner-confirmed</span><span>{q.data.payment.map(method => ({cash:'Cash',card:'Card',foreign_card:'International card',onnuri:'Onnuri'})[method] || method).join(' / ')}</span></div></section>
      <Button className="order-back-button" to={`/stores/${id}`}>{t.back}</Button>
      {confirmed && <p className="order-ready" role="status">{t.ready}</p>}
      <SelectionBar items={items} total={preview.data?.total_price ?? total}><Button to={`/stores/${id}`}>{t.back}</Button><Button primary disabled={preview.isPending || preview.isError || preview.isFetching} onClick={() => setConfirmed(true)}>{confirmed ? t.ready : t.confirm}</Button></SelectionBar>
    </>}
  </>}</State></div>
}
