import React from 'react';
import { Lead } from '../types';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export const LeadStatus = ({ lead }: { lead: Lead }) => {
  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="mb-8">
        <span className="text-[9px] font-bold text-[var(--lime)] uppercase tracking-[2px]">hunter.lease · Your Request</span>
        <h2 className="font-display text-5xl tracking-tight leading-none mt-2">STATUS</h2>
        <div className="font-mono text-[11px] text-[var(--mu2)] mt-2">ID: {lead.id.slice(0, 8).toUpperCase()}</div>
      </div>

      <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg font-mono text-xs font-bold tracking-widest uppercase mb-8 ${lead.status === 'pending' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500' : 'bg-[var(--lime)]/10 border border-[var(--lime)]/30 text-[var(--lime)]'}`}>
        <div className={`w-2 h-2 rounded-full animate-pulse ${lead.status === 'pending' ? 'bg-amber-500' : 'bg-[var(--lime)]'}`} />
        {lead.status === 'pending' ? 'AWAITING CONFIRMATION' : 'IN PROGRESS'}
      </div>

      <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6 flex justify-between items-center gap-4 mb-6">
        <div>
          <div className="font-mono text-[10px] text-[var(--lime)] tracking-widest uppercase mb-1">{lead.car.year} · {lead.calc.type === 'lease' ? 'LEASE' : 'FINANCE'}</div>
          <div className="font-display text-3xl leading-none">{lead.car.make} {lead.car.model}</div>
          <div className="text-xs text-[var(--mu2)] mt-1">{lead.car.trim}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl text-[var(--lime)]">{fmt(lead.calc.payment)}</div>
          <div className="text-[9px] text-[var(--mu)] uppercase tracking-widest">/month</div>
          <div className="text-xs text-[var(--mu2)] mt-1">Down {fmt(lead.calc.down)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-8">
        <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-center">
          <div className="font-display text-3xl text-[var(--lime)]">{lead.dealersSent}</div>
          <div className="text-[9px] text-[var(--mu)] uppercase tracking-widest leading-tight">Dealers<br />Sent</div>
        </div>
        <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-center">
          <div className={`font-display text-3xl ${lead.dealersAccepted > 0 ? 'text-[var(--grn)]' : 'text-[var(--mu2)]'}`}>{lead.dealersAccepted}</div>
          <div className="text-[9px] text-[var(--mu)] uppercase tracking-widest leading-tight">Dealers<br />Accepted</div>
        </div>
        <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-center">
          <div className="font-display text-3xl text-amber-500">$95</div>
          <div className="text-[9px] text-[var(--mu)] uppercase tracking-widest leading-tight">Deposit<br />Paid</div>
        </div>
      </div>

      {lead.acceptedBy && (
        <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/30 rounded-2xl p-6 mb-8">
          <div className="font-mono text-[9px] text-[var(--lime)] tracking-widest uppercase mb-3">🏢 Dealer accepted request</div>
          <div className="font-bold text-lg mb-2">{lead.acceptedBy}</div>
          <p className="text-sm text-[var(--mu2)] leading-relaxed">Our manager is coordinating the visit. Expect a call within 1-2 hours.</p>
        </div>
      )}

      <div className="space-y-6 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-[var(--b2)] mb-12">
        {[
          { i: '💳', t: 'Deposit Received', d: 'Request accepted for processing', s: 'done' },
          { i: '🔍', t: 'LA Market Analysis', d: `Comparing offers from ${lead.dealersSent} dealers`, s: lead.status !== 'pending' ? 'done' : 'active' },
          { i: '🤝', t: 'Negotiating with Dealers', d: 'Getting the best "under the table" terms', s: lead.dealersAccepted > 0 ? 'done' : 'active' },
          { i: '🏢', t: lead.acceptedBy ? `${lead.acceptedBy} confirmed` : 'Best dealer selected', d: lead.acceptedBy ? 'Price and parameters locked' : 'Dealers are reviewing...', s: lead.acceptedBy ? 'done' : 'active' },
          { i: '🛡️', t: 'Contract Protection', d: 'We will check documents before you sign', s: lead.acceptedBy ? 'active' : 'pending' },
        ].map((item, i) => (
          <div key={i} className="flex gap-6 items-start relative pl-10">
            <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 border-2 ${item.s === 'done' ? 'bg-[var(--lime)] text-white border-[var(--lime)]' : item.s === 'active' ? 'bg-[var(--s2)] border-[var(--lime)] animate-pulse' : 'bg-[var(--b2)] border-[var(--b1)] text-[var(--mu)]'}`}>
              {item.s === 'done' ? '✓' : item.i}
            </div>
            <div>
              <div className={`font-bold text-sm ${item.s === 'done' ? 'text-[var(--w)]' : item.s === 'active' ? 'text-[var(--lime)]' : 'text-[var(--mu2)]'}`}>{item.t}</div>
              <div className="text-xs text-[var(--mu2)] mt-1">{item.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <a 
          href="https://wa.me/1234567890" 
          target="_blank"
          className="flex-1 bg-[var(--s2)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl text-center hover:bg-[var(--b1)] transition-all"
        >
          Chat with Agent
        </a>
        <button 
          onClick={() => window.location.reload()}
          className="flex-1 bg-[var(--lime)] text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl text-center hover:bg-[var(--lime2)] transition-all"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
};
