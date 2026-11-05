import { useContext, useState } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mediaUrl } from './api'
import { Empty, Money, State, VideoPlayer } from './shared'
import { Language, LanguageSettings, SubtitleSettings, useApi } from './data'
import { Merchant } from './Merchant'
import LoginPage, { MerchantLoginPage } from './pages/LoginPage'
import { readRole } from './auth'
import FeedPage from './pages/FeedPage'
import Profile, { LanguageSelect, NavIcon } from './Profile'
import PagePosition from './PagePosition'
import { copy } from './locale'
import ContentsFeedPage from './pages/ContentsFeedPage'
import StoreMenuPage from './pages/StoreMenuPage'
import OrderPreviewPage from './pages/OrderPreviewPage'
import MarketFeedPage from './pages/MarketFeedPage'
import MarketMenuFeedPage from './pages/MarketMenuFeedPage'
import useHostPreferences from './components/host/use-host-preferences'

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } })
function StoreCard({ store, index = 0 }) {
  return <Link className="market-card" to={`/stores/${store.store_id}`}><div className={`food-art art-${index % 4}`}>{store.thumbnail_url ? <img src={mediaUrl(store.thumbnail_url)} alt="" loading="lazy" /> : <NavIcon type="store"/>}<small>LOCAL FLAVOR</small></div><div className="card-body"><span className="eyebrow">{store.market || 'MARKET PICK'}</span><h3>{store.name} <span className="arrow">↗</span></h3><p>{store.top_menu?.name}</p><strong><Money value={store.top_menu?.price ?? store.price_range?.min} /></strong></div></Link>
}
function VideoPage() {
  const u = copy[useContext(Language)]
  const { id } = useParams(), q = useApi(`/videos/${id}`)
  return <State query={q}>{q.data && <div className="narrow"><VideoPlayer video={q.data} /><h1>{q.data.menu?.name || u.feed}</h1><Link className="button" to={`/stores/${q.data.store_id}`}>{u.visit} ↗</Link></div>}</State>
}
function Content() {
  const u = copy[useContext(Language)]
  const { id } = useParams(), q = useApi(`/contents/${id}/foods`)
  return <State query={q}>{q.data && <><div className="page-heading"><span className="eyebrow">TASTE THE SCENE</span><h1>{q.data.title}</h1></div>{q.data.foods.map((f, i) => <section key={i}><h2>{f.name || f.food_ko}</h2><div className="market-grid">{f.stores?.map((s, j) => <StoreCard key={s.store_id} store={s} index={j} />)}</div>{!f.stores?.length && <div className="notice"><p>{u.similar}</p>{f.similar?.map((s, j) => <div key={j}><h3>{s.name || s.food_ko}</h3><div className="market-grid">{s.store_id ? <StoreCard store={s} /> : s.stores?.map(store => <StoreCard key={store.store_id} store={store} />)}</div></div>)}</div>}</section>)}</>}</State>
}

