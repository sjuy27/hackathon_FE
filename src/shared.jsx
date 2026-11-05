import { useContext } from 'react'
import { mediaUrl } from './api'
import { Language } from './data'
export function Money({ value }) { return <>{value == null ? '가격 문의 · Ask for price' : `₩${value.toLocaleString()}`}</> }
export function ErrorMessage({ error }) { return error ? <p className="notice error" role="alert">{error.message}</p> : null }
export function State({ query, children }) {
  if (query.isPending) return <div className="state" role="status">불러오는 중 · Loading…</div>
  if (query.isError) return <div className="state error" role="alert"><p>{query.error.message}</p><button onClick={() => query.refetch()}>다시 시도 · Retry</button></div>
  return children
}
export function Empty() { return <p className="state">아직 등록된 정보가 없어요. · Nothing here yet.</p> }
export function VideoPlayer({ video }) {
  const lang = useContext(Language)
  return <video controls playsInline preload="metadata" poster={mediaUrl(video.thumbnail_url)} src={mediaUrl(video.video_url)} crossOrigin="anonymous">{Object.entries(video.subtitles || {}).map(([code, url]) => <track key={code} kind="subtitles" src={mediaUrl(url)} srcLang={code} label={{ ko: '한국어', en: 'English', zh: '中文' }[code] || code} default={code === lang} />)}</video>
}

