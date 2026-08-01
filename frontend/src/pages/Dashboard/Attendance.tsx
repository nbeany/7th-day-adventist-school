import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import { CalendarDays, Save } from 'lucide-react';

const Attendance: React.FC = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<number, string>>({});
  
  const [isLoading, setIsLoading] = useState(false);
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
        console.error("Failed to fetch dropdowns", error);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (selectedSection && selectedDate) {
      loadClassRoster();
    }
  }, [selectedSection, selectedDate]);

  const loadClassRoster = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      // 1. Get all students enrolled in this section
      const enrollRes = await api.get(`/student-enrollments/?section=${selectedSection}`);
      const enrolledStudents = enrollRes.data.map((e: any) => e.student);
      
      // We would ideally need the student names. The viewset for student-enrollments doesn't return full student object, 
      // but let's assume we can fetch students directly or we fetch all students and filter.
      const studentsRes = await api.get('/students/');
      const studentsInSection = studentsRes.data.filter((s: any) => 
        s.enrollments.some((e: any) => e.section.toString() === selectedSection && e.status === 'ACTIVE')
      );
      setStudents(studentsInSection);

      // 2. Get existing attendance for this date
      const attRes = await api.get(`/attendance/?section=${selectedSection}&date=${selectedDate}`);
      const existingData: Record<number, string> = {};
      
      if (attRes.data.length > 0) {
        attRes.data.forEach((record: any) => {
          existingData[record.student] = record.status;
        });
      } else {
        // Default everyone to PRESENT if no records exist yet
        studentsInSection.forEach((s: any) => {
          existingData[s.id] = 'PRESENT';
        });
      }
      setAttendanceData(existingData);
      
    } catch (error) {
      console.error("Failed to load roster", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (studentId: number, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSave = async () => {
    if (!selectedSection || !selectedTerm || !selectedDate) return;
    
    setIsSaving(true);
    setMessage('');
    
    const records = Object.entries(attendanceData).map(([studentId, status]) => ({
      student_id: parseInt(studentId),
      status: status
    }));

    try {
      await api.post('/attendance/bulk_update/', {
        section_id: parseInt(selectedSection),
        term_id: parseInt(selectedTerm),
        date: selectedDate,
        records: records
      });
      setMessage('Attendance saved successfully!');
    } catch (error) {
      console.error(error);
      setMessage('Failed to save attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusButtonClass = (currentStatus: string, targetStatus: string, colorClass: string) => {
    const isSelected = currentStatus === targetStatus;
    return `px-3 py-1 text-xs font-medium rounded-full transition-colors ${
      isSelected ? colorClass : 'bg-muted text-muted-foreground hover:bg-muted/80'
    }`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Attendance</h1>
        <p className="text-sm text-muted-foreground">Fast bulk-entry for daily class attendance.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex flex-col gap-1.5 w-48">
          <label className="text-xs font-medium text-muted-foreground">Section</label>
          <select 
            className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-col gap-1.5 w-48">
          <label className="text-xs font-medium text-muted-foreground">Term</label>
          <select 
            className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-48">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <input 
            type="date"
            className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        
        <Button variant="ghost" onClick={loadClassRoster} isLoading={isLoading}>
          Load Class
        </Button>
      </div>

      {message && (
        <div className={`p-3 text-sm border rounded-md ${message.includes('success') ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
          {message}
        </div>
      )}

      {students.length > 0 ? (
        <div className="border rounded-lg shadow-sm bg-card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Student Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student) => {
                const status = attendanceData[student.id] || 'PRESENT';
                return (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {student.user.first_name} {student.user.last_name}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">({student.user.username})</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleStatusChange(student.id, 'PRESENT')}
                          className={getStatusButtonClass(status, 'PRESENT', 'bg-success text-success-foreground')}
                        >
                          Present
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'LATE')}
                          className={getStatusButtonClass(status, 'LATE', 'bg-warning text-warning-foreground')}
                        >
                          Late
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'EXCUSED')}
                          className={getStatusButtonClass(status, 'EXCUSED', 'bg-primary/20 text-primary')}
                        >
                          Excused
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'ABSENT')}
                          className={getStatusButtonClass(status, 'ABSENT', 'bg-destructive text-destructive-foreground')}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-4 bg-muted/20 border-t flex justify-end">
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              <Save size={16} className="mr-2" /> Save Attendance
            </Button>
          </div>
        </div>
      ) : (
        !isLoading && (
          <div className="p-12 text-center border rounded-lg bg-card shadow-sm text-muted-foreground">
            <CalendarDays size={48} className="mx-auto mb-4 opacity-20" />
            <p>No students found for this section.</p>
            <p className="text-sm">Select a section and date, then click Load Class.</p>
          </div>
        )
      )}
    </div>
  );
};

export default Attendance;
