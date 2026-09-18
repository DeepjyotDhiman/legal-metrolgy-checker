import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard',        label: 'Dashboard' },
  { to: '/inspections/new',  label: 'New Inspection' },
  { to: '/inspections',      label: 'Inspections' },
  { to: '/reports',          label: 'Reports' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar__logo">
        <div>
          <div className="sidebar__logo-title">TriNetra</div>
          <div className="sidebar__logo-subtitle">Legal Metrology Checker</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        <div className="sidebar__nav-label">Menu</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar__nav-link${isActive ? ' active' : ''}`
            }
            // exact match only for /inspections to avoid /inspections/new conflict
            end={item.to === '/inspections'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">v0.1.0 – Development</div>
    </aside>
  );
}
