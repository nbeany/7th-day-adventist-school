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
  const [activeTab, setActiveTab] = useState<'terms' | 'grades' | 'subjects' | 'sections' | 'assignments'>('terms');
  const [data, setData] = useState<any[]>([]);
  const [gradesList, setGradesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const fetchData = async () => {
    setIsLoading(true);
    let endpoint = 'terms';
    if (activeTab === 'grades') endpoint = 'grade-levels';
    if (activeTab === 'subjects') endpoint = 'subjects';
    if (activeTab === 'sections') endpoint = 'sections';
    if (activeTab === 'assignments') endpoint = 'subject-teachers';
    
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
      const [gradesRes, teachersRes, subjectsRes, sectionsRes] = await Promise.all([
        api.get('/grade-levels/'),
        api.get('/users/?role=TEACHER'),
        api.get('/subjects/'),
        api.get('/sections/')
      ]);
      setGradesList(gradesRes.data);
      setTeachersList(teachersRes.data);
      setSubjectsList(subjectsRes.data);
      setSectionsList(sectionsRes.data);
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
        <Button variant="primary" onClick={handleOpenModal}>Add New</Button>
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
            <Table columns={['Name', 'Grade Level', 'Homeroom Teacher']}>
              {data.map((item) => {
                const grade = gradesList.find(g => g.id === item.grade_level);
                return (
                  <tr key={item.id} className="transition-colors hover:bg-muted/50">
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4">{grade ? grade.name : item.grade_level}</td>
                    <td className="p-4">{item.homeroom_teacher_name || <span className="text-muted-foreground italic">None Assigned</span>}</td>
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
          
          {data.length === 0 && emptyState}
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
    </div>
  );
};

export default Academics;
