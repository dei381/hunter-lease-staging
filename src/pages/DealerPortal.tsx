import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { Car, Clock, CheckCircle2, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { CounterOfferModal } from '../components/CounterOfferModal';
import { AcceptLeadModal } from '../components/AcceptLeadModal';

export const DealerPortal = () => {
  const { user } = useAuthStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const fetchDealerLeads = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/dealer/leads', {
        headers: {
          'x-user-uid': user.uid
        }
      });
      if (response.ok) {
        const fetchedLeads = await response.json();
        setLeads(fetchedLeads);
      }
    } catch (error) {
      console.error('Error fetching dealer leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealerLeads();
  }, [user]);

  const handleAction = async (leadId: string, action: 'accept' | 'reject') => {
    if (!user) return;
    try {
      const response = await fetch(`/api/dealer/leads/${leadId}/${action}`, {
        method: 'POST',
        headers: {
          'x-user-uid': user.uid
        }
      });
      if (response.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: action === 'accept' ? 'accepted' : 'rejected' } : l));
      }
    } catch (error) {
      console.error(`Error ${action}ing lead:`, error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-display mb-4">Dealer Sign In Required</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="font-display text-4xl md:text-5xl mb-4">Dealer Portal</h1>
          <p className="text-[var(--mu2)]">Manage incoming leads and SLAs.</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold uppercase tracking-widest text-[var(--mu)] mb-6">Available Leads</h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[var(--s1)] h-32 rounded-2xl border border-[var(--b2)]"></div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-12 text-center">
              <Car className="w-12 h-12 text-[var(--mu2)] mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-display mb-2">No active leads</h3>
              <p className="text-[var(--mu2)]">Check back later for new opportunities.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {leads.map((lead) => {
                // Calculate SLA time remaining (e.g., 2 hours from creation)
                const createdAt = new Date(lead.createdAt);
                const deadline = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);
                const now = new Date();
                const timeRemaining = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 60000));
                const isUrgent = timeRemaining < 30;

                return (
                  <motion.div 
                    key={lead.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-[var(--s2)] rounded-xl flex items-center justify-center shrink-0">
                          <Car className="w-6 h-6 text-[var(--lime)]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-bold">
                              {lead.carYear} {lead.carMake} {lead.carModel} {lead.carTrim}
                            </h3>
                            <span className="bg-[var(--s2)] text-[var(--mu2)] px-2 py-1 rounded text-xs font-mono">
                              ID: {lead.id.substring(0, 8)}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--mu2)] font-mono mb-3">
                            <span className="flex items-center gap-1 uppercase tracking-widest">
                              <Clock size={14} /> 
                              SLA: 
                              <span className={`ml-1 font-bold ${isUrgent ? 'text-red-500' : 'text-[var(--lime)]'}`}>
                                {timeRemaining > 0 ? `${timeRemaining} mins left` : 'EXPIRED'}
                              </span>
                            </span>
                            <span className="flex items-center gap-1 uppercase tracking-widest">
                              Type: <span className="text-[var(--w)] ml-1">{lead.calcType}</span>
                            </span>
                          </div>

                          <div className="bg-[var(--s2)] p-3 rounded-lg text-sm">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <div className="text-[var(--mu2)] text-[10px] uppercase tracking-widest">MSRP</div>
                                <div className="font-bold">${lead.carMsrp?.toLocaleString()}</div>
                              </div>
                              <div>
                                <div className="text-[var(--mu2)] text-[10px] uppercase tracking-widest">Payment</div>
                                <div className="font-bold text-[var(--lime)]">${lead.calcPayment}/mo</div>
                              </div>
                              <div>
                                <div className="text-[var(--mu2)] text-[10px] uppercase tracking-widest">Down</div>
                                <div className="font-bold">${lead.calcDown}</div>
                              </div>
                              <div>
                                <div className="text-[var(--mu2)] text-[10px] uppercase tracking-widest">Zip Code</div>
                                <div className="font-bold">{lead.calcZip || 'N/A'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-row md:flex-col gap-3 shrink-0">
                        {lead.status === 'new' || lead.status === 'pending' ? (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedLeadId(lead.id);
                                setAcceptModalOpen(true);
                              }}
                              className="flex items-center justify-center gap-2 bg-[var(--lime)] text-black font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-[var(--lime2)] transition-colors"
                            >
                              <CheckCircle2 size={18} /> Accept
                            </button>
                            <button 
                              onClick={() => handleAction(lead.id, 'reject')}
                              className="flex items-center justify-center gap-2 bg-red-500/10 text-red-500 font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-red-500/20 transition-colors"
                            >
                              <XCircle size={18} /> Pass
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedLeadId(lead.id);
                                setCounterModalOpen(true);
                              }}
                              className="flex items-center justify-center gap-2 bg-[var(--s2)] text-white font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-[var(--s3)] transition-colors border border-[var(--b2)]"
                            >
                              <MessageSquare size={18} /> Counter
                            </button>
                          </>
                        ) : (
                          <div className={`flex items-center justify-center gap-2 font-bold uppercase tracking-widest px-6 py-3 rounded-xl border ${lead.status === 'accepted' ? 'border-[var(--lime)] text-[var(--lime)]' : 'border-red-500 text-red-500'}`}>
                            {lead.status === 'accepted' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                            {lead.status}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedLeadId && (
        <CounterOfferModal
          isOpen={counterModalOpen}
          onClose={() => {
            setCounterModalOpen(false);
            setSelectedLeadId(null);
          }}
          leadId={selectedLeadId}
          onSuccess={() => {
            fetchDealerLeads();
          }}
        />
      )}

      {selectedLeadId && (
        <AcceptLeadModal
          isOpen={acceptModalOpen}
          onClose={() => {
            setAcceptModalOpen(false);
            setSelectedLeadId(null);
          }}
          leadId={selectedLeadId}
          onSuccess={() => {
            fetchDealerLeads();
          }}
        />
      )}
    </div>
  );
};
