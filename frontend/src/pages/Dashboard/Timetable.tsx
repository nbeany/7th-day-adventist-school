import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { CalendarDays, Plus, Clock, Edit2 } from 'lucide-react';

const DAYS = [
  { id: 'MON', label: 'Monday' },
  { id: 'TUE', label: 'Tuesday' },
  { id: 'WED', label: 'Wednesday' },
  { id: 'THU', label: 'Thursday' },
  { id: 'FRI', label: 'Friday' },
];

const Timetable: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const [viewMode, setViewMode] = useState<'SECTION' | 'TEACHER'>('SECTION');
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignData, setAssignData] = useState({
    id: null as number | null,
    day_of_week: '',
    period: '',
    subject: '',
    teacher: '',
    section: '',
    room_number: ''
  });

  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodData, setPeriodData] = useState({ name: '', start_time: '', end_time: '', is_break: false });

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [secRes, teachRes, subRes, perRes, assignRes] = await Promise.all([
          api.get('/sections/'),
          api.get('/users/?role=TEACHER'),
          api.get('/subjects/'),
          api.get('/periods/'),
          api.get('/subject-teachers/')
        ]);
        setSections(secRes.data);
        setTeachers(teachRes.data);
        setSubjects(subRes.data);
        setPeriods(perRes.data);
        setCourseAssignments(assignRes.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchInit();
  }, []);

  const fetchSchedules = async () => {
    if (!selectedEntityId) return;
    setIsLoading(true);
    try {
      const url = viewMode === 'SECTION' 
        ? `/class-schedules/?section=${selectedEntityId}` 
        : `/class-schedules/?teacher=${selectedEntityId}`;
      const res = await api.get(url);
      setSchedules(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [selectedEntityId, viewMode]);

  const handleCreatePeriod = async () => {
    try {
      await api.post('/periods/', periodData);
      const res = await api.get('/periods/');
      setPeriods(res.data);
      setIsPeriodModalOpen(false);
      setPeriodData({ name: '', start_time: '', end_time: '', is_break: false });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAssignClass = async () => {
    try {
      if (assignData.id) {
        await api.put(`/class-schedules/${assignData.id}/`, assignData);
      } else {
        await api.post('/class-schedules/', assignData);
      }
      fetchSchedules();
      setIsAssignModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('Failed to save schedule. Check for scheduling conflicts.');
    }
  };

  const handleDeleteClass = async () => {
    if (!assignData.id) return;
    if (window.confirm('Are you sure you want to remove this schedule block?')) {
      try {
        await api.delete(`/class-schedules/${assignData.id}/`);
        fetchSchedules();
        setIsAssignModalOpen(false);
      } catch (error) {
        console.error(error);
        alert('Failed to delete schedule block.');
      }
    }
  };

  const getScheduleForSlot = (dayId: string, periodId: number) => {
    return schedules.find(s => s.day_of_week === dayId && s.period === periodId);
  };

  const handleSlotClick = (dayId: string, periodId: number) => {
    if (!isEditMode) return;
    
    const existingSchedule = getScheduleForSlot(dayId, periodId);

    if (existingSchedule) {
      setAssignData({
        id: existingSchedule.id,
        day_of_week: dayId,
        period: periodId.toString(),
        subject: existingSchedule.subject.toString(),
        teacher: existingSchedule.teacher.toString(),
        section: existingSchedule.section.toString(),
        room_number: existingSchedule.room_number || ''
      });
    } else {
      setAssignData({
        id: null,
        day_of_week: dayId,
        period: periodId.toString(),
        subject: '',
        teacher: viewMode === 'TEACHER' ? selectedEntityId : '',
        section: viewMode === 'SECTION' ? selectedEntityId : '',
        room_number: ''
      });
    }
    setIsAssignModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timetable</h1>
          <p className="text-sm text-muted-foreground">Manage and view class schedules.</p>
        </div>
        {canEdit && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsPeriodModalOpen(true)}>
              <Clock size={16} className="mr-2" /> Manage Periods
            </Button>
            <Button variant={isEditMode ? "primary" : "outline"} onClick={() => setIsEditMode(!isEditMode)}>
              <Edit2 size={16} className="mr-2" /> {isEditMode ? 'Exit Edit Mode' : 'Edit Mode'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex flex-col gap-1.5 w-48">
          <label className="text-xs font-medium text-muted-foreground">View By</label>
          <select 
            className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" 
            value={viewMode} 
            onChange={(e) => {
              setViewMode(e.target.value as any);
              setSelectedEntityId('');
              setSchedules([]);
            }}
          >
            <option value="SECTION">Class Section</option>
            <option value="TEACHER">Teacher</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-64">
          <label className="text-xs font-medium text-muted-foreground">Select {viewMode === 'SECTION' ? 'Section' : 'Teacher'}</label>
          <select 
            className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" 
            value={selectedEntityId} 
            onChange={(e) => setSelectedEntityId(e.target.value)}
          >
            <option value="">Choose...</option>
            {viewMode === 'SECTION' 
              ? sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
              : teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)
            }
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Loading timetable...</div>
      ) : periods.length === 0 ? (
        <div className="p-12 text-center border rounded-lg bg-card text-muted-foreground">
          <Clock size={48} className="mx-auto mb-4 opacity-20" />
          <p>No periods defined.</p>
          <p className="text-sm">Click 'Manage Periods' to set up your school's daily bell schedule.</p>
        </div>
      ) : selectedEntityId ? (
        <div className="border rounded-lg bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b">
                <th className="p-4 font-semibold text-muted-foreground border-r w-32">Time</th>
                {DAYS.map(day => (
                  <th key={day.id} className="p-4 font-semibold text-center border-r last:border-r-0 w-48">{day.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id} className={`border-b last:border-b-0 ${period.is_break ? 'bg-muted/30' : ''}`}>
                  <td className="p-4 border-r align-top">
                    <p className="font-semibold">{period.name}</p>
                    <p className="text-xs text-muted-foreground">{period.start_time.substring(0,5)} - {period.end_time.substring(0,5)}</p>
                  </td>
                  {DAYS.map(day => {
                    const schedule = getScheduleForSlot(day.id, period.id);
                    return (
                      <td 
                        key={`${day.id}-${period.id}`} 
                        className={`p-2 border-r last:border-r-0 text-center align-top ${isEditMode && !schedule && !period.is_break ? 'hover:bg-accent/10 cursor-pointer' : ''}`}
                        onClick={() => !period.is_break && handleSlotClick(day.id, period.id)}
                      >
                        {period.is_break ? (
                          <div className="h-full flex items-center justify-center text-muted-foreground/50 font-medium">BREAK</div>
                        ) : schedule ? (
                          <div className="p-2 border rounded bg-background shadow-sm flex flex-col gap-1">
                            <span className="font-bold text-primary">{schedule.subject_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {viewMode === 'SECTION' ? schedule.teacher_name : schedule.section_name}
                            </span>
                            {schedule.room_number && (
                              <span className="text-xs font-medium bg-muted px-1 py-0.5 rounded w-max mx-auto">
                                {schedule.room_number}
                              </span>
                            )}
                          </div>
                        ) : isEditMode ? (
                          <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 text-primary">
                            <Plus size={20} />
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center border rounded-lg bg-card text-muted-foreground">
          <CalendarDays size={48} className="mx-auto mb-4 opacity-20" />
          <p>Select a {viewMode === 'SECTION' ? 'Section' : 'Teacher'} to view their timetable.</p>
        </div>
      )}

      {/* Assign Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Class">
        {(() => {
          let availTeachers = teachers;
          let availSubjects = subjects;
          let availSections = sections;

          if (viewMode === 'SECTION') {
            const validAssignments = courseAssignments.filter(ca => ca.section.toString() === selectedEntityId);
            const validTeacherIds = new Set(validAssignments.map(ca => ca.teacher));
            availTeachers = teachers.filter(t => validTeacherIds.has(t.id));
            
            if (assignData.teacher) {
              const validSubjectIds = new Set(validAssignments.filter(ca => ca.teacher.toString() === assignData.teacher).map(ca => ca.subject));
              availSubjects = subjects.filter(s => validSubjectIds.has(s.id));
            } else {
              const validSubjectIds = new Set(validAssignments.map(ca => ca.subject));
              availSubjects = subjects.filter(s => validSubjectIds.has(s.id));
            }
          } else if (viewMode === 'TEACHER') {
            const validAssignments = courseAssignments.filter(ca => ca.teacher.toString() === selectedEntityId);
            const validSectionIds = new Set(validAssignments.map(ca => ca.section));
            availSections = sections.filter(s => validSectionIds.has(s.id));
            
            if (assignData.section) {
              const validSubjectIds = new Set(validAssignments.filter(ca => ca.section.toString() === assignData.section).map(ca => ca.subject));
              availSubjects = subjects.filter(s => validSubjectIds.has(s.id));
            } else {
              const validSubjectIds = new Set(validAssignments.map(ca => ca.subject));
              availSubjects = subjects.filter(s => validSubjectIds.has(s.id));
            }
          }

          return (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={assignData.subject} onChange={(e) => setAssignData({...assignData, subject: e.target.value})}>
                  <option value="">Select subject...</option>
                  {availSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {viewMode === 'SECTION' && (
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-medium text-muted-foreground">Teacher</label>
                  <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={assignData.teacher} onChange={(e) => {
                    setAssignData({...assignData, teacher: e.target.value, subject: ''});
                  }}>
                    <option value="">Select teacher...</option>
                    {availTeachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                  </select>
                </div>
              )}

              {viewMode === 'TEACHER' && (
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-medium text-muted-foreground">Section</label>
                  <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={assignData.section} onChange={(e) => {
                    setAssignData({...assignData, section: e.target.value, subject: ''});
                  }}>
                    <option value="">Select section...</option>
                    {availSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <Input label="Room Number (Optional)" value={assignData.room_number} onChange={(e) => setAssignData({...assignData, room_number: e.target.value})} />
            </div>
          );
        })()}
        <div className="flex justify-end gap-3 pt-6">
          {assignData.id && (
            <div className="mr-auto">
              <Button type="button" variant="ghost" onClick={handleDeleteClass} className="text-destructive hover:bg-destructive/10">
                Remove
              </Button>
            </div>
          )}
          <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAssignClass}>{assignData.id ? 'Save Changes' : 'Assign'}</Button>
        </div>
      </Modal>

      {/* Create Period Modal */}
      <Modal isOpen={isPeriodModalOpen} onClose={() => setIsPeriodModalOpen(false)} title="Create Period">
        <div className="space-y-4">
          <Input label="Name (e.g. Period 1, Lunch)" value={periodData.name} onChange={(e) => setPeriodData({...periodData, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" type="time" value={periodData.start_time} onChange={(e) => setPeriodData({...periodData, start_time: e.target.value})} />
            <Input label="End Time" type="time" value={periodData.end_time} onChange={(e) => setPeriodData({...periodData, end_time: e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_break" checked={periodData.is_break} onChange={(e) => setPeriodData({...periodData, is_break: e.target.checked})} className="rounded border-border text-primary" />
            <label htmlFor="is_break" className="text-sm font-medium">Is this a break? (Blocks assignments)</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setIsPeriodModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreatePeriod}>Save Period</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Timetable;
