import { NavLink } from 'react-router-dom'
import Icon from './Icon'

const main = [['/', 'Overview', 'overview'], ['/activity', 'Activity', 'activity'], ['/accounts', 'Accounts', 'wallet'], ['/budgets', 'Budgets', 'budget'], ['/goals', 'Goals', 'goal'], ['/reports', 'Reports', 'chart']]

// One landmark for both layouts: a sidebar on wide screens and a bottom bar on narrow ones (see index.css).
// The bottom bar leaves Settings out; it is always reachable from the user menu in the header.
export default function WorkspaceNavigation() {
  return <nav aria-label="Workspace" className="workspace-nav">
    {main.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'} className="nav-link"><Icon name={icon} /><span>{label}</span></NavLink>)}
    <NavLink to="/settings" className="nav-link nav-secondary"><Icon name="settings" /><span>Settings</span></NavLink>
  </nav>
}
