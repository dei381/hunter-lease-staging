import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { ArrowLeft, Calendar, Clock, Share2, Facebook, Twitter, Linkedin, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { BlogPost as BlogPostType } from '../data/blogPosts';

export const BlogPost = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const t = translations[language];

  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPost = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'blogPosts', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() } as BlogPostType);
        } else {
          setPost(null);
        }

        // Fetch related posts
        const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'), limit(4));
        const snapshot = await getDocs(q);
        const posts = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as BlogPostType))
          .filter(p => p.id !== id)
          .slice(0, 3);
        setRelatedPosts(posts);
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const getLocalized = (p: BlogPostType, field: string) => {
    return (p as any)[`${field}_${language}`] || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20 flex items-center justify-center">
        <div className="text-[var(--mu2)] text-xl">Loading...</div>
      </div>
    );
  }

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = getLocalized(post!, 'title');
    
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      alert(language === 'ru' ? 'Ссылка скопирована!' : 'Link copied!');
    }
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20 flex flex-col items-center justify-center">
        <h1 className="font-display text-4xl mb-4">Post not found</h1>
        <button onClick={() => navigate('/blog')} className="text-[var(--lime)] hover:underline">
          Return to Blog
        </button>
      </div>
    );
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": getLocalized(post, 'title'),
    "image": [
      post.image
    ],
    "datePublished": post.date,
    "dateModified": post.date,
    "author": [{
        "@type": "Person",
        "name": post.author,
        "url": window.location.origin
      }]
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20">
      <SEO 
        title={`${getLocalized(post, 'title')} | Hunter Lease`}
        description={getLocalized(post, 'excerpt')}
        ogImage={post.image}
        schema={articleSchema}
      />

      <div className="max-w-4xl mx-auto px-6">
        {/* Back Button */}
        <Link to="/blog" className="inline-flex items-center gap-2 text-[var(--mu2)] hover:text-white transition-colors mb-8 font-bold uppercase tracking-widest text-xs">
          <ArrowLeft size={16} />
          {language === 'ru' ? 'Назад в блог' : 'Back to Blog'}
        </Link>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-4 text-xs text-[var(--mu2)] uppercase tracking-widest font-bold mb-6">
            <span className="bg-[var(--lime)]/10 text-[var(--lime)] px-3 py-1 rounded-full border border-[var(--lime)]/20">
              {getLocalized(post, 'category')}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {post.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {getLocalized(post, 'readTime')}
            </span>
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl uppercase tracking-tight mb-8 leading-tight">
            {getLocalized(post, 'title')}
          </h1>

          <div className="flex items-center justify-between border-y border-[var(--b2)] py-6">
            <div className="flex items-center gap-4">
              {post.authorImage && (
                <img src={post.authorImage} alt={post.author} className="w-12 h-12 rounded-full object-cover border-2 border-[var(--b2)]" />
              )}
              <div>
                <div className="font-bold text-sm">{post.author}</div>
                <div className="text-xs text-[var(--mu2)]">{getLocalized(post, 'authorRole')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--mu2)] uppercase tracking-widest font-bold mr-2 hidden sm:inline">
                {language === 'ru' ? 'Поделиться:' : 'Share:'}
              </span>
              <button onClick={() => handleShare('twitter')} className="p-2 bg-[var(--s1)] rounded-full hover:bg-[var(--lime)] hover:text-black transition-colors border border-[var(--b2)]">
                <Twitter size={16} />
              </button>
              <button onClick={() => handleShare('facebook')} className="p-2 bg-[var(--s1)] rounded-full hover:bg-[var(--lime)] hover:text-black transition-colors border border-[var(--b2)]">
                <Facebook size={16} />
              </button>
              <button onClick={() => handleShare('linkedin')} className="p-2 bg-[var(--s1)] rounded-full hover:bg-[var(--lime)] hover:text-black transition-colors border border-[var(--b2)]">
                <Linkedin size={16} />
              </button>
              <button onClick={() => handleShare('copy')} className="p-2 bg-[var(--s1)] rounded-full hover:bg-[var(--lime)] hover:text-black transition-colors border border-[var(--b2)]">
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.image && (
          <div className="mb-16 rounded-3xl overflow-hidden border border-[var(--b2)]">
            <img 
              src={post.image} 
              alt={getLocalized(post, 'title')} 
              className="w-full h-auto object-cover max-h-[600px]"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none mb-20">
          <div dangerouslySetInnerHTML={{ __html: getLocalized(post, 'content') }} />
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-[var(--s1)] to-[var(--s2)] border border-[var(--lime)]/20 rounded-3xl p-12 text-center relative overflow-hidden mb-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--lime)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="font-display text-4xl uppercase mb-4">
              {language === 'ru' ? 'Готовы найти свой идеальный лизинг?' : 'Ready to find your perfect lease?'}
            </h2>
            <p className="text-[var(--mu2)] mb-8">
              {language === 'ru' 
                ? 'Используйте наш калькулятор, чтобы рассчитать реальную стоимость без скрытых платежей.' 
                : 'Use our calculator to find the real cost without hidden fees.'}
            </p>
            <Link 
              to="/deals"
              className="inline-flex items-center gap-2 bg-[var(--lime)] text-black font-bold uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-[var(--lime2)] transition-colors"
            >
              {language === 'ru' ? 'Смотреть предложения' : 'View Deals'}
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="border-t border-[var(--b2)] pt-16">
            <h3 className="font-display text-3xl uppercase mb-8">
              {language === 'ru' ? 'Похожие статьи' : 'Related Posts'}
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost, i) => (
                <motion.div 
                  key={relatedPost.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link to={`/blog/${relatedPost.id}`} className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl overflow-hidden hover:border-[var(--lime)]/50 transition-colors group flex flex-col h-full">
                    <div className="relative h-32 overflow-hidden">
                      {relatedPost.image ? (
                        <img 
                          src={relatedPost.image} 
                          alt={getLocalized(relatedPost, 'title')} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--s2)] flex items-center justify-center text-[var(--mu2)]">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h4 className="font-display text-lg mb-2 text-[var(--w)] group-hover:text-[var(--lime)] transition-colors line-clamp-2">
                        {getLocalized(relatedPost, 'title')}
                      </h4>
                      <div className="mt-auto text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold">
                        {relatedPost.date}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
