import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import NotificationBell from '../NotificationBell';
import { useAuth } from '../../contexts/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();
  const showBell = !!user;

  return (
    <>
      <Sidebar />

      <div className="main-content">
        {showBell && (
          <header className="app-topbar">
            <NotificationBell />
          </header>
        )}
        <Outlet />
      </div>
    </>
  );
}
