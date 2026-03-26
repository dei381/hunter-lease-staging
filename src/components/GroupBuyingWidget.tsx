import React, { useState, useEffect } from 'react';
import { Users, TrendingDown, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { useLanguageStore } from '../store/languageStore';

interface GroupBuyingWidgetProps {
  make: string;
  model: string;
}

export const GroupBuyingWidget = ({ make, model }: GroupBuyingWidgetProps) => {
  const { language } = useLanguageStore();
  const [joined, setJoined] = useState(false);
  const [count, setCount] = useState(2); // Start with 2 people
  const target = 3;

  const handleJoin = () => {
    setJoined(true);
    setCount(c => c + 1);
  };

  const progress = (count / target) * 100;
  const isUnlocked = count >= target;

  const t = {
    en: {
      title: 'Fleet Pricing Syndicate',
      subtitle: `Join the ${make} ${model} buying group.`,
      status: isUnlocked 
        ? 'Goal reached! Fleet pricing unlocked.' 
        : `${count}/${target} buyers joined. Need ${target - count} more to unlock!`,
      discount: 'Extra $1,500 Off MSRP',
      joinBtn: 'Join Syndicate (Free)',
      joinedBtn: 'You are in the Syndicate',
      urgency: 'Closes in 48 hours'
    },
    ru: {
      title: 'Синдикат Совместной Покупки',
      subtitle: `Присоединяйтесь к группе на ${make} ${model}.`,
      status: isUnlocked 
        ? 'Цель достигнута! Оптовая цена разблокирована.' 
        : `${count}/${target} участников. Нужен еще ${target - count} для скидки!`,
      discount: 'Доп. скидка $1,500 от MSRP',
      joinBtn: 'Вступить в синдикат (Бесплатно)',
      joinedBtn: 'Вы в синдикате',
      urgency: 'Закрывается через 48 часов'
    }
  }[language] || {
    title: 'Fleet Pricing Syndicate',
    subtitle: `Join the ${make} ${model} buying group.`,
    status: isUnlocked 
      ? 'Goal reached! Fleet pricing unlocked.' 
      : `${count}/${target} buyers joined. Need ${target - count} more to unlock!`,
    discount: 'Extra $1,500 Off MSRP',
    joinBtn: 'Join Syndicate (Free)',
    joinedBtn: 'You are in the Syndicate',
    urgency: 'Closes in 48 hours'
  };

  return (
    <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-2xl p-6 relative overflow-hidden group">
      {/* Background glow when unlocked */}
      <AnimatePresence>
        {isUnlocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[var(--lime)]/5 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-[var(--lime)]" />
              <h3 className="text-sm font-bold uppercase tracking-widest">{t.title}</h3>
            </div>
            <p className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{t.subtitle}</p>
          </div>
          <div className="bg-[var(--lime)]/10 text-[var(--lime)] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
            <TrendingDown size={12} />
            {t.discount}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className={isUnlocked ? "text-[var(--lime)]" : "text-[var(--w)]"}>
              {t.status}
            </span>
            <span className="text-[var(--mu2)]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[var(--b1)] rounded-full overflow-hidden">
            <motion.div 
              className={cn(
                "h-full rounded-full transition-colors duration-500",
                isUnlocked ? "bg-[var(--lime)]" : "bg-[var(--mu2)]"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between gap-4">
          <button
            onClick={handleJoin}
            disabled={joined}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              joined 
                ? "bg-[var(--b1)] text-[var(--lime)] border border-[var(--lime)]/30 cursor-default" 
                : "bg-[var(--w)] text-black hover:bg-[var(--lime)]"
            )}
          >
            {joined ? <CheckCircle2 size={14} /> : <Zap size={14} />}
            {joined ? t.joinedBtn : t.joinBtn}
          </button>
          
          {!isUnlocked && (
            <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest text-right">
              ⏳ {t.urgency}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
