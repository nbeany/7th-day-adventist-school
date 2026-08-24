import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, BookOpen, Users, Trophy } from 'lucide-react';
import api from '../api/axios';

import { useAuth } from '../context/AuthContext';

const Landing: React.FC = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/announcements/');
        setAnnouncements(res.data);
      } catch (error) {
        console.error("Failed to fetch announcements", error);
      }
    };
    fetchAnnouncements();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-transparent">
              <img src="/logo.png" alt="SDA Logo" className="w-8 h-8 object-contain" />
            </div>
            <span className="font-bold text-xl tracking-tight text-primary">Debre Berhan SDA School</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to={isAuthenticated ? "/dashboard" : "/login"} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
              {isAuthenticated ? "Go to Dashboard" : "Portal Login"} <ArrowRight size={16} className="ml-2" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-24 md:py-32 lg:py-48 bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-[800px] mx-auto space-y-6">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-foreground mb-4">
                Empowering the Future at <span className="text-primary">Debre Berhan</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                A community dedicated to academic excellence, spiritual growth, and character development. Welcome to the official portal of Debre Berhan Seventh-Day Adventist School.
              </p>
              <div className="flex justify-center gap-4">
                <Link to={isAuthenticated ? "/dashboard" : "/login"} className="inline-flex items-center justify-center rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-12 px-8">
                  {isAuthenticated ? "Go to Dashboard" : "Access Portal"}
                </Link>
                <a href="#notice-board" className="inline-flex items-center justify-center rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-12 px-8">
                  View Announcements
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6 space-y-4">
                <div className="p-4 bg-primary/10 text-primary rounded-full">
                  <BookOpen size={32} />
                </div>
                <h3 className="text-xl font-bold">Academic Excellence</h3>
                <p className="text-muted-foreground">Rigorous curriculum designed to challenge and inspire students to reach their highest potential.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 space-y-4">
                <div className="p-4 bg-primary/10 text-primary rounded-full">
                  <Users size={32} />
                </div>
                <h3 className="text-xl font-bold">Community Focus</h3>
                <p className="text-muted-foreground">A supportive environment that fosters strong relationships between students, parents, and teachers.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 space-y-4">
                <div className="p-4 bg-primary/10 text-primary rounded-full">
                  <Trophy size={32} />
                </div>
                <h3 className="text-xl font-bold">Character Building</h3>
                <p className="text-muted-foreground">Integrating faith and learning to develop well-rounded individuals prepared for the future.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Public Notice Board Section */}
        <section id="notice-board" className="w-full py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">Community Notice Board</h2>
            
            {announcements.length === 0 ? (
              <div className="text-center p-12 bg-card rounded-lg border shadow-sm">
                <p className="text-muted-foreground">No recent announcements from the administration.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {announcements.map((a) => (
                  <div key={a.id} className="p-6 bg-card rounded-lg border shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold">{a.title}</h3>
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {a.image && (
                      <div className="mb-6 rounded-md overflow-hidden bg-muted/50 border max-h-96 flex items-center justify-center">
                        <img src={a.image} alt={a.title} className="object-contain w-full max-h-96" />
                      </div>
                    )}
                    <p className="text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                    <div className="mt-4 pt-4 border-t text-sm text-muted-foreground flex justify-between items-center">
                      <span>Posted by: {a.created_by_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="w-full py-8 border-t bg-background">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Debre Berhan Seventh-Day Adventist School. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
