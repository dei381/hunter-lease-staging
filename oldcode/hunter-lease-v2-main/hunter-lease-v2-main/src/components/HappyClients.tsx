import React, { useState, useEffect } from 'react';
import { Star, Play } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

const IMAGES = [
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800&h=1067', // Happy client with car
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=800&h=1067', // Car delivery
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800&h=1067', // Luxury car
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800&h=1067', // Happy couple
  'https://images.unsplash.com/photo-1517672651691-24622a91b550?auto=format&fit=crop&q=80&w=800&h=1067', // Car keys
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800&h=1067', // Modern car
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800&h=1067', // Porsche
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800&h=1067', // BMW
];

interface Review {
  id: string;
  clientName: string;
  carName: string;
  location: string;
  savings: string;
  imageUrl: string;
  videoUrl: string | null;
  rating: number;
}

export const HappyClients = () => {
  const { language } = useLanguageStore();
  const t = translations[language].clients;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reviews')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setReviews(data);
        }
      })
      .catch(err => console.error('Failed to fetch reviews:', err));
  }, []);

  const displayReviews = reviews.length > 0 ? reviews : t.clientList.map((client, i) => ({
    id: client.id,
    clientName: client.name,
    carName: client.car,
    location: client.loc,
    savings: client.save,
    imageUrl: IMAGES[i] || IMAGES[0],
    videoUrl: null,
    rating: 5
  }));

  return (
    <div className="mb-32">
      <div className="flex items-center gap-4 mb-12">
        <h2 className="font-display text-4xl tracking-widest uppercase">{t.title}</h2>
        <div className="flex-1 h-px bg-[var(--b2)]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {displayReviews.map((client) => (
          <div key={client.id} className="group relative aspect-[3/4] bg-[var(--s1)] rounded-2xl overflow-hidden border border-[var(--b2)] hover:border-[var(--lime)]/50 transition-all shadow-lg">
            {activeVideo === client.id && client.videoUrl ? (
              <iframe
                src={client.videoUrl}
                className="w-full h-full object-cover"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <img src={client.imageUrl} alt={client.clientName} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                
                {client.videoUrl && (
                  <button 
                    onClick={() => setActiveVideo(client.id)}
                    className="absolute inset-0 m-auto w-16 h-16 bg-[var(--lime)]/90 text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_30px_rgba(204,255,0,0.3)] z-10"
                  >
                    <Play className="w-6 h-6 ml-1" />
                  </button>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-5 z-20 pointer-events-none">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(client.rating || 5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-[var(--lime)] text-[var(--lime)]" />)}
                  </div>
                  <div className="text-[10px] text-[var(--mu2)] font-bold uppercase tracking-widest mb-1">📍 {client.location}</div>
                  <div className="font-display text-xl text-[var(--w)] mb-1 uppercase tracking-tight">{client.clientName}</div>
                  <div className="text-[10px] text-[var(--lime)] font-mono uppercase tracking-widest mb-3">{client.carName}</div>
                  <div className="inline-block bg-[var(--lime)] text-black text-[10px] font-bold px-3 py-1 rounded uppercase tracking-widest shadow-lg">
                    {client.savings}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="text-center mt-12 p-8 bg-[var(--s1)] border border-[var(--b2)] rounded-3xl">
        <p className="text-[var(--mu2)] text-sm italic">{t.quote}</p>
      </div>
    </div>
  );
};
