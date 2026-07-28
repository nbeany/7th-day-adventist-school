import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';

const tabStyle = (isActive: boolean) => ({
  padding: '0.5rem 1rem',
  background: 'none',
  border: 'none',
  borderBottom: isActive ? '2px solid #dc2626' : '2px solid transparent',
  color: isActive ? '#dc2626' : '#666666',
  cursor: 'pointer',
  fontWeight: 500 as const,
  fontSize: '0.875rem',
  transition: 'all 0.15s ease',
});

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
    <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>
      No data found. Click "Add New" to get started.
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1>Academic Structure</h1>
          <p>Configure your school's terms, grades, and subjects.</p>
        </div>
        <Button variant="primary">Add New</Button>
      </div>
      
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setActiveTab('terms')} style={tabStyle(activeTab === 'terms')}>
          Terms & Semesters
        </button>
        <button onClick={() => setActiveTab('grades')} style={tabStyle(activeTab === 'grades')}>
          Grade Levels
        </button>
        <button onClick={() => setActiveTab('subjects')} style={tabStyle(activeTab === 'subjects')}>
          Subjects
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Loading...</div>
      ) : (
        <>
          {activeTab === 'terms' && (
            <Table columns={['Name', 'Start Date', 'End Date', 'Status']}>
              {data.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td>{item.start_date}</td>
                  <td>{item.end_date}</td>
                  <td>
                    <span className="badge" style={item.is_active ? { backgroundColor: '#dc2626', color: '#ffffff' } : { backgroundColor: '#f0f0f0', color: '#666666' }}>
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
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td>{item.level_order}</td>
                </tr>
              ))}
            </Table>
          )}
          
          {activeTab === 'subjects' && (
            <Table columns={['Name', 'Code']}>
              {data.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td>{item.code || '—'}</td>
                </tr>
              ))}
            </Table>
          )}
          
          {data.length === 0 && emptyState}
        </>
      )}
    </div>
  );
};

export default Academics;
