import React, { useState, useEffect } from 'react';
import { MessageSquare, Calendar, User, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { getAuthToken } from '../utils/auth';

export const FeedbackAdmin = () => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const res = await fetch('/api/admin/feedback', {
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
      });
      const data = await res.json();
      setFeedback(data);
    } catch (err) {
      console.error('Failed to fetch feedback', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
      });
      fetchFeedback();
    } catch (err) {
      console.error('Failed to delete feedback', err);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/feedback/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ status })
      });
      fetchFeedback();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[var(--lime)]/30 border-t-[var(--lime)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-widest">USER FEEDBACK</h2>
        <div className="text-xs text-[var(--mu2)] uppercase tracking-widest font-bold">
          {feedback.length} Submissions
        </div>
      </div>

      <div className="grid gap-4">
        {feedback.map((item) => (
          <div 
            key={item.id} 
            className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6 hover:border-[var(--lime)]/30 transition-all group"
          >
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--s2)] flex items-center justify-center text-[var(--lime)]">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[var(--w)]">{item.name || 'Anonymous'}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                        item.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 
                        item.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' : 
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {item.status || 'new'}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--mu2)] flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.email || 'No email'}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy HH:mm') : 'Unknown date'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--s2)] rounded-xl p-4 border border-[var(--b2)]">
                  <p className="text-sm text-[var(--mu)] leading-relaxed whitespace-pre-wrap">
                    {item.message}
                  </p>
                </div>

                {item.category && (
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-[var(--b2)] text-[var(--mu2)] px-2 py-1 rounded font-bold uppercase tracking-widest">
                      {item.category}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex md:flex-col items-center justify-end gap-2">
                <button 
                  onClick={() => handleStatusUpdate(item.id, 'resolved')}
                  className="p-2 bg-[var(--s2)] rounded-lg text-[var(--mu2)] hover:text-green-400 transition-colors"
                  title="Mark as Resolved"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleStatusUpdate(item.id, 'in-progress')}
                  className="p-2 bg-[var(--s2)] rounded-lg text-[var(--mu2)] hover:text-blue-400 transition-colors"
                  title="Mark as In Progress"
                >
                  <Clock className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-2 bg-[var(--s2)] rounded-lg text-[var(--mu2)] hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {feedback.length === 0 && (
          <div className="text-center py-20 bg-[var(--s1)] border border-dashed border-[var(--b2)] rounded-3xl">
            <MessageSquare className="w-12 h-12 text-[var(--mu2)] mx-auto mb-4 opacity-20" />
            <p className="text-[var(--mu2)] font-bold uppercase tracking-widest text-sm">No feedback received yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
