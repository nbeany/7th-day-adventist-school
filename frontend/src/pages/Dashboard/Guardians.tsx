import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { UserPlus } from 'lucide-react';

const Guardians: React.FC = () => {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  const [newGuardian, setNewGuardian] = useState({
    user: '', relationship_to_student: '', emergency_contact_number: '', occupation: ''
  });

  const fetchGuardians = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/guardians/');
      setGuardians(response.data);
    } catch (error) {
      console.error("Failed to fetch guardians", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await api.get('/users/');
      const parentUsers = response.data.filter((u: any) => u.role === 'PARENT');
      setAvailableUsers(parentUsers);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchGuardians();
  }, []);

  const openAddModal = () => {
    fetchAvailableUsers();
    setIsAddModalOpen(true);
    setFormError('');
    setNewGuardian({ user: '', relationship_to_student: '', emergency_contact_number: '', occupation: '' });
  };

  const handleAddGuardian = async () => {
    if (!newGuardian.user) {
      setFormError('Please select a user account.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await api.post('/guardians/', {
        user_id: parseInt(newGuardian.user),
        relationship_to_student: newGuardian.relationship_to_student,
        emergency_contact_number: newGuardian.emergency_contact_number,
        occupation: newGuardian.occupation,
      });
      setIsAddModalOpen(false);
      fetchGuardians();
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(' ');
        setFormError(msgs);
      } else {
        setFormError('Failed to create guardian profile.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parent & Guardian Contacts</h1>
          <p className="text-sm text-muted-foreground">Manage emergency contacts and linked student relationships.</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <UserPlus size={16} className="mr-2" /> Add Guardian
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading guardians...</div>
      ) : (
        <div className="animate-fade-in">
          <Table columns={['Name', 'Email', 'Relationship', 'Emergency Contact', 'Occupation']}>
            {guardians.map((guardian) => (
              <tr key={guardian.id} className="transition-colors hover:bg-muted/50 cursor-pointer">
                <td className="p-4 font-medium">{guardian.user.first_name} {guardian.user.last_name}</td>
                <td className="p-4 text-muted-foreground">{guardian.user.email}</td>
                <td className="p-4">{guardian.relationship_to_student || '—'}</td>
                <td className="p-4">{guardian.emergency_contact_number || '—'}</td>
                <td className="p-4">{guardian.occupation || '—'}</td>
              </tr>
            ))}
            {guardians.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No guardian profiles found. Create a User with role "Parent" first, then add their profile here.
                </td>
              </tr>
            )}
          </Table>
        </div>
      )}

      {/* Add Guardian Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Guardian Profile">
        {formError && (
          <div className="p-3 mb-4 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">{formError}</div>
        )}
        <div className="space-y-1">
          <div className="flex flex-col w-full mb-4">
            <label className="mb-1.5 text-sm font-medium text-foreground">Link to User Account *</label>
            <select
              className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground"
              value={newGuardian.user}
              onChange={(e) => setNewGuardian({...newGuardian, user: e.target.value})}
            >
              <option value="">Select a parent user...</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col w-full mb-4">
            <label className="mb-1.5 text-sm font-medium text-foreground">Relationship</label>
            <select
              className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground"
              value={newGuardian.relationship_to_student}
              onChange={(e) => setNewGuardian({...newGuardian, relationship_to_student: e.target.value})}
            >
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
          <Input label="Occupation" value={newGuardian.occupation} onChange={(e) => setNewGuardian({...newGuardian, occupation: e.target.value})} placeholder="e.g. Teacher, Engineer..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddGuardian} isLoading={isSaving}>Create Profile</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Guardians;
