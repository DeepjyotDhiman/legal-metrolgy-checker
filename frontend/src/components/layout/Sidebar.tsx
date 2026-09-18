import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  IcoDashboard, IcoPlus, IcoClipboard, IcoDocument,
  IcoQuestion, IcoSignal, IcoLogout,
} from '../ui/Icons';

const NAV = [
  { to: '/dashboard',       label: 'Dashboard',      icon: IcoDashboard,  end: true },
  { to: '/inspections/new', label: 'New Inspection',  icon: IcoPlus,       end: true },
  { to: '/inspections',     label: 'Inspections',     icon: IcoClipboard,  end: true },
  { to: '/reports',         label: 'Reports',         icon: IcoDocument,   end: false },
];

const SECONDARY = [
  { to: '#', label: 'Help',          icon: IcoQuestion },
  { to: '#', label: 'System Status', icon: IcoSignal   },
];

function Initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'Officer';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__brand-logo">
          <div className="sidebar__brand-emblem">TN</div>
          <span className="sidebar__brand-name">TriNetra</span>
        </div>
        <div className="sidebar__brand-sub">Legal Metrology Inspection</div>
      </div>

      {/* Primary Nav */}
      <nav className="sidebar__nav">
        <div className="sidebar__nav-section">
          <div className="sidebar__nav-label">Workspace</div>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar__nav-link${isActive ? ' active' : ''}`
              }
            >
              <span className="sidebar__nav-icon"><Icon size={16} /></span>
              {label}
            </NavLink>
          ))}
        </div>

        <hr className="sidebar__divider" />

        <div className="sidebar__nav-section">
          <div className="sidebar__nav-label">Support</div>
          {SECONDARY.map(({ to, label, icon: Icon }) => (
            <a key={label} href={to} className="sidebar__nav-link">
              <span className="sidebar__nav-icon"><Icon size={16} /></span>
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* Profile / Logout */}
      <div className="sidebar__footer">
        <div className="sidebar__profile">
          <div className="sidebar__avatar">{Initials(displayName)}</div>
          <div className="sidebar__profile-info">
            <div className="sidebar__profile-name">{displayName}</div>
            <div className="sidebar__profile-role">{user?.role ?? 'Officer'}</div>
          </div>
          <button
            className="sidebar__logout-btn"
            onClick={handleLogout}
            title="Sign out"
          >
            <IcoLogout size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
