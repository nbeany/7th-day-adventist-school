import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, GraduationCap, CalendarDays } from 'lucide-react';

const Home: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Welcome back, {user?.username}</h1>
        <p>Here's an overview of your school portal.</p>
      </div>
      
      <div className="grid-cols-3">
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: '#000000', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#666666', marginBottom: '0' }}>Total Users</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000000' }}>—</p>
            </div>
          </div>
        </div>
        
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#666666', marginBottom: '0' }}>Grade Levels</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000000' }}>—</p>
            </div>
          </div>
        </div>
        
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: '#000000', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#666666', marginBottom: '0' }}>Active Term</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000000' }}>—</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Getting Started</h3>
        <p>Configure your academic structure, add users, and set up your school settings to get started.</p>
      </div>
    </div>
  );
};

export default Home;
