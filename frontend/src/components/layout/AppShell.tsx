import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * AppShell wraps all authenticated pages.
 * Structure: sidebar | (header + outlet page)
 * Pages use the .page class to manage their own header/body/scroll.
 */
export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Header />
        <Outlet />
      </div>
    </div>
  );
}
