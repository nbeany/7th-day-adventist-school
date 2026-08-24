import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Plus, Save, BookOpen } from 'lucide-react';

const Gradebook: React.FC = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [gradeData, setGradeData] = useState<Record<number, { score: string; comment: string }>>({});

  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ name: '', max_score: '100', weight: '1.0', date: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [secRes, termRes] = await Promise.all([
          api.get('/sections/'),
          api.get('/terms/')
        ]);
        setSections(secRes.data);
        setTerms(termRes.data);
        if (secRes.data.length > 0) setSelectedSection(secRes.data[0].id.toString());
        if (termRes.data.length > 0) setSelectedTerm(termRes.data[0].id.toString());
      } catch (error) {
        console.error(error);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedSection) return;
      try {
        const subRes = await api.get(`/subjects/?section=${selectedSection}`);
        setSubjects(subRes.data);
        if (subRes.data.length > 0) {
          setSelectedSubject(subRes.data[0].id.toString());
        } else {
          setSelectedSubject('');
        }
      } catch (error) {
        console.error("Failed to fetch subjects", error);
      }
    };
    fetchSubjects();
  }, [selectedSection]);

  useEffect(() => {
    if (selectedSection && selectedSubject && selectedTerm) {
      fetchAssignments();
    }
  }, [selectedSection, selectedSubject, selectedTerm]);

  const fetchAssignments = async () => {
    try {
      const res = await api.get(`/assignments/?section=${selectedSection}&subject=${selectedSubject}&term=${selectedTerm}`);
      setAssignments(res.data);
      setSelectedAssignment(null);
    } catch (error) {
      console.error(error);
    }
  };

  const loadGradeEntry = async (assignment: any) => {
    setSelectedAssignment(assignment);
    setMessage('');
    try {
      // Get students enrolled in this section
      const studentsRes = await api.get('/students/');
      const enrolled = studentsRes.data.filter((s: any) =>
        s.enrollments?.some((e: any) => e.section.toString() === selectedSection && e.status === 'ACTIVE')
      );
      setStudents(enrolled);

      // Get existing grades
      const gradesRes = await api.get(`/grades/?assignment=${assignment.id}`);
      const existing: Record<number, { score: string; comment: string }> = {};
      enrolled.forEach((s: any) => {
        const grade = gradesRes.data.find((g: any) => g.student === s.id);
        existing[s.id] = {
          score: grade ? grade.score.toString() : '',
          comment: grade ? grade.comment : ''
        };
      });
      setGradeData(existing);
    } catch (error) {
      console.error(error);
    }
  };

  const handleScoreChange = (studentId: number, value: string) => {
    setGradeData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], score: value }
    }));
  };

  const handleCommentChange = (studentId: number, value: string) => {
    setGradeData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], comment: value }
    }));
  };

  const handleSaveGrades = async () => {
    if (!selectedAssignment) return;
    setIsSaving(true);
    setMessage('');

    const grades = Object.entries(gradeData)
      .filter(([_, data]) => data.score !== '')
      .map(([studentId, data]) => ({
        student_id: parseInt(studentId),
        score: parseFloat(data.score),
        comment: data.comment
      }));

    try {
      await api.post('/grades/bulk_update/', {
        assignment_id: selectedAssignment.id,
        grades
      });
      setMessage('Grades saved successfully!');
    } catch (error) {
      setMessage('Failed to save grades.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.name) return;
    setIsSaving(true);
    try {
      await api.post('/assignments/', {
        name: newAssignment.name,
        section: parseInt(selectedSection),
        subject: parseInt(selectedSubject),
        term: parseInt(selectedTerm),
        max_score: parseFloat(newAssignment.max_score),
        weight: parseFloat(newAssignment.weight),
        date: newAssignment.date || null
      });
      setIsAddAssignmentOpen(false);
      setNewAssignment({ name: '', max_score: '100', weight: '1.0', date: '' });
      fetchAssignments();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleComputeTermGrades = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const res = await api.post('/term-grades/compute/', {
        section_id: parseInt(selectedSection),
        subject_id: parseInt(selectedSubject),
        term_id: parseInt(selectedTerm)
      });
      setMessage(res.data.message);
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to compute term grades.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gradebook</h1>
          <p className="text-sm text-muted-foreground">Enter and manage student scores.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleComputeTermGrades} isLoading={isSaving}>
            Compute Term Grades
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex flex-col gap-1.5 w-44">
          <label className="text-xs font-medium text-muted-foreground">Section</label>
          <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
            {sections.length > 0 ? (
              sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
            ) : (
              <option value="">No sections assigned</option>
            )}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 w-44">
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
            {subjects.length > 0 ? (
              subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
            ) : (
              <option value="">No subjects assigned</option>
            )}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 w-44">
          <label className="text-xs font-medium text-muted-foreground">Term</label>
          <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <Button variant="primary" onClick={() => setIsAddAssignmentOpen(true)} disabled={!selectedSubject}>
          <Plus size={16} className="mr-1" /> Add Assignment
        </Button>
      </div>

      {!selectedSubject && selectedSection && (
        <div className="p-4 mb-4 text-sm bg-warning/10 text-warning-foreground border border-warning/20 rounded-md">
          <strong>Note:</strong> You have no subjects assigned for this class. To grade students here, an administrator must assign you to a subject in the <strong>Course Assignments</strong> tab on the Academics page.
        </div>
      )}

      {message && (
        <div className={`p-3 text-sm border rounded-md ${message.includes('success') ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Assignment List */}
        <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Assignments ({assignments.length})</h3>
          </div>
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {assignments.map(a => (
              <button
                key={a.id}
                onClick={() => loadGradeEntry(a)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/50 ${selectedAssignment?.id === a.id ? 'bg-primary/10 border-l-2 border-primary' : ''}`}
              >
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">Max: {a.max_score} · Weight: {(a.weight * 100).toFixed(0)}%{a.date ? ` · ${a.date}` : ''}</p>
              </button>
            ))}
            {assignments.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <BookOpen size={24} className="mx-auto mb-2 opacity-20" />
                No assignments yet.
              </div>
            )}
          </div>
        </div>

        {/* Grade Entry Table */}
        <div className="lg:col-span-2 border rounded-lg bg-card shadow-sm overflow-hidden">
          {selectedAssignment ? (
            <>
              <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold">{selectedAssignment.name}</h3>
                  <p className="text-xs text-muted-foreground">Max Score: {selectedAssignment.max_score}</p>
                </div>
                <Button variant="primary" onClick={handleSaveGrades} isLoading={isSaving}>
                  <Save size={16} className="mr-1" /> Save Grades
                </Button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/20 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-1/3">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Score</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Teacher Comment (Optional)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-medium">{s.user.first_name} {s.user.last_name}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={selectedAssignment.max_score}
                          step="0.5"
                          className="w-24 px-2 py-1 text-sm bg-input border rounded border-border text-foreground"
                          value={gradeData[s.id]?.score || ''}
                          onChange={(e) => handleScoreChange(s.id, e.target.value)}
                          placeholder={`/ ${selectedAssignment.max_score}`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className="w-full px-3 py-1 text-sm bg-input border rounded border-border text-foreground"
                          value={gradeData[s.id]?.comment || ''}
                          onChange={(e) => handleCommentChange(s.id, e.target.value)}
                          placeholder="Add a comment..."
                        />
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No enrolled students found.</td></tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
              <p>Select an assignment to enter grades.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Assignment Modal */}
      <Modal isOpen={isAddAssignmentOpen} onClose={() => setIsAddAssignmentOpen(false)} title="Add Assignment">
        <div className="space-y-1">
          <Input label="Assignment Name" value={newAssignment.name} onChange={(e) => setNewAssignment({...newAssignment, name: e.target.value})} placeholder="e.g. Midterm Exam" required />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Max Score" type="number" value={newAssignment.max_score} onChange={(e) => setNewAssignment({...newAssignment, max_score: e.target.value})} />
            <Input label="Weight (0-1)" type="number" step="0.01" value={newAssignment.weight} onChange={(e) => setNewAssignment({...newAssignment, weight: e.target.value})} />
          </div>
          <Input label="Date" type="date" value={newAssignment.date} onChange={(e) => setNewAssignment({...newAssignment, date: e.target.value})} />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setIsAddAssignmentOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddAssignment} isLoading={isSaving}>Create</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Gradebook;
