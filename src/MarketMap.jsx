import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mediaUrl } from './api'
import { Money } from './shared'

export default function MarketMap({ market, stores }) {
  const [selected, setSelected] = useState(stores[0]?.store_id)
  const active = stores.find(s => s.store_id === selected)
  const west = Math.min(market.lng, ...stores.map(s => s.lng)) - 0.0015
  const east = Math.max(market.lng, ...stores.map(s => s.lng)) + 0.0015
  const south = Math.min(market.lat, ...stores.map(s => s.lat)) - 0.001
  const north = Math.max(market.lat, ...stores.map(s => s.lat)) + 0.001
  const bbox = `${west},${south},${east},${north}`
  return <section className="market-map"><div className="map-canvas"><iframe title={`${market.name} 가게 지도 · Store map`} loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`} /><div className="map-overlay">{stores.map((s, i) => <button key={s.store_id} className={`map-pin ${s.store_id === selected ? 'selected' : ''}`} style={{ left: `${(s.lng - west) / (east - west) * 100}%`, top: `${(north - s.lat) / (north - south) * 100}%` }} aria-label={s.name} aria-pressed={s.store_id === selected} onClick={() => setSelected(s.store_id)}>{i + 1}</button>)}</div></div>{active ? <div className="map-selection"><div><span className="eyebrow">MARKET SPOT</span><Link to={`/stores/${active.store_id}`}><h3>{active.name} ↗</h3></Link><p>{active.top_menu?.name} · <Money value={active.top_menu?.price} /></p></div><a className="button outline" href={mediaUrl(active.directions_url)} target="_blank" rel="noreferrer">길찾기 · Directions ↗</a></div> : <p className="notice">아직 등록된 가게가 없습니다.</p>}<a className="map-attribution" href={`https://www.openstreetmap.org/?mlat=${market.lat}&mlon=${market.lng}#map=17/${market.lat}/${market.lng}`} target="_blank" rel="noreferrer">© OpenStreetMap contributors · 큰 지도 보기 ↗</a></section>
}
