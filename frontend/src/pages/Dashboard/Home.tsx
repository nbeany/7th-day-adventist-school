import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, GraduationCap, CalendarDays } from 'lucide-react';

const Home: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.username}</h1>
        <p className="text-muted-foreground">Here's an overview of your school portal.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
              <Users size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">—</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-accent text-accent-foreground">
              <GraduationCap size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Grade Levels</p>
              <p className="text-2xl font-bold">—</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Term</p>
              <p className="text-2xl font-bold">—</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
        <h3 className="mb-2 text-lg font-semibold tracking-tight">Getting Started</h3>
        <p className="text-sm text-muted-foreground">Configure your academic structure, add users, and set up your school settings to get started.</p>
      </div>
    </div>
  );
};

export default Home;
