import { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { Language, useApi } from './data'
import { copy } from './locale'
import { designCopy } from './design-copy'
import { Empty, State } from './shared'
import { mediaUrl } from './api'
import { LanguageSelect, NavIcon } from './Profile'
import Dialog from './Dialog'

function FoodMatches({ content, onClose }) {
  const lang = useContext(Language), t = designCopy[lang], q = useApi(`/contents/${content.content_id}/foods`)
  return <Dialog label={`${t.foods} ${content.title}`} onClose={onClose}><div className="content-sheet"><span className="sheet-handle"/><button className="close" aria-label={copy[lang].close} onClick={onClose}>×</button><h2>{t.foods} {content.title}</h2><p>{t.matched}</p><State query={q}>{q.data?.foods.map((food, i) => <div className="food-match" key={i}><div className="food-match-title"><div className="food-placeholder" aria-hidden="true"><NavIcon type="store"/></div><div><h3>{food.name || food.food_ko}</h3><p>{food.stores?.length ? `${food.stores.length} ${t.stalls}` : t.notInMarket}</p></div></div>{food.stores?.map(s => <Link className="food-shop-link" key={s.store_id} to={`/stores/${s.store_id}`}><span>{s.name}<small>{s.market}</small></span><span>›</span></Link>)}{!food.stores?.length && <div className="similar-matches"><p>{t.similar}</p>{food.similar?.map((f, j) => <div key={j}><strong>{f.name || f.food_ko}</strong>{f.stores?.map(s => <Link className="food-shop-link" key={s.store_id} to={`/stores/${s.store_id}`}><span>{s.name}<small>{s.market}</small></span><span>›</span></Link>)}</div>)}</div>}</div>)}{q.data?.foods.length === 0 && <Empty/>}</State></div></Dialog>
}

export default function Contents() {
  const lang = useContext(Language), t = designCopy[lang], q = useApi('/contents')
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all'), [selected, setSelected] = useState(null)
  const filters = [['all', t.all], ['netflix', 'Netflix'], ['drama', t.drama], ['movie', t.movie], ['variety', t.variety]]
  const items = q.data?.filter(c => {
    const category = `${c.platform} ${c.genre}`.toLowerCase()
    const matchesCategory = filter === 'all' || category.includes(filter) || (filter === 'movie' && category.includes('film'))
    return matchesCategory && `${c.title} ${c.title_ko} ${c.foods.join(' ')} ${c.foods_ko.join(' ')}`.toLowerCase().includes(search.toLowerCase())
  }) || []
  return <div className="catalog-page"><div className="screen-title"><div><h1>{t.contentTitle}</h1><p>{t.contentIntro}</p></div><LanguageSelect/></div><label className="catalog-search"><span aria-hidden="true">⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} aria-label={t.search}/></label><div className="catalog-filters" role="group" aria-label={copy[lang].contents}>{filters.map(([key, label]) => <button aria-pressed={key === filter} className={key === filter ? 'selected' : ''} key={key} onClick={() => setFilter(key)}>{label}</button>)}</div><div className="catalog-section-title"><h2>{t.discover}</h2><span>{t.catalog}</span></div><State query={q}><div className="catalog-grid">{items.map(c => <button key={c.content_id} className={`catalog-card ${selected?.content_id === c.content_id ? 'selected' : ''}`} onClick={() => setSelected(c)}>{c.image_url ? <img className="catalog-image" src={mediaUrl(c.image_url)} alt="" loading="lazy"/> : <div className="title-placeholder"><span>{c.title}</span></div>}<h3>{c.title}</h3><p>{c.platform} · {c.genre}</p><div className="food-tags">{c.foods.slice(0, 1).map(f => <span key={f}>{f}</span>)}{c.foods.length > 1 && <span>+{c.foods.length - 1}</span>}</div></button>)}</div>{items.length === 0 && <Empty/>}</State>{selected && <FoodMatches content={selected} onClose={() => setSelected(null)}/>}</div>
}
