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
    <div className="animate-fade-in" style={{ maxWidth: '560px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>School Settings</h1>
        <p>Configure your school's branding and grading system.</p>
      </div>
      
      <div className="card" style={{ padding: '1.5rem' }}>
        {message && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: message.includes('success') ? '#f0f0f0' : '#fef2f2',
            color: message.includes('success') ? '#000000' : '#dc2626',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
          }}>
            {message.includes('success') ? '✓' : '✗'} {message}
          </div>
        )}
        
        <Input 
          label="School Name"
          value={config.name}
          onChange={(e) => setConfig({...config, name: e.target.value})}
        />
        
        <div className="grid-cols-2">
          <Input 
            label="Primary Color"
            type="color"
            value={config.primary_color}
            onChange={(e) => setConfig({...config, primary_color: e.target.value})}
            style={{ padding: '0.25rem', height: '2.5rem' }}
          />
          <Input 
            label="Secondary Color"
            type="color"
            value={config.secondary_color}
            onChange={(e) => setConfig({...config, secondary_color: e.target.value})}
            style={{ padding: '0.25rem', height: '2.5rem' }}
          />
        </div>
        
        <div className="input-group">
          <label className="input-label">Grading Scale</label>
          <select 
            className="input-field"
            value={config.grading_scale}
            onChange={(e) => setConfig({...config, grading_scale: e.target.value})}
          >
            <option value="PERCENTAGE">Percentage (0-100)</option>
            <option value="GPA">GPA (0.0-4.0)</option>
            <option value="LETTER">Letter Grade (A, B, C...)</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
