import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { UserPlus } from 'lucide-react';

const Students: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  const [newStudent, setNewStudent] = useState({
    user: '', date_of_birth: '', gender: '', address: '', medical_notes: ''
  });

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/students/');
      setStudents(response.data);
    } catch (error) {
      console.error("Failed to fetch students", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await api.get('/users/');
      // Filter to STUDENT role users who don't already have a profile
      const studentUsers = response.data.filter((u: any) => u.role === 'STUDENT');
      setAvailableUsers(studentUsers);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openAddModal = () => {
    fetchAvailableUsers();
    setIsAddModalOpen(true);
    setFormError('');
    setNewStudent({ user: '', date_of_birth: '', gender: '', address: '', medical_notes: '' });
  };

  const handleAddStudent = async () => {
    if (!newStudent.user) {
      setFormError('Please select a user account.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await api.post('/students/', {
        user_id: parseInt(newStudent.user),
        date_of_birth: newStudent.date_of_birth || null,
        gender: newStudent.gender || null,
        address: newStudent.address,
        medical_notes: newStudent.medical_notes,
      });
      setIsAddModalOpen(false);
      fetchStudents();
    } catch (error: any) {
      const data = error.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(' ');
        setFormError(msgs);
      } else {
        setFormError('Failed to create student profile.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Student Profiles</h1>
          <p className="text-sm text-muted-foreground">Manage student bios and class enrollments.</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <UserPlus size={16} className="mr-2" /> Add Student
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading students...</div>
      ) : (
        <div className="animate-fade-in">
          <Table columns={['Name', 'Username', 'Gender', 'DOB', 'Primary Guardian', 'Current Class']}>
            {students.map((student) => {
              const primaryGuardian = student.guardian_relations?.find((rel: any) => rel.is_primary_contact)?.guardian;
              const currentEnrollment = student.enrollments?.find((e: any) => e.status === 'ACTIVE');
              
              return (
                <tr key={student.id} className="transition-colors hover:bg-muted/50 cursor-pointer">
                  <td className="p-4 font-medium">{student.user.first_name} {student.user.last_name}</td>
                  <td className="p-4 text-muted-foreground">{student.user.username}</td>
                  <td className="p-4">{student.gender || '—'}</td>
                  <td className="p-4">{student.date_of_birth || '—'}</td>
                  <td className="p-4">
                    {primaryGuardian ? `${primaryGuardian.user.first_name} ${primaryGuardian.user.last_name}` : <span className="text-muted-foreground italic">None</span>}
                  </td>
                  <td className="p-4">
                    {currentEnrollment ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {currentEnrollment.section_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Not enrolled</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No student profiles found. Create a User with role "Student" first, then add their profile here.
                </td>
              </tr>
            )}
          </Table>
        </div>
      )}

      {/* Add Student Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Student Profile">
        {formError && (
          <div className="p-3 mb-4 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">{formError}</div>
        )}
        <div className="space-y-1">
          <div className="flex flex-col w-full mb-4">
            <label className="mb-1.5 text-sm font-medium text-foreground">Link to User Account *</label>
            <select
              className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground"
              value={newStudent.user}
              onChange={(e) => setNewStudent({...newStudent, user: e.target.value})}
            >
              <option value="">Select a student user...</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>
              ))}
            </select>
          </div>
          <Input label="Date of Birth" type="date" value={newStudent.date_of_birth} onChange={(e) => setNewStudent({...newStudent, date_of_birth: e.target.value})} />
          <div className="flex flex-col w-full mb-4">
            <label className="mb-1.5 text-sm font-medium text-foreground">Gender</label>
            <select
              className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground"
              value={newStudent.gender}
              onChange={(e) => setNewStudent({...newStudent, gender: e.target.value})}
            >
              <option value="">Select...</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <Input label="Address" value={newStudent.address} onChange={(e) => setNewStudent({...newStudent, address: e.target.value})} placeholder="Home address" />
          <Input label="Medical Notes" value={newStudent.medical_notes} onChange={(e) => setNewStudent({...newStudent, medical_notes: e.target.value})} placeholder="Any allergies, conditions..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddStudent} isLoading={isSaving}>Create Profile</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Students;
