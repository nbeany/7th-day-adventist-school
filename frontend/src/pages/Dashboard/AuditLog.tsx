import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { History } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  'user.role_change': 'Role changed',
  'user.delete': 'User deleted',
  'user.password_reset': 'Password reset',
  'user.bulk_create': 'Bulk user import',
  'payment.create': 'Payment recorded',
  'grade.bulk_update': 'Grades saved',
  'term_grade.compute': 'Term grades computed',
  'enrollment.promote': 'Students promoted',
};

const describeDetails = (action: string, details: any): string => {
  if (!details) return '';
  switch (action) {
    case 'user.role_change':
      return `${details.old_role} → ${details.new_role}`;
    case 'user.password_reset':
    case 'user.delete':
      return `user #${details.target_user_id}`;
    case 'user.bulk_create':
      return `${(details.usernames || []).length} account(s), ${details.error_count || 0} error(s)`;
    case 'payment.create':
      return `invoice #${details.invoice_id} · ${details.amount} (${details.method})`;
    case 'grade.bulk_update':
      return `assignment #${details.assignment_id} · ${details.student_count} student(s)`;
    case 'term_grade.compute':
      return `section #${details.section_id}, subject #${details.subject_id}, term #${details.term_id} · ${details.student_count} student(s)`;
    case 'enrollment.promote':
      return `${details.student_count} student(s)`;
    default:
      return JSON.stringify(details);
  }
};

const AuditLog: React.FC = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchLogs = async (action = '') => {
    setIsLoading(true);
    try {
      const res = await api.get(`/audit-logs/${action ? `?action=${encodeURIComponent(action)}` : ''}`);
      setEntries(res.data);
      setNextUrl((res as any).pagination?.next || null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleLoadMore = async () => {
    if (!nextUrl) return;
    setIsLoadingMore(true);
    try {
      const res = await api.get(nextUrl);
      setEntries(prev => [...prev, ...res.data]);
      setNextUrl((res as any).pagination?.next || null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(actionFilter);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">A record of sensitive actions: role changes, deletions, password resets, payments, and bulk grade/attendance writes.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 items-end max-w-md">
        <div className="flex-1">
          <Input
            placeholder="Filter by action (e.g. payment, role_change)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" isLoading={isLoading}>Filter</Button>
      </form>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading audit log...</div>
      ) : (
        <>
          <Table columns={['When', 'Who', 'Action', 'Details']}>
            {entries.map((entry) => (
              <tr key={entry.id} className="transition-colors hover:bg-muted/50">
                <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="p-4 font-medium">{entry.actor_username || 'system'}</td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {entry.object_repr}{entry.object_repr && ' · '}{describeDetails(entry.action, entry.details)}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  <History size={40} className="mx-auto mb-3 opacity-20" />
                  No audit entries found.
                </td>
              </tr>
            )}
          </Table>

          {nextUrl && (
            <div className="flex justify-center">
              <Button variant="ghost" onClick={handleLoadMore} isLoading={isLoadingMore}>Load More</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuditLog;
