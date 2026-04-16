import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Loader2, User, Car, DollarSign, Calendar, MessageSquare, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface CalibratorLead {
  id: string;
  brokerName: string;
  clientNameCity: string;
  carPurpose: string;
  firstTimeBuyer: string;
  ficoScore: string;
  score: number;
  scoreText: string;
  status: 'new' | 'thinking' | 'deposit' | 'closed';
  createdAt: any;
  selectedCarFromCalc?: any;
}

export function CalibratorLeadsAdmin() {
  const [leads, setLeads] = useState<CalibratorLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'calibrator_leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CalibratorLead[];
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching calibrator leads:', error);
      toast.error('Ошибка при загрузке лидов калибратора');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'calibrator_leads', id), { status: newStatus });
      toast.success('Статус обновлен');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Ошибка при обновлении статуса');
    }
  };

  const columns = [
    { id: 'new', title: 'Новые', color: 'bg-blue-50 border-blue-200', icon: <MessageSquare className="w-4 h-4 text-blue-500" /> },
    { id: 'thinking', title: 'Думают', color: 'bg-amber-50 border-amber-200', icon: <Clock className="w-4 h-4 text-amber-500" /> },
    { id: 'deposit', title: 'Внесли депозит', color: 'bg-emerald-50 border-emerald-200', icon: <DollarSign className="w-4 h-4 text-emerald-500" /> },
    { id: 'closed', title: 'Закрыты / Отказ', color: 'bg-slate-50 border-slate-200', icon: <XCircle className="w-4 h-4 text-slate-500" /> }
  ];

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Лиды из Калибратора</h2>
          <p className="text-sm text-slate-500">Управление заявками, созданными брокерами через Калибратор</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <div key={col.id} className={`rounded-xl border ${col.color} flex flex-col min-h-[500px]`}>
            <div className="p-3 border-b border-inherit bg-white/50 flex items-center gap-2 font-semibold text-slate-700">
              {col.icon}
              {col.title}
              <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs border border-inherit">
                {leads.filter(l => (l.status || 'new') === col.id).length}
              </span>
            </div>
            
            <div className="p-3 flex-1 space-y-3 overflow-y-auto">
              {leads.filter(l => (l.status || 'new') === col.id).map(lead => (
                <div key={lead.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-slate-900">{lead.clientNameCity || 'Без имени'}</div>
                    <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${lead.score >= 80 ? 'bg-emerald-100 text-emerald-700' : lead.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {lead.score}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                    <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Брокер: {lead.brokerName || 'Не указан'}</div>
                    {lead.selectedCarFromCalc ? (
                      <div className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-slate-400" /> {lead.selectedCarFromCalc.make} {lead.selectedCarFromCalc.model}</div>
                    ) : (
                      <div className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-slate-400" /> Авто не выбрано</div>
                    )}
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {lead.createdAt?.toDate ? format(lead.createdAt.toDate(), 'dd.MM.yyyy HH:mm') : '-'}</div>
                  </div>

                  <select 
                    value={lead.status || 'new'} 
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-indigo-500"
                  >
                    <option value="new">Новый</option>
                    <option value="thinking">Думает</option>
                    <option value="deposit">Внес депозит</option>
                    <option value="closed">Закрыт / Отказ</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
