import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Upload, Plus, Pencil, Trash2, KeyRound } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone_number?: string;
}

const roleStyles: Record<string, string> = {
  ADMIN: "bg-primary text-primary-foreground",
  TEACHER: "bg-secondary text-secondary-foreground",
  PARENT: "bg-accent text-accent-foreground",
  STUDENT: "bg-muted text-muted-foreground",
};

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{message?: string, errors?: string[]}>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ username: string; password: string } | null>(null);

  const [newUser, setNewUser] = useState({
    username: '', email: '', first_name: '', last_name: '', role: 'TEACHER', password: '', phone_number: ''
  });

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const fetchUsers = async (search = '') => {
    try {
      const response = await api.get(`/users/${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  useEffect(() => {
    fetchUsers(debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    if (isAddModalOpen && (newUser.first_name || newUser.last_name)) {
      const fn = newUser.first_name.trim().toLowerCase();
      const ln = newUser.last_name.trim().toLowerCase();
      const generated = `${fn}${fn && ln ? '.' : ''}${ln}`.replace(/\s+/g, '');
      setNewUser(prev => ({...prev, username: generated}));
    }
  }, [newUser.first_name, newUser.last_name, isAddModalOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus({});
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/users/bulk_upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus(response.data);
      fetchUsers(debouncedSearch);
    } catch (error: any) {
      setUploadStatus({ errors: error.response?.data?.errors || [error.message] });
    } finally {
      setIsUploading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormError('');
    setNewUser({ username: '', email: '', first_name: '', last_name: '', role: 'TEACHER', password: '', phone_number: '' });
    setIsAddModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingId(u.id);
    setFormError('');
    setNewUser({ username: u.username, email: u.email || '', first_name: u.first_name, last_name: u.last_name, role: u.role, password: '', phone_number: u.phone_number || '' });
    setIsAddModalOpen(true);
  };

  const handleAddUser = async () => {
    if (!editingId && (!newUser.username || !newUser.password)) {
      setFormError('Username and password are required.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      if (editingId) {
        const { password, ...editablePayload } = newUser;
        await api.patch(`/users/${editingId}/`, editablePayload);
      } else {
        await api.post('/users/', newUser);
      }
      setIsAddModalOpen(false);
      setEditingId(null);
      setNewUser({ username: '', email: '', first_name: '', last_name: '', role: 'TEACHER', password: '', phone_number: '' });
      fetchUsers(debouncedSearch);
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(' ');
        setFormError(msgs);
      } else {
        setFormError('Failed to save user.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`Delete ${u.first_name} ${u.last_name} (${u.username})? This also removes all their related records (profile, grades, attendance, etc.) and cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}/`);
      fetchUsers(debouncedSearch);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const handleResetPassword = async (u: User) => {
    if (!window.confirm(`Reset the password for ${u.username}? They'll be required to set a new one on next login.`)) return;
    try {
      const res = await api.post(`/users/${u.id}/reset_password/`);
      setResetPasswordResult({ username: u.username, password: res.data.temporary_password });
    } catch (error) {
      alert('Failed to reset password.');
    }
  };

  const getRoleBadge = (role: string) => {
    const style = roleStyles[role] || "bg-muted text-muted-foreground";
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">{users.length} total users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setIsBulkModalOpen(true)}>
            <Upload size={16} /> Bulk Upload
          </Button>
          <Button variant="primary" onClick={openAddModal}>
            <Plus size={16} /> Add User
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by name, username, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Table columns={['Username', 'Name', 'Email', 'Role', '']}>
        {users.map((u) => (
          <tr key={u.id} className="transition-colors hover:bg-muted/50">
            <td className="p-4 font-medium">{u.username}</td>
            <td className="p-4">{u.first_name} {u.last_name}</td>
            <td className="p-4 text-muted-foreground">{u.email}</td>
            <td className="p-4">{getRoleBadge(u.role)}</td>
            <td className="p-4 text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" className="px-2" title="Edit" onClick={() => openEditModal(u)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" className="px-2" title="Reset Password" onClick={() => handleResetPassword(u)}>
                  <KeyRound size={14} />
                </Button>
                {currentUser?.user_id !== u.id && (
                  <Button variant="ghost" className="px-2 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => handleDeleteUser(u)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {users.length === 0 && (
          <tr>
            <td colSpan={5} className="p-8 text-center text-muted-foreground">
              No users found. Add users manually or use CSV upload.
            </td>
          </tr>
        )}
      </Table>

      {/* Bulk Upload Modal */}
      <Modal isOpen={isBulkModalOpen} onClose={() => { setIsBulkModalOpen(false); setUploadStatus({}); setFile(null); }} title="Bulk Upload Users">
        <div className="mb-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with columns: <strong className="font-medium text-foreground">username, email, first_name, last_name, role, phone_number</strong>
          </p>
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-muted-foreground/25 bg-muted/20">
            <input type="file" accept=".csv" onChange={handleFileChange} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
            {file && <p className="mt-2 text-sm text-muted-foreground">Selected: {file.name}</p>}
          </div>
          {uploadStatus.message && (
            <div className="p-3 text-sm border rounded-md bg-success/10 text-success border-success/20">✓ {uploadStatus.message}</div>
          )}
          {uploadStatus.errors && uploadStatus.errors.length > 0 && (
            <div className="p-3 overflow-y-auto text-sm border rounded-md max-h-32 bg-destructive/10 text-destructive border-destructive/20">
              <ul className="pl-4 list-disc">{uploadStatus.errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setIsBulkModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpload} isLoading={isUploading} disabled={!file}>Upload</Button>
        </div>
      </Modal>

      {/* Add / Edit User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setFormError(''); }} title={editingId ? 'Edit User' : 'Add New User'}>
        {formError && (
          <div className="p-3 mb-4 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">{formError}</div>
        )}
        <div className="space-y-1">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="First Name" value={newUser.first_name} onChange={(e) => setNewUser({...newUser, first_name: e.target.value})} placeholder="John" />
            <Input label="Last Name" value={newUser.last_name} onChange={(e) => setNewUser({...newUser, last_name: e.target.value})} placeholder="Doe" />
          </div>
          <Input label="Username" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} placeholder="johndoe" required />
          <Input label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder="john@school.com" />
          {!editingId && (
            <Input label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} placeholder="••••••••" required />
          )}
          <Input label="Phone Number" value={newUser.phone_number} onChange={(e) => setNewUser({...newUser, phone_number: e.target.value})} placeholder="+251..." />
          <div className="flex flex-col w-full mb-4">
            <label className="mb-1.5 text-sm font-medium text-foreground">Role</label>
            <select
              className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground"
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            >
              <option value="TEACHER">Teacher</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {editingId && (
            <p className="text-xs text-muted-foreground -mt-2">To change this user's password, use the reset-password action instead.</p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddUser} isLoading={isSaving}>{editingId ? 'Save Changes' : 'Create User'}</Button>
        </div>
      </Modal>

      {/* Reset Password Result */}
      <Modal isOpen={!!resetPasswordResult} onClose={() => setResetPasswordResult(null)} title="Password Reset">
        {resetPasswordResult && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this temporary password with <strong className="text-foreground">{resetPasswordResult.username}</strong> securely. They'll be required to set a new one the next time they log in.
            </p>
            <div className="p-3 font-mono text-sm text-center border rounded-md bg-muted select-all">
              {resetPasswordResult.password}
            </div>
          </div>
        )}
        <div className="flex justify-end pt-4">
          <Button variant="primary" onClick={() => setResetPasswordResult(null)}>Done</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