function Shell() {
  const { largeText } = useHostPreferences()
  const [lang, setLang] = useState(() => {
    try { const saved = localStorage.getItem('market-lang'); if (['en', 'ko', 'zh'].includes(saved)) return saved } catch { /* Storage is optional. */ }
    // 고른 적이 없으면 브라우저 언어를 따르고, 지원하지 않는 언어면 영어
    const browser = (navigator.languages?.[0] || navigator.language || '').slice(0, 2).toLowerCase()
    return ['en', 'ko', 'zh'].includes(browser) ? browser : 'en'
  })
  const [subtitleChoice, setSubtitleChoice] = useState(() => {
    try { const saved = localStorage.getItem('golmok-subtitle-lang'); return ['en', 'ko', 'zh'].includes(saved) ? saved : 'auto' } catch { return 'auto' }
  })
  function changeSubtitles(next) {
    if (!['auto', 'en', 'ko', 'zh'].includes(next)) return
    setSubtitleChoice(next)
    try { localStorage.setItem('golmok-subtitle-lang', next) } catch { /* Optional preference. */ }
  }
  const location = useLocation()
  // 사장님 화면(/merchant/...)은 손님이 고른 언어와 상관없이 항상 한국어로 보여준다.
  const isMerchant = location.pathname.startsWith('/merchant')
  const isLogin = ['/login', '/merchant/login'].includes(location.pathname)
  const viewLang = isMerchant ? 'ko' : lang, t = copy[viewLang]
  const customHeader = ['/contents', '/profile'].includes(location.pathname) || isLogin
  const storeRoute = /^\/stores\/[^/]+(?:\/order)?$/.test(location.pathname)
  const designRoute = (isMerchant && !isLogin) || location.pathname === '/contents' || /^\/markets(?:\/[^/]+)?$/.test(location.pathname) || storeRoute
  const isFeed = location.pathname === '/' || location.pathname === '/shorts'
  function changeLanguage(next) {
    if (!['en', 'ko', 'zh'].includes(next)) return
    setLang(next)
    try { localStorage.setItem('market-lang', next) } catch { /* Storage is optional. */ }
  }
  return <Language.Provider value={viewLang}><LanguageSettings.Provider value={changeLanguage}>
    <SubtitleSettings.Provider value={{ lang: isMerchant ? 'ko' : subtitleChoice === 'auto' ? lang : subtitleChoice, choice: subtitleChoice, setChoice: changeSubtitles }}><PagePosition/>
    {!designRoute && !isFeed && !customHeader && <header><Link className="brand" to="/"><span className="brand-icon">◒</span> 골목</Link><div className="header-tools">{isMerchant ? <span className="merchant-badge">사장님 모드</span> : <LanguageSelect/>}</div></header>}
    <main className={`${designRoute ? 'design-route' : isFeed ? 'feed-main' : isLogin ? 'login-main' : customHeader ? 'designed-main' : ''}${isMerchant && largeText ? ' host-large-text' : ''}`} key={location.pathname + lang}><Routes>
      <Route path="/" element={readRole() ? <FeedPage/> : <Navigate to="/login" replace/>}/><Route path="/shorts" element={<FeedPage/>}/>
      <Route path="/markets" element={<MarketFeedPage/>}/><Route path="/markets/:id" element={<MarketMenuFeedPage/>}/>
      <Route path="/stores/:id" element={<StoreMenuPage/>}/><Route path="/stores/:id/order" element={<OrderPreviewPage/>}/><Route path="/videos/:id" element={<VideoPage/>}/>
      <Route path="/contents" element={<ContentsFeedPage/>}/><Route path="/contents/:id" element={<Content/>}/>
      <Route path="/host" element={<Navigate to="/merchant" replace/>}/><Route path="/profile" element={<Profile/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/merchant/login" element={<MerchantLoginPage/>}/><Route path="/merchant/*" element={<Merchant/>}/>
      <Route path="*" element={<div className="state"><h1>{t.notFound}</h1><Link to="/">{t.home}</Link></div>}/>
    </Routes></main>
    {!designRoute && !isFeed && !customHeader && <footer><Link className="brand" to="/">◒ 골목</Link><p>{t.footer}</p><span>© 2026 GOLMOK</span></footer>}
    {isLogin || storeRoute ? null : isMerchant ? (!['/merchant/register','/merchant/review','/merchant/video'].includes(location.pathname) && <nav className={`mobile-nav host-navigation${largeText ? ' host-large-text' : ''}`} aria-label="사장님 메뉴">
      <NavLink to="/merchant" end><NavIcon type="home"/><span>홈</span></NavLink>
      <NavLink to="/merchant/edit"><NavIcon type="store"/><span>가게 정보</span></NavLink>
      <NavLink to="/merchant/stats"><NavIcon type="stats"/><span>통계</span></NavLink>
      <NavLink to="/merchant/profile"><NavIcon type="profile"/><span>마이페이지</span></NavLink>
    </nav>) : <nav className="mobile-nav" aria-label={t.map}>
      <NavLink to="/" end className={({ isActive }) => isActive || location.pathname === '/shorts' ? 'active' : ''}><NavIcon type="feed"/><span>{t.feed}</span></NavLink>
      <NavLink to="/contents"><NavIcon type="contents"/><span>{t.contents}</span></NavLink>
      <NavLink to="/markets"><NavIcon type="map"/><span>{t.map}</span></NavLink>
      <NavLink to="/profile"><NavIcon type="profile"/><span>{t.profile}</span></NavLink>
    </nav>}
  </SubtitleSettings.Provider></LanguageSettings.Provider></Language.Provider>
}
export default function App() { return <QueryClientProvider client={client}><BrowserRouter><Shell /></BrowserRouter></QueryClientProvider> }


