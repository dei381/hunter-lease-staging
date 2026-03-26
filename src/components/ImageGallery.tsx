import React, { useState } from 'react';
import { Maximize2, Eye, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

const CAR_IMAGES = [
  'https://images.unsplash.com/photo-1707156172012-32049950669b?q=80&w=1000&auto=format&fit=crop', // Main Elantra-like
  'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?q=80&w=1000&auto=format&fit=crop', // Rear
  'https://images.unsplash.com/photo-1590362891991-f776e933a690?q=80&w=1000&auto=format&fit=crop', // Side
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1000&auto=format&fit=crop', // Interior 1
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1000&auto=format&fit=crop', // Interior 2
  'https://images.unsplash.com/photo-1603584173870-7f339f084ec1?q=80&w=1000&auto=format&fit=crop', // Wheel
];

interface ImageGalleryProps {
  mainImage?: string;
  images?: string[];
  viewCount?: string;
  dealId?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ mainImage, images: propImages, viewCount, dealId }) => {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [activeIndex, setActiveIndex] = useState(0);

  const images = propImages && propImages.length > 0 ? propImages : (mainImage ? [mainImage] : CAR_IMAGES);
  const hasMultipleImages = images.length > 1;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Thumbnails - Vertical on Desktop */}
      {hasMultipleImages && (
        <div className="hidden md:flex flex-col gap-3 w-24 shrink-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "aspect-square rounded-xl overflow-hidden border-2 transition-all relative group",
                activeIndex === idx 
                  ? "border-[var(--lime)] shadow-[0_0_15px_rgba(163,230,53,0.3)]" 
                  : "border-white/5 opacity-40 hover:opacity-100 hover:border-white/20"
              )}
            >
              <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className={cn(
                "absolute inset-0 bg-[var(--lime)]/10 transition-opacity",
                activeIndex === idx ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )} />
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col gap-6">
        {/* Main Image Container */}
        <div className="relative aspect-[16/10] bg-white/5 rounded-xl overflow-hidden border border-white/10 group">
          <AnimatePresence mode="wait">
            <motion.img
              key={activeIndex}
              src={images[activeIndex]}
              alt="Car view"
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>

          {/* Expand Button */}
          <button className="absolute bottom-4 right-4 p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg text-white hover:text-[var(--lime)] transition-colors">
            <Maximize2 size={18} />
          </button>
        </div>

        {/* Thumbnails - Horizontal on Mobile */}
        {hasMultipleImages && (
          <div className="md:hidden flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "w-20 aspect-square shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                  activeIndex === idx ? "border-[var(--lime)]" : "border-white/10 opacity-60"
                )}
              >
                <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}

        {/* Info Footer */}
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest flex items-center gap-2">
            <Info size={10} />
            {t.gallery.referenceOnly}
          </p>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">REF: {dealId || '286877'}</p>
        </div>
      </div>
    </div>
  );
};
