import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Mail, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

import { useFeedbackStore } from '../store/feedbackStore';

export const Footer = () => {
  const { language } = useLanguageStore();
  const { open } = useFeedbackStore();
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubscribe = async () => {
    if (!email) {
      setErrorMsg(t.footer.emailRequired);
      setStatus('error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg(t.footer.invalidEmail);
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      await addDoc(collection(db, 'subscribers'), {
        email,
        createdAt: serverTimestamp(),
        source: 'footer'
      });
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Error subscribing:', error);
      setErrorMsg(t.footer.subscribeFailed);
      setStatus('error');
    }
  };

  return (
    <footer className="bg-[var(--s2)] border-t border-[var(--b2)] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-16 mb-24">
        <div className="space-y-8">
          <div className="flex flex-col items-start gap-4">
            <span className="font-display text-2xl tracking-widest text-[var(--w)]">HUNTER<span className="text-[var(--lime)]">.</span>LEASE</span>
            <div className="inline-block bg-[var(--lime)]/10 border border-[var(--lime)]/20 text-[var(--lime)] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">
              {t.hero.badge}
            </div>
          </div>
          <p className="text-sm text-[var(--mu2)] leading-relaxed">
            {t.footer.desc}
          </p>
          <div className="flex gap-4">
            {[
              { Icon: Instagram, label: 'Instagram' },
              { Icon: Twitter, label: 'Twitter' },
              { Icon: Facebook, label: 'Facebook' }
            ].map(({ Icon, label }, i) => (
              <a key={i} href="#" aria-label={label} className="w-10 h-10 rounded-xl bg-[var(--s1)] border border-[var(--b2)] flex items-center justify-center hover:border-[var(--lime)]/40 transition-all text-[var(--mu)] hover:text-[var(--lime)]">
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display text-lg tracking-widest mb-8 text-[var(--w)]">{t.footer.services}</h4>
          <ul className="space-y-4 text-sm text-[var(--mu2)]">
            <li><Link to="/deals" className="hover:text-[var(--lime)] transition-colors">{t.footer.newCarLeasing}</Link></li>
            <li><Link to="/deals" className="hover:text-[var(--lime)] transition-colors">{t.footer.financing}</Link></li>
            <li><Link to="/#calc" className="hover:text-[var(--lime)] transition-colors">{t.footer.tradeInAppraisal}</Link></li>
            <li><Link to="/#how-it-works" className="hover:text-[var(--lime)] transition-colors">{t.footer.vipSigning}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg tracking-widest mb-8 text-[var(--w)]">{t.footer.info}</h4>
          <ul className="space-y-4 text-sm text-[var(--mu2)]">
            <li><Link to="/#how-it-works" className="hover:text-[var(--lime)] transition-colors">{t.footer.howItWorks}</Link></li>
            <li><Link to="/#faq" className="hover:text-[var(--lime)] transition-colors">{t.footer.faq}</Link></li>
            <li><Link to="/#reviews" className="hover:text-[var(--lime)] transition-colors">{t.footer.clientReviews}</Link></li>
            <li><Link to="/blog" className="hover:text-[var(--lime)] transition-colors">{t.footer.blog}</Link></li>
            <li>
              <button 
                onClick={open}
                className="hover:text-[var(--lime)] transition-colors text-left"
              >
                {language === 'ru' ? 'Оставить отзыв' : 'Leave Feedback'}
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-lg tracking-widest mb-8 text-[var(--w)]">{t.footer.contacts}</h4>
          <ul className="space-y-6 text-sm text-[var(--mu2)] mb-8">
            <li className="flex items-start gap-4">
              <Phone className="w-5 h-5 text-[var(--lime)] shrink-0" />
              <span>+1 (310) 909-7755<br/><span className="text-[10px] uppercase font-bold text-[var(--mu)]">{t.footer.monSat}: 9AM - 8PM</span></span>
            </li>
            <li className="flex items-start gap-4">
              <Mail className="w-5 h-5 text-[var(--lime)] shrink-0" />
              <span>hello@hunter.lease</span>
            </li>
          </ul>
          
          <div className="pt-6 border-t border-[var(--b2)]">
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-[var(--w)] mb-4">{t.footer.stayUpdated}</h5>
            <div className="flex gap-2">
              <input 
                type="email" 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                placeholder={t.footer.emailPlaceholder}
                className={`flex-1 bg-[var(--s1)] border ${status === 'error' ? 'border-red-500' : 'border-[var(--b2)]'} rounded-xl px-4 py-3 text-xs outline-none focus:border-[var(--lime)] transition-all`}
                disabled={status === 'loading' || status === 'success'}
              />
              <button 
                onClick={handleSubscribe}
                disabled={status === 'loading' || status === 'success'}
                className={`text-white text-[10px] font-bold uppercase tracking-widest px-4 py-3 rounded-xl transition-all flex items-center justify-center min-w-[80px] ${
                  status === 'success' ? 'bg-green-500' : 
                  status === 'error' ? 'bg-red-500' : 
                  'bg-[var(--lime)] hover:bg-[var(--lime2)]'
                }`}
              >
                {status === 'loading' ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : status === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  t.footer.join
                )}
              </button>
            </div>
            {status === 'error' && (
              <p className="text-red-500 text-[10px] mt-2">{errorMsg}</p>
            )}
            {status === 'success' && (
              <p className="text-green-500 text-[10px] mt-2">{t.footer.subscribeSuccess}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12 border-t border-[var(--b2)] flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-[10px] text-[var(--mu)] font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} Hunter Lease. {t.footer.rights}
        </div>
        <div className="flex flex-wrap justify-center md:justify-end gap-8 text-[10px] text-[var(--mu)] font-bold uppercase tracking-widest">
          <Link to="/privacy" className="hover:text-[var(--lime)] transition-colors">{t.legal.privacy}</Link>
          <Link to="/terms" className="hover:text-[var(--lime)] transition-colors">{t.legal.terms}</Link>
          <Link to="/broker-disclosure" className="hover:text-[var(--lime)] transition-colors">{t.legal.broker}</Link>
          <Link to="/accessibility" className="hover:text-[var(--lime)] transition-colors">{t.legal.accessibility}</Link>
          <span className="text-[var(--mu2)]">{t.footer.licensedBroker}</span>
          <span className="text-[var(--mu2)]">{t.footer.license}: #21318</span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-8 text-center text-[10px] text-[var(--mu2)] leading-relaxed">
        <p>Hunter Lease is a premier auto leasing and financing broker serving Los Angeles, California, and nationwide. We specialize in securing the best car lease deals, auto financing rates, and zero-down lease specials on all makes and models including Toyota, Honda, BMW, Mercedes-Benz, Audi, Lexus, and more. Our AI-powered platform monitors dealer inventory to guarantee transparent pricing with no hidden markups. Whether you are looking for a luxury SUV lease, an electric vehicle (EV) deal, or an affordable hybrid commuter car, our expert auto brokers negotiate on your behalf to save you time and money. Contact us today for a hassle-free car buying experience delivered straight to your door.</p>
      </div>
    </footer>
  );
};
