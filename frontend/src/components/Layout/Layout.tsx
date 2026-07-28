import React, { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Users, GraduationCap, Settings, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';
import Button from '../ui/Button';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/users': return 'User Management';
      case '/academics': return 'Academic Structure';
      case '/settings': return 'School Settings';
      default: return 'Portal';
    }
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <GraduationCap size={22} />
          EduPortal
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} className="nav-icon" /> Dashboard
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Users size={18} className="nav-icon" /> Users
          </NavLink>
          <NavLink to="/academics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <GraduationCap size={18} className="nav-icon" /> Academics
          </NavLink>
          
          <div className="nav-section-label">System</div>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Settings size={18} className="nav-icon" /> Settings
          </NavLink>
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="header">
          <div className="header-title">{getPageTitle()}</div>
          <div className="header-actions">
            <div className="user-info">
              <div className="user-avatar">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <span style={{ color: '#000000', fontSize: '0.875rem' }}>{user?.username}</span>
            </div>
            <Button variant="ghost" onClick={logout} style={{ padding: '0.375rem 0.5rem' }}>
              <LogOut size={16} />
            </Button>
          </div>
        </header>
        <div className="page-content animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
