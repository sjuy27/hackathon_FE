import { useContext } from 'react'
import { Language } from '../data'
import { copy } from '../locale'
import { Money } from '../shared'
import { Button, MediaSlot } from './MobileUI'

export default function StorePreviewCard({ item, message }) {
  const lang = useContext(Language), t = copy[lang], store = item.store
  return <div className="feed-store-card"><div className="feed-store-info"><MediaSlot src={item.thumbnail_url} alt={store.name}/><div><h3>{store.name}</h3><p><Money value={store.top_menu?.price}/> · {store.top_menu?.name}</p><p>{store.market}</p></div></div>{message && <p className="feed-card-message" role="status">{message}</p>}<div className="short-shop-actions"><Button to={`/stores/${store.store_id}`}>{t.visit}</Button><Button primary to={`/stores/${store.store_id}#menu`}>{t.order}</Button></div></div>
}
