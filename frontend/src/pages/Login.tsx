import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { GraduationCap } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

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
    <div className="relative flex items-center justify-center min-h-screen bg-background">
      {/* Decorative gradient blobs behind the card */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] opacity-50 mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] opacity-50 mix-blend-screen pointer-events-none"></div>
      
      <div className="relative w-full max-w-md p-8 sm:p-10 glass-card sm:rounded-2xl shadow-glow animate-scale-in">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center w-24 h-24 mx-auto mb-4 bg-transparent">
            <img src="/logo.png" alt="SDA Logo" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Debre Berhan SDA School</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your school dashboard</p>
        </div>

        {error && (
          <div className="p-3 mb-6 text-sm border rounded-md bg-destructive/10 text-destructive border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="••••••••"
            required 
          />
          
          <Button type="submit" variant="primary" isLoading={isLoading} className="w-full mt-2">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
