import { useContext } from 'react'
import { Language } from '../data'
import { Money } from '../shared'

export default function SelectionBar({ items, total, children }) {
  const lang = useContext(Language)
  return <div className="selection-bar"><div className="selection-total"><span>{items.length} {lang === 'ko' ? '개 선택' : lang === 'zh' ? '项已选' : 'selected'} · {items.map(item => item.name).join(', ')}</span><strong><Money value={total}/></strong></div><div className="selection-actions">{children}</div></div>
}
