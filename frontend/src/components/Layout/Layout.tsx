import React, { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Users, GraduationCap, Settings, LogOut, LayoutDashboard, DollarSign, CalendarDays, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import api from '../../api/axios';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [passwordData, setPasswordData] = React.useState({ old_password: '', new_password: '', confirm_password: '' });
  const [passwordStatus, setPasswordStatus] = React.useState({ error: '', success: '' });
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const handleChangePassword = async () => {
    setPasswordStatus({ error: '', success: '' });
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordStatus({ error: 'New passwords do not match.', success: '' });
      return;
    }
    if (passwordData.new_password.length < 6) {
      setPasswordStatus({ error: 'New password must be at least 6 characters.', success: '' });
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.post('/users/change_password/', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });
      setPasswordStatus({ error: '', success: 'Password changed successfully!' });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        setPasswordStatus({ error: '', success: '' });
      }, 1500);
    } catch (error: any) {
      setPasswordStatus({ error: error.response?.data?.error || 'Failed to change password.', success: '' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/users': return 'User Management';
      case '/students': return 'Student Information System';
      case '/guardians': return 'Guardian Profiles';
      case '/attendance': return 'Daily Attendance';
      case '/attendance-history': return 'Attendance History & Reports';
      case '/academics': return 'Academic Structure';
      case '/gradebook': return 'Gradebook';
      case '/report-cards': return 'Report Cards';
      case '/fees': return 'Fee Structure';
      case '/invoices': return 'Invoices & Payments';
      case '/settings': return 'School Settings';
      default: return 'Portal';
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed top-0 bottom-0 left-0 z-20 flex flex-col w-64 border-r bg-sidebar-background border-sidebar-border text-sidebar-foreground">
        <div className="flex items-center h-16 gap-3 px-6 border-b border-sidebar-border text-sidebar-primary">
          <img src="/logo.png" alt="SDA Logo" className="w-8 h-8 object-contain" />
          <span className="text-sm font-bold tracking-tight leading-tight">Debre Berhan<br/>SDA School</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="px-3 pt-4 pb-2 text-xs font-semibold tracking-wider uppercase text-sidebar-foreground/50">
            Main
          </div>
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          {user?.role === 'ADMIN' && (
            <>
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
            </>
          )}
          {['ADMIN', 'TEACHER'].includes(user?.role || '') && (
            <>
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
            </>
          )}
          {user?.role === 'ADMIN' && (
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
          )}
          <NavLink 
            to="/timetable" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <CalendarDays size={18} /> Timetable
          </NavLink>
          {['ADMIN', 'TEACHER'].includes(user?.role || '') && (
            <NavLink 
              to="/gradebook" 
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                  isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <LayoutDashboard size={18} /> Gradebook
            </NavLink>
          )}
          {['ADMIN', 'STUDENT', 'PARENT'].includes(user?.role || '') && (
            <NavLink 
              to="/report-cards" 
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                  isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <LayoutDashboard size={18} /> Report Cards
            </NavLink>
          )}
          
          {['STUDENT', 'PARENT'].includes(user?.role || '') && (
            <NavLink 
              to="/my-grades" 
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                  isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <LayoutDashboard size={18} /> My Grades
            </NavLink>
          )}

          {user?.role === 'ADMIN' && (
            <NavLink 
              to="/fees" 
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                  isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <DollarSign size={18} /> Fee Structure
            </NavLink>
          )}
          {['ADMIN', 'PARENT'].includes(user?.role || '') && (
            <NavLink 
              to="/invoices" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <DollarSign size={18} /> Invoices & Payments
          </NavLink>
          )}
          
          {user?.role === 'ADMIN' && (
            <>
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
            </>
          )}
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
            <Button variant="ghost" onClick={() => setIsPasswordModalOpen(true)} className="px-2" title="Change Password">
              <Key size={16} />
            </Button>
            <Button variant="ghost" onClick={logout} className="px-2" title="Log out">
              <LogOut size={16} />
            </Button>
          </div>
        </header>
        <div className="flex-1 p-6 animate-fade-in">
          {children}
        </div>
      </main>

      <Modal isOpen={isPasswordModalOpen} onClose={() => { setIsPasswordModalOpen(false); setPasswordStatus({error: '', success: ''}); setPasswordData({ old_password: '', new_password: '', confirm_password: '' }); }} title="Change Password">
        <div className="space-y-4">
          {passwordStatus.error && (
            <div className="p-3 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">{passwordStatus.error}</div>
          )}
          {passwordStatus.success && (
            <div className="p-3 text-sm border rounded-md bg-success/10 text-success border-success/20">✓ {passwordStatus.success}</div>
          )}
          <Input 
            label="Current Password" 
            type="password" 
            value={passwordData.old_password} 
            onChange={(e) => setPasswordData({...passwordData, old_password: e.target.value})} 
          />
          <Input 
            label="New Password" 
            type="password" 
            value={passwordData.new_password} 
            onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} 
            placeholder="Min 6 characters"
          />
          <Input 
            label="Confirm New Password" 
            type="password" 
            value={passwordData.confirm_password} 
            onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} 
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleChangePassword} isLoading={isChangingPassword}>Change Password</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Layout;
