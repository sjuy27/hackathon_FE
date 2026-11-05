import { useContext, useEffect, useState } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import { api, mediaUrl } from './api'
import { Empty, ErrorMessage, Money, State, VideoPlayer } from './shared'
import { Language, LanguageSettings, SubtitleSettings, text, useApi } from './data'
import { Merchant } from './Merchant'
import MarketMap from './MarketMap'
import Dialog from './Dialog'
import Shorts from './Shorts'
import Profile, { LanguageSelect, NavIcon } from './Profile'
import PagePosition from './PagePosition'
import { copy } from './locale'
import Contents from './Contents'
import { rememberShop } from './local-history'

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } })
function StoreCard({ store, index = 0 }) {
  return <Link className="market-card" to={`/stores/${store.store_id}`}><div className={`food-art art-${index % 4}`}>{store.thumbnail_url ? <img src={mediaUrl(store.thumbnail_url)} alt="" loading="lazy" /> : <span>{['🍜', '🥟', '🍢', '🥬'][index % 4]}</span>}<small>LOCAL FLAVOR</small></div><div className="card-body"><span className="eyebrow">{store.market || 'MARKET PICK'}</span><h3>{store.name} <span className="arrow">↗</span></h3><p>{store.top_menu?.name}</p><strong><Money value={store.top_menu?.price ?? store.price_range?.min} /></strong></div></Link>
}
function Explore() {
  const u = copy[useContext(Language)]
  const lang = useContext(Language), t = text[lang], markets = useApi('/markets')
  const [search, setSearch] = useState('')
  const filtered = markets.data?.filter(m => `${m.name} ${m.name_ko} ${m.address}`.toLowerCase().includes(search.toLowerCase()))
  return <><section className="hero"><div className="hero-copy"><span className="eyebrow">A LITTLE ADVENTURE, A LOCAL MARKET</span><h1>{t[4]}</h1><p>{t[5]}</p><Link className="button light" to="/shorts">{t[1]} ↗</Link></div><div className="hero-art" aria-hidden="true"><div className="awning"/><div className="shop-sign">{u.map}</div><div className="bowl">🍜</div><span className="stamp">FRESH<br/>LOCAL<br/>STORIES</span><p>{u.footer}</p></div></section><div className="section-title"><div><span className="eyebrow">EXPLORE THE NEIGHBORHOOD</span><h2>{t[6]}</h2></div><span className="round-icon">↘</span></div><label className="search">⌕ <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t[7]} aria-label={t[7]} /></label><State query={markets}><div className="market-grid">{filtered?.map((m, i) => <Link className="market-card" to={`/markets/${m.market_id}`} key={m.market_id}><div className={`market-visual art-${i % 4}`}><span className="market-number">0{i + 1}</span><span className="market-illustration" aria-hidden="true">{['🏘️', '🌿', '🏮', '🧺'][i % 4]}</span><span className="market-pill">{m.store_count} {t[8]}</span></div><div className="card-body"><h3>{m.name}<span className="arrow">↗</span></h3><p>{m.address}</p><div className="tags"><span>{m.open_cycle}</span>{m.has_parking && <span>{u.parking}</span>}{m.has_toilet && <span>{u.toilet}</span>}{m.vouchers.map(v => <span key={v}>{v}</span>)}</div></div></Link>)}</div>{!filtered?.length && <Empty />}</State></>
}
function Market() {
  const u = copy[useContext(Language)]
  const { id } = useParams(), q = useApi(`/markets/${id}/stores`)
  return <State query={q}>{q.data && <><Link className="back" to="/markets">← {u.allMarkets}</Link><div className="page-heading"><span className="eyebrow">YOUR NEXT LOCAL ADVENTURE</span><h1>{q.data.market.name}</h1><p>{q.data.market.address} · {q.data.market.open_cycle}</p></div><MarketMap market={q.data.market} stores={q.data.stores} /><h2>{u.visit}</h2><div className="market-grid">{q.data.stores.map((s, i) => <StoreCard key={s.store_id} store={s} index={i} />)}</div>{!q.data.stores.length && <Empty />}</>}</State>
}
function VideoPage() {
  const u = copy[useContext(Language)]
  const { id } = useParams(), q = useApi(`/videos/${id}`)
  return <State query={q}>{q.data && <div className="narrow"><VideoPlayer video={q.data} /><h1>{q.data.menu?.name || u.feed}</h1><Link className="button" to={`/stores/${q.data.store_id}`}>{u.visit} ↗</Link></div>}</State>
}
function Store() {
  const u = copy[useContext(Language)]
  const { id } = useParams(), lang = useContext(Language), t = text[lang], q = useApi(`/stores/${id}`)
  useEffect(() => { if (q.data) rememberShop(q.data.store_id) }, [q.data])
  const [cart, setCart] = useState({}), [order, setOrder] = useState(null)
  const preview = useMutation({ mutationFn: () => api('/orders/preview', { method: 'POST', body: { store_id: Number(id), lang, items: Object.entries(cart).filter(([, qty]) => qty > 0).map(([menu_id, qty]) => ({ menu_id: Number(menu_id), qty })) } }), onSuccess: setOrder })
  const count = Object.values(cart).reduce((a, b) => a + b, 0)
  function change(menuId, delta) { setCart(c => ({ ...c, [menuId]: Math.max(0, Math.min(50, (c[menuId] || 0) + delta)) })); setOrder(null) }
  return <State query={q}>{q.data && <><div className="store-heading"><div><span className="eyebrow">{q.data.market.name}</span><h1>{q.data.name}</h1><p>{q.data.address}</p><p>{q.data.hours}</p><div className="tags">{q.data.payment.map(p => <span key={p}>{p}</span>)}</div></div><a className="button outline" href={mediaUrl(q.data.directions_url)} target="_blank" rel="noreferrer">⌖ {t[12]} ↗</a></div><div className="store-layout"><div><section className="story"><span className="eyebrow">FROM THE MERCHANT</span><h2>{u.story}</h2><p>{q.data.story || q.data.story_ko}</p></section>{q.data.videos.map(v => <div className="store-video" key={v.video_id}><VideoPlayer video={v} /></div>)}</div><section className="menu-panel" id="menu"><h2>{t[9]} <span className="small">{q.data.menus.length}</span></h2>{q.data.menus.map(m => <article className="menu-row" key={m.menu_id}><div><h3>{m.name}</h3>{lang !== 'ko' && <p>{m.name_ko}</p>}<p>{m.description}</p>{m.how_to_eat && <details><summary>{u.how}</summary><p>{m.how_to_eat}</p></details>}<div className="tags"><span>{'🌶'.repeat(m.spicy_level) || u.mild}</span>{m.is_ai_guess && <span>{u.ai}</span>}</div><strong><Money value={m.price} /></strong></div><div className="stepper"><button aria-label={`${m.name} -1`} disabled={!cart[m.menu_id]} onClick={() => change(m.menu_id, -1)}>−</button><output>{cart[m.menu_id] || 0}</output><button aria-label={`${m.name} +1`} disabled={cart[m.menu_id] >= 50} onClick={() => change(m.menu_id, 1)}>+</button></div></article>)}{!q.data.menus.length && <Empty />}<ErrorMessage error={preview.error} /><button className="button full" disabled={!count || preview.isPending} onClick={() => preview.mutate()}>{preview.isPending ? u.loading : `${t[10]} · ${count}`} →</button><p className="small">{u.orderNote}</p></section></div>{order && <Dialog label={t[11]} onClose={() => setOrder(null)}><button className="close" onClick={() => setOrder(null)} autoFocus aria-label={u.close}>×</button><span className="eyebrow">ORDER CARD</span><p>{t[11]}</p><h2>{order.ko_message}</h2>{order.ko_lines.map((line, i) => <div className="order-line" key={i}><strong>{line}</strong><p>{order.translated_lines[i]}</p></div>)}<div className="total">{u.total}<strong><Money value={order.total_price} /></strong></div><button className="button full" onClick={() => setOrder(null)}>{u.ok}</button></Dialog>}</>}</State>
}
function Content() {
  const u = copy[useContext(Language)]
  const { id } = useParams(), q = useApi(`/contents/${id}/foods`)
  return <State query={q}>{q.data && <><div className="page-heading"><span className="eyebrow">TASTE THE SCENE</span><h1>{q.data.title}</h1></div>{q.data.foods.map((f, i) => <section key={i}><h2>{f.name || f.food_ko}</h2><div className="market-grid">{f.stores?.map((s, j) => <StoreCard key={s.store_id} store={s} index={j} />)}</div>{!f.stores?.length && <div className="notice"><p>{u.similar}</p>{f.similar?.map((s, j) => <div key={j}><h3>{s.name || s.food_ko}</h3><div className="market-grid">{s.store_id ? <StoreCard store={s} /> : s.stores?.map(store => <StoreCard key={store.store_id} store={store} />)}</div></div>)}</div>}</section>)}</>}</State>
}

