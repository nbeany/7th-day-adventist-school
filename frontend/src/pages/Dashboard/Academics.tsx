import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';

const tabStyle = (isActive: boolean) => (
  `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
    isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
  }`
);

const Academics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'terms' | 'grades' | 'subjects'>('terms');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async (endpoint: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/${endpoint}/`);
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'terms') fetchData('terms');
    if (activeTab === 'grades') fetchData('grade-levels');
    if (activeTab === 'subjects') fetchData('subjects');
  }, [activeTab]);

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
          <p className="text-sm text-muted-foreground">Configure your school's terms, grades, and subjects.</p>
        </div>
        <Button variant="primary">Add New</Button>
      </div>
      
      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setActiveTab('terms')} className={tabStyle(activeTab === 'terms')}>
          Terms & Semesters
        </button>
        <button onClick={() => setActiveTab('grades')} className={tabStyle(activeTab === 'grades')}>
          Grade Levels
        </button>
        <button onClick={() => setActiveTab('subjects')} className={tabStyle(activeTab === 'subjects')}>
          Subjects
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
          
          {data.length === 0 && emptyState}
        </div>
      )}
    </div>
  );
};

export default Academics;
