import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { UserPlus, Pencil, Trash2, KeyRound } from 'lucide-react';

const Guardians: React.FC = () => {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingGuardian, setEditingGuardian] = useState<any>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ username: string; password: string } | null>(null);

  const [newGuardian, setNewGuardian] = useState({
    first_name: '', last_name: '', username: '', password: '', email: '',
    relationship_to_student: '', emergency_contact_number: '', occupation: ''
  });

  const [editData, setEditData] = useState({
    first_name: '', last_name: '', email: '', phone_number: '',
    relationship_to_student: '', emergency_contact_number: '', occupation: ''
  });

  const fetchGuardians = async (search = '') => {
    setIsLoading(true);
    try {
      const response = await api.get(`/guardians/${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setGuardians(response.data);
    } catch (error) {
      console.error("Failed to fetch guardians", error);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    fetchGuardians(debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    if (isAddModalOpen && (newGuardian.first_name || newGuardian.last_name)) {
      const fn = newGuardian.first_name.trim().toLowerCase();
      const ln = newGuardian.last_name.trim().toLowerCase();
      const generated = `${fn}${fn && ln ? '.' : ''}${ln}`.replace(/\s+/g, '');
      setNewGuardian(prev => ({...prev, username: generated}));
    }
  }, [newGuardian.first_name, newGuardian.last_name, isAddModalOpen]);

  const openAddModal = () => {
    setIsAddModalOpen(true);
    setFormError('');
    setNewGuardian({ first_name: '', last_name: '', username: '', password: '', email: '', relationship_to_student: '', emergency_contact_number: '', occupation: '' });
  };

  const handleAddGuardian = async () => {
    if (!newGuardian.first_name || !newGuardian.password || !newGuardian.username) {
      setFormError('Please fill in Name, Username, and Password.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await api.post('/guardians/register/', {
        user: {
          first_name: newGuardian.first_name,
          last_name: newGuardian.last_name,
          username: newGuardian.username,
          password: newGuardian.password,
          email: newGuardian.email,
        },
        profile: {
          relationship_to_student: newGuardian.relationship_to_student,
          emergency_contact_number: newGuardian.emergency_contact_number,
          occupation: newGuardian.occupation,
        }
      });
      setIsAddModalOpen(false);
      fetchGuardians(debouncedSearch);
    } catch (error: any) {
      const data = error.response?.data;
      if (data && data.error) {
        setFormError(data.error);
      } else {
        setFormError('Failed to register guardian.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (guardian: any) => {
    setEditingGuardian(guardian);
    setFormError('');
    setEditData({
      first_name: guardian.user.first_name || '',
      last_name: guardian.user.last_name || '',
      email: guardian.user.email || '',
      phone_number: guardian.user.phone_number || '',
      relationship_to_student: guardian.relationship_to_student || '',
      emergency_contact_number: guardian.emergency_contact_number || '',
      occupation: guardian.occupation || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingGuardian) return;
    setIsSaving(true);
    setFormError('');
    try {
      await api.patch(`/users/${editingGuardian.user.id}/`, {
        first_name: editData.first_name,
        last_name: editData.last_name,
        email: editData.email,
        phone_number: editData.phone_number
      });
      await api.patch(`/guardians/${editingGuardian.id}/`, {
        relationship_to_student: editData.relationship_to_student,
        emergency_contact_number: editData.emergency_contact_number,
        occupation: editData.occupation
      });
      setEditingGuardian(null);
      fetchGuardians(debouncedSearch);
    } catch (error: any) {
      const data = error.response?.data;
      setFormError(data ? Object.values(data).flat().join(' ') : 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGuardian = async (guardian: any) => {
    if (!window.confirm(`Delete ${guardian.user.first_name} ${guardian.user.last_name}? This also removes their links to any students, and cannot be undone.`)) return;
    try {
      await api.delete(`/users/${guardian.user.id}/`);
      fetchGuardians(debouncedSearch);
    } catch (error) {
      alert('Failed to delete guardian.');
    }
  };

  const handleResetPassword = async (guardian: any) => {
    if (!window.confirm(`Reset the password for ${guardian.user.username}? They'll be required to set a new one on next login.`)) return;
    try {
      const res = await api.post(`/users/${guardian.user.id}/reset_password/`);
      setResetPasswordResult({ username: guardian.user.username, password: res.data.temporary_password });
    } catch (error) {
      alert('Failed to reset password.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parent & Guardian Contacts</h1>
          <p className="text-sm text-muted-foreground">Manage emergency contacts. Link them to students from the Students page.</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <UserPlus size={16} className="mr-2" /> Register Guardian
        </Button>
      </div>

      <div className="mb-4">
        <Input 
          placeholder="Search guardians by name or email..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading guardians...</div>
      ) : (
        <div className="animate-fade-in">
          <Table columns={['Name', 'Email', 'Relationship', 'Emergency Contact', 'Occupation', 'Linked Students', '']}>
            {guardians.map((guardian) => (
              <tr key={guardian.id} className="transition-colors hover:bg-muted/50">
                <td className="p-4 font-medium">{guardian.user.first_name} {guardian.user.last_name}</td>
                <td className="p-4 text-muted-foreground">{guardian.user.email}</td>
                <td className="p-4">{guardian.relationship_to_student || '—'}</td>
                <td className="p-4">{guardian.emergency_contact_number || '—'}</td>
                <td className="p-4">{guardian.occupation || '—'}</td>
                <td className="p-4">
                  {guardian.student_relations?.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {guardian.student_relations.map((rel: any) => (
                        <span key={rel.id} className="text-xs">
                          {rel.first_name} {rel.last_name}
                          {rel.is_primary && <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1 rounded uppercase">Primary</span>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">No students linked</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" className="px-2" title="Edit" onClick={() => openEditModal(guardian)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" className="px-2" title="Reset Password" onClick={() => handleResetPassword(guardian)}>
                      <KeyRound size={14} />
                    </Button>
                    <Button variant="ghost" className="px-2 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => handleDeleteGuardian(guardian)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {guardians.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No guardian profiles found. Click "Register Guardian" to add one.
                </td>
              </tr>
            )}
          </Table>
        </div>
      )}

      {/* Add Guardian Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Guardian">
        {formError && (
          <div className="p-3 mb-4 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">{formError}</div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" value={newGuardian.first_name} onChange={(e) => setNewGuardian({...newGuardian, first_name: e.target.value})} />
            <Input label="Last Name *" value={newGuardian.last_name} onChange={(e) => setNewGuardian({...newGuardian, last_name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Username *" value={newGuardian.username} onChange={(e) => setNewGuardian({...newGuardian, username: e.target.value})} />
            <Input label="Password *" type="password" value={newGuardian.password} onChange={(e) => setNewGuardian({...newGuardian, password: e.target.value})} />
          </div>
          <Input label="Email Address" type="email" value={newGuardian.email} onChange={(e) => setNewGuardian({...newGuardian, email: e.target.value})} />
          
          <hr className="my-2 border-border" />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col w-full">
              <label className="mb-1.5 text-sm font-medium text-foreground">Relationship</label>
              <select className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground" value={newGuardian.relationship_to_student} onChange={(e) => setNewGuardian({...newGuardian, relationship_to_student: e.target.value})}>
                <option value="">Select...</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Uncle">Uncle</option>
                <option value="Aunt">Aunt</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <Input label="Emergency Contact Number" value={newGuardian.emergency_contact_number} onChange={(e) => setNewGuardian({...newGuardian, emergency_contact_number: e.target.value})} placeholder="+251..." />
          </div>
          <Input label="Occupation" value={newGuardian.occupation} onChange={(e) => setNewGuardian({...newGuardian, occupation: e.target.value})} placeholder="e.g. Teacher, Engineer..." />
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddGuardian} isLoading={isSaving}>Register Guardian</Button>
        </div>
      </Modal>

      {/* Edit Guardian Modal */}
      <Modal isOpen={!!editingGuardian} onClose={() => setEditingGuardian(null)} title="Edit Guardian">
        {formError && (
          <div className="p-3 mb-4 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">{formError}</div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={editData.first_name} onChange={(e) => setEditData({...editData, first_name: e.target.value})} />
            <Input label="Last Name" value={editData.last_name} onChange={(e) => setEditData({...editData, last_name: e.target.value})} />
          </div>
          <Input label="Email" type="email" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} />
          <hr className="my-2 border-border" />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col w-full">
              <label className="mb-1.5 text-sm font-medium text-foreground">Relationship</label>
              <select className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground" value={editData.relationship_to_student} onChange={(e) => setEditData({...editData, relationship_to_student: e.target.value})}>
                <option value="">Select...</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Uncle">Uncle</option>
                <option value="Aunt">Aunt</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <Input label="Emergency Contact Number" value={editData.emergency_contact_number} onChange={(e) => setEditData({...editData, emergency_contact_number: e.target.value})} placeholder="+251..." />
          </div>
          <Input label="Occupation" value={editData.occupation} onChange={(e) => setEditData({...editData, occupation: e.target.value})} />
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setEditingGuardian(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveEdit} isLoading={isSaving}>Save Changes</Button>
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

export default Guardians;
