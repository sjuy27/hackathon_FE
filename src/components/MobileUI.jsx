import { Link } from 'react-router-dom'
import { LanguageSelect } from '../Profile'
import Photo from './Photo'

export function PageHeader({ title, back }) {
  return <div className="mobile-heading">{back && <Link className="back-control" to={back} aria-label="Back">‹</Link>}<h1>{title}</h1><LanguageSelect/></div>
}
export function SearchInput({ label, value, onChange }) {
  return <label className="mobile-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input type="search" aria-label={label} placeholder={label} value={value} onChange={event => onChange(event.target.value)}/></label>
}
export function FilterChips({ label, options, value, onChange }) {
  return <div className="mobile-filters" role="group" aria-label={label}>{options.map(([key,text]) => <button key={key} type="button" aria-pressed={key === value} onClick={() => onChange(key)}>{text}</button>)}</div>
}
export function Button({ to, href, primary = false, className = '', children, ...props }) {
  const classes = `mobile-button ${primary ? 'primary' : ''} ${className}`
  if (to) return <Link className={classes} to={to} {...props}>{children}</Link>
  if (href) return <a className={classes} href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>
  return <button type="button" className={classes} {...props}>{children}</button>
}
export function MediaSlot({ src, fallback, alt, kind = 'thumb', label = '' }) {
  return <span className={`mobile-media ${kind}`}><Photo src={src} fallback={fallback} alt={alt} placeholder={<span className="mobile-media-placeholder" aria-label={alt}>{label}</span>}/></span>
}
