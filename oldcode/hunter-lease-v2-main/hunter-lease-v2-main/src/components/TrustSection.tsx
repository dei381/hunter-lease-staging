import React from 'react';
import { motion } from 'motion/react';
import { Check, Star, Youtube, Send, ShieldCheck, Zap, UserCheck, DollarSign, X } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

const REVIEWS = [
  {
    name: 'Alexey M.',
    role: 'Senior Software Engineer',
    loc: 'Glendale, CA',
    car: 'Toyota RAV4 Hybrid 2026 XLE AWD',
    text: 'I used to calculate everything in Excel. When the dealer gave me the numbers, the math did not add up. Azat sent a calculation where everything matched to the cent: no markups on MF and hidden add-ons. Saved me a lot of time and nerves.',
    save: 'Saved $2,520 over 3 years',
    initials: 'AM'
  },
  {
    name: 'Natalia K.',
    role: 'Financial Analyst',
    loc: 'West Hollywood, CA',
    car: 'Mercedes GLC 300 2026 4MATIC',
    text: 'My time is expensive. I am not ready to spend 6 hours haggling with managers in the showroom. Hunter.Lease is like a Bloomberg Terminal for buying a car. You see the real price, click a button, pick up the car.',
    save: 'Approved without SSN',
    initials: 'NK'
  },
  {
    name: 'Dmitry T.',
    role: 'Entrepreneur',
    loc: 'Torrance, CA',
    car: 'Acura MDX A-Spec 2026 SH-AWD',
    text: 'Delegated buying a car as a business task. Paid a $95 deposit, two days later received a contract at Fleet Pricing. Came to the showroom just to sign. Perfect service.',
    save: 'Saved $3,960 over 36 mo',
    initials: 'DT'
  },
  {
    name: 'Elena V.',
    role: 'Product Manager',
    loc: 'Sherman Oaks, CA',
    car: 'Hyundai Santa Fe Calligraphy 2026 Hybrid',
    text: 'I was afraid of overpaying for add-ons — GAP, extended warranty. Azat explained that nothing is mandatory and protected me at signing. The dealer did not even try to pressure because they knew they were dealing with pros.',
    save: 'Declined add-ons for $3,200',
    initials: 'EV'
  }
];

const VIDEOS = [
  { id: 'rkVc9b9Guo4', title: 'Client Review 1', thumb: 'https://img.youtube.com/vi/rkVc9b9Guo4/hqdefault.jpg' },
  { id: 'upKcWYTVPVY', title: 'Client Review 2', thumb: 'https://img.youtube.com/vi/upKcWYTVPVY/hqdefault.jpg' },
  { id: 'FuWg0_aNjmY', title: 'Client Review 3', thumb: 'https://img.youtube.com/vi/FuWg0_aNjmY/hqdefault.jpg' },
  { id: 'OHpxOYsqMzQ', title: 'Client Review 4', thumb: 'https://img.youtube.com/vi/OHpxOYsqMzQ/hqdefault.jpg' },
];

