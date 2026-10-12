import { Activity, Apple, BarChart3, CalendarDays, ChevronDown, CircleHelp, ClipboardList, Leaf, Menu, Settings2, Sparkles, Utensils, X } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'

const links = [
  { to: '/dashboard', label: 'Overview', icon: Activity },
  { to: '/meals', label: 'Meal journal', icon: Utensils },
  { to: '/analytics', label: 'Insights', icon: BarChart3 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/targets', label: 'Daily goals', icon: Settings2 },
  { to: '/foods', label: 'Food insights', icon: Apple },
]

const titles: Record<string, string> = {
  '/dashboard': 'Your overview',
  '/meals': 'Meal journal',
  '/meals/new': 'Log a meal',
  '/analytics': 'Nutrition insights',
  '/calendar': 'Your food calendar',
  '/targets': 'Daily goals',
  '/foods': 'Food insights',
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const title = titles[location.pathname] || (location.pathname.startsWith('/meals/') ? (location.pathname.endsWith('/edit') ? 'Edit meal' : 'Meal details') : 'MacroZone')
  return <div className="app-shell">
    {open && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <NavLink to="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark bg-lime text-ink"><Leaf size={18} /></span><span>macro<span>zone</span></span></NavLink>
      <div className="space-label">YOUR SPACE</div>
      <nav className="side-nav">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span>{to === '/analytics' && <span className="nav-new">NEW</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="side-tip"><Sparkles size={17} /><p><strong>Small steps, real change.</strong><br />Consistency beats perfection.</p></div>
        <NavLink className="nav-link" to="/"><CircleHelp size={17} /><span>About MacroZone</span></NavLink>
        <div className="profile-row"><span className="avatar">M</span><span><strong>My nutrition</strong><small>Personal space</small></span><ChevronDown size={15} /></div>
      </div>
      <button className="mobile-close" aria-label="Close navigation" onClick={() => setOpen(false)}><X /></button>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={20} /></button><div className="topbar-title">{title}</div><div className="topbar-date"><span className="status-dot" />{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}<span className="topbar-divider" /><ClipboardList size={16} /><span>Nutrition journal</span></div></header>
      <main className="main-content"><Outlet /></main>
      <footer className="app-footer"><span>MacroZone</span><span>Build a better relationship with your food.</span></footer>
    </div>
  </div>
}
