import { Button } from '../MobileUI'
import { NavIcon } from '../../Profile'

export default function HostActionCard({ to, icon, title, description, primary = false, state }) {
  return <Button to={to} state={state} primary={primary} className="host-action-card"><NavIcon type={icon}/><span><strong>{title}</strong><small>{description}</small></span></Button>
}