function Shell() {
  const [lang, setLang] = useState(() => {
    try { const saved = localStorage.getItem('market-lang'); return ['en', 'ko', 'zh'].includes(saved) ? saved : 'en' } catch { return 'en' }
  })
  const [subtitleChoice, setSubtitleChoice] = useState(() => {
    try { const saved = localStorage.getItem('golmok-subtitle-lang'); return ['en', 'ko', 'zh'].includes(saved) ? saved : 'auto' } catch { return 'auto' }
  })
  function changeSubtitles(next) {
    if (!['auto', 'en', 'ko', 'zh'].includes(next)) return
    setSubtitleChoice(next)
    try { localStorage.setItem('golmok-subtitle-lang', next) } catch { /* Optional preference. */ }
  }
  const location = useLocation(), t = copy[lang]
  const customHeader = ['/contents', '/profile'].includes(location.pathname)
  const isFeed = location.pathname === '/' || location.pathname === '/shorts'
  function changeLanguage(next) {
    if (!['en', 'ko', 'zh'].includes(next)) return
    setLang(next)
    try { localStorage.setItem('market-lang', next) } catch { /* Storage is optional. */ }
  }
  return <Language.Provider value={lang}><LanguageSettings.Provider value={changeLanguage}>
    <SubtitleSettings.Provider value={{ lang: subtitleChoice === 'auto' ? lang : subtitleChoice, choice: subtitleChoice, setChoice: changeSubtitles }}><PagePosition/>
    {!isFeed && !customHeader && <header><Link className="brand" to="/"><span className="brand-icon">◒</span> 골목</Link><div className="header-tools"><LanguageSelect/></div></header>}
    <main className={isFeed ? 'feed-main' : customHeader ? 'designed-main' : ''} key={location.pathname + lang}><Routes>
      <Route path="/" element={<Shorts/>}/><Route path="/shorts" element={<Shorts/>}/>
      <Route path="/markets" element={<Explore/>}/><Route path="/markets/:id" element={<Market/>}/>
      <Route path="/stores/:id" element={<Store/>}/><Route path="/videos/:id" element={<VideoPage/>}/>
      <Route path="/contents" element={<Contents/>}/><Route path="/contents/:id" element={<Content/>}/>
      <Route path="/profile" element={<Profile/>}/><Route path="/merchant/*" element={<Merchant/>}/>
      <Route path="*" element={<div className="state"><h1>{t.notFound}</h1><Link to="/">{t.home}</Link></div>}/>
    </Routes></main>
    {!isFeed && !customHeader && <footer><Link className="brand" to="/">◒ 골목</Link><p>{t.footer}</p><span>© 2026 GOLMOK</span></footer>}
    <nav className="mobile-nav" aria-label={t.map}>
      <NavLink to="/" end className={({ isActive }) => isActive || location.pathname === '/shorts' ? 'active' : ''}><NavIcon type="feed"/><span>{t.feed}</span></NavLink>
      <NavLink to="/contents"><NavIcon type="contents"/><span>{t.contents}</span></NavLink>
      <NavLink to="/markets"><NavIcon type="map"/><span>{t.map}</span></NavLink>
      <NavLink to="/profile"><NavIcon type="profile"/><span>{t.profile}</span></NavLink>
    </nav>
  </SubtitleSettings.Provider></LanguageSettings.Provider></Language.Provider>
}
export default function App() { return <QueryClientProvider client={client}><BrowserRouter><Shell /></BrowserRouter></QueryClientProvider> }


