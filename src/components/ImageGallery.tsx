import React, { useState } from 'react';
import { Maximize2, Eye, Info, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

interface ImageGalleryProps {
  mainImage?: string;
  images?: string[];
  viewCount?: string;
  dealId?: string;
  isMarketcheck?: boolean;
  vehicleName?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ mainImage, images: propImages, viewCount, dealId, isMarketcheck, vehicleName }) => {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [activeIndex, setActiveIndex] = useState(0);

  const hasRealImages = (propImages && propImages.length > 0) || !!mainImage;
  const images = propImages && propImages.length > 0 ? propImages : (mainImage ? [mainImage] : []);
  const hasMultipleImages = images.length > 1;

  // No real photos — show placeholder
  if (!hasRealImages) {
    return (
      <div className="flex flex-col gap-6">
        <div className="relative aspect-[16/10] bg-gradient-to-br from-white/[0.03] to-white/[0.08] rounded-xl overflow-hidden border border-white/10 flex flex-col items-center justify-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Camera size={32} className="text-white/20" />
          </div>
          {vehicleName && (
            <p className="text-lg font-bold text-white/40 tracking-wider uppercase">{vehicleName}</p>
          )}
          <p className="text-xs text-white/20 uppercase tracking-widest">
            {language === 'ru' ? 'Фото будут доступны в ближайшее время' : 'Photos coming soon'}
          </p>
        </div>
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest flex items-center gap-2">
            <Info size={10} />
            {t.gallery.referenceOnly}
          </p>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">REF: {dealId || '286877'}</p>
        </div>
      </div>
    );
  }

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

          {/* Obscure dealer info on top and bottom for Marketcheck deals */}
          {isMarketcheck && (
            <>
              <div className="absolute top-0 left-0 right-0 h-16 bg-transparent backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)] pointer-events-none z-10" />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-transparent backdrop-blur-xl [mask-image:linear-gradient(to_top,black_50%,transparent_100%)] pointer-events-none z-10" />
            </>
          )}

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
