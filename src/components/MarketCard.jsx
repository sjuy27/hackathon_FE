import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { Language, useApi } from '../data'
import { mediaUrl } from '../api'
import { marketPhoto } from '../menu-photos'
import { mobileCopy } from './mobile-copy'
import { Button, MediaSlot } from './MobileUI'

export default function MarketCard({ market }) {
  const lang = useContext(Language), t = mobileCopy[lang], stores = useApi(`/markets/${market.market_id}/stores`)
  const foods = [...new Set(stores.data?.stores.map(store => store.top_menu?.name).filter(Boolean) || [])]
  const directions = mediaUrl(market.directions_url) || `https://www.google.com/maps/dir/?api=1&destination=${market.lat},${market.lng}`
  return <article className="market-feed-card"><div className="market-card-media"><Link to={`/markets/${market.market_id}`} aria-label={market.name}><MediaSlot kind="map" src={market.thumbnail_url || stores.data?.market?.thumbnail_url} fallback={marketPhoto(market) || stores.data?.stores.find(store => store.thumbnail_url)?.thumbnail_url} alt={market.name} label={`${market.name} ${t.markets}`}/></Link><Button href={directions}>{t.directions} ↗</Button></div><div className="market-card-details"><Link to={`/markets/${market.market_id}`}><h2>{market.name}</h2></Link><p>{market.address} · {market.open_cycle}</p><div className="market-card-tags"><span>{market.store_count} {lang === 'ko' ? '가게' : lang === 'zh' ? '店铺' : 'stores'}</span>{foods.slice(0,3).map(food => <span key={food}>{food}</span>)}{foods.length > 3 && <span>+{foods.length - 3}</span>}</div></div></article>
}
