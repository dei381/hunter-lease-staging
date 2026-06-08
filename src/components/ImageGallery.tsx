import React, { useState } from 'react';
import { Maximize2, Eye, Info, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  isMarketcheck?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ mainImage, images: propImages, viewCount, dealId, isMarketcheck }) => {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const images = propImages && propImages.length > 0 ? propImages : (mainImage ? [mainImage] : CAR_IMAGES);
  const hasMultipleImages = images.length > 1;

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6">
      {/* Thumbnails - Vertical on Desktop */}
      {hasMultipleImages && (
        <div className="hidden md:flex flex-col gap-3 w-24 shrink-0 max-h-[500px] overflow-y-auto no-scrollbar scroll-smooth">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "shrink-0 w-24 h-24 aspect-square rounded-xl overflow-hidden border-2 transition-all relative group",
                activeIndex === idx 
                  ? "border-[var(--lime)] shadow-[0_0_15px_rgba(163,230,53,0.3)]" 
                  : "border-[var(--b2)] opacity-60 hover:opacity-100 hover:border-[var(--b3)]"
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
        <div 
          className="relative aspect-[16/10] bg-[var(--b1)] rounded-xl overflow-hidden border border-[var(--b2)] group cursor-pointer"
          onClick={() => setIsFullscreen(true)}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={activeIndex}
              src={images[activeIndex]}
              alt="Car view"
              className="w-full h-full object-cover bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>

          {/* Obscure dealer info on top and bottom for Marketcheck deals */}
          {isMarketcheck && (
            <>
              <div className="absolute top-0 left-0 right-0 h-16 bg-[var(--bg)]/50 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)] pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-[var(--bg)]/50 backdrop-blur-xl [mask-image:linear-gradient(to_top,black_50%,transparent_100%)] pointer-events-none z-10" />
            </>
          )}

          {viewCount && (
            <div className="absolute bottom-4 left-4 bg-[var(--s2)]/95 backdrop-blur-md text-[var(--w)] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-medium tracking-wide shadow-lg border border-[var(--b2)] z-20">
              <Eye size={12} className="text-[var(--mu2)]" />
              {viewCount} views last 24H
            </div>
          )}

          {/* Expand Button */}
          <button className="absolute bottom-4 right-4 p-2 bg-black/40 backdrop-blur-md border border-[var(--b2)] rounded-lg text-white hover:text-[var(--lime)] transition-colors z-20">
            <Maximize2 size={18} />
          </button>
        </div>

        {/* Thumbnails - Horizontal on Mobile (Collage style) */}
        {hasMultipleImages && (
          <div className="md:hidden grid grid-cols-4 gap-2">
            {images.slice(0, 4).map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all relative",
                  activeIndex === idx ? "border-[var(--lime)]" : "border-transparent"
                )}
              >
                <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
                {idx === 3 && images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs">
                    +{images.length - 4}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center">
          <button 
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-50"
            onClick={() => setIsFullscreen(false)}
          >
            <X size={24} />
          </button>

          <button 
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-[var(--lime)] hover:text-black transition-colors z-50"
            onClick={prevImage}
          >
            <ChevronLeft size={24} />
          </button>

          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-[var(--lime)] hover:text-black transition-colors z-50"
            onClick={nextImage}
          >
            <ChevronRight size={24} />
          </button>

          <div className="w-full max-w-5xl px-12 aspect-[16/9] relative">
            <img 
              src={images[activeIndex]} 
              className="w-full h-full object-contain" 
              alt="Fullscreen view" 
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-mono text-sm tracking-widest bg-white/10 px-4 py-2 rounded-full">
            {activeIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
};
