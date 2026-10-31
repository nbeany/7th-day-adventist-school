import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { FileText, Archive, Download } from 'lucide-react';

const ReportCards: React.FC = () => {
  const { user } = useAuth();
  const canBatchGenerate = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const [students, setStudents] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [termGrades, setTermGrades] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [batchSection, setBatchSection] = useState('');
  const [batchTerm, setBatchTerm] = useState('');
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchError, setBatchError] = useState('');

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [studRes, termRes, secRes] = await Promise.all([
          api.get('/students/?page_size=1000'),
          api.get('/terms/'),
          api.get('/sections/')
        ]);
        setStudents(studRes.data);
        setTerms(termRes.data);
        setSections(secRes.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchDropdowns();
  }, []);

  const handleBatchDownload = async () => {
    if (!batchSection || !batchTerm) return;
    setIsBatchDownloading(true);
    setBatchError('');
    try {
      const response = await api.get(
        `/term-grades/generate_section_report_cards/?section_id=${batchSection}&term_id=${batchTerm}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_cards_section_${batchSection}_term_${batchTerm}.zip`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
    } catch (error: any) {
      if (error.response?.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          setBatchError(JSON.parse(text).error || 'Failed to generate report cards.');
        } catch {
          setBatchError('Failed to generate report cards.');
        }
      } else {
        setBatchError('Failed to generate report cards.');
      }
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!batchSection || !batchTerm) return;
    try {
      const response = await api.get(
        `/term-grades/export/?section=${batchSection}&term=${batchTerm}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `term_grades_section_${batchSection}_term_${batchTerm}.csv`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Failed to export grades', error);
    }
  };

  const fetchTermGrades = async () => {
    if (!selectedStudent || !selectedTerm) return;
    setIsLoading(true);
    try {
      const [gradesRes, summaryRes] = await Promise.all([
        api.get(`/term-grades/?student=${selectedStudent}&term=${selectedTerm}`),
        api.get(`/term-grades/summary/?student_id=${selectedStudent}&term_id=${selectedTerm}`)
      ]);
      setTermGrades(gradesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudent && selectedTerm) {
      fetchTermGrades();
    }
  }, [selectedStudent, selectedTerm]);

  const getLetterColor = (letter: string) => {
    if (letter.startsWith('A')) return 'bg-success/10 text-success';
    if (letter.startsWith('B')) return 'bg-primary/10 text-primary';
    if (letter.startsWith('C')) return 'bg-warning/10 text-warning';
    return 'bg-destructive/10 text-destructive';
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/term-grades/generate_report_card/?student_id=${selectedStudent}&term_id=${selectedTerm}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_card.pdf`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Failed to download report card', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report Cards</h1>
          <p className="text-sm text-muted-foreground">View aggregated term grades per student.</p>
        </div>
        {termGrades.length > 0 && selectedStudent && selectedTerm && (
          <Button 
            variant="primary" 
            onClick={handleDownloadPDF}
          >
            <FileText size={16} className="mr-2" /> Download PDF
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex flex-col gap-1.5 w-64">
          <label className="text-xs font-medium text-muted-foreground">Student</label>
          <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
            <option value="">Select a student...</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.user.first_name} {s.user.last_name} ({s.user.username})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 w-48">
          <label className="text-xs font-medium text-muted-foreground">Term</label>
          <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
            <option value="">Select a term...</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Batch download for a whole class */}
      {canBatchGenerate && (
        <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-card shadow-sm">
          <div className="flex flex-col gap-1.5 w-64">
            <label className="text-xs font-medium text-muted-foreground">Generate for a Whole Class</label>
            <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={batchSection} onChange={(e) => setBatchSection(e.target.value)}>
              <option value="">Select a class...</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 w-48">
            <label className="text-xs font-medium text-muted-foreground">Term</label>
            <select className="w-full px-3 py-2 text-sm bg-input border rounded-md border-border text-foreground" value={batchTerm} onChange={(e) => setBatchTerm(e.target.value)}>
              <option value="">Select a term...</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Button variant="outline" onClick={handleBatchDownload} isLoading={isBatchDownloading} disabled={!batchSection || !batchTerm}>
            <Archive size={16} className="mr-2" /> Download All (.zip)
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={!batchSection || !batchTerm}>
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
          {batchError && <p className="text-sm text-destructive w-full">{batchError}</p>}
        </div>
      )}

      {/* Summary Card */}
      {termGrades.length > 0 && summary && (
        <div className="p-4 border rounded-lg bg-card shadow-sm flex items-center justify-between">
          <div className="flex gap-12">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overall Average</p>
              <p className="text-3xl font-bold">{summary.overall_average ? `${summary.overall_average}%` : '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Class Rank</p>
              <p className="text-3xl font-bold">{summary.rank ? `${summary.rank} / ${summary.total_students}` : '—'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Subjects</p>
            <p className="text-3xl font-bold">{termGrades.length}</p>
          </div>
        </div>
      )}

      {/* Grades Table */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading grades...</div>
      ) : termGrades.length > 0 ? (
        <Table columns={['Subject', 'Score (%)', 'Letter Grade', 'Teacher Comment']}>
          {termGrades.map((tg) => (
            <tr key={tg.id} className="transition-colors hover:bg-muted/50">
              <td className="p-4 font-medium">{tg.subject_name}</td>
              <td className="p-4 font-semibold">{tg.final_score}%</td>
              <td className="p-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getLetterColor(tg.letter_grade)}`}>
                  {tg.letter_grade}
                </span>
              </td>
              <td className="p-4 text-muted-foreground">{tg.teacher_comment || '—'}</td>
            </tr>
          ))}
        </Table>
      ) : selectedStudent && selectedTerm ? (
        <div className="p-12 text-center border rounded-lg bg-card shadow-sm text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-20" />
          <p>No term grades found.</p>
          <p className="text-sm">Go to the Gradebook to enter grades and compute term averages.</p>
        </div>
      ) : (
        <div className="p-12 text-center border rounded-lg bg-card shadow-sm text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-20" />
          <p>Select a student and term above to view their report card.</p>
        </div>
      )}
    </div>
  );
};

export default ReportCards;
