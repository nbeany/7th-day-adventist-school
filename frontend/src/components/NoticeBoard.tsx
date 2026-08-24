import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';

interface Announcement {
  id: number;
  title: string;
  content: string;
  image?: string | null;
  target_audience: string;
  created_by_name: string;
  created_at: string;
}

const NoticeBoard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', target_audience: 'ALL' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/announcements/');
      setAnnouncements(res.data);
    } catch (error) {
      console.error("Failed to fetch announcements", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePost = async () => {
    if (!newPost.title || !newPost.content) return;
    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append('title', newPost.title);
      formData.append('content', newPost.content);
      formData.append('target_audience', newPost.target_audience);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await api.post('/announcements/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setIsModalOpen(false);
      setNewPost({ title: '', content: '', target_audience: 'ALL' });
      setImageFile(null);
      fetchAnnouncements();
    } catch (error) {
      console.error("Failed to post announcement", error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      await api.delete(`/announcements/${id}/`);
      fetchAnnouncements();
    } catch (error) {
      console.error("Failed to delete announcement", error);
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between p-6 border-b">
        <h3 className="text-lg font-semibold tracking-tight flex items-center">
          <Megaphone size={18} className="mr-2 text-primary" /> Notice Board
        </h3>
        {isAdmin && (
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} className="mr-1" /> New Post
          </Button>
        )}
      </div>
      
      <div className="p-0 overflow-y-auto max-h-[500px]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading notices...</div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground italic">No new announcements.</div>
        ) : (
          <div className="divide-y">
            {announcements.map((a) => (
              <div key={a.id} className="p-6 transition-colors hover:bg-muted/30">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-base">{a.title}</h4>
                  {isAdmin && (
                    <button onClick={() => handleDelete(a.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {a.image && (
                  <div className="mb-4 rounded-md overflow-hidden bg-muted/50 border max-h-64 flex items-center justify-center">
                    <img src={a.image} alt={a.title} className="object-contain w-full max-h-64" />
                  </div>
                )}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{a.content}</p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wider">
                  <span>{new Date(a.created_at).toLocaleDateString()} • {a.created_by_name}</span>
                  {isAdmin && <span className="bg-muted px-2 py-0.5 rounded text-foreground">{a.target_audience}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Announcement">
        <div className="space-y-4">
          <Input 
            label="Title" 
            value={newPost.title} 
            onChange={(e) => setNewPost({...newPost, title: e.target.value})} 
            placeholder="Important Update" 
          />
          <div className="flex flex-col w-full">
            <label className="mb-1.5 text-sm font-medium text-foreground">Message</label>
            <textarea
              className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border min-h-[100px] text-foreground"
              value={newPost.content}
              onChange={(e) => setNewPost({...newPost, content: e.target.value})}
              placeholder="Write your announcement here..."
            />
          </div>
          <div className="flex flex-col w-full">
            <label className="mb-1.5 text-sm font-medium text-foreground">Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
              className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>
          <div className="flex flex-col w-full">
            <label className="mb-1.5 text-sm font-medium text-foreground">Target Audience</label>
            <select
              className="flex w-full px-3 py-2 text-sm transition-colors bg-input border rounded-md border-border text-foreground"
              value={newPost.target_audience}
              onChange={(e) => setNewPost({...newPost, target_audience: e.target.value})}
            >
              <option value="ALL">All Community</option>
              <option value="TEACHERS">Teachers Only</option>
              <option value="STUDENTS">Students Only</option>
              <option value="PARENTS">Parents Only</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handlePost} isLoading={isPosting}>Post Announcement</Button>
        </div>
      </Modal>
    </div>
  );
};

export default NoticeBoard;
