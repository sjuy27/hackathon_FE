import { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Language, useApi } from '../data'
import { copy } from '../locale'
import { Empty, State } from '../shared'
import { mediaUrl } from '../api'
import { rememberShop } from '../local-history'
import { NavIcon } from '../Profile'
import { Button, PageHeader } from '../components/MobileUI'
import MenuSelectCard from '../components/MenuSelectCard'
import SelectionBar from '../components/SelectionBar'

export default function StoreMenuPage() {
  const { id } = useParams(), lang = useContext(Language), t = copy[lang], q = useApi(`/stores/${id}`)
  const [selected, setSelected] = useState([])
  useEffect(() => { if (q.data) rememberShop(q.data.store_id) }, [q.data])
  const items = q.data?.menus.filter(menu => selected.includes(menu.menu_id)) || []
  const total = items.every(menu => menu.price != null) ? items.reduce((sum, menu) => sum + menu.price, 0) : null
  const orderPath = `/stores/${id}/order?items=${items.map(menu => `${menu.menu_id}:1`).join(',')}`
  return <div className="mobile-page store-menu-page"><PageHeader title={q.data?.name || t.visit} back="/shorts"/><State query={q}>{q.data && <>
    <p className="store-location"><NavIcon type="map"/>{q.data.address || q.data.market.name}</p>
    <section id="menu"><h2>{lang === 'ko' ? '메뉴' : lang === 'zh' ? '菜单' : 'Menu'}</h2><div className="menu-selection-list">{q.data.menus.map(menu => <MenuSelectCard key={menu.menu_id} menu={menu} selected={selected.includes(menu.menu_id)} onChange={checked => setSelected(previous => checked ? [...previous,menu.menu_id] : previous.filter(value => value !== menu.menu_id))}/>)}</div>{!q.data.menus.length && <Empty/>}</section>
    <section className="store-market-map"><h2>{lang === 'ko' ? '시장 지도' : lang === 'zh' ? '市场地图' : 'Market map'}</h2><div><NavIcon type="map"/><p><strong>{q.data.market.name}</strong><small>{q.data.address}</small></p><a href={mediaUrl(q.data.directions_url)} target="_blank" rel="noreferrer">{lang === 'ko' ? '지도 보기' : 'View map'} ↗</a></div></section>
    <SelectionBar items={items} total={total}>{items.length ? <Button className="store-order-action" primary to={orderPath}>{lang === 'ko' ? '한국어 주문 보여주기' : lang === 'zh' ? '显示韩语点餐卡' : 'Show order in Korean'}</Button> : <Button className="store-order-action" primary disabled aria-disabled="true">{t.order}</Button>}</SelectionBar>
  </>}</State></div>
}
