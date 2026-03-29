import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Star, Video, Image as ImageIcon } from 'lucide-react';

interface Review {
  id: string;
  clientName: string;
  carName: string;
  location: string;
  savings: string;
  imageUrl: string;
  videoUrl: string | null;
  rating: number;
  isActive: boolean;
  createdAt: string;
}

export function ReviewsAdmin() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Review>>({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/admin/reviews', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id?: string) => {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/reviews/${id}` : '/api/admin/reviews';
    
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (res.ok) {
        fetchReviews();
        setEditingId(null);
        setIsAdding(false);
        setEditForm({});
      }
    } catch (error) {
      console.error('Failed to save review:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (res.ok) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  };

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditForm(review);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditForm({
      clientName: '',
      carName: '',
      location: '',
      savings: '',
      imageUrl: '',
      videoUrl: '',
      rating: 5,
      isActive: true
    });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-display">Client Reviews</h2>
        <button
          onClick={startAdd}
          disabled={isAdding}
          className="flex items-center gap-2 bg-[var(--lime)] text-white px-4 py-2 rounded-lg font-bold hover:bg-[var(--lime2)] transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Add Review
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-600">Client</th>
                <th className="p-4 font-bold text-slate-600">Car</th>
                <th className="p-4 font-bold text-slate-600">Media</th>
                <th className="p-4 font-bold text-slate-600">Status</th>
                <th className="p-4 font-bold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isAdding && (
                <tr className="bg-slate-50/50">
                  <td className="p-4 space-y-2">
                    <input
                      type="text"
                      placeholder="Client Name"
                      value={editForm.clientName || ''}
                      onChange={e => setEditForm({...editForm, clientName: e.target.value})}
                      className="w-full border border-slate-200 rounded px-2 py-1"
                    />
                    <input
                      type="text"
                      placeholder="Location (e.g. Los Angeles, CA)"
                      value={editForm.location || ''}
                      onChange={e => setEditForm({...editForm, location: e.target.value})}
                      className="w-full border border-slate-200 rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-4 space-y-2">
                    <input
                      type="text"
                      placeholder="Car Name"
                      value={editForm.carName || ''}
                      onChange={e => setEditForm({...editForm, carName: e.target.value})}
                      className="w-full border border-slate-200 rounded px-2 py-1"
                    />
                    <input
                      type="text"
                      placeholder="Savings (e.g. Saved $4,500)"
                      value={editForm.savings || ''}
                      onChange={e => setEditForm({...editForm, savings: e.target.value})}
                      className="w-full border border-slate-200 rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-4 space-y-2">
                    <input
                      type="text"
                      placeholder="Image URL"
                      value={editForm.imageUrl || ''}
                      onChange={e => setEditForm({...editForm, imageUrl: e.target.value})}
                      className="w-full border border-slate-200 rounded px-2 py-1"
                    />
                    <input
                      type="text"
                      placeholder="Video URL (Optional)"
                      value={editForm.videoUrl || ''}
                      onChange={e => setEditForm({...editForm, videoUrl: e.target.value})}
                      className="w-full border border-slate-200 rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isActive || false}
                        onChange={e => setEditForm({...editForm, isActive: e.target.checked})}
                        className="rounded border-slate-300 text-[var(--lime)] focus:ring-[var(--lime)]"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleSave()} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsAdding(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              
              {reviews.map(review => (
                <tr key={review.id} className="hover:bg-slate-50">
                  {editingId === review.id ? (
                    <>
                      <td className="p-4 space-y-2">
                        <input
                          type="text"
                          value={editForm.clientName || ''}
                          onChange={e => setEditForm({...editForm, clientName: e.target.value})}
                          className="w-full border border-slate-200 rounded px-2 py-1"
                        />
                        <input
                          type="text"
                          value={editForm.location || ''}
                          onChange={e => setEditForm({...editForm, location: e.target.value})}
                          className="w-full border border-slate-200 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-4 space-y-2">
                        <input
                          type="text"
                          value={editForm.carName || ''}
                          onChange={e => setEditForm({...editForm, carName: e.target.value})}
                          className="w-full border border-slate-200 rounded px-2 py-1"
                        />
                        <input
                          type="text"
                          value={editForm.savings || ''}
                          onChange={e => setEditForm({...editForm, savings: e.target.value})}
                          className="w-full border border-slate-200 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-4 space-y-2">
                        <input
                          type="text"
                          value={editForm.imageUrl || ''}
                          onChange={e => setEditForm({...editForm, imageUrl: e.target.value})}
                          className="w-full border border-slate-200 rounded px-2 py-1"
                        />
                        <input
                          type="text"
                          value={editForm.videoUrl || ''}
                          onChange={e => setEditForm({...editForm, videoUrl: e.target.value})}
                          className="w-full border border-slate-200 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isActive || false}
                            onChange={e => setEditForm({...editForm, isActive: e.target.checked})}
                            className="rounded border-slate-300 text-[var(--lime)] focus:ring-[var(--lime)]"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleSave(review.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{review.clientName}</div>
                        <div className="text-xs text-slate-500">{review.location}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-900">{review.carName}</div>
                        <div className="text-xs font-medium text-emerald-600 bg-emerald-50 inline-block px-1.5 py-0.5 rounded mt-1">
                          {review.savings}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {review.imageUrl && (
                            <div className="w-10 h-10 rounded overflow-hidden bg-slate-100">
                              <img src={review.imageUrl} alt={`Review by ${review.clientName}`} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex gap-1">
                            {review.imageUrl && <ImageIcon className="w-4 h-4 text-slate-400" />}
                            {review.videoUrl && <Video className="w-4 h-4 text-emerald-500" />}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          review.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {review.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(review)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(review.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              
              {reviews.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No reviews found. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
