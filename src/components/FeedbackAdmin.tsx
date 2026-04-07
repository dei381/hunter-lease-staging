import React, { useState, useEffect } from 'react';
import { MessageSquare, Check, X, Clock } from 'lucide-react';
import { getAuthToken } from '../utils/auth';

export const FeedbackAdmin = () => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async (pageNum: number) => {
    try {
      const res = await fetch(`/api/admin/feedback?page=${pageNum}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch feedback');
      const data = await res.json();
      if (data.data) {
        setFeedback(data.data);
        setTotalPages(Math.ceil(data.total / data.limit));
      } else {
        setFeedback(data);
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback(page);
  }, [page]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/feedback/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ status })
      });
      fetchFeedback(page);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading feedback...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Обратная связь (Feedback)
        </h2>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Message</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {feedback.map((item) => (
              <tr key={item.id} className={item.status === 'new' ? 'bg-blue-50/50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-slate-900">
                  <div className="font-medium">{item.name || 'Anonymous'}</div>
                  <div className="text-slate-500">{item.email || 'No email'}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 max-w-md">
                  <div className="whitespace-pre-wrap">{item.message}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    item.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {item.status === 'new' && (
                    <button
                      onClick={() => updateStatus(item.id, 'resolved')}
                      className="text-green-600 hover:text-green-900 flex items-center gap-1 justify-end w-full"
                    >
                      <Check className="w-4 h-4" /> Resolve
                    </button>
                  )}
                  {item.status === 'resolved' && (
                    <button
                      onClick={() => updateStatus(item.id, 'new')}
                      className="text-slate-600 hover:text-slate-900 flex items-center gap-1 justify-end w-full"
                    >
                      <Clock className="w-4 h-4" /> Reopen
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {feedback.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No feedback received yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t border-slate-200">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-slate-500 flex items-center">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
