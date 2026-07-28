import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Upload, Plus } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

const roleColors: Record<string, { bg: string; color: string }> = {
  ADMIN: { bg: '#dc2626', color: '#ffffff' },
  TEACHER: { bg: '#000000', color: '#ffffff' },
  PARENT: { bg: '#f0f0f0', color: '#000000' },
  STUDENT: { bg: '#fef2f2', color: '#dc2626' },
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{message?: string, errors?: string[]}>({});
  const [isUploading, setIsUploading] = useState(false);

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
      setUploadStatus({
        errors: error.response?.data?.errors || [error.message]
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const style = roleColors[role] || { bg: '#f0f0f0', color: '#000000' };
    return (
      <span className="badge" style={{ backgroundColor: style.bg, color: style.color }}>
        {role}
      </span>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1>Users</h1>
          <p>{users.length} total users</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="ghost" onClick={() => setIsModalOpen(true)}>
            <Upload size={16} /> Bulk Upload
          </Button>
          <Button variant="primary">
            <Plus size={16} /> Add User
          </Button>
        </div>
      </div>

      <Table columns={['Username', 'Name', 'Email', 'Role']}>
        {users.map((u) => (
          <tr key={u.id}>
            <td style={{ fontWeight: 500 }}>{u.username}</td>
            <td>{u.first_name} {u.last_name}</td>
            <td>{u.email}</td>
            <td>{getRoleBadge(u.role)}</td>
          </tr>
        ))}
        {users.length === 0 && (
          <tr>
            <td colSpan={4} style={{ textAlign: 'center', color: '#666666', padding: '2rem' }}>
              No users found. Add users manually or use CSV upload.
            </td>
          </tr>
        )}
      </Table>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setUploadStatus({}); setFile(null); }} title="Bulk Upload Users">
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            Upload a CSV file with columns: <strong style={{ color: '#000000' }}>username, email, first_name, last_name, role, phone_number</strong>
          </p>
          
          <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center' }}>
            <input type="file" accept=".csv" onChange={handleFileChange} style={{ fontSize: '0.875rem' }} />
            {file && <p style={{ marginTop: '0.5rem', color: '#000000' }}>Selected: {file.name}</p>}
          </div>
          
          {uploadStatus.message && (
            <div style={{ padding: '0.75rem', backgroundColor: '#f0f0f0', color: '#000000', borderRadius: 'var(--radius-md)', marginTop: '1rem', fontSize: '0.875rem' }}>
              ✓ {uploadStatus.message}
            </div>
          )}
          
          {uploadStatus.errors && uploadStatus.errors.length > 0 && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: 'var(--radius-md)', marginTop: '1rem', fontSize: '0.875rem', maxHeight: '120px', overflowY: 'auto' }}>
              <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                {uploadStatus.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpload} isLoading={isUploading} disabled={!file}>Upload</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
