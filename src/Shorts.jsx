import { useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api, mediaUrl } from './api'
import { Language, SubtitleSettings, useApi } from './data'
import { copy } from './locale'
import { designCopy } from './design-copy'
import { readIds, writeIds } from './local-history'
import { Empty, Money, State } from './shared'
import { LanguageSelect, NavIcon } from './Profile'

function Clip({ item }) {
  const lang = useContext(Language), t = copy[lang], d = designCopy[lang], subtitles = useContext(SubtitleSettings), video = useRef(null)
  const [paused, setPaused] = useState(true), [muted, setMuted] = useState(true), [failed, setFailed] = useState(false), [active, setActive] = useState(false)
  const [saved, setSaved] = useState(() => readIds('golmok-saved-videos').includes(item.video_id))
  const [liked, setLiked] = useState(() => readIds('golmok-liked-videos').includes(item.video_id))
  const [message, setMessage] = useState('')
  const store = item.store, detail = useApi(`/stores/${store.store_id}`, active)
  useEffect(() => {
    const player = video.current
    let visible = false
    function sync() { if (visible && !document.hidden) player.play().catch(() => {}); else player.pause() }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= .65; setActive(visible); sync() }, { threshold: .65 })
    observer.observe(player)
    document.addEventListener('visibilitychange', sync)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); player.pause() }
  }, [])
  useEffect(() => {
    const player = video.current
    function selectTrack() { for (const track of player.textTracks) track.mode = track.language === subtitles.lang ? 'showing' : 'disabled' }
    selectTrack(); player.addEventListener('loadedmetadata', selectTrack)
    return () => player.removeEventListener('loadedmetadata', selectTrack)
  }, [subtitles.lang])
  function toggle(key, value, setter) {
    writeIds(key, value ? readIds(key).filter(id => id !== item.video_id) : [item.video_id, ...readIds(key)].slice(0, 50))
    setter(!value)
  }
  async function share() {
    const url = new URL(`/videos/${item.video_id}`, location.origin).href
    try {
      if (navigator.share) await navigator.share({ title: store.name, url })
      else { await navigator.clipboard.writeText(url); setMessage(d.copied) }
    } catch (error) { if (error.name !== 'AbortError') setMessage(d.copyFailed) }
  }
  return <article className="short-slide" aria-label={store.name}>
    <video ref={video} className="short-video" src={mediaUrl(item.video_url)} poster={mediaUrl(item.thumbnail_url)} playsInline loop muted={muted} preload="metadata" crossOrigin="anonymous" onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onError={() => setFailed(true)}>
      {Object.entries(item.subtitles || {}).map(([code, url]) => <track key={code} kind="subtitles" src={mediaUrl(url)} srcLang={code} label={{ en: 'English', ko: '한국어', zh: '中文' }[code] || code} default={code === subtitles.lang}/>)}
    </video><div className="short-shade"/>
    {failed ? <p className="short-video-error" role="status">{t.videoError}</p> : <button className={`short-play ${paused ? 'is-paused' : ''}`} aria-label={paused ? t.play : t.pause} onClick={() => paused ? video.current.play().catch(() => {}) : video.current.pause()}>{paused ? '▷' : 'Ⅱ'}</button>}
    <button className="short-audio" aria-label={muted ? t.unmute : t.mute} onClick={() => setMuted(v => !v)}>{muted ? '♫ ×' : '♫'}</button>
    <div className="short-tools"><button aria-label={liked ? d.liked : d.like} aria-pressed={liked} onClick={() => toggle('golmok-liked-videos', liked, setLiked)}><NavIcon type="like"/></button><button aria-label={saved ? d.saved : d.save} aria-pressed={saved} onClick={() => toggle('golmok-saved-videos', saved, setSaved)}><NavIcon type="save"/><span>{saved ? d.saved : d.save}</span></button><button onClick={share}><NavIcon type="share"/><span>{d.share}</span></button></div>
    {message && <p className="share-message" role="status">{message}</p>}
    <div className="short-caption"><h2>{store.name} · {store.market}</h2><p>{detail.data?.story || store.top_menu?.name}</p>{item.subtitles?.[subtitles.lang] && <span className="subtitle-badge">{subtitles.lang.toUpperCase()} · {d.subtitle}</span>}</div>
    <div className="short-shop"><div className="short-shop-info"><div className="shop-thumbnail">{item.thumbnail_url ? <img src={mediaUrl(item.thumbnail_url)} alt=""/> : <NavIcon type="map"/>}</div><div><h3>{store.name}</h3><span>⌖ {store.market}</span><div className="shop-facts">{store.payment.slice(0, 2).map(p => <span key={p}>{d[p] || p}</span>)}{store.top_menu && <span>{store.top_menu.spicy_level === 0 ? t.mild : `${d.spicy} ${store.top_menu.spicy_level}`}</span>}<span><Money value={store.top_menu?.price}/></span></div></div></div><div className="short-shop-actions"><Link className="shop-order" to={`/stores/${store.store_id}#menu`}>{d.menuOrder}</Link><a className="shop-visit" href={mediaUrl(store.directions_url)} target="_blank" rel="noreferrer">{d.directions}</a></div></div>
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
  return <div className="shorts-page"><div className="shorts-topbar"><span className="for-you">{t.forYou}</span><Link to="/markets">{designCopy[lang].near}</Link><LanguageSelect/></div>{!q.data ? <State query={q}/> : <div className="shorts-scroller" aria-label={t.feed}>{items.map(item => <Clip key={item.video_id} item={item}/>)}{!items.length && <Empty/>}{hasNextPage && <div ref={more} className="feed-more"><button disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>{isFetchingNextPage ? t.loading : isFetchNextPageError ? t.retry : t.more}</button></div>}</div>}</div>
}


