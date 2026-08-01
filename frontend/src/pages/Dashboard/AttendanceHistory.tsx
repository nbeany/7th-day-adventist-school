import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { BarChart3, Download } from 'lucide-react';

const AttendanceHistory: React.FC = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await api.get('/sections/');
        setSections(res.data);
        if (res.data.length > 0) setSelectedSection(res.data[0].id.toString());
      } catch (error) {
        console.error(error);
      }
    };
    fetchSections();

    // Default date range: last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const fetchHistory = async () => {
    if (!selectedSection) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/attendance/?section=${selectedSection}`);
      // Filter by date range on the client side
      const filtered = res.data.filter((r: any) => {
        if (startDate && r.date < startDate) return false;
        if (endDate && r.date > endDate) return false;
        return true;
      });
      
      // Sort by date descending
      filtered.sort((a: any, b: any) => b.date.localeCompare(a.date));
      setRecords(filtered);

      // Calculate stats
      const present = filtered.filter((r: any) => r.status === 'PRESENT').length;
      const absent = filtered.filter((r: any) => r.status === 'ABSENT').length;
      const late = filtered.filter((r: any) => r.status === 'LATE').length;
      const excused = filtered.filter((r: any) => r.status === 'EXCUSED').length;
      setStats({ present, absent, late, excused, total: filtered.length });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSection && startDate && endDate) {
      fetchHistory();
    }
  }, [selectedSection, startDate, endDate]);

  const getPercentage = (value: number) => {
    if (stats.total === 0) return '0';
    return ((value / stats.total) * 100).toFixed(1);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PRESENT: 'bg-success/10 text-success',
      ABSENT: 'bg-destructive/10 text-destructive',
      LATE: 'bg-warning/10 text-warning',
      EXCUSED: 'bg-primary/10 text-primary',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-muted text-muted-foreground'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance History & Reports</h1>
        <p className="text-sm text-muted-foreground">View attendance records and summary statistics.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex flex-col gap-1.5 w-48">
          <label className="text-xs font-medium text-muted-foreground">Section</label>
          <select
            className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 w-44">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <input
            type="date"
            className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 w-44">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <input
            type="date"
            className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Button variant="ghost" onClick={fetchHistory} isLoading={isLoading}>
          <BarChart3 size={16} className="mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats Summary Cards */}
      {stats.total > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Present</p>
            <p className="text-2xl font-bold text-success">{stats.present}</p>
            <p className="text-xs text-muted-foreground">{getPercentage(stats.present)}% of total</p>
          </div>
          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Absent</p>
            <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
            <p className="text-xs text-muted-foreground">{getPercentage(stats.absent)}% of total</p>
          </div>
          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Late</p>
            <p className="text-2xl font-bold text-warning">{stats.late}</p>
            <p className="text-xs text-muted-foreground">{getPercentage(stats.late)}% of total</p>
          </div>
          <div className="p-4 border rounded-lg bg-card shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Excused</p>
            <p className="text-2xl font-bold text-primary">{stats.excused}</p>
            <p className="text-xs text-muted-foreground">{getPercentage(stats.excused)}% of total</p>
          </div>
        </div>
      )}

      {/* Records Table */}
      <Table columns={['Date', 'Student', 'Status']}>
        {records.map((record, index) => (
          <tr key={index} className="transition-colors hover:bg-muted/50">
            <td className="p-4 font-medium">{record.date}</td>
            <td className="p-4">{record.student_name}</td>
            <td className="p-4">{getStatusBadge(record.status)}</td>
          </tr>
        ))}
        {records.length === 0 && !isLoading && (
          <tr>
            <td colSpan={3} className="p-8 text-center text-muted-foreground">
              No attendance records found for this period.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
};

export default AttendanceHistory;
