import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, GraduationCap, CalendarDays, DollarSign, Activity, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import TrendChart from '../../components/ui/TrendChart';
import { Link } from 'react-router-dom';
import NoticeBoard from '../../components/NoticeBoard';

const Home: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchStats = async (forceRefresh = false) => {
    // Only admins have access to the global dashboard stats endpoint
    if (user?.role !== 'ADMIN') return;
    
    setIsLoading(true);
    try {
      const url = forceRefresh ? '/dashboard/stats/?refresh=true' : '/dashboard/stats/';
      const res = await api.get(url);
      setStats(res.data);
      const date = new Date(res.data.last_updated);
      setLastUpdated(date.toLocaleTimeString());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (user?.role === 'TEACHER') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.first_name || user?.username}</h1>
          <p className="text-muted-foreground">Here is your Teacher Dashboard.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1 p-6 border rounded-lg bg-card text-card-foreground shadow-sm h-fit">
            <h3 className="text-lg font-semibold tracking-tight">Quick Links</h3>
            <div className="flex flex-col gap-2 mt-4">
              <Link to="/timetable" className="text-primary hover:underline">View my Timetable</Link>
              <Link to="/attendance" className="text-primary hover:underline">Mark Daily Attendance</Link>
              <Link to="/gradebook" className="text-primary hover:underline">Enter Grades</Link>
            </div>
          </div>
          <div className="md:col-span-2">
            <NoticeBoard />
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'STUDENT' || user?.role === 'PARENT') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.first_name || user?.username}</h1>
          <p className="text-muted-foreground">Here is your {user?.role === 'PARENT' ? 'Parent' : 'Student'} Dashboard.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1 p-6 border rounded-lg bg-card text-card-foreground shadow-sm h-fit">
            <h3 className="text-lg font-semibold tracking-tight">Quick Links</h3>
            <div className="flex flex-col gap-2 mt-4">
              <Link to="/timetable" className="text-primary hover:underline">View Schedule</Link>
              <Link to="/report-cards" className="text-primary hover:underline">View Grades</Link>
              <Link to={user?.role === 'PARENT' ? '/invoices' : '/fees'} className="text-primary hover:underline">View Financials</Link>
            </div>
          </div>
          <div className="md:col-span-2">
            <NoticeBoard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
          <p className="text-muted-foreground">Here's an overview of your school portal.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-muted-foreground">Last updated: {lastUpdated}</span>}
          <Button variant="outline" size="sm" onClick={() => fetchStats(true)} isLoading={isLoading}>
            <RefreshCw size={14} className="mr-2" /> Refresh
          </Button>
        </div>
      </div>
      
      {!stats && isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Loading dashboard statistics...</div>
      ) : stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            
            {/* Enrollment */}
            <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{stats.enrollment.total_students}</p>
                </div>
              </div>
            </div>

            <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-accent/10 text-accent">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Enrollments</p>
                  <p className="text-2xl font-bold">{stats.enrollment.active_enrollments}</p>
                </div>
              </div>
            </div>

            {/* Attendance */}
            <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-success/10 text-success">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Attendance</p>
                  <p className="text-2xl font-bold">{stats.attendance.today_rate}%</p>
                </div>
              </div>
            </div>

            {/* Finance */}
            <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-warning/10 text-warning">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold">ETB {stats.finance.total_paid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              </div>
            </div>

          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold tracking-tight flex items-center"><Activity size={18} className="mr-2" /> Quick Summary</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Total Teachers</span>
                      <span className="font-semibold">{stats.enrollment.total_teachers}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Students Present Today</span>
                      <span className="font-semibold text-success">{stats.attendance.present_today} / {stats.attendance.total_recorded_today}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Total Invoiced</span>
                      <span className="font-semibold">ETB {stats.finance.total_invoiced.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Outstanding Balance</span>
                      <span className="font-semibold text-destructive">ETB {stats.finance.outstanding_balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold tracking-tight">Attendance, Last 14 Days</h3>
                  <TrendChart
                    data={(stats.attendance_trend || []).map((p: any) => ({
                      label: new Date(p.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                      value: p.rate
                    }))}
                    formatValue={(v) => `${v}%`}
                    barClassName="bg-success"
                    emptyLabel="No attendance recorded in the last 14 days."
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-1">
              <NoticeBoard />
            </div>
          </div>

          <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
            <h3 className="mb-4 text-lg font-semibold tracking-tight">Fee Collection, Last 6 Months</h3>
            <TrendChart
              data={(stats.payment_trend || []).map((p: any) => ({
                label: new Date(p.month + '-01T00:00:00').toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
                value: p.total
              }))}
              formatValue={(v) => `ETB ${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              barClassName="bg-warning"
              emptyLabel="No payments recorded in the last 6 months."
            />
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Home;
