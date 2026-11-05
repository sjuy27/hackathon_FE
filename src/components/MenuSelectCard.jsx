import { menuPhoto } from '../menu-photos'
import { Money } from '../shared'
import { MediaSlot } from './MobileUI'

export default function MenuSelectCard({ menu, selected, onChange }) {
  return <label className={`menu-select-card ${selected ? 'selected' : ''}`}><MediaSlot src={menu.image_url} fallback={menuPhoto(menu)} alt={menu.name}/><span className="menu-select-details"><strong>{menu.name_ko} · {menu.name}</strong><small>{menu.description}</small><b><Money value={menu.price}/></b></span><input type="checkbox" checked={selected} onChange={event => onChange(event.target.checked)} aria-label={menu.name}/></label>
}
