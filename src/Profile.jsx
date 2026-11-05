import { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { Language, LanguageSettings, SubtitleSettings, useApi } from './data'
import { copy } from './locale'
import { designCopy } from './design-copy'
import { readIds } from './local-history'
import Dialog from './Dialog'
import { readRole } from './auth'
import Photo from './components/Photo'
import { menuPhoto } from './menu-photos'
import photoCredits from './assets/foods/CREDITS.txt?url'

export function NavIcon({ type }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === 'home' ? <path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/> : type === 'stats' ? <path d="M4 21V11M10 21V3M16 21V8M22 21V15"/> : type === 'play' ? <path d="m8 4 13 8-13 8Z"/> : type === 'sound' ? <><path d="M11 4 5 9H2v6h3l6 5Z"/><path d="M16 8a6 6 0 0 1 0 8"/></> : type === 'photo' ? <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-3 5 5"/></> : type === 'profile' ? <><circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></> : type === 'map' ? <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/></> : type === 'like' ? <path d="M12 21S2 15 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 7-10 13-10 13Z"/> : type === 'save' ? <path d="M6 3h12v18l-6-4-6 4Z"/> : type === 'share' ? <><path d="M12 16V2m-5 5 5-5 5 5M5 13H3v8h18v-8h-2"/></> : type === 'store' ? <><path d="M4 10v10h16V10M3 10l2-6h14l2 6Z"/><path d="M10 20v-5h4v5"/></> : type === 'video' ? <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></> : type === 'edit' ? <path d="M4 20h4L19 9l-4-4L4 16Z"/> : type === 'mic' ? <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></> : <><rect x="3" y="4" width="18" height="14" rx="2"/>{type === 'feed' && <path d="m10 8 5 3-5 3Z"/>}{type === 'contents' && <path d="M8 21h8"/>}</>}
  </svg>
}
export function LanguageSelect() {
  const lang = useContext(Language), setLang = useContext(LanguageSettings)
  return <select className="language-pill" aria-label={copy[lang].language} value={lang} onChange={e => setLang(e.target.value)}><option value="en">EN</option><option value="ko">KO</option><option value="zh">ZH</option></select>
}
function RecentShop({ id }) {
  const q = useApi(`/stores/${id}`)
  if (!q.data) return null
  return <Link className="recent-shop" to={`/stores/${id}`}><Photo className="recent-placeholder" src={q.data.thumbnail_url || q.data.menus?.find(menu => menu.image_url)?.image_url || q.data.menus?.map(menuPhoto).find(Boolean)} fallback={q.data.videos?.find(video => video.thumbnail_url)?.thumbnail_url} alt="" placeholder={<span className="recent-placeholder" aria-hidden="true"/>}/><span><strong>{q.data.name}</strong><small>{q.data.market.name}</small></span><span>›</span></Link>
}
export default function Profile() {
  const lang = useContext(Language), setLang = useContext(LanguageSettings), subtitles = useContext(SubtitleSettings)
  const t = copy[lang], d = designCopy[lang], [setting, setSetting] = useState(null)
  const [recent] = useState(() => readIds('golmok-recent-shops'))
  const names = { en: 'English', ko: '한국어', zh: '中文' }
  return <div className="account-page"><div className="screen-title"><h1>{d.myPage}</h1><LanguageSelect/></div><div className="guest-card"><div className="guest-avatar"><NavIcon type="profile"/></div><div><h2>{d.guest}</h2><p>{d.noSignup}</p></div></div><section className="account-section"><h2>{d.settings}</h2><button className="setting-row" onClick={() => setSetting('language')}><span>{t.language}</span><span>{names[lang]} <b>›</b></span></button><button className="setting-row" onClick={() => setSetting('subtitles')}><span>{d.subtitles}</span><span>{names[subtitles.lang]} <b>›</b></span></button></section><section className="account-section"><h2>{d.recent}</h2>{recent.length ? recent.map(id => <RecentShop key={id} id={id}/>) : <p className="recent-empty">{d.noRecent}</p>}</section><section className="account-section"><h2>{d.help}</h2><details className="help-row"><summary>{d.howOrder}<span>›</span></summary><p>{d.howText}</p></details><a className="photo-credits" href={photoCredits} target="_blank" rel="noreferrer">{lang === 'ko' ? '음식 참고 사진 · 출처' : lang === 'zh' ? '食物参考图片 · 来源' : 'Reference food photos · Credits'}</a></section><section className="merchant-invite" lang="ko"><h2>사장님이신가요?</h2><p>가게 등록과 영상 만들기는 사장님 모드에서 할 수 있어요.</p><Link className="button full" to={readRole() === 'merchant' ? '/merchant' : '/merchant/login'}><NavIcon type="store"/>사장님 로그인</Link></section>{setting && <Dialog label={setting === 'language' ? t.language : d.subtitles} onClose={() => setSetting(null)}><button className="close" onClick={() => setSetting(null)} aria-label={t.close}>×</button><h2>{setting === 'language' ? t.language : d.subtitles}</h2>{(setting === 'subtitles' ? [['auto', d.follow], ...Object.entries(names)] : Object.entries(names)).map(([code, name]) => <button key={code} className="language-option" aria-pressed={(setting === 'language' ? lang : subtitles.choice) === code} onClick={() => { if (setting === 'language') setLang(code); else subtitles.setChoice(code); setSetting(null) }}><span>{name}</span><span className="language-check">{(setting === 'language' ? lang : subtitles.choice) === code ? '✓' : ''}</span></button>)}</Dialog>}</div>
}
