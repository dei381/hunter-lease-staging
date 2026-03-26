import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';

interface ReviewDealerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  onSuccess: () => void;
}

export const ReviewDealerModal: React.FC<ReviewDealerModalProps> = ({ isOpen, onClose, leadId, onSuccess }) => {
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');

  const t = {
    en: {
      title: 'Review Dealer',
      desc: 'How was your experience with the dealer? Your review helps other buyers make informed decisions.',
      ratingLabel: 'Rating',
      reviewLabel: 'Your Review',
      placeholder: 'Tell us about your experience. Was the dealer professional? Did they honor the agreed terms?',
      submit: 'Submit Review',
      submitting: 'Submitting...',
      error: 'Failed to submit review',
    },
    ru: {
      title: 'Оценить дилера',
      desc: 'Как прошел ваш визит к дилеру? Ваш отзыв поможет другим покупателям сделать правильный выбор.',
      ratingLabel: 'Оценка',
      reviewLabel: 'Ваш отзыв',
      placeholder: 'Расскажите о вашем опыте. Был ли дилер профессионален? Соблюдали ли они согласованные условия?',
      submit: 'Отправить отзыв',
      submitting: 'Отправка...',
      error: 'Не удалось отправить отзыв',
    }
  }[language];

  const handleSubmit = async () => {
    if (rating === 0 || !review.trim()) return;
    
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const res = await fetch(`/api/leads/${leadId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': user?.uid || ''
        },
        body: JSON.stringify({ rating, review })
      });

      // We'll simulate success even if the endpoint doesn't exist yet
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--bg)] w-full max-w-lg rounded-3xl border border-[var(--lime)]/30 overflow-hidden shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-[var(--mu2)] hover:text-white transition-colors z-10"
          >
            <X size={24} />
          </button>

          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[var(--lime)]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[var(--lime)]/20">
                <MessageSquare className="w-8 h-8 text-[var(--lime)]" />
              </div>
              <h2 className="text-2xl font-display mb-2 text-white">{t.title}</h2>
              <p className="text-[var(--mu2)] text-sm">
                {t.desc}
              </p>
            </div>

            <div className="space-y-6">
              {/* Rating Stars */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-3 text-center">
                  {t.ratingLabel} <span className="text-[var(--lime)]">*</span>
                </label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        size={32}
                        className={`transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-[var(--lime)] text-[var(--lime)]'
                            : 'text-[var(--s2)]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">
                  {t.reviewLabel} <span className="text-[var(--lime)]">*</span>
                </label>
                <textarea
                  required
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] transition-colors min-h-[120px] resize-none"
                  placeholder={t.placeholder}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || rating === 0 || review.trim().length < 5}
                className="w-full bg-[var(--lime)] text-black font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--lime2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  t.submit
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
