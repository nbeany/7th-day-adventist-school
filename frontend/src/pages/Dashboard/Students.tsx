import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { UserPlus, Link, Pencil, Trash2, KeyRound } from 'lucide-react';

const Students: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [availableGuardians, setAvailableGuardians] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ username: string; password: string } | null>(null);

  const [newStudent, setNewStudent] = useState({
    first_name: '', last_name: '', username: '', password: '',
    date_of_birth: '', gender: '', address: '', medical_notes: '',
    section_id: '', term_id: ''
  });

  const [editData, setEditData] = useState({
    first_name: '', last_name: '', email: '', phone_number: '',
    date_of_birth: '', gender: '', address: '', medical_notes: ''
  });

  const [linkData, setLinkData] = useState({
    guardian_id: '', is_primary_contact: false
  });

  const [enrollData, setEnrollData] = useState({
    section_id: '', term_id: ''
  });

  const fetchStudents = async (search = '') => {
    setIsLoading(true);
    try {
      const response = await api.get(`/students/${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setStudents(response.data);
    } catch (error) {
      console.error("Failed to fetch students", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGuardians = async () => {
    try {
      const response = await api.get('/guardians/?page_size=1000');
      setAvailableGuardians(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [secRes, termRes] = await Promise.all([
        api.get('/sections/'),
        api.get('/terms/')
      ]);
      setSections(secRes.data);
      setTerms(termRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    fetchGuardians();
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchStudents(debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    if (isAddModalOpen && (newStudent.first_name || newStudent.last_name)) {
      const fn = newStudent.first_name.trim().toLowerCase();
      const ln = newStudent.last_name.trim().toLowerCase();
      const generated = `${fn}${fn && ln ? '.' : ''}${ln}`.replace(/\s+/g, '');
      setNewStudent(prev => ({...prev, username: generated}));
    }
  }, [newStudent.first_name, newStudent.last_name, isAddModalOpen]);

  const openAddModal = () => {
    setIsAddModalOpen(true);
    setFormError('');
    setNewStudent({ 
      first_name: '', last_name: '', username: '', password: '', 
      date_of_birth: '', gender: '', address: '', medical_notes: '',
      section_id: '', term_id: '' 
    });
  };

  const openLinkModal = (studentId: string) => {
    setSelectedStudentId(studentId);
    setLinkData({ guardian_id: '', is_primary_contact: false });
    setIsLinkModalOpen(true);
  };

  const openEnrollModal = (studentId: string) => {
    setSelectedStudentId(studentId);
    setEnrollData({ section_id: '', term_id: '' });
    setIsEnrollModalOpen(true);
  };

  const handleAddStudent = async () => {
    if (!newStudent.first_name || !newStudent.password || !newStudent.username) {
      setFormError('Please fill in Name, Username, and Password.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      const res = await api.post('/students/register/', {
        user: {
          first_name: newStudent.first_name,
          last_name: newStudent.last_name,
          username: newStudent.username,
          password: newStudent.password,
        },
        profile: {
          date_of_birth: newStudent.date_of_birth || null,
          gender: newStudent.gender || null,
          address: newStudent.address,
          medical_notes: newStudent.medical_notes,
        }
      });
      
      const studentId = res.data.id;
      
      if (newStudent.section_id && newStudent.term_id) {
        await api.post('/student-enrollments/', {
          student: studentId,
          section: parseInt(newStudent.section_id),
          term: parseInt(newStudent.term_id),
          status: 'ACTIVE'
        });
      }

      setIsAddModalOpen(false);
      fetchStudents(debouncedSearch);
    } catch (error: any) {
      const data = error.response?.data;
      if (data && data.error) {
        setFormError(data.error);
      } else {
        setFormError('Failed to register student.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (student: any) => {
    setEditingStudent(student);
    setFormError('');
    setEditData({
      first_name: student.user.first_name || '',
      last_name: student.user.last_name || '',
      email: student.user.email || '',
      phone_number: student.user.phone_number || '',
      date_of_birth: student.date_of_birth || '',
      gender: student.gender || '',
      address: student.address || '',
      medical_notes: student.medical_notes || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setIsSaving(true);
    setFormError('');
    try {
      await api.patch(`/users/${editingStudent.user.id}/`, {
        first_name: editData.first_name,
        last_name: editData.last_name,
        email: editData.email,
        phone_number: editData.phone_number
      });
      await api.patch(`/students/${editingStudent.id}/`, {
        date_of_birth: editData.date_of_birth || null,
        gender: editData.gender || null,
        address: editData.address,
        medical_notes: editData.medical_notes
      });
      setEditingStudent(null);
      fetchStudents(debouncedSearch);
    } catch (error: any) {
      const data = error.response?.data;
      setFormError(data ? Object.values(data).flat().join(' ') : 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (student: any) => {
    if (!window.confirm(`Delete ${student.user.first_name} ${student.user.last_name}? This also removes their enrollments, grades, attendance, and guardian links, and cannot be undone.`)) return;
    try {
      await api.delete(`/users/${student.user.id}/`);
      fetchStudents(debouncedSearch);
    } catch (error) {
      alert('Failed to delete student.');
    }
  };

  const handleResetPassword = async (student: any) => {
    if (!window.confirm(`Reset the password for ${student.user.username}? They'll be required to set a new one on next login.`)) return;
    try {
      const res = await api.post(`/users/${student.user.id}/reset_password/`);
      setResetPasswordResult({ username: student.user.username, password: res.data.temporary_password });
    } catch (error) {
      alert('Failed to reset password.');
    }
  };

  const handleLinkGuardian = async () => {
    if (!linkData.guardian_id) return;
    setIsSaving(true);
    try {
      await api.post('/student-guardian-relations/', {
        student: parseInt(selectedStudentId!),
        guardian: parseInt(linkData.guardian_id),
        is_primary_contact: linkData.is_primary_contact
      });
      setIsLinkModalOpen(false);
      fetchStudents(debouncedSearch);
    } catch (error) {
      console.error(error);
      alert('Failed to link guardian. They might already be linked.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnrollStudent = async () => {
    if (!enrollData.section_id || !enrollData.term_id) return;
    setIsSaving(true);
    try {
      await api.post('/student-enrollments/', {
        student: parseInt(selectedStudentId!),
        section: parseInt(enrollData.section_id),
        term: parseInt(enrollData.term_id),
        status: 'ACTIVE'
      });
      setIsEnrollModalOpen(false);
      fetchStudents(debouncedSearch);
    } catch (error) {
      console.error(error);
      alert('Failed to enroll student. They might already be enrolled in this term.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Student Profiles</h1>
          <p className="text-sm text-muted-foreground">Manage student bios, guardians, and class enrollments.</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <UserPlus size={16} className="mr-2" /> Register Student
        </Button>
      </div>

      <div className="mb-4">
        <Input 
          placeholder="Search students by name or username..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading students...</div>
      ) : (
        <div className="animate-fade-in">
          <Table columns={['Name', 'Username', 'Gender', 'DOB', 'Guardians', 'Current Class', 'Actions']}>
            {students.map((student) => {
              const currentEnrollment = student.enrollments?.find((e: any) => e.status === 'ACTIVE');

              return (
                <tr key={student.id} className="transition-colors hover:bg-muted/50">
                  <td className="p-4 font-medium">{student.user.first_name} {student.user.last_name}</td>
                  <td className="p-4 text-muted-foreground">{student.user.username}</td>
                  <td className="p-4">{student.gender || '—'}</td>
                  <td className="p-4">{student.date_of_birth || '—'}</td>
                  <td className="p-4">
                    {student.guardian_relations?.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {student.guardian_relations.map((rel: any) => (
                          <span key={rel.id} className="text-xs">
                            {rel.guardian_detail?.user.first_name} {rel.guardian_detail?.user.last_name} 
                            {rel.is_primary_contact && <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1 rounded uppercase">Primary</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">No Guardians</span>
                    )}
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
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEnrollModal(student.id)}>
                        Enroll
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openLinkModal(student.id)}>
                        <Link size={14} className="mr-2" /> Link Guardian
                      </Button>
                      <Button variant="ghost" className="px-2" title="Edit" onClick={() => openEditModal(student)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" className="px-2" title="Reset Password" onClick={() => handleResetPassword(student)}>
                        <KeyRound size={14} />
                      </Button>
                      <Button variant="ghost" className="px-2 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => handleDeleteStudent(student)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No student profiles found. Click "Register Student" to add one.
                </td>
              </tr>
            )}
          </Table>
        </div>
      )}

      {/* Add Student Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Student">
        {formError && (
          <div className="p-3 mb-4 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">{formError}</div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" value={newStudent.first_name} onChange={(e) => setNewStudent({...newStudent, first_name: e.target.value})} />
            <Input label="Last Name *" value={newStudent.last_name} onChange={(e) => setNewStudent({...newStudent, last_name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Username *" value={newStudent.username} onChange={(e) => setNewStudent({...newStudent, username: e.target.value})} />
            <Input label="Password *" type="password" value={newStudent.password} onChange={(e) => setNewStudent({...newStudent, password: e.target.value})} />
          </div>
          <hr className="my-2 border-border" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date of Birth" type="date" value={newStudent.date_of_birth} onChange={(e) => setNewStudent({...newStudent, date_of_birth: e.target.value})} />
            <div className="flex flex-col w-full">
              <label className="mb-1.5 text-sm font-medium text-foreground">Gender</label>
              <select className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground" value={newStudent.gender} onChange={(e) => setNewStudent({...newStudent, gender: e.target.value})}>
                <option value="">Select...</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
          </div>
          <hr className="my-2 border-border" />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col w-full">
              <label className="mb-1.5 text-sm font-medium text-foreground">Term (Optional)</label>
              <select className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground" value={newStudent.term_id} onChange={(e) => setNewStudent({...newStudent, term_id: e.target.value})}>
                <option value="">Choose a term...</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col w-full">
              <label className="mb-1.5 text-sm font-medium text-foreground">Class (Optional)</label>
              <select className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground" value={newStudent.section_id} onChange={(e) => setNewStudent({...newStudent, section_id: e.target.value})}>
                <option value="">Choose a class...</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Input label="Address" value={newStudent.address} onChange={(e) => setNewStudent({...newStudent, address: e.target.value})} placeholder="Home address" />
          <Input label="Medical Notes" value={newStudent.medical_notes} onChange={(e) => setNewStudent({...newStudent, medical_notes: e.target.value})} placeholder="Any allergies, conditions..." />
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddStudent} isLoading={isSaving}>Register Student</Button>
        </div>
      </Modal>

      {/* Link Guardian Modal */}
      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Link Guardian">
        <div className="space-y-4">
          <div className="flex flex-col w-full">
            <label className="mb-1.5 text-sm font-medium text-foreground">Select Guardian</label>
            <select className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground" value={linkData.guardian_id} onChange={(e) => setLinkData({...linkData, guardian_id: e.target.value})}>
              <option value="">Choose an existing guardian...</option>
              {availableGuardians.map(g => (
                <option key={g.id} value={g.id}>{g.user.first_name} {g.user.last_name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="is_primary" checked={linkData.is_primary_contact} onChange={(e) => setLinkData({...linkData, is_primary_contact: e.target.checked})} className="rounded border-border text-primary" />
            <label htmlFor="is_primary" className="text-sm font-medium">Set as Primary Contact</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setIsLinkModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleLinkGuardian} isLoading={isSaving} disabled={!linkData.guardian_id}>Link</Button>
        </div>
      </Modal>

      {/* Enroll Modal */}
      <Modal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)} title="Enroll in Class">
        <div className="space-y-4">
          <div className="flex flex-col w-full">
            <label className="mb-1.5 text-sm font-medium text-foreground">Select Term</label>
            <select className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground" value={enrollData.term_id} onChange={(e) => setEnrollData({...enrollData, term_id: e.target.value})}>
              <option value="">Choose a term...</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col w-full">
            <label className="mb-1.5 text-sm font-medium text-foreground">Select Class (Section)</label>
            <select className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground" value={enrollData.section_id} onChange={(e) => setEnrollData({...enrollData, section_id: e.target.value})}>
              <option value="">Choose a class...</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setIsEnrollModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleEnrollStudent} isLoading={isSaving} disabled={!enrollData.section_id || !enrollData.term_id}>Enroll</Button>
        </div>
      </Modal>

      {/* Edit Student Modal */}
      <Modal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} title="Edit Student">
        {formError && (
          <div className="p-3 mb-4 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">{formError}</div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={editData.first_name} onChange={(e) => setEditData({...editData, first_name: e.target.value})} />
            <Input label="Last Name" value={editData.last_name} onChange={(e) => setEditData({...editData, last_name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} />
            <Input label="Phone Number" value={editData.phone_number} onChange={(e) => setEditData({...editData, phone_number: e.target.value})} placeholder="+251..." />
          </div>
          <hr className="my-2 border-border" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date of Birth" type="date" value={editData.date_of_birth} onChange={(e) => setEditData({...editData, date_of_birth: e.target.value})} />
            <div className="flex flex-col w-full">
              <label className="mb-1.5 text-sm font-medium text-foreground">Gender</label>
              <select className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground" value={editData.gender} onChange={(e) => setEditData({...editData, gender: e.target.value})}>
                <option value="">Select...</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
          </div>
          <Input label="Address" value={editData.address} onChange={(e) => setEditData({...editData, address: e.target.value})} />
          <Input label="Medical Notes" value={editData.medical_notes} onChange={(e) => setEditData({...editData, medical_notes: e.target.value})} />
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setEditingStudent(null)}>Cancel</Button>
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

export default Students;
