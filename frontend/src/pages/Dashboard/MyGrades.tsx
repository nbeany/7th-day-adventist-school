import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import { useAuth } from '../../context/AuthContext';
import { FileText } from 'lucide-react';

const MyGrades: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [studRes, termRes] = await Promise.all([
          api.get('/students/'),
          api.get('/terms/')
        ]);
        setStudents(studRes.data);
        setTerms(termRes.data);
        
        // Auto-select first student if student role
        if (user?.role === 'STUDENT' && studRes.data.length > 0) {
          setSelectedStudent(studRes.data[0].id);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchDropdowns();
  }, [user]);

  const fetchGradesData = async () => {
    if (!selectedStudent || !selectedTerm) return;
    setIsLoading(true);
    try {
      const [assignRes, gradesRes] = await Promise.all([
        api.get(`/assignments/?student=${selectedStudent}&term=${selectedTerm}`),
        api.get(`/grades/?student=${selectedStudent}`)
      ]);
      setAssignments(assignRes.data);
      setGrades(gradesRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudent && selectedTerm) {
      fetchGradesData();
    }
  }, [selectedStudent, selectedTerm]);

  // Group assignments by subject
  const subjectsMap: Record<string, any[]> = {};
  assignments.forEach(a => {
    if (!subjectsMap[a.subject_name]) {
      subjectsMap[a.subject_name] = [];
    }
    
    const studentGrade = grades.find(g => g.assignment === a.id);
    
    subjectsMap[a.subject_name].push({
      ...a,
      studentScore: studentGrade ? studentGrade.score : null,
      teacherComment: studentGrade ? studentGrade.comment : ''
    });
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>
        <p className="text-sm text-muted-foreground">View individual assignment and quiz scores.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-card shadow-sm">
        {user?.role === 'PARENT' && (
          <div className="flex flex-col gap-1.5 w-64">
            <label className="text-xs font-medium text-muted-foreground">Student</label>
            <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
              <option value="">Select a child...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.user.first_name} {s.user.last_name} ({s.user.username})</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5 w-48">
          <label className="text-xs font-medium text-muted-foreground">Term</label>
          <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
            <option value="">Select a term...</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Grades Content */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading grades...</div>
      ) : Object.keys(subjectsMap).length > 0 ? (
        <div className="space-y-6">
          {Object.keys(subjectsMap).map(subjectName => (
            <div key={subjectName} className="border rounded-lg bg-card shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b font-semibold">
                {subjectName}
              </div>
              <Table columns={['Assignment Name', 'Due Date', 'Score', 'Max Score', 'Teacher Comment']}>
                {subjectsMap[subjectName].map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/10">
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{item.due_date || '—'}</td>
                    <td className="p-4 font-semibold">
                      {item.studentScore !== null ? (
                        <span className="text-primary">{item.studentScore}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Not graded</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{item.max_score}</td>
                    <td className="p-4 text-muted-foreground text-sm">{item.teacherComment || '—'}</td>
                  </tr>
                ))}
              </Table>
            </div>
          ))}
        </div>
      ) : selectedStudent && selectedTerm ? (
        <div className="p-12 text-center border rounded-lg bg-card shadow-sm text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-20" />
          <p>No assignments found for this term.</p>
        </div>
      ) : (
        <div className="p-12 text-center border rounded-lg bg-card shadow-sm text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-20" />
          <p>Select a term {user?.role === 'PARENT' ? 'and student ' : ''}to view your grades.</p>
        </div>
      )}
    </div>
  );
};

export default MyGrades;
