import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { getAuthToken } from '../utils/auth';

export const LeadsAdmin = () => {
  const { language } = useLanguageStore();
  const t = translations[language].admin;
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error('Failed to fetch leads', err);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/lead/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ status })
      });
      fetchLeads();
    } catch (err) {
      console.error('Failed to update lead status', err);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl tracking-widest text-[var(--w)]">{t.customerLeads}</h2>
      
      <div className="grid gap-4">
        {leads.map(lead => (
          <div key={lead.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-6">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              
              {/* Client Info */}
              <div className="space-y-4 flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{t.client}</div>
                    {lead.source === 'custom_calculator' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest">
                        Custom Calc
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-lg">{lead.client.name}</div>
                  <div className="text-sm text-[var(--mu2)]">{lead.client.phone}</div>
                </div>
                
                <div>
                  <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.paymentMethod} ($95)</div>
                  <div className="text-sm">
                    <span className="font-bold uppercase">{lead.client.payMethod}</span>
                    {lead.client.paymentName && (
                      <span className="text-[var(--lime)] ml-2">{t.paymentName}: {lead.client.paymentName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Car Info */}
              <div className="space-y-4 flex-1 border-t md:border-t-0 md:border-l border-[var(--b2)] pt-4 md:pt-0 md:pl-6">
                <div>
                  <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.desiredCar}</div>
                  <div className="font-bold text-lg text-[var(--lime)]">
                    {lead.car.make} {lead.car.model} {lead.car.year}
                  </div>
                  <div className="text-sm text-[var(--mu2)]">{lead.car.trim}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.dealType}</div>
                    <div className="text-sm font-bold uppercase">{lead.calc.type}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.payment}</div>
                    <div className="text-sm font-bold">${lead.calc.payment}/mo</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.down}</div>
                    <div className="text-sm font-bold">${lead.calc.down}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.tier}</div>
                    <div className="text-sm font-bold">{lead.calc.tier}</div>
                  </div>
                </div>
              </div>

              {/* Trade-in Info */}
              <div className="space-y-4 flex-1 border-t md:border-t-0 md:border-l border-[var(--b2)] pt-4 md:pt-0 md:pl-6">
                <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.tradeIn}</div>
                {lead.tradeIn && lead.tradeIn.hasTradeIn ? (
                  <div className="space-y-2">
                    <div className="font-bold text-sm text-yellow-400">
                      {lead.tradeIn.make} {lead.tradeIn.model} {lead.tradeIn.year}
                    </div>
                    <div className="text-xs text-[var(--mu2)]">{t.mileage}: {lead.tradeIn.mileage} miles</div>
                    {lead.tradeIn.vin && (
                      <div className="text-xs text-[var(--mu2)]">{t.vin}: <span className="font-mono text-[var(--w)]">{lead.tradeIn.vin}</span></div>
                    )}
                    {lead.tradeIn.hasLoan ? (
                      <div className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded mt-2 inline-block">
                        {t.hasLoanPayoff.replace('${payoff}', lead.tradeIn.payoff.toString())}
                      </div>
                    ) : (
                      <div className="text-xs bg-[var(--lime)]/10 text-[var(--lime)] px-2 py-1 rounded mt-2 inline-block">
                        {t.paidOffNoLoan}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--mu2)]">{t.noTradeIn}</div>
                )}
              </div>

              {/* Status */}
              <div className="flex-1 border-t md:border-t-0 md:border-l border-[var(--b2)] pt-4 md:pt-0 md:pl-6">
                <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-2">{t.status}</div>
                <select 
                  value={lead.status}
                  onChange={(e) => updateStatus(lead.id, e.target.value)}
                  className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                >
                  <option value="pending">{t.newAwaitingPayment}</option>
                  <option value="active">{t.inProgressPaid}</option>
                  <option value="closed">{t.successfullyClosed}</option>
                  <option value="rejected">{t.cancelled}</option>
                </select>
                <div className="text-[10px] text-[var(--mu2)] mt-4">
                  {t.created}: {new Date(lead.createdAt).toLocaleString()}
                </div>
              </div>

            </div>
          </div>
        ))}
        
        {leads.length === 0 && (
          <div className="text-center py-12 text-[var(--mu2)]">{t.noLeads}</div>
        )}
      </div>
    </div>
  );
};
