import { useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Language } from './data'

export default function PagePosition() {
  const { pathname, hash } = useLocation(), lang = useContext(Language)
  useEffect(() => {
    document.documentElement.lang = lang
    if (!hash) { window.scrollTo(0, 0); document.getElementById('root')?.scrollTo(0, 0); return }
    let observer
    const target = () => {
      const element = document.getElementById(hash.slice(1))
      if (!element) return false
      element.scrollIntoView({ block: 'start' })
      observer?.disconnect()
      return true
    }
    if (!target()) {
      observer = new MutationObserver(target)
      observer.observe(document.getElementById('root'), { childList: true, subtree: true })
    }
    return () => observer?.disconnect()
  }, [pathname, hash, lang])
  return null
}
