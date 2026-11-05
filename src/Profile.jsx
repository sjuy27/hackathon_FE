import { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { Language, LanguageSettings, SubtitleSettings, useApi } from './data'
import { copy } from './locale'
import { designCopy } from './design-copy'
import { readIds } from './local-history'
import Dialog from './Dialog'

export function NavIcon({ type }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === 'profile' ? <><circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></> : type === 'map' ? <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/></> : type === 'like' ? <path d="M12 21S2 15 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 7-10 13-10 13Z"/> : type === 'save' ? <path d="M6 3h12v18l-6-4-6 4Z"/> : type === 'share' ? <><path d="M12 16V2m-5 5 5-5 5 5M5 13H3v8h18v-8h-2"/></> : <><rect x="3" y="4" width="18" height="14" rx="2"/>{type === 'feed' && <path d="m10 8 5 3-5 3Z"/>}{type === 'contents' && <path d="M8 21h8"/>}</>}
  </svg>
}
export function LanguageSelect() {
  const lang = useContext(Language), setLang = useContext(LanguageSettings)
  return <select className="language-pill" aria-label={copy[lang].language} value={lang} onChange={e => setLang(e.target.value)}><option value="en">EN</option><option value="ko">KO</option><option value="zh">ZH</option></select>
}
function RecentShop({ id }) {
  const q = useApi(`/stores/${id}`)
  if (!q.data) return null
  return <Link className="recent-shop" to={`/stores/${id}`}><span className="recent-placeholder" aria-hidden="true"/><span><strong>{q.data.name}</strong><small>{q.data.market.name}</small></span><span>›</span></Link>
}
export default function Profile() {
  const lang = useContext(Language), setLang = useContext(LanguageSettings), subtitles = useContext(SubtitleSettings)
  const t = copy[lang], d = designCopy[lang], [setting, setSetting] = useState(null)
  const [recent] = useState(() => readIds('golmok-recent-shops'))
  const names = { en: 'English', ko: '한국어', zh: '中文' }
  return <div className="account-page"><div className="screen-title"><h1>{d.myPage}</h1><LanguageSelect/></div><div className="guest-card"><div className="guest-avatar"><NavIcon type="profile"/></div><div><h2>{d.guest}</h2><p>{d.noSignup}</p></div></div><section className="account-section"><h2>{d.settings}</h2><button className="setting-row" onClick={() => setSetting('language')}><span>{t.language}</span><span>{names[lang]} <b>›</b></span></button><button className="setting-row" onClick={() => setSetting('subtitles')}><span>{d.subtitles}</span><span>{names[subtitles.lang]} <b>›</b></span></button></section><section className="account-section"><h2>{d.recent}</h2>{recent.length ? recent.map(id => <RecentShop key={id} id={id}/>) : <p className="recent-empty">{d.noRecent}</p>}</section><section className="account-section"><h2>{d.help}</h2><details className="help-row"><summary>{d.howOrder}<span>›</span></summary><p>{d.howText}</p></details></section><section className="merchant-invite"><h2>{d.merchantQuestion}</h2><p>{d.merchantText}</p><Link className="button full" to="/merchant"><NavIcon type="contents"/>{d.merchantButton}</Link></section>{setting && <Dialog label={setting === 'language' ? t.language : d.subtitles} onClose={() => setSetting(null)}><button className="close" onClick={() => setSetting(null)} aria-label={t.close}>×</button><h2>{setting === 'language' ? t.language : d.subtitles}</h2>{(setting === 'subtitles' ? [['auto', d.follow], ...Object.entries(names)] : Object.entries(names)).map(([code, name]) => <button key={code} className="language-option" aria-pressed={(setting === 'language' ? lang : subtitles.choice) === code} onClick={() => { if (setting === 'language') setLang(code); else subtitles.setChoice(code); setSetting(null) }}><span>{name}</span><span className="language-check">{(setting === 'language' ? lang : subtitles.choice) === code ? '✓' : ''}</span></button>)}</Dialog>}</div>
}
