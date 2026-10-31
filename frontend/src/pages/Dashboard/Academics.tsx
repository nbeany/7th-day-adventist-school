import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';

const tabStyle = (isActive: boolean) => (
  `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
    isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
  }`
);

const Academics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'terms' | 'grades' | 'subjects' | 'sections' | 'assignments' | 'teachers'>('terms');
  const [data, setData] = useState<any[]>([]);
  const [gradesList, setGradesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [termsList, setTermsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Teacher management modal (homeroom assignment + course assignments,
  // both in one place instead of switching between the Sections and
  // Course Assignments tabs).
  const [managingTeacher, setManagingTeacher] = useState<any>(null);
  const [homeroomSelection, setHomeroomSelection] = useState('');
  const [isSavingHomeroom, setIsSavingHomeroom] = useState(false);
  const [newAssignment, setNewAssignment] = useState<{ subject: string; sections: number[] }>({ subject: '', sections: [] });
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);

  // Bulk year-end promotion of a section's students into a new class/term.
  const [promotingSection, setPromotingSection] = useState<any>(null);
  const [promoteTarget, setPromoteTarget] = useState({ to_section_id: '', to_term_id: '' });
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    let endpoint = 'terms';
    if (activeTab === 'grades') endpoint = 'grade-levels';
    if (activeTab === 'subjects') endpoint = 'subjects';
    if (activeTab === 'sections') endpoint = 'sections';
    if (activeTab === 'assignments' || activeTab === 'teachers') endpoint = 'subject-teachers';

    try {
      const res = await api.get(`/${endpoint}/`);
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [gradesRes, teachersRes, subjectsRes, sectionsRes, termsRes] = await Promise.all([
        api.get('/grade-levels/'),
        api.get('/users/?role=TEACHER'),
        api.get('/subjects/'),
        api.get('/sections/'),
        api.get('/terms/')
      ]);
      setGradesList(gradesRes.data);
      setTeachersList(teachersRes.data);
      setSubjectsList(subjectsRes.data);
      setSectionsList(sectionsRes.data);
      setTermsList(termsRes.data);
    } catch (error) {
      console.error("Failed to fetch auxiliary data", error);
    }
  };

  useEffect(() => {
    fetchData();
    setFormData({}); // Reset form data when switching tabs
  }, [activeTab]);

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  const handleOpenModal = () => {
    if (activeTab === 'terms') {
      setFormData({ name: '', start_date: '', end_date: '', is_active: false });
    } else if (activeTab === 'grades') {
      setFormData({ name: '', level_order: 1 });
    } else if (activeTab === 'subjects') {
      setFormData({ name: '', code: '' });
    } else if (activeTab === 'sections') {
      setFormData({ name: '', grade_level: gradesList.length > 0 ? gradesList[0].id : '', homeroom_teacher: '' });
    } else if (activeTab === 'assignments') {
      setFormData({ teacher: '', subject: '', sections: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let endpoint = 'terms';
    if (activeTab === 'grades') endpoint = 'grade-levels';
    if (activeTab === 'subjects') endpoint = 'subjects';
    if (activeTab === 'sections') endpoint = 'sections';
    if (activeTab === 'assignments') endpoint = 'subject-teachers';
    
    try {
      // Clean homeroom_teacher if empty
      const payload = { ...formData };
      if (activeTab === 'sections' && !payload.homeroom_teacher) {
        payload.homeroom_teacher = null;
      }
      
      if (activeTab === 'assignments') {
        payload.section_ids = payload.sections;
        delete payload.sections;
      }
      
      await api.post(`/${endpoint}/`, payload);
      setIsModalOpen(false);
      fetchData();
      if (activeTab === 'grades') fetchAuxiliaryData(); // refresh auxiliary data if needed
    } catch (error: any) {
      console.error("Failed to add new item", error.response?.data || error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSectionToggle = (sectionId: number) => {
    const currentSections = formData.sections || [];
    if (currentSections.includes(sectionId)) {
      setFormData({ ...formData, sections: currentSections.filter((id: number) => id !== sectionId) });
    } else {
      setFormData({ ...formData, sections: [...currentSections, sectionId] });
    }
  };

  const openManageTeacher = (teacher: any) => {
    setManagingTeacher(teacher);
    const currentSection = sectionsList.find(s => s.homeroom_teacher === teacher.id);
    setHomeroomSelection(currentSection ? currentSection.id.toString() : '');
    setNewAssignment({ subject: '', sections: [] });
  };

  const closeManageTeacher = () => setManagingTeacher(null);

  const handleSaveHomeroom = async () => {
    if (!managingTeacher) return;
    setIsSavingHomeroom(true);
    try {
      const currentSection = sectionsList.find(s => s.homeroom_teacher === managingTeacher.id);
      const newSectionId = homeroomSelection ? parseInt(homeroomSelection) : null;

      // Clear the old assignment first: a section can only have one
      // homeroom teacher, and a teacher can only be homeroom of one
      // section, so moving them to a new class means freeing the old one
      // before claiming the new one (otherwise the new PATCH would 400
      // against the still-held old assignment).
      if (currentSection && currentSection.id !== newSectionId) {
        await api.patch(`/sections/${currentSection.id}/`, { homeroom_teacher: null });
      }
      if (newSectionId) {
        await api.patch(`/sections/${newSectionId}/`, { homeroom_teacher: managingTeacher.id });
      }
      await fetchAuxiliaryData();
    } catch (error: any) {
      alert(error.response?.data?.homeroom_teacher?.[0] || 'Failed to update homeroom assignment.');
    } finally {
      setIsSavingHomeroom(false);
    }
  };

  const handleNewAssignmentSectionToggle = (sectionId: number) => {
    const current = newAssignment.sections;
    setNewAssignment({
      ...newAssignment,
      sections: current.includes(sectionId) ? current.filter(id => id !== sectionId) : [...current, sectionId]
    });
  };

  const handleAddCourseAssignment = async () => {
    if (!managingTeacher || !newAssignment.subject || newAssignment.sections.length === 0) return;
    setIsAddingAssignment(true);
    try {
      await api.post('/subject-teachers/', {
        teacher: managingTeacher.id,
        subject: newAssignment.subject,
        section_ids: newAssignment.sections
      });
      setNewAssignment({ subject: '', sections: [] });
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Failed to add course assignment.');
    } finally {
      setIsAddingAssignment(false);
    }
  };

  const handleRemoveCourseAssignment = async (id: number) => {
    if (!window.confirm('Remove this course assignment?')) return;
    try {
      await api.delete(`/subject-teachers/${id}/`);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Failed to remove course assignment.');
    }
  };

  const openPromoteModal = (section: any) => {
    setPromotingSection(section);
    setPromoteTarget({ to_section_id: '', to_term_id: '' });
    setPromoteResult('');
  };

  const closePromoteModal = () => {
    setPromotingSection(null);
    setPromoteResult('');
  };

  const handlePromote = async () => {
    if (!promotingSection || !promoteTarget.to_section_id || !promoteTarget.to_term_id) return;
    setIsPromoting(true);
    setPromoteResult('');
    try {
      const res = await api.post('/student-enrollments/promote/', {
        from_section_id: promotingSection.id,
        to_section_id: parseInt(promoteTarget.to_section_id),
        to_term_id: parseInt(promoteTarget.to_term_id)
      });
      setPromoteResult(res.data.message);
    } catch (error: any) {
      setPromoteResult(error.response?.data?.error || 'Failed to promote students.');
    } finally {
      setIsPromoting(false);
    }
  };

  const emptyState = (
    <div className="p-8 text-center text-muted-foreground">
      No data found. Click "Add New" to get started.
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Academic Structure</h1>
          <p className="text-sm text-muted-foreground">Configure your school's terms, grades, classes, and subjects.</p>
        </div>
        {activeTab !== 'teachers' && (
          <Button variant="primary" onClick={handleOpenModal}>Add New</Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <button onClick={() => setActiveTab('terms')} className={tabStyle(activeTab === 'terms')}>
          Terms & Semesters
        </button>
        <button onClick={() => setActiveTab('grades')} className={tabStyle(activeTab === 'grades')}>
          Grade Levels
        </button>
        <button onClick={() => setActiveTab('sections')} className={tabStyle(activeTab === 'sections')}>
          Classes (Sections)
        </button>
        <button onClick={() => setActiveTab('subjects')} className={tabStyle(activeTab === 'subjects')}>
          Subjects
        </button>
        <button onClick={() => setActiveTab('assignments')} className={tabStyle(activeTab === 'assignments')}>
          Course Assignments
        </button>
        <button onClick={() => setActiveTab('teachers')} className={tabStyle(activeTab === 'teachers')}>
          Teachers
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="animate-fade-in">
          {activeTab === 'terms' && (
            <Table columns={['Name', 'Start Date', 'End Date', 'Status']}>
              {data.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/50">
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4">{item.start_date}</td>
                  <td className="p-4">{item.end_date}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.is_active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          )}
          
          {activeTab === 'grades' && (
            <Table columns={['Name', 'Order']}>
              {data.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/50">
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4">{item.level_order}</td>
                </tr>
              ))}
            </Table>
          )}
          
          {activeTab === 'sections' && (
            <Table columns={['Name', 'Grade Level', 'Homeroom Teacher', '']}>
              {data.map((item) => {
                const grade = gradesList.find(g => g.id === item.grade_level);
                return (
                  <tr key={item.id} className="transition-colors hover:bg-muted/50">
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4">{grade ? grade.name : item.grade_level}</td>
                    <td className="p-4">{item.homeroom_teacher_name || <span className="text-muted-foreground italic">None Assigned</span>}</td>
                    <td className="p-4 text-right">
                      <Button variant="outline" onClick={() => openPromoteModal(item)}>Promote Students</Button>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
          
          {activeTab === 'subjects' && (
            <Table columns={['Name', 'Code']}>
              {data.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/50">
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4">{item.code || '—'}</td>
                </tr>
              ))}
            </Table>
          )}

          {activeTab === 'assignments' && (
            <Table columns={['Teacher', 'Subject', 'Class (Section)']}>
              {data.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/50">
                  <td className="p-4 font-medium">{item.teacher_name}</td>
                  <td className="p-4">{item.subject_name}</td>
                  <td className="p-4">{item.section_name}</td>
                </tr>
              ))}
            </Table>
          )}

          {activeTab === 'teachers' && (
            <Table columns={['Teacher', 'Homeroom Class', 'Courses Taught', '']}>
              {teachersList.map((t) => {
                const homeroomSection = sectionsList.find(s => s.homeroom_teacher === t.id);
                const courses = data.filter((a: any) => a.teacher === t.id);
                return (
                  <tr key={t.id} className="transition-colors hover:bg-muted/50">
                    <td className="p-4 font-medium">{t.first_name} {t.last_name}</td>
                    <td className="p-4">
                      {homeroomSection ? homeroomSection.name : <span className="text-muted-foreground italic">Unassigned</span>}
                    </td>
                    <td className="p-4">
                      {courses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {courses.map((c: any) => (
                            <span key={c.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                              {c.subject_name} — {c.section_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">None</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="outline" onClick={() => openManageTeacher(t)}>Manage</Button>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}

          {activeTab === 'teachers' ? teachersList.length === 0 && emptyState : data.length === 0 && emptyState}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Add New ${activeTab === 'terms' ? 'Term' : activeTab === 'grades' ? 'Grade Level' : activeTab === 'sections' ? 'Class' : activeTab === 'assignments' ? 'Course Assignment' : 'Subject'}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'terms' && (
            <>
              <Input label="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Term 1" />
              <Input label="Start Date" type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
              <Input label="End Date" type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} required />
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="is_active" checked={formData.is_active || false} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                <label htmlFor="is_active" className="text-sm font-medium text-foreground">Is Active</label>
              </div>
            </>
          )}
          
          {activeTab === 'grades' && (
            <>
              <Input label="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Grade 9" />
              <Input label="Order" type="number" value={formData.level_order || ''} onChange={e => setFormData({...formData, level_order: parseInt(e.target.value)})} required placeholder="9" />
            </>
          )}
          
          {activeTab === 'sections' && (
            <>
              <Input label="Class/Section Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Section A" />
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-foreground">Grade Level</label>
                <select 
                  className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                  value={formData.grade_level || ''} 
                  onChange={(e) => setFormData({...formData, grade_level: e.target.value})}
                  required
                >
                  <option value="">Select a grade...</option>
                  {gradesList.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-foreground">Homeroom Teacher</label>
                <select 
                  className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                  value={formData.homeroom_teacher || ''} 
                  onChange={(e) => setFormData({...formData, homeroom_teacher: e.target.value})}
                >
                  <option value="">None / Unassigned</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          {activeTab === 'subjects' && (
            <>
              <Input label="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Mathematics" />
              <Input label="Code (Optional)" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="MATH-101" />
            </>
          )}

          {activeTab === 'assignments' && (
            <>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-foreground">Teacher</label>
                <select 
                  className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                  value={formData.teacher || ''} 
                  onChange={(e) => setFormData({...formData, teacher: e.target.value})}
                  required
                >
                  <option value="">Select a teacher...</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-foreground">Subject</label>
                <select 
                  className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                  value={formData.subject || ''} 
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  required
                >
                  <option value="">Select a subject...</option>
                  {subjectsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-foreground mb-1">Classes (Select Multiple)</label>
                <div className="max-h-48 overflow-y-auto border border-border rounded-md p-3 space-y-2 bg-input">
                  {sectionsList.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                        checked={(formData.sections || []).includes(s.id)}
                        onChange={() => handleSectionToggle(s.id)}
                      />
                      <span className="text-sm text-foreground">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!managingTeacher}
        onClose={closeManageTeacher}
        title={managingTeacher ? `Manage ${managingTeacher.first_name} ${managingTeacher.last_name}` : ''}
      >
        {managingTeacher && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Homeroom Class</label>
              <p className="text-xs text-muted-foreground mb-2">The class this teacher marks daily attendance for. A teacher can only be homeroom of one class.</p>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={homeroomSelection}
                  onChange={(e) => setHomeroomSelection(e.target.value)}
                >
                  <option value="">None / Unassigned</option>
                  {sectionsList.map((s: any) => {
                    const takenByOther = s.homeroom_teacher && s.homeroom_teacher !== managingTeacher.id;
                    return (
                      <option key={s.id} value={s.id} disabled={takenByOther}>
                        {s.name}{takenByOther ? ` (assigned to ${s.homeroom_teacher_name})` : ''}
                      </option>
                    );
                  })}
                </select>
                <Button variant="primary" onClick={handleSaveHomeroom} isLoading={isSavingHomeroom}>Save</Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Courses Taught</label>
              <div className="space-y-2 mb-3">
                {data.filter((a: any) => a.teacher === managingTeacher.id).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-muted/30">
                    <span>{a.subject_name} — {a.section_name}</span>
                    <button type="button" onClick={() => handleRemoveCourseAssignment(a.id)} className="text-destructive hover:underline text-xs">
                      Remove
                    </button>
                  </div>
                ))}
                {data.filter((a: any) => a.teacher === managingTeacher.id).length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No courses assigned yet.</p>
                )}
              </div>

              <div className="p-3 border rounded-md bg-muted/10 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add a course assignment</p>
                <select
                  className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={newAssignment.subject}
                  onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
                >
                  <option value="">Select subject...</option>
                  {subjectsList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="max-h-32 overflow-y-auto border border-border rounded-md p-2 space-y-1 bg-input">
                  {sectionsList.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                        checked={newAssignment.sections.includes(s.id)}
                        onChange={() => handleNewAssignmentSectionToggle(s.id)}
                      />
                      <span className="text-sm text-foreground">{s.name}</span>
                    </label>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCourseAssignment}
                  isLoading={isAddingAssignment}
                  className="w-full"
                >
                  Add Assignment
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="ghost" onClick={closeManageTeacher}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!promotingSection}
        onClose={closePromoteModal}
        title={promotingSection ? `Promote Students from ${promotingSection.name}` : ''}
      >
        {promotingSection && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Moves every actively-enrolled student in this class into a new class and term. Their current enrollment is kept as historical record (marked Completed), so past attendance and grades stay intact.
            </p>
            {promoteResult && (
              <div className="p-3 text-sm border rounded-md bg-success/10 text-success border-success/20">{promoteResult}</div>
            )}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-foreground">New Term</label>
              <select
                className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={promoteTarget.to_term_id}
                onChange={(e) => setPromoteTarget({ ...promoteTarget, to_term_id: e.target.value })}
              >
                <option value="">Select term...</option>
                {termsList.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-medium text-foreground">New Class</label>
              <select
                className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={promoteTarget.to_section_id}
                onChange={(e) => setPromoteTarget({ ...promoteTarget, to_section_id: e.target.value })}
              >
                <option value="">Select class...</option>
                {sectionsList.filter((s: any) => s.id !== promotingSection.id).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={closePromoteModal}>Close</Button>
              <Button
                type="button"
                variant="primary"
                onClick={handlePromote}
                isLoading={isPromoting}
                disabled={!promoteTarget.to_section_id || !promoteTarget.to_term_id}
              >
                Promote
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Academics;
