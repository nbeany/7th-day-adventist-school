import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

interface SchoolConfig {
  id?: number;
  name: string;
  primary_color: string;
  secondary_color: string;
  grading_scale: string;
}

const Settings: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig>({
    name: 'My School',
    primary_color: '#000000',
    secondary_color: '#FFFFFF',
    grading_scale: 'PERCENTAGE'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/schools/');
        if (response.data.length > 0) {
          setConfig(response.data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      if (config.id) {
        await api.put(`/schools/${config.id}/`, config);
      } else {
        const res = await api.post('/schools/', config);
        setConfig(res.data);
      }
      setMessage('Settings saved successfully!');
    } catch (error) {
      setMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">School Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your school's branding and grading system.</p>
      </div>
      
      <div className="p-6 border rounded-lg shadow-sm bg-card text-card-foreground">
        {message && (
          <div className={`p-3 mb-6 text-sm border rounded-md ${message.includes('success') ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
            {message.includes('success') ? '✓' : '✗'} {message}
          </div>
        )}
        
        <div className="space-y-4">
          <Input 
            label="School Name"
            value={config.name}
            onChange={(e) => setConfig({...config, name: e.target.value})}
          />
          
          <div className="grid gap-4 md:grid-cols-2">
            <Input 
              label="Primary Color"
              type="color"
              value={config.primary_color}
              onChange={(e) => setConfig({...config, primary_color: e.target.value})}
              className="h-10 p-1"
            />
            <Input 
              label="Secondary Color"
              type="color"
              value={config.secondary_color}
              onChange={(e) => setConfig({...config, secondary_color: e.target.value})}
              className="h-10 p-1"
            />
          </div>
          
          <div className="flex flex-col w-full mb-4">
            <label className="mb-1.5 text-sm font-medium text-foreground">Grading Scale</label>
            <select 
              className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={config.grading_scale}
              onChange={(e) => setConfig({...config, grading_scale: e.target.value})}
            >
              <option value="PERCENTAGE">Percentage (0-100)</option>
              <option value="GPA">GPA (0.0-4.0)</option>
              <option value="LETTER">Letter Grade (A, B, C...)</option>
            </select>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
