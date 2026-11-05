import { useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api, mediaUrl } from './api'
import { Language } from './data'
import { copy } from './locale'
import { Empty, Money, State } from './shared'
import { LanguageSelect, NavIcon } from './Profile'

function Clip({ item }) {
  const lang = useContext(Language), t = copy[lang], video = useRef(null)
  const [paused, setPaused] = useState(true), [muted, setMuted] = useState(true), [failed, setFailed] = useState(false)
  useEffect(() => {
    const player = video.current
    let visible = false
    function sync() {
      if (visible && !document.hidden) player.play().catch(() => {})
      else player.pause()
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= .65; sync() }, { threshold: .65 })
    observer.observe(player)
    document.addEventListener('visibilitychange', sync)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); player.pause() }
  }, [])
  const store = item.store
  return <article className="short-slide" aria-label={store.name}>
    <video ref={video} className="short-video" src={mediaUrl(item.video_url)} poster={mediaUrl(item.thumbnail_url)} playsInline loop muted={muted} preload="metadata" crossOrigin="anonymous" onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onError={() => setFailed(true)}>
      {Object.entries(item.subtitles || {}).map(([code, url]) => <track key={code} kind="subtitles" src={mediaUrl(url)} srcLang={code} label={{ en: 'English', ko: '한국어', zh: '中文' }[code] || code} default={code === lang}/>)}
    </video>
    <div className="short-shade"/>
    {failed ? <p className="short-video-error" role="status">{t.videoError}</p> : <button className={`short-play ${paused ? 'is-paused' : ''}`} aria-label={paused ? t.play : t.pause} onClick={() => paused ? video.current.play().catch(() => {}) : video.current.pause()}>{paused ? '▶' : 'Ⅱ'}</button>}
    <div className="short-tools"><button aria-label={muted ? t.unmute : t.mute} onClick={() => setMuted(m => !m)}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/>{muted ? <path d="m16 9 5 6m0-6-5 6"/> : <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>}</svg></button><Link aria-label={t.details} to={`/videos/${item.video_id}`}><NavIcon type="feed"/></Link></div>
    <div className="short-caption"><h2>{store.top_menu?.name || store.name}</h2><p>{store.market} · {store.name}</p></div>
    <div className="short-shop"><div className="short-shop-info"><div className="shop-thumbnail">{item.thumbnail_url ? <img src={mediaUrl(item.thumbnail_url)} alt=""/> : <NavIcon type="map"/>}</div><div><h3>{store.name}</h3><p><Money value={store.top_menu?.price}/>{store.top_menu && ` · ${store.top_menu.name}`}</p><span>⌖ {store.market}</span></div></div><div className="short-shop-actions"><Link className="shop-visit" to={`/stores/${store.store_id}`}>{t.visit}</Link><Link className="shop-order" to={`/stores/${store.store_id}#menu`}>{t.order}</Link></div></div>
  </article>
}

export default function Shorts() {
  const lang = useContext(Language), t = copy[lang], more = useRef(null)
  const q = useInfiniteQuery({ queryKey: ['feed', lang], queryFn: ({ pageParam, signal }) => api(`/feed?lang=${lang}${pageParam == null ? '' : `&cursor=${pageParam}`}`, { signal }), initialPageParam: null, getNextPageParam: last => last.next_cursor ?? undefined })
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = q
  useEffect(() => {
    if (!more.current || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) fetchNextPage() }, { rootMargin: '100px' })
    observer.observe(more.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])
  const items = q.data?.pages.flatMap(p => p.items) || []
  return <div className="shorts-page"><div className="shorts-topbar"><span className="for-you">{t.forYou}</span><Link to="/markets">{t.nearMe}</Link><LanguageSelect/></div>{!q.data ? <State query={q}/> : <div className="shorts-scroller" aria-label={t.feed}>{items.map(item => <Clip key={item.video_id} item={item}/>)}{!items.length && <Empty/>}{hasNextPage && <div ref={more} className="feed-more"><button disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>{isFetchingNextPage ? t.loading : isFetchNextPageError ? t.retry : t.more}</button></div>}</div>}</div>
}

