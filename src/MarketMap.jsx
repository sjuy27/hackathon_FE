import { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps'
import { mediaUrl } from './api'
import { Money } from './shared'
import { Language, text } from './data'
import { copy } from './locale'

// 구글 지도 키가 있으면 Google Maps JavaScript API, 없으면(예: 배포 환경변수 미설정) 기존 OpenStreetMap 그림으로 보여준다.
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'

function GoogleCanvas({ market, stores, selected, onSelect }) {
  const lang = useContext(Language)
  return <APIProvider apiKey={MAPS_KEY} language={lang} region="KR"><Map className="map-canvas google" mapId={MAP_ID} defaultCenter={{ lat: market.lat, lng: market.lng }} defaultZoom={17} gestureHandling="greedy" disableDefaultUI zoomControl clickableIcons={false}>
    {stores.map((s, i) => <AdvancedMarker key={s.store_id} position={{ lat: s.lat, lng: s.lng }} title={s.name} zIndex={s.store_id === selected ? 10 : 1} onClick={() => onSelect(s.store_id)}><span className={`map-pin ${s.store_id === selected ? 'selected' : ''}`}>{i + 1}</span></AdvancedMarker>)}
  </Map></APIProvider>
}
function OsmCanvas({ market, stores, selected, onSelect }) {
  const t = copy[useContext(Language)]
  const west = Math.min(market.lng, ...stores.map(s => s.lng)) - 0.0015
  const east = Math.max(market.lng, ...stores.map(s => s.lng)) + 0.0015
  const south = Math.min(market.lat, ...stores.map(s => s.lat)) - 0.001
  const north = Math.max(market.lat, ...stores.map(s => s.lat)) + 0.001
  const bbox = `${west},${south},${east},${north}`
  return <div className="map-canvas"><iframe title={`${market.name} ${t.map}`} loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`} /><div className="map-overlay">{stores.map((s, i) => <button key={s.store_id} className={`map-pin ${s.store_id === selected ? 'selected' : ''}`} style={{ left: `${(s.lng - west) / (east - west) * 100}%`, top: `${(north - s.lat) / (north - south) * 100}%` }} aria-label={s.name} aria-pressed={s.store_id === selected} onClick={() => onSelect(s.store_id)}>{i + 1}</button>)}</div></div>
}

export default function MarketMap({ market, stores }) {
  const lang = useContext(Language), t = copy[lang]
  const [selected, setSelected] = useState(stores[0]?.store_id)
  const active = stores.find(s => s.store_id === selected)
  const Canvas = MAPS_KEY ? GoogleCanvas : OsmCanvas
  return <section className="market-map"><Canvas market={market} stores={stores} selected={selected} onSelect={setSelected} />{active ? <div className="map-selection"><div><span className="eyebrow">MARKET SPOT</span><Link to={`/stores/${active.store_id}`}><h3>{active.name} ↗</h3></Link><p>{active.top_menu?.name} · <Money value={active.top_menu?.price} /></p></div><a className="button outline" href={mediaUrl(active.directions_url)} target="_blank" rel="noreferrer">{text[lang][12]} ↗</a></div> : <p className="notice">{t.empty}</p>}{!MAPS_KEY && <a className="map-attribution" href={`https://www.openstreetmap.org/?mlat=${market.lat}&mlon=${market.lng}#map=17/${market.lat}/${market.lng}`} target="_blank" rel="noreferrer">© OpenStreetMap contributors · {t.largeMap} ↗</a>}</section>
}
