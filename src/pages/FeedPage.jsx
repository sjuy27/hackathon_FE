import { useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api, mediaUrl } from '../api'
import { Language } from '../data'
import { copy } from '../locale'
import { designCopy } from '../design-copy'
import { readIds, writeIds } from '../local-history'
import { Empty, State } from '../shared'
import { LanguageSelect, NavIcon } from '../Profile'
import StorePreviewCard from '../components/StorePreviewCard'

function Clip({ item }) {
  const lang = useContext(Language), t = copy[lang], d = designCopy[lang], video = useRef(null)
  const [paused, setPaused] = useState(true), [failed, setFailed] = useState(false)
  const [liked, setLiked] = useState(() => readIds('golmok-liked-videos').includes(item.video_id))
  const [message, setMessage] = useState('')
  const store = item.store
  useEffect(() => {
    const player = video.current
    let visible = false
    function sync() { if (visible && !document.hidden) player.play().catch(() => {}); else player.pause() }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= .65; sync() }, { threshold: .65 })
    observer.observe(player)
    document.addEventListener('visibilitychange', sync)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); player.pause() }
  }, [])
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
    <video ref={video} className="short-video" src={mediaUrl(item.video_urls?.[lang] || item.video_url)} poster={mediaUrl(item.thumbnail_url)} playsInline loop muted preload="metadata" crossOrigin="anonymous" onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onError={() => setFailed(true)}>
    </video><div className="short-shade"/>
    {!failed && <button className={`short-play ${paused ? 'is-paused' : ''}`} aria-label={paused ? t.play : t.pause} onClick={() => paused ? video.current.play().catch(() => {}) : video.current.pause()}>{paused ? '▷' : 'Ⅱ'}</button>}
    <div className="short-tools"><button aria-label={liked ? d.liked : d.like} aria-pressed={liked} onClick={() => toggle('golmok-liked-videos', liked, setLiked)}><NavIcon type="like"/></button><button onClick={share} aria-label={d.share}><NavIcon type="share"/></button></div>
    <StorePreviewCard item={item} message={failed ? t.videoError : message}/>
  </article>
}
export default function FeedPage() {
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
