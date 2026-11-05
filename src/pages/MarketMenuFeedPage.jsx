import { useContext, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Language, useApi } from '../data'
import { api } from '../api'
import { Empty, ErrorMessage, State } from '../shared'
import { copy } from '../locale'
import { mobileCopy } from '../components/mobile-copy'
import { FilterChips, PageHeader, SearchInput } from '../components/MobileUI'
import MarketMenuCard from '../components/MarketMenuCard'

export default function MarketMenuFeedPage() {
  const { id } = useParams(), lang = useContext(Language), t = mobileCopy[lang], q = useApi(`/markets/${id}/stores`)
  const [search, setSearch] = useState(''), [category, setCategory] = useState('all')
  const stores = useQueries({ queries: (q.data?.stores || []).map(store => ({ queryKey: [`/stores/${store.store_id}`,lang], queryFn: ({ signal }) => api(`/stores/${store.store_id}?lang=${lang}`,{ signal }) })) })
  const entries = stores.flatMap(result => result.data?.menus.map(menu => ({ menu, store: result.data })) || [])
  const options = [['all',t.all], ...Array.from(new Map(entries.map(({menu}) => [menu.name_ko || menu.name,menu.name])).entries())]
  const filtered = entries.filter(({menu,store}) => (category === 'all' || (menu.name_ko || menu.name) === category) && `${menu.name} ${menu.name_ko} ${store.name} ${store.name_ko}`.toLowerCase().includes(search.toLowerCase()))
  const pending = stores.some(result => result.isPending)
  return <div className="mobile-page market-menu-page"><PageHeader title={q.data?.market.name || t.markets} back="/markets"/><SearchInput label={t.searchMenu} value={search} onChange={setSearch}/><FilterChips label={t.menu} options={options} value={category} onChange={setCategory}/><State query={q}>
    <div className="market-menu-list">{filtered.map(({menu,store}) => <MarketMenuCard key={`${store.store_id}-${menu.menu_id}`} menu={menu} store={store}/>)}</div>
    {pending && <p role="status">{copy[lang].loading}</p>}
    {stores.filter(result => result.isError).map((result,index) => <div key={index}><ErrorMessage error={result.error}/><button onClick={() => result.refetch()}>{copy[lang].retry}</button></div>)}
    {!pending && !filtered.length && !stores.some(result => result.isError) && <Empty/>}
  </State></div>
}
