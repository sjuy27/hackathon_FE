import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { Language, LanguageSettings } from './data'
import { copy } from './locale'

export function NavIcon({ type }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === 'profile' ? <><circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></> : type === 'map' ? <><path d="M18 9c0 4-6 9-6 9S6 13 6 9a6 6 0 1 1 12 0Z"/><circle cx="12" cy="9" r="2"/><path d="m6 15-3 6h18l-3-6"/></> : <><rect x="3" y="4" width="18" height="14" rx="2"/><path d="m10 8 5 3-5 3Z"/>{type === 'contents' && <path d="M8 21h8"/>}</>}
  </svg>
}

export function LanguageSelect() {
  const lang = useContext(Language), setLang = useContext(LanguageSettings)
  return <select aria-label={copy[lang].language} value={lang} onChange={e => setLang(e.target.value)}><option value="en">English</option><option value="ko">한국어</option><option value="zh">中文</option></select>
}

export default function Profile() {
  const lang = useContext(Language), setLang = useContext(LanguageSettings), t = copy[lang]
  return <div className="profile-page"><div className="profile-avatar"><NavIcon type="profile"/></div><h1>{t.profile}</h1><p>{t.profileHelp}</p><section className="profile-settings"><h2>{t.language}</h2><p>{t.languageHelp}</p><div role="group" aria-label={t.language}>{[['en', 'English', 'EN'], ['ko', '한국어', 'KO'], ['zh', '中文', 'ZH']].map(([code, name, badge]) => <button key={code} className={`language-option ${lang === code ? 'selected' : ''}`} aria-pressed={lang === code} onClick={() => setLang(code)}><span className="language-badge">{badge}</span><span lang={code}>{name}</span><span className="language-check" aria-hidden="true">{lang === code ? '✓' : ''}</span></button>)}</div></section><Link className="merchant-entry" to="/merchant"><strong>{t.merchant} ↗</strong><span>{t.merchantHelp}</span></Link></div>
}
