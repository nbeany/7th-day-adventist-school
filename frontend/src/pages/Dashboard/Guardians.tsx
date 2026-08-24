import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { UserPlus } from 'lucide-react';

const Guardians: React.FC = () => {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [newGuardian, setNewGuardian] = useState({
    first_name: '', last_name: '', username: '', password: '', email: '',
    relationship_to_student: '', emergency_contact_number: '', occupation: ''
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

  useEffect(() => {
    fetchGuardians();
  }, []);

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
      fetchGuardians();
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
          <Table columns={['Name', 'Email', 'Relationship', 'Emergency Contact', 'Occupation', 'Linked Students']}>
            {guardians.filter(guardian => {
              const q = searchQuery.toLowerCase();
              return guardian.user.first_name.toLowerCase().includes(q) ||
                     guardian.user.last_name.toLowerCase().includes(q) ||
                     (guardian.user.email || '').toLowerCase().includes(q);
            }).map((guardian) => (
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
              </tr>
            ))}
            {guardians.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
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
    </div>
  );
};

export default Guardians;
