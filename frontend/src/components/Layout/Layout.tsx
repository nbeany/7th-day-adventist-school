import React, { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Users, GraduationCap, Settings, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
      case '/students': return 'Student Information System';
      case '/guardians': return 'Guardian Profiles';
      case '/attendance': return 'Daily Attendance';
      case '/attendance-history': return 'Attendance History & Reports';
      case '/academics': return 'Academic Structure';
      case '/settings': return 'School Settings';
      default: return 'Portal';
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed top-0 bottom-0 left-0 z-20 flex flex-col w-64 border-r bg-sidebar-background border-sidebar-border text-sidebar-foreground">
        <div className="flex items-center h-16 gap-2 px-6 border-b border-sidebar-border text-sidebar-primary">
          <GraduationCap size={24} />
          <span className="text-lg font-bold tracking-tight">EduPortal</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="px-3 pt-4 pb-2 text-xs font-semibold tracking-wider uppercase text-sidebar-foreground/50">
            Main
          </div>
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink 
            to="/users" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Users size={18} /> Users
          </NavLink>
          <NavLink 
            to="/students" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Users size={18} /> Students
          </NavLink>
          <NavLink 
            to="/guardians" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Users size={18} /> Guardians
          </NavLink>
          <NavLink 
            to="/attendance" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <LayoutDashboard size={18} /> Attendance
          </NavLink>
          <NavLink 
            to="/attendance-history" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <LayoutDashboard size={18} /> Att. History
          </NavLink>
          <NavLink 
            to="/academics" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <GraduationCap size={18} /> Academics
          </NavLink>
          
          <div className="px-3 pt-6 pb-2 text-xs font-semibold tracking-wider uppercase text-sidebar-foreground/50">
            System
          </div>
          <NavLink 
            to="/settings" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Settings size={18} /> Settings
          </NavLink>
        </nav>
      </aside>
      
      <main className="flex flex-col flex-1 ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border">
          <div className="text-sm font-semibold tracking-tight">{getPageTitle()}</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                {user?.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-sm font-medium text-foreground">{user?.username || 'User'}</span>
            </div>
            <Button variant="ghost" onClick={logout} className="px-2" title="Log out">
              <LogOut size={16} />
            </Button>
          </div>
        </header>
        <div className="flex-1 p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
