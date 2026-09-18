import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <span className="header__title">{title ?? 'TriNetra'}</span>

      <div className="header__user-area">
        {user && (
          <span className="header__user-badge">
            {user.role}
          </span>
        )}
        {user?.email && (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            {user.email}
          </span>
        )}
        <button className="btn btn-ghost" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
