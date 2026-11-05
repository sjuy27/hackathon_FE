import { useContext } from 'react'
import { mediaUrl } from './api'
import { Language, SubtitleSettings } from './data'
import { copy } from './locale'
export function Money({ value }) { const lang = useContext(Language); return <>{value == null ? copy[lang].price : `₩${value.toLocaleString()}`}</> }
export function ErrorMessage({ error }) { return error ? <p className="notice error" role="alert">{error.message}</p> : null }
export function State({ query, children }) {
  const t = copy[useContext(Language)]
  if (query.isPending) return <div className="state" role="status">{t.loading}</div>
  if (query.isError) return <div className="state error" role="alert"><p>{query.error.message}</p><button onClick={() => query.refetch()}>{t.retry}</button></div>
  return children
}
export function Empty() { const lang = useContext(Language); return <p className="state">{copy[lang].empty}</p> }
export function VideoPlayer({ video }) {
  const { lang } = useContext(SubtitleSettings)
  return <video key={lang} controls playsInline preload="metadata" poster={mediaUrl(video.thumbnail_url)} src={mediaUrl(video.video_url)} crossOrigin="anonymous">{Object.entries(video.subtitles || {}).map(([code, url]) => <track key={code} kind="subtitles" src={mediaUrl(url)} srcLang={code} label={{ ko: '한국어', en: 'English', zh: '中文' }[code] || code} default={code === lang} />)}</video>
}


