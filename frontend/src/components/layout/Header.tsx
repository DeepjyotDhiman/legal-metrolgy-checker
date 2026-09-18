import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ROUTE_META: Record<string, { label: string; parent?: { label: string; to: string } }> = {
  '/dashboard':        { label: 'Dashboard' },
  '/inspections':      { label: 'Inspections' },
  '/inspections/new':  { label: 'New Inspection', parent: { label: 'Inspections', to: '/inspections' } },
  '/reports':          { label: 'Reports' },
};

function useBreadcrumbs() {
  const { pathname } = useLocation();
  // Match /inspections/:id
  if (/^\/inspections\/[^/]+$/.test(pathname) && pathname !== '/inspections/new') {
    const id = pathname.split('/')[2];
    return { label: id, parent: { label: 'Inspections', to: '/inspections' } };
  }
  if (/^\/reports\/[^/]+$/.test(pathname)) {
    const id = pathname.split('/')[2];
    return { label: id, parent: { label: 'Reports', to: '/reports' } };
  }
  return ROUTE_META[pathname] ?? { label: '—' };
}

export default function Header() {
  const crumb = useBreadcrumbs();
  const { user } = useAuth();

  return (
    <header className="header">
      {/* Breadcrumb */}
      <nav className="header__breadcrumb" aria-label="breadcrumb">
        <span className="header__breadcrumb-item">TriNetra</span>
        <span className="header__breadcrumb-sep">›</span>
        {crumb.parent && (
          <>
            <Link to={crumb.parent.to} className="header__breadcrumb-item">
              {crumb.parent.label}
            </Link>
            <span className="header__breadcrumb-sep">›</span>
          </>
        )}
        <span className="header__breadcrumb-item current">{crumb.label}</span>
      </nav>

      {/* Right side */}
      <div className="header__right">
        <div className="header__status">
          <span className="status-dot status-dot--online" />
          System Online
        </div>
        {user && (
          <div className="header__user">
            <span className="header__user-name">{user.name || user.email}</span>
            <span className="header__role-badge">{user.role}</span>
          </div>
        )}
      </div>
    </header>
  );
}
