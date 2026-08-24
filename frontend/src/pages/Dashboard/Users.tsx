import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Upload, Plus } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

const roleStyles: Record<string, string> = {
  ADMIN: "bg-primary text-primary-foreground",
  TEACHER: "bg-secondary text-secondary-foreground",
  PARENT: "bg-accent text-accent-foreground",
  STUDENT: "bg-muted text-muted-foreground",
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{message?: string, errors?: string[]}>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [newUser, setNewUser] = useState({
    username: '', email: '', first_name: '', last_name: '', role: 'TEACHER', password: '', phone_number: ''
  });

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      fetchUsers();
    } catch (error: any) {
      setUploadStatus({ errors: error.response?.data?.errors || [error.message] });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) {
      setFormError('Username and password are required.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await api.post('/users/', newUser);
      setIsAddModalOpen(false);
      setNewUser({ username: '', email: '', first_name: '', last_name: '', role: 'TEACHER', password: '', phone_number: '' });
      fetchUsers();
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(' ');
        setFormError(msgs);
      } else {
        setFormError('Failed to create user.');
      }
    } finally {
      setIsSaving(false);
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
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
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

      <Table columns={['Username', 'Name', 'Email', 'Role']}>
        {users.filter(u => {
          const q = searchQuery.toLowerCase();
          return u.first_name.toLowerCase().includes(q) ||
                 u.last_name.toLowerCase().includes(q) ||
                 u.username.toLowerCase().includes(q) ||
                 (u.email || '').toLowerCase().includes(q) ||
                 u.role.toLowerCase().includes(q);
        }).map((u) => (
          <tr key={u.id} className="transition-colors hover:bg-muted/50">
            <td className="p-4 font-medium">{u.username}</td>
            <td className="p-4">{u.first_name} {u.last_name}</td>
            <td className="p-4 text-muted-foreground">{u.email}</td>
            <td className="p-4">{getRoleBadge(u.role)}</td>
          </tr>
        ))}
        {users.length === 0 && (
          <tr>
            <td colSpan={4} className="p-8 text-center text-muted-foreground">
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

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setFormError(''); }} title="Add New User">
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
          <Input label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} placeholder="••••••••" required />
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
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddUser} isLoading={isSaving}>Create User</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
