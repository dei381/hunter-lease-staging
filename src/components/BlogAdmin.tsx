import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Edit2, Trash2, X, Save, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { BlogPost } from '../data/blogPosts';
import { Link } from 'react-router-dom';
import { BlogAIGenerator } from './BlogAIGenerator';

type EditingPost = {
  id?: string;
  title_en?: string;
  title_ru?: string;
  excerpt_en?: string;
  excerpt_ru?: string;
  content_en?: string;
  content_ru?: string;
  date?: string;
  author?: string;
  authorRole_en?: string;
  authorRole_ru?: string;
  authorImage?: string;
  readTime_en?: string;
  readTime_ru?: string;
  category_en?: string;
  category_ru?: string;
  image?: string;
  featured?: boolean;
};

export const BlogAdmin = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<EditingPost | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'blogPosts'), (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlogPost[];
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'blogPosts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!editingPost?.title_en || !editingPost?.title_ru || !editingPost?.content_en || !editingPost?.content_ru) {
      alert('Please fill in all required fields (Title and Content in both languages).');
      return;
    }

    try {
      const postId = editingPost.id || doc(collection(db, 'blogPosts')).id;
      const postRef = doc(db, 'blogPosts', postId);
      
      const postData = {
        title: { en: editingPost.title_en, ru: editingPost.title_ru },
        excerpt: { en: editingPost.excerpt_en || '', ru: editingPost.excerpt_ru || '' },
        content: { en: editingPost.content_en, ru: editingPost.content_ru },
        date: editingPost.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        author: editingPost.author || 'Hunter Lease Team',
        authorRole: { en: editingPost.authorRole_en || 'Expert', ru: editingPost.authorRole_ru || 'Эксперт' },
        authorImage: editingPost.authorImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
        readTime: { en: editingPost.readTime_en || '5 min read', ru: editingPost.readTime_ru || '5 мин' },
        category: { en: editingPost.category_en || 'General', ru: editingPost.category_ru || 'Общее' },
        image: editingPost.image || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1200',
        featured: editingPost.featured || false,
        updatedAt: serverTimestamp()
      };

      if (!editingPost.id) {
        Object.assign(postData, { createdAt: serverTimestamp() });
      } else {
        // preserve createdAt
        const existingDoc = await getDoc(postRef);
        if (existingDoc.exists()) {
          Object.assign(postData, { createdAt: existingDoc.data().createdAt });
        }
      }

      await setDoc(postRef, postData, { merge: true });
      setIsEditing(false);
      setEditingPost(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'blogPosts');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deleteDoc(doc(db, 'blogPosts', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `blogPosts/${id}`);
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[var(--mu2)]">Loading blog posts...</div>;
  }

  return (
    <div className="space-y-6">
      <BlogAIGenerator />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display uppercase tracking-widest">Blog Posts</h2>
        <button
          onClick={() => {
            setEditingPost({});
            setIsEditing(true);
          }}
          className="flex items-center gap-2 bg-[var(--lime)] text-black px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-[var(--lime2)] transition-colors"
        >
          <Plus size={16} />
          New Post
        </button>
      </div>

      <div className="bg-[var(--s1)] rounded-2xl border border-[var(--b2)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--s2)] text-[var(--mu2)] uppercase tracking-widest text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Title (EN)</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Featured</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--b2)]">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-[var(--s2)] transition-colors">
                  <td className="px-6 py-4 font-medium text-white">
                    {post.title?.en}
                  </td>
                  <td className="px-6 py-4 text-[var(--mu2)]">
                    {post.category?.en}
                  </td>
                  <td className="px-6 py-4 text-[var(--mu2)]">
                    {post.date}
                  </td>
                  <td className="px-6 py-4">
                    {post.featured ? (
                      <span className="bg-[var(--lime)]/10 text-[var(--lime)] px-2 py-1 rounded text-xs font-bold uppercase">Yes</span>
                    ) : (
                      <span className="text-[var(--mu2)] px-2 py-1 text-xs uppercase">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      to={`/blog/${post.id}`}
                      target="_blank"
                      className="inline-flex items-center justify-center p-2 text-[var(--mu2)] hover:text-white hover:bg-[var(--s1)] rounded-lg transition-colors"
                      title="View Post"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      onClick={() => {
                        setEditingPost({
                          id: post.id,
                          title_en: post.title?.en,
                          title_ru: post.title?.ru,
                          excerpt_en: post.excerpt?.en,
                          excerpt_ru: post.excerpt?.ru,
                          content_en: post.content?.en,
                          content_ru: post.content?.ru,
                          date: post.date,
                          author: post.author,
                          authorRole_en: post.authorRole?.en,
                          authorRole_ru: post.authorRole?.ru,
                          authorImage: post.authorImage,
                          readTime_en: post.readTime?.en,
                          readTime_ru: post.readTime?.ru,
                          category_en: post.category?.en,
                          category_ru: post.category?.ru,
                          image: post.image,
                          featured: post.featured,
                        });
                        setIsEditing(true);
                      }}
                      className="inline-flex items-center justify-center p-2 text-[var(--mu2)] hover:text-[var(--lime)] hover:bg-[var(--lime)]/10 rounded-lg transition-colors"
                      title="Edit Post"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="inline-flex items-center justify-center p-2 text-[var(--mu2)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Post"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[var(--mu2)]">
                    No blog posts found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg)] w-full max-w-4xl rounded-3xl border border-[var(--lime)]/30 shadow-2xl relative my-8"
            >
              <div className="sticky top-0 bg-[var(--bg)] border-b border-[var(--b2)] p-6 flex justify-between items-center z-10 rounded-t-3xl">
                <h3 className="text-2xl font-display uppercase tracking-widest">
                  {editingPost?.id ? 'Edit Post' : 'New Post'}
                </h3>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingPost(null);
                  }}
                  className="text-[var(--mu2)] hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* English Fields */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-[var(--lime)] uppercase tracking-widest text-sm border-b border-[var(--b2)] pb-2">English Content</h4>
                    
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Title (EN) *</label>
                      <input
                        type="text"
                        value={editingPost?.title_en || ''}
                        onChange={e => setEditingPost({ ...editingPost, title_en: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Excerpt (EN)</label>
                      <textarea
                        value={editingPost?.excerpt_en || ''}
                        onChange={e => setEditingPost({ ...editingPost, excerpt_en: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] h-24"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Content (EN) * (HTML allowed)</label>
                      <textarea
                        value={editingPost?.content_en || ''}
                        onChange={e => setEditingPost({ ...editingPost, content_en: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] h-64 font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Category (EN)</label>
                      <input
                        type="text"
                        value={editingPost?.category_en || ''}
                        onChange={e => setEditingPost({ ...editingPost, category_en: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)]"
                      />
                    </div>
                  </div>

                  {/* Russian Fields */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-[var(--lime)] uppercase tracking-widest text-sm border-b border-[var(--b2)] pb-2">Russian Content</h4>
                    
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Title (RU) *</label>
                      <input
                        type="text"
                        value={editingPost?.title_ru || ''}
                        onChange={e => setEditingPost({ ...editingPost, title_ru: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Excerpt (RU)</label>
                      <textarea
                        value={editingPost?.excerpt_ru || ''}
                        onChange={e => setEditingPost({ ...editingPost, excerpt_ru: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] h-24"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Content (RU) * (HTML allowed)</label>
                      <textarea
                        value={editingPost?.content_ru || ''}
                        onChange={e => setEditingPost({ ...editingPost, content_ru: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] h-64 font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Category (RU)</label>
                      <input
                        type="text"
                        value={editingPost?.category_ru || ''}
                        onChange={e => setEditingPost({ ...editingPost, category_ru: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Shared Fields */}
                <div className="space-y-4 pt-6 border-t border-[var(--b2)]">
                  <h4 className="font-bold text-[var(--lime)] uppercase tracking-widest text-sm border-b border-[var(--b2)] pb-2">Shared Metadata</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Main Image URL</label>
                      <input
                        type="text"
                        value={editingPost?.image || ''}
                        onChange={e => setEditingPost({ ...editingPost, image: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">Author Name</label>
                      <input
                        type="text"
                        value={editingPost?.author || ''}
                        onChange={e => setEditingPost({ ...editingPost, author: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)]"
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-6">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPost?.featured || false}
                          onChange={e => setEditingPost({ ...editingPost, featured: e.target.checked })}
                          className="w-5 h-5 rounded border-[var(--b2)] bg-[var(--s1)] text-[var(--lime)] focus:ring-[var(--lime)] focus:ring-offset-0"
                        />
                        <span className="text-sm font-bold uppercase tracking-widest text-white">Featured Post</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-[var(--bg)] border-t border-[var(--b2)] p-6 flex justify-end gap-4 rounded-b-3xl">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingPost(null);
                  }}
                  className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs text-white hover:bg-[var(--s1)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-[var(--lime)] text-black px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[var(--lime2)] transition-colors"
                >
                  <Save size={16} />
                  Save Post
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