export const TrustSection = () => {
  const { language } = useLanguageStore();
  const t = translations[language];

  return (
    <div className="space-y-24 py-12">
      {/* Trust Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <ShieldCheck className="w-5 h-5 text-[var(--lime)]" />, title: t.trust.contract, desc: t.trust.contractDesc },
          { icon: <ShieldCheck className="w-5 h-5 text-[var(--lime)]" />, title: t.trust.protection, desc: t.trust.protectionDesc },
          { icon: <Zap className="w-5 h-5 text-[var(--lime)]" />, title: t.trust.monitoring, desc: t.trust.monitoringDesc },
          { icon: <DollarSign className="w-5 h-5 text-[var(--lime)]" />, title: t.trust.noPressure, desc: t.trust.noPressureDesc },
        ].map((item, i) => (
          <div key={i} className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 space-y-2">
            <div className="bg-[var(--lime)]/10 w-10 h-10 rounded-lg flex items-center justify-center mb-2">
              {item.icon}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest">{item.title}</div>
            <div className="text-[10px] text-[var(--mu2)] leading-relaxed">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Mission Section */}
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-[0.2em]">{t.why.title}</div>
          <h2 className="font-display text-5xl md:text-6xl">WHOLESALE — <span className="text-[var(--lime)]">NOT RETAIL</span></h2>
          <p className="text-sm text-[var(--mu2)] max-w-2xl mx-auto leading-relaxed">
            {t.why.desc1}
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr,auto,1fr] items-center gap-8">
          <div className="bg-[var(--s1)] border border-red-500/20 rounded-2xl p-8 space-y-6 opacity-60 grayscale hover:grayscale-0 transition-all">
            <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest">{t.why.retailModel}</div>
            <ul className="space-y-3">
              {t.why.retailItems.map((item: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-xs text-[var(--mu2)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400/50" /> {item}
                </li>
              ))}
            </ul>
            <div className="pt-4 border-t border-[var(--b2)]">
              <div className="text-3xl font-display text-red-400">{t.why.variableCommission}</div>
              <div className="text-[10px] text-[var(--mu)] uppercase tracking-widest mt-1">{t.why.dealerWantsMore}</div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center gap-2">
            <div className="w-px h-12 bg-gradient-to-b from-transparent to-[var(--b2)]" />
            <div className="text-[var(--lime)] font-bold">VS</div>
            <div className="w-px h-12 bg-gradient-to-t from-transparent to-[var(--b2)]" />
          </div>

          <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/30 rounded-2xl p-8 space-y-6">
            <div className="text-[10px] font-mono text-[var(--lime)] uppercase tracking-widest">{t.why.wholesaleModel}</div>
            <ul className="space-y-3">
              {t.why.wholesaleItems.map((item: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-xs text-[var(--w)]">
                  <Check className="w-4 h-4 text-[var(--lime)]" /> {item}
                </li>
              ))}
            </ul>
            <div className="pt-4 border-t border-[var(--lime)]/20">
              <div className="text-3xl font-display text-[var(--lime)]">{t.why.fixedFee}</div>
              <div className="text-[10px] text-[var(--mu)] uppercase tracking-widest mt-1">{t.why.ourInterestSavings}</div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-[0.2em]">{t.team.title}</div>
          <h2 className="font-display text-4xl md:text-5xl">3 STEPS TO <span className="text-[var(--lime)]">NEW CAR</span></h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: t.team.step1Title, desc: t.team.step1Desc },
            { step: '02', title: t.team.step2Title, desc: t.team.step2Desc },
            { step: '03', title: t.team.step3Title, desc: t.team.step3Desc },
          ].map((item, i) => (
            <div key={i} className="relative p-8 bg-[var(--s1)] border border-[var(--b2)] rounded-2xl group hover:border-[var(--lime)]/30 transition-all">
              <div className="text-5xl font-display text-[var(--b2)] group-hover:text-[var(--lime)]/20 transition-colors mb-4">{item.step}</div>
              <div className="text-sm font-bold uppercase tracking-widest mb-2">{item.title}</div>
              <div className="text-xs text-[var(--mu2)] leading-relaxed">{item.desc}</div>
              {i < 2 && <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-[var(--b3)]">→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl overflow-hidden relative">
        <div className="p-8 border-b border-[var(--b2)] bg-[var(--s2)]/50">
          <h3 className="font-display text-2xl tracking-widest uppercase">{t.comparison.title}</h3>
          <p className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mt-2">{t.comparison.subtitle}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--s2)]/30">
                <th className="p-6 text-xs font-bold text-[var(--mu)] uppercase tracking-widest border-b border-[var(--b2)]">{t.comparison.parameter}</th>
                <th className="p-6 text-xs font-bold text-red-400 uppercase tracking-widest border-b border-[var(--b2)]">{t.comparison.regularDealer}</th>
                <th className="p-6 text-xs font-bold text-[var(--lime)] uppercase tracking-widest border-b border-[var(--b2)] bg-[var(--lime)]/5">
                  <div className="flex items-center gap-2">
                    {t.comparison.hunterLease}
                    <span className="bg-[var(--lime)] text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      VERIFIED
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {t.comparison.rows.map((row: any, i: number) => (
                <tr key={i} className="border-b border-[var(--b2)] hover:bg-[var(--w)]/5 transition-colors">
                  <td className="p-6 align-top md:w-1/3">
                    <div className="font-bold text-[var(--w)] text-base mb-2">{row.p}</div>
                    <div className="text-xs text-[var(--mu2)] leading-relaxed">{row.desc}</div>
                  </td>
                  <td className="p-6 align-top md:w-1/3">
                    <div className="flex items-start gap-3 text-red-400/90 font-medium text-sm md:text-base">
                      <X className="w-5 h-5 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{row.d}</span>
                    </div>
                  </td>
                  <td className="p-6 align-top md:w-1/3 bg-[var(--lime)]/5 relative">
                    <div className="flex items-start gap-3 text-[var(--lime)] font-bold text-sm md:text-base">
                      <Check className="w-5 h-5 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{row.h}</span>
                    </div>
                    {i === 0 && <div className="absolute top-0 right-0 px-2 py-1 bg-[var(--lime)] text-white text-[9px] font-bold uppercase tracking-widest rounded-bl-lg">Best Value</div>}
                  </td>
                </tr>
              ))}
              <tr className="bg-[var(--lime)]/10">
                <td className="p-6 font-display text-xl text-[var(--w)] uppercase tracking-widest">{t.comparison.total}</td>
                <td className="p-6 text-red-400 font-bold uppercase tracking-widest text-xs">{t.comparison.overpayment}</td>
                <td className="p-6 text-[var(--lime)] font-display text-xl uppercase tracking-widest bg-[var(--lime)]/10">
                  {t.comparison.savings}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-[var(--s2)]/30 border-t border-[var(--b2)]">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[var(--lime)]/10 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-[var(--lime)]" />
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-[var(--w)] uppercase tracking-widest mb-1">{t.comparison.noteTitle}</h4>
                <p className="text-[11px] text-[var(--mu2)] leading-relaxed" dangerouslySetInnerHTML={{ __html: t.comparison.noteDesc }} />
              </div>
            </div>
            <div className="p-4 bg-[var(--w)]/5 border border-[var(--b2)] rounded-xl italic text-[10px] text-[var(--mu)] leading-relaxed">
              {t.comparison.quote}
            </div>
          </div>
        </div>
      </div>

      {/* Founder Section */}
      <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 md:p-12">
        <div className="grid md:grid-cols-[auto,1fr] gap-12 items-start">
          <div className="relative group">
            <div className="absolute -inset-4 bg-[var(--lime)]/20 rounded-full blur-2xl group-hover:bg-[var(--lime)]/30 transition-all" />
            <img 
              src="/azat.jpg" 
              alt="Azat" 
              className="w-32 h-32 md:w-48 md:h-48 rounded-full object-cover relative z-10 border-4 border-[var(--lime)]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Azat';
              }}
            />
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-display text-4xl uppercase">{t.team.founder}</h3>
              <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-[0.2em]">{t.team.founderDesc}</div>
            </div>
            <p className="text-sm text-[var(--mu2)] leading-relaxed whitespace-pre-line">
              {t.team.founderBio}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {t.team.stats.map((stat: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="text-2xl font-display text-[var(--lime)]">{stat.val}</div>
                  <div className="text-[8px] text-[var(--mu)] uppercase tracking-widest font-bold">{stat.lbl}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 pt-4">
              <a href="https://youtube.com/@AzatAutoSacramento" target="_blank" className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all">
                <Youtube className="w-4 h-4" /> {t.reviews.youtubeChannel}
              </a>
              <a href="https://t.me/azat_reed" target="_blank" className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-500/20 transition-all">
                <Send className="w-4 h-4" /> {t.reviews.telegram} @azat_reed
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="space-y-12">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-display text-4xl tracking-widest">{t.reviews.title}</h2>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
              <span className="text-[10px] text-[var(--mu2)] font-bold ml-2 uppercase tracking-widest">{t.reviews.subtitle}</span>
            </div>
          </div>
          <div className="hidden sm:block h-px flex-1 bg-[var(--b2)] mx-8" />
        </div>

        {/* Video Shorts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {VIDEOS.map((vid, i) => (
            <div key={vid.id} className="group relative aspect-[9/16] bg-[var(--s1)] border border-[var(--b2)] rounded-2xl overflow-hidden cursor-pointer hover:border-[var(--lime)]/50 transition-all">
              <img src={vid.thumb} alt={t.reviews.videoTitles[i]} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-[var(--lime)] rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                  <Youtube className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                <div className="text-[8px] font-bold text-[var(--lime)] uppercase tracking-widest mb-1">{t.reviews.shorts}</div>
                <div className="text-[10px] font-bold text-white line-clamp-1">{t.reviews.videoTitles[i]}</div>
              </div>
              <a 
                href={`https://www.youtube.com/shorts/${vid.id}`} 
                target="_blank" 
                className="absolute inset-0 z-20"
              />
            </div>
          ))}
        </div>

        {/* Text Reviews */}
        <div className="grid md:grid-cols-2 gap-6">
          {t.reviews.items.map((rev: any, i: number) => (
            <div key={i} className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6 space-y-4 relative overflow-hidden group">
              <div className="absolute top-4 right-6 text-6xl font-serif text-[var(--b2)] opacity-50 group-hover:text-[var(--lime)]/10 transition-colors">"</div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--b2)] flex items-center justify-center text-xs font-bold text-[var(--mu2)]">
                  {rev.name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold">{rev.name}</div>
                  <div className="text-[10px] text-[var(--mu)]">📍 {rev.loc}</div>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />)}
                </div>
              </div>
              <div className="text-[10px] font-mono text-[var(--lime)] uppercase tracking-widest">{rev.car}</div>
              <p className="text-sm text-[var(--w)] leading-relaxed italic opacity-90">
                "{rev.text}"
              </p>
              <div className="inline-block bg-[var(--grn)]/10 border border-[var(--grn)]/20 text-[var(--grn)] text-[11px] font-bold px-3 py-1 rounded-md">
                {rev.save}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
