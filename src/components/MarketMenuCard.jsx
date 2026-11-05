import { menuPhoto } from '../menu-photos'
import { useContext } from 'react'
import { Language } from '../data'
import { Money } from '../shared'
import { mediaUrl } from '../api'
import { NavIcon } from '../Profile'
import { Button, MediaSlot } from './MobileUI'
import { mobileCopy } from './mobile-copy'

export default function MarketMenuCard({ menu, store }) {
  const lang = useContext(Language), t = mobileCopy[lang]
  return <article className="market-menu-card"><MediaSlot kind="menu" src={menu.image_url} fallback={menuPhoto(menu)} alt={menu.name} label={lang === 'ko' ? '메뉴 사진' : lang === 'zh' ? '菜品图片' : 'Menu photo'}/><div className="market-menu-details"><h2>{menu.name}</h2><p><Money value={menu.price}/> · {store.name}</p><p className="market-menu-location"><NavIcon type="map"/>{store.address || store.market.name}</p><div><Button to={`/stores/${store.store_id}`}>{t.visit}</Button><Button primary href={mediaUrl(store.directions_url)}>{t.directions} ↗</Button></div></div></article>
}
