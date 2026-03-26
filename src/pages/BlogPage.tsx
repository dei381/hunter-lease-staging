import React, { useState, useEffect } from 'react';
import { SEO } from '../components/SEO';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { ArrowRight, Calendar, Clock, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { BlogPost } from '../data/blogPosts';

export const BlogPage = () => {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
        setBlogPosts(posts);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const getLocalized = (post: BlogPost, field: string) => {
    return (post as any)[`${field}_${language}`] || '';
  };

  const categories = ['All', ...Array.from(new Set(blogPosts.map(post => getLocalized(post, 'category'))))];

  const featuredPost = blogPosts.find(post => post.featured) || blogPosts[0];
  
  const filteredPosts = blogPosts.filter(post => 
    post.id !== featuredPost?.id && 
    (activeCategory === 'All' || getLocalized(post, 'category') === activeCategory)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20 flex items-center justify-center">
        <div className="text-[var(--mu2)] text-xl">Loading...</div>
      </div>
    );
  }

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": language === 'ru' ? 'Блог | Hunter Lease' : 'Blog | Hunter Lease',
    "description": language === 'ru' ? 'Полезные статьи о покупке и лизинге авто в США.' : 'Useful articles about buying and leasing cars in the US.',
    "url": window.location.href,
    "blogPost": blogPosts.slice(0, 10).map(post => ({
      "@type": "BlogPosting",
      "headline": getLocalized(post, 'title'),
      "image": post.image,
      "datePublished": post.date,
      "url": `${window.location.origin}/blog/${post.id}`
    }))
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20">
      <SEO 
        title={language === 'ru' ? 'Блог | Hunter Lease' : 'Blog | Hunter Lease'}
        description={language === 'ru' ? 'Полезные статьи о покупке и лизинге авто в США.' : 'Useful articles about buying and leasing cars in the US.'}
        schema={blogSchema}
      />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="font-display text-5xl tracking-widest uppercase mb-6">
            {language === 'ru' ? 'Блог' : 'Blog'}
          </h1>
          <p className="text-[var(--mu2)] text-xl max-w-2xl mx-auto">
            {language === 'ru' 
              ? 'Полезные советы, руководства и новости из мира автолизинга в США.' 
              : 'Useful tips, guides, and news from the world of auto leasing in the US.'}
          </p>
        </div>

        {/* Featured Post */}
        {activeCategory === 'All' && featuredPost && (
          <div className="mb-20">
            <Link to={`/blog/${featuredPost.id}`} className="group block">
              <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl overflow-hidden hover:border-[var(--lime)]/50 transition-colors flex flex-col md:flex-row">
                <div className="md:w-2/3 relative h-64 md:h-auto overflow-hidden">
                  {featuredPost.image ? (
                    <img 
                      src={featuredPost.image} 
                      alt={getLocalized(featuredPost, 'title')} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--s2)] flex items-center justify-center text-[var(--mu2)]">
                      No Image
                    </div>
                  )}
                  <div className="absolute top-6 left-6 bg-[var(--bg)]/80 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-[var(--lime)]">
                    {getLocalized(featuredPost, 'category')}
                  </div>
                </div>
                <div className="md:w-1/3 p-8 md:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-4 text-xs text-[var(--mu2)] uppercase tracking-widest font-bold mb-6">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {featuredPost.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {getLocalized(featuredPost, 'readTime')}
                    </span>
                  </div>
                  <h2 className="font-display text-3xl mb-4 text-[var(--w)] group-hover:text-[var(--lime)] transition-colors">
                    {getLocalized(featuredPost, 'title')}
                  </h2>
                  <p className="text-[var(--mu2)] text-lg mb-8 line-clamp-3">
                    {getLocalized(featuredPost, 'excerpt')}
                  </p>
                  <div className="flex items-center gap-4 mt-auto">
                    {featuredPost.authorImage && (
                      <img src={featuredPost.authorImage} alt={featuredPost.author} className="w-12 h-12 rounded-full object-cover border-2 border-[var(--b2)]" />
                    )}
                    <div>
                      <div className="font-bold text-sm">{featuredPost.author}</div>
                      <div className="text-xs text-[var(--mu2)]">{getLocalized(featuredPost, 'authorRole')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Categories */}
        <div className="flex flex-wrap gap-3 mb-12 justify-center">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-colors ${
                activeCategory === category 
                  ? 'bg-[var(--lime)] text-black' 
                  : 'bg-[var(--s1)] text-[var(--mu2)] hover:text-white border border-[var(--b2)]'
              }`}
            >
              {category === 'All' ? (language === 'ru' ? 'Все' : 'All') : category}
            </button>
          ))}
        </div>

        {/* Post Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {filteredPosts.map((post, i) => (
            <motion.article 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={`/blog/${post.id}`} className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl overflow-hidden hover:border-[var(--lime)]/50 transition-colors group flex flex-col h-full">
                <div className="relative h-48 overflow-hidden">
                  {post.image ? (
                    <img 
                      src={post.image} 
                      alt={getLocalized(post, 'title')} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--s2)] flex items-center justify-center text-[var(--mu2)]">
                      No Image
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-[var(--bg)]/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-[var(--lime)]">
                    {getLocalized(post, 'category')}
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="font-display text-xl mb-3 text-[var(--w)] group-hover:text-[var(--lime)] transition-colors line-clamp-2">
                    {getLocalized(post, 'title')}
                  </h2>
                  
                  <p className="text-[var(--mu2)] text-sm mb-6 line-clamp-3 flex-1">
                    {getLocalized(post, 'excerpt')}
                  </p>
                  
                  <div className="flex items-center justify-between text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold pt-4 border-t border-[var(--b2)]">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {getLocalized(post, 'readTime')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* Newsletter Block */}
        <div className="bg-gradient-to-br from-[var(--s1)] to-[var(--s2)] border border-[var(--lime)]/20 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--lime)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--teal)]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-[var(--lime)]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[var(--lime)]/20">
              <Mail className="w-8 h-8 text-[var(--lime)]" />
            </div>
            <h2 className="font-display text-4xl uppercase mb-4">
              {language === 'ru' ? 'Будьте в курсе' : 'Stay Updated'}
            </h2>
            <p className="text-[var(--mu2)] mb-8">
              {language === 'ru' 
                ? 'Получайте лучшие предложения по лизингу, инсайдерские советы и новости рынка каждую неделю.' 
                : 'Get the best lease deals, insider tips, and market news delivered weekly.'}
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder={language === 'ru' ? 'Ваш email' : 'Your email address'} 
                className="flex-1 bg-[var(--bg)] border border-[var(--b2)] rounded-xl px-6 py-4 text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
                required
              />
              <button 
                type="submit"
                className="bg-[var(--lime)] text-black font-bold uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-[var(--lime2)] transition-colors whitespace-nowrap"
              >
                {language === 'ru' ? 'Подписаться' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
