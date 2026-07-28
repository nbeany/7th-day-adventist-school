import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { GraduationCap } from 'lucide-react';
import './Login.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/api/token/', {
        username,
        password
      });
      login(response.data.access, response.data.refresh);
    } catch (err) {
      setError('Invalid username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <div className="login-icon">
            <GraduationCap size={24} />
          </div>
          <h1 className="login-title">EduPortal</h1>
          <p className="login-subtitle">Sign in to your school dashboard</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <Input 
            label="Username" 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Enter your username"
            required 
          />
          <Input 
            label="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Enter your password"
            required 
          />
          
          <Button type="submit" variant="primary" isLoading={isLoading} style={{ width: '100%', marginTop: '0.5rem' }}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
