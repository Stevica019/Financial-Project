import { NavLink } from 'react-router-dom'

// Links between the pages of one section, styled as tabs. Each tab is its own route, so tabs can be linked to and bookmarked.
function SectionTabs({ label, links }) {
  return <nav aria-label={label} className="section-tabs">
    {links.map(([to, name]) => <NavLink key={to} to={to} end className="section-tab">{name}</NavLink>)}
  </nav>
}

export function ActivityTabs() {
  return <SectionTabs label="Activity sections" links={[['/activity', 'All activity'], ['/activity/scheduled', 'Scheduled']]} />
}

export function SettingsTabs() {
  return <SectionTabs label="Settings sections" links={[['/settings', 'Preferences'], ['/settings/categories', 'Categories'], ['/settings/import', 'Import & export']]} />
}
