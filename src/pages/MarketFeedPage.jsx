import { useContext, useState } from 'react'
import { Language, useApi } from '../data'
import { Empty, State } from '../shared'
import { PageHeader, SearchInput } from '../components/MobileUI'
import { mobileCopy } from '../components/mobile-copy'
import MarketCard from '../components/MarketCard'

export default function MarketFeedPage() {
  const lang = useContext(Language), t = mobileCopy[lang], q = useApi('/markets'), [search, setSearch] = useState('')
  const markets = q.data?.filter(market => `${market.name} ${market.name_ko} ${market.address}`.toLowerCase().includes(search.toLowerCase())) || []
  return <div className="mobile-page market-feed-page"><PageHeader title={t.markets}/><SearchInput label={t.searchMarkets} value={search} onChange={setSearch}/><State query={q}><div className="market-feed-list">{markets.map(market => <MarketCard key={market.market_id} market={market}/>)}</div>{!markets.length && <Empty/>}</State></div>
}
