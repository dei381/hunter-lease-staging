import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { auth } from '../firebase';
import { useLanguageStore } from '../store/languageStore';
import { useGarageStore } from '../store/garageStore';
import { translations } from '../translations';
import { Car, Calendar, Clock, CheckCircle2, ChevronRight, Bell, CreditCard, Heart, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CreditConsentModal } from '../components/CreditConsentModal';
import { ReportDealerModal } from '../components/ReportDealerModal';
import { VIPCertificateModal } from '../components/VIPCertificateModal';
import { ReviewDealerModal } from '../components/ReviewDealerModal';
import { DealCard } from '../components/DealCard';
import { fetchWithCache } from '../utils/fetchWithCache';

export const Dashboard = () => {
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const { savedDealIds } = useGarageStore();
  const t = translations[language].dashboard;
  const [activeTab, setActiveTab] = useState<'applications' | 'saved' | 'listings'>('applications');
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadData, setSelectedLeadData] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const [leadsRes, notifsRes, photosRes] = await Promise.all([
        fetch('/api/leads/my', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/notifications/my', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetchWithCache('/api/car-photos')
      ]);
      
      let fetchedLeads: any[] = [];
      if (leadsRes.ok) {
        fetchedLeads = await leadsRes.json();
        setLeads(fetchedLeads);
      }
      if (notifsRes.ok) {
        setNotifications(await notifsRes.json());
      }
      if (photosRes) {
        setPhotos(photosRes as any[]);
      }

      // Fetch deals that are either saved or associated with leads
      const leadDealIds = fetchedLeads.map(l => l.dealId).filter(Boolean);
      const allDealIdsToFetch = Array.from(new Set([...savedDealIds, ...leadDealIds]));
      
      if (allDealIdsToFetch.length > 0) {
        const dealsRes = await fetchWithCache(`/api/deals?ids=${allDealIdsToFetch.join(',')}`);
        if (dealsRes) {
          setDeals(dealsRes as any[]);
        }
      } else {
        setDeals([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, savedDealIds]);

  const markNotificationsRead = async () => {
    if (!user) return;
    try {
      await fetch('/api/notifications/my/read', {
        method: 'POST',
        headers: { 'x-user-uid': user.uid }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-display mb-4">{t.signInRequired}</h2>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const savedDeals = useMemo(() => deals.filter(deal => savedDealIds.includes(deal.id.toString())), [deals, savedDealIds]);

  const tabs = [
    { id: 'applications', label: language === 'ru' ? 'Заявки' : 'Applications', icon: Car },
    { id: 'saved', label: language === 'ru' ? 'Сохраненные' : 'Saved Deals', icon: Heart }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl md:text-5xl mb-4">{t.title}</h1>
            <p className="text-[var(--mu2)]">{t.welcomeBack}, {user.displayName || user.email}</p>
          </div>
          
          <div className="relative">
            <button 
              onClick={markNotificationsRead}
              className="flex items-center gap-2 bg-[var(--s1)] border border-[var(--b2)] px-4 py-2 rounded-xl hover:border-[var(--lime)]/50 transition-colors"
            >
              <Bell size={20} className={unreadCount > 0 ? "text-[var(--lime)]" : "text-[var(--mu2)]"} />
              <span className="font-bold text-sm uppercase tracking-widest">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-[var(--lime)] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-8 border-b border-[var(--b2)] overflow-x-auto custom-scrollbar pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-bold uppercase tracking-widest text-sm whitespace-nowrap transition-colors relative ${
                  activeTab === tab.id ? 'text-[var(--lime)]' : 'text-[var(--mu2)] hover:text-[var(--w)]'
                }`}
              >
                <Icon size={18} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--lime)]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'applications' && (
              <>
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
                                <span className="flex items-center gap-1 uppercase tracking-widest">
                                  <CreditCard size={14} /> Platform Fee: 
                                  <span className={`ml-1 ${lead.depositStatus === 'paid' ? 'text-[var(--lime)]' : 'text-yellow-500'}`}>
                                    {lead.depositStatus}
                                  </span>
                                </span>
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
                            {lead.depositStatus !== 'paid' ? (
                              <button 
                                onClick={async () => {
                                  if (!lead.creditConsent) {
                                    setSelectedLeadId(lead.id);
                                    setCreditModalOpen(true);
                                    return;
                                  }
                                  try {
                                    const res = await fetch('/api/create-checkout-session', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'x-user-uid': user.uid
                                      },
                                      body: JSON.stringify({ leadId: lead.id })
                                    });
                                    const data = await res.json();
                                    if (data.url) {
                                      window.location.href = data.url;
                                    }
                                  } catch (err) {
                                    console.error('Error initiating checkout:', err);
                                  }
                                }}
                                className="mt-2 w-full bg-[var(--lime)] text-black font-bold uppercase tracking-widest text-xs px-4 py-2 rounded-lg hover:bg-[var(--lime2)] transition-colors"
                              >
                                Pay $95 Platform Fee
                              </button>
                            ) : lead.status === 'accepted' && (
                              <div className="mt-2 text-right">
                                <button 
                                  onClick={() => {
                                    setSelectedLeadData(lead);
                                    setVipModalOpen(true);
                                  }}
                                  className="w-full bg-[var(--s1)] text-white border border-[var(--lime)] font-bold uppercase tracking-widest text-xs px-4 py-2 rounded-lg hover:bg-[var(--lime)] hover:text-black transition-colors mb-2"
                                >
                                  View VIP Certificate
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedLeadId(lead.id);
                                    setReviewModalOpen(true);
                                  }}
                                  className="w-full bg-[var(--lime)]/10 text-[var(--lime)] font-bold uppercase tracking-widest text-xs px-4 py-2 rounded-lg hover:bg-[var(--lime)]/20 transition-colors mb-2"
                                >
                                  {language === 'ru' ? 'Оценить дилера' : 'Review Dealer'}
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedLeadId(lead.id);
                                    setReportModalOpen(true);
                                  }}
                                  className="w-full bg-red-500/10 text-red-500 font-bold uppercase tracking-widest text-xs px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                                >
                                  Report Dealer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {lead.offers && lead.offers.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-[var(--b2)]">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--mu2)] mb-4">Dealer Offers</h4>
                            <div className="space-y-4">
                              {lead.offers.map((offer: any) => (
                                <div key={offer.id} className="bg-[var(--s2)] p-4 rounded-xl border border-[var(--lime)]/30">
                                  <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-[var(--lime)]/10 text-[var(--lime)] px-2 py-1 rounded text-xs font-bold uppercase tracking-widest">
                                          Counter Offer
                                        </span>
                                        <span className="text-xs text-[var(--mu2)]">{new Date(offer.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-sm mb-2">"{offer.message}"</p>
                                      {offer.alternative && (
                                        <p className="text-sm text-[var(--mu2)]"><span className="font-bold text-white">Alternative:</span> {offer.alternative}</p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      {offer.payment && (
                                        <div className="text-xl font-display text-[var(--lime)]">${offer.payment}/mo</div>
                                      )}
                                      {offer.down && (
                                        <div className="text-xs text-[var(--mu2)]">${offer.down} down</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'saved' && (
              <>
                <h2 className="text-xl font-bold uppercase tracking-widest text-[var(--mu)] mb-6">
                  {language === 'ru' ? 'Сохраненные предложения' : 'Saved Deals'}
                </h2>
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-[var(--lime)] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : savedDeals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedDeals.map(deal => (
                      <DealCard key={deal.id} deal={deal} photos={photos} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-12 text-center">
                    <Heart className="w-12 h-12 text-[var(--mu2)] mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-display mb-2">
                      {language === 'ru' ? 'Нет сохраненных предложений' : 'No Saved Deals'}
                    </h3>
                    <p className="text-[var(--mu2)] mb-6">
                      {language === 'ru' 
                        ? 'Вы еще не сохранили ни одного предложения.' 
                        : 'You haven\'t saved any deals yet.'}
                    </p>
                    <Link to="/deals" className="inline-flex items-center gap-2 bg-[var(--lime)] text-black font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-[var(--lime2)] transition-colors">
                      {language === 'ru' ? 'Смотреть каталог' : 'Browse Inventory'} <ChevronRight size={16} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold uppercase tracking-widest text-[var(--mu)] mb-6">Recent Notifications</h2>
            <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6">
              {notifications.length === 0 ? (
                <div className="text-center text-[var(--mu2)] py-8">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.slice(0, 5).map(notif => (
                    <div key={notif.id} className={`p-4 rounded-xl border ${notif.read ? 'bg-[var(--s2)] border-transparent' : 'bg-[var(--s2)] border-[var(--lime)]/30'}`}>
                      <h4 className="font-bold text-sm mb-1">{notif.title}</h4>
                      <p className="text-xs text-[var(--mu2)] mb-2">{notif.message}</p>
                      <span className="text-[10px] font-mono text-[var(--mu2)]">{new Date(notif.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedLeadId && (
        <CreditConsentModal
          isOpen={creditModalOpen}
          onClose={() => {
            setCreditModalOpen(false);
            setSelectedLeadId(null);
          }}
          leadId={selectedLeadId}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {selectedLeadId && (
        <ReportDealerModal
          isOpen={reportModalOpen}
          onClose={() => {
            setReportModalOpen(false);
            setSelectedLeadId(null);
          }}
          leadId={selectedLeadId}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {selectedLeadId && (
        <ReviewDealerModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedLeadId(null);
          }}
          leadId={selectedLeadId}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {selectedLeadData && (
        <VIPCertificateModal
          isOpen={vipModalOpen}
          onClose={() => {
            setVipModalOpen(false);
            setSelectedLeadData(null);
          }}
          lead={selectedLeadData}
        />
      )}
    </div>
  );
};
