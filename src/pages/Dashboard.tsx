import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Lead } from '../types';
import { Car, Calendar, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const t = translations[language].dashboard;
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserLeads = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/leads/my', {
          headers: {
            'x-user-uid': user.uid
          }
        });
        if (response.ok) {
          const fetchedLeads = await response.json();
          setLeads(fetchedLeads);
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLeads();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-display mb-4">{t.signInRequired}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="font-display text-4xl md:text-5xl mb-4">{t.title}</h1>
          <p className="text-[var(--mu2)]">{t.welcomeBack}, {user.displayName || user.email}</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold uppercase tracking-widest text-[var(--mu)] mb-6">{t.yourApplications}</h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-[var(--s1)] h-32 rounded-2xl border border-[var(--b2)]"></div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-12 text-center">
              <Car className="w-12 h-12 text-[var(--mu2)] mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-display mb-2">{t.noApplications}</h3>
              <p className="text-[var(--mu2)] mb-6">{t.noApplicationsDesc}</p>
              <Link to="/deals" className="inline-flex items-center gap-2 bg-[var(--lime)] text-black font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-[var(--lime2)] transition-colors">
                {t.browseDeals} <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {leads.map((lead) => (
                <motion.div 
                  key={lead.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6 hover:border-[var(--lime)]/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[var(--s2)] rounded-xl flex items-center justify-center shrink-0">
                        <Car className="w-6 h-6 text-[var(--lime)]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">
                          {lead.vehicle?.year} {lead.vehicle?.make} {lead.vehicle?.model}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--mu2)] font-mono">
                          <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(lead.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1 uppercase tracking-widest"><Clock size={14} /> {t.status}: <span className="text-[var(--w)] ml-1">{lead.status}</span></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 bg-[var(--s2)] p-4 rounded-xl border border-[var(--b2)]">
                      <div className="text-[10px] uppercase tracking-widest text-[var(--mu2)] font-bold">
                        {lead.calc?.type === 'lease' ? t.estLease : t.estFinance}
                      </div>
                      <div className="text-2xl font-display text-[var(--lime)]">
                        ${lead.calc?.payment}/mo
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
