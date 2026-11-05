import { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { Language, useApi } from '../data'
import { copy } from '../locale'
import { designCopy } from '../design-copy'
import { Empty, State } from '../shared'
import Dialog from '../Dialog'
import { FilterChips, MediaSlot, PageHeader, SearchInput } from '../components/MobileUI'

function FoodResult({ food }) {
  const lang = useContext(Language), t = designCopy[lang], [expanded, setExpanded] = useState(false)
  const stores = food.stores || [], similar = food.similar || [], name = food.name || food.food_ko
  const target = stores.length === 1 ? stores[0] : null
  return <>
    <div className="food-result-row"><MediaSlot src={food.image_url} alt={name}/><div><h3>{name}</h3><p>{stores.length ? stores.map(store => store.market).filter(Boolean).filter((market,i,all) => all.indexOf(market) === i).join(' · ') : `${t.notInMarket}${similar.length ? ` · ${t.similar}: ${similar.map(item => item.name || item.food_ko).join(', ')}` : ''}`}</p></div>{target ? <Link to={`/stores/${target.store_id}`} aria-label={`${t.menuOrder}: ${name}`}>›</Link> : <button aria-label={`${name}: ${t.stalls}`} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>›</button>}</div>
    {expanded && <div className="food-result-options">{[...stores, ...similar.flatMap(item => item.stores || (item.store_id ? [item] : []))].map(store => <Link key={store.store_id} to={`/stores/${store.store_id}`}>{store.name}<span>›</span></Link>)}{!stores.length && !similar.length && <Empty/>}</div>}
  </>
}
function FoodMatchSheet({ content, onClose }) {
  const lang = useContext(Language), t = designCopy[lang], q = useApi(`/contents/${content.content_id}/foods`)
  return <Dialog label={`${t.foods} ${content.title}`} onClose={onClose}><div className="figma-food-sheet"><button className="sheet-handle" aria-label={copy[lang].close} onClick={onClose}/><h2>{t.foods} {content.title}</h2><p>{t.matched}</p><State query={q}>{q.data?.foods.map((food,i) => <FoodResult key={`${food.food_ko}-${i}`} food={food}/>)}{q.data?.foods.length === 0 && <Empty/>}</State></div></Dialog>
}
export default function ContentsFeedPage() {
  const lang = useContext(Language), t = designCopy[lang], q = useApi('/contents')
  const [search, setSearch] = useState(''), [category, setCategory] = useState('all'), [selected, setSelected] = useState(null)
  const options = [['all',t.all],['drama',t.drama],['movie',t.movie],['variety',t.variety]]
  const items = q.data?.filter(item => {
    const genre = item.genre.toLowerCase()
    return (category === 'all' || genre.includes(category) || (category === 'movie' && genre.includes('film'))) && `${item.title} ${item.title_ko} ${item.foods.join(' ')} ${item.foods_ko.join(' ')}`.toLowerCase().includes(search.toLowerCase())
  }) || []
  return <div className="mobile-page content-feed"><PageHeader title={t.contentTitle}/><p className="mobile-subheading">{t.contentIntro}</p><SearchInput label={t.search} value={search} onChange={setSearch}/><FilterChips label={copy[lang].contents} options={options} value={category} onChange={setCategory}/><h2>{lang === 'ko' ? '트렌딩' : lang === 'zh' ? '热门' : 'Trending'}</h2><State query={q}><div className="content-feed-grid">{items.map(item => <button className="content-feed-card" key={item.content_id} aria-expanded={selected?.content_id === item.content_id} onClick={() => setSelected(item)}><MediaSlot kind="content" src={item.image_url} alt={item.title}/><h3>{item.title}</h3><p>{item.platform} · {item.genre}</p><div className="content-food-tags">{item.foods.slice(0,1).map(food => <span key={food}>{food}</span>)}{item.foods.length > 1 && <span>+{item.foods.length - 1}</span>}</div></button>)}</div>{!items.length && <Empty/>}</State>{selected && <FoodMatchSheet content={selected} onClose={() => setSelected(null)}/>}</div>
}
