import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Save, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, DollarSign, Percent, Database } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

interface TrimData {
  name: string;
  msrp: number;
  rebate?: number;
  mf?: number;
  apr?: number;
  rv?: number;
  leaseCash?: number;
  baseAPR?: number;
  rv36?: number;
  [key: string]: any;
}

interface ModelData {
  id: string;
  name: string;
  trims: TrimData[];
  [key: string]: any;
}

interface MakeData {
  id: string;
  name: string;
  models: ModelData[];
}

interface CarDb {
  makes: MakeData[];
}

export function IncentivesAdmin() {
  const [carDb, setCarDb] = useState<CarDb | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMakes, setExpandedMakes] = useState<string[]>([]);
  const [expandedModels, setExpandedModels] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingTrim, setEditingTrim] = useState<{ make: string, model: string, trim: string, data: TrimData } | null>(null);

  const { language } = useLanguageStore();
  const t = translations[language].admin;

  useEffect(() => {
    fetchCarDb();
  }, []);

  const fetchCarDb = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cars');
      if (response.ok) {
        const data = await response.json();
        setCarDb(data);
      }
    } catch (error) {
      console.error('Failed to fetch car database:', error);
      setMessage({ type: 'error', text: 'Failed to load car database' });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!confirm('This will fetch the latest financial data from Marketcheck. It may take a few minutes. Continue?')) return;
    
    try {
      setSyncing(true);
      setMessage({ type: 'success', text: 'Sync started... please wait.' });
      
      const response = await fetch('/api/admin/sync-external', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: 'success', text: `Sync completed! Updated ${result.updatedCount || ''} models.` });
        fetchCarDb();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Sync failed' });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setMessage({ type: 'error', text: 'Sync failed due to a network error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveTrim = async () => {
    if (!editingTrim || !carDb) return;

    try {
      const updatedDb = { ...carDb };
      const makeIndex = updatedDb.makes.findIndex(m => m.name === editingTrim.make);
      if (makeIndex === -1) return;
      
      const modelIndex = updatedDb.makes[makeIndex].models.findIndex(m => m.name === editingTrim.model);
      if (modelIndex === -1) return;

      const trimIndex = updatedDb.makes[makeIndex].models[modelIndex].trims.findIndex(t => t.name === editingTrim.trim);
      if (trimIndex === -1) return;

      updatedDb.makes[makeIndex].models[modelIndex].trims[trimIndex] = {
        ...updatedDb.makes[makeIndex].models[modelIndex].trims[trimIndex],
        ...editingTrim.data
      };

      const response = await fetch('/api/admin/cars', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedDb)
      });

      if (response.ok) {
        setCarDb(updatedDb);
        setEditingTrim(null);
        setMessage({ type: 'success', text: 'Trim updated successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save changes' });
      }
    } catch (error) {
      console.error('Failed to save trim:', error);
      setMessage({ type: 'error', text: 'Failed to save changes' });
    }
  };

  const toggleMake = (make: string) => {
    setExpandedMakes(prev => 
      prev.includes(make) ? prev.filter(m => m !== make) : [...prev, make]
    );
  };

  const toggleModel = (modelKey: string) => {
    setExpandedModels(prev => 
      prev.includes(modelKey) ? prev.filter(m => m !== modelKey) : [...prev, modelKey]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-[var(--lime)] animate-spin" />
      </div>
    );
  }

  const filteredMakes = carDb?.makes ? carDb.makes.filter(make => 
    make.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    make.models.some(model => 
      model.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[var(--lime)]" />
            {t.deals || 'Incentives'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage MSRP, Rebates, Money Factor, APR, and Residual Values.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--lime)] text-white font-bold rounded-lg hover:bg-[var(--lime-hover)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Marketcheck'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto text-current opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search make or model..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[var(--lime)] transition-colors"
        />
      </div>

      <div className="space-y-4">
        {filteredMakes.length === 0 && !searchTerm && (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/20">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Database className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Incentives Database is Empty</h3>
              <p className="text-gray-400 mb-8">
                Your car database doesn't have any financial data yet. You can sync the latest data from Marketcheck to populate it.
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-8 py-3 bg-[var(--lime)] text-white font-bold rounded-xl hover:bg-[var(--lime-hover)] transition-all transform hover:scale-105 disabled:opacity-50 mx-auto"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing Data...' : 'Populate Database via Marketcheck'}
              </button>
            </div>
          </div>
        )}

        {filteredMakes.map(make => (
          <div key={make.name} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleMake(make.name)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl font-bold text-[var(--lime)]">
                  {make.name[0]}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-white">{make.name}</h3>
                  <p className="text-xs text-gray-400">{make.models.length} models</p>
                </div>
              </div>
              {expandedMakes.includes(make.name) ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
            </button>

            {expandedMakes.includes(make.name) && (
              <div className="p-4 pt-0 space-y-3 border-t border-white/10">
                {make.models.map(model => {
                  const modelKey = `${make.name}-${model.name}`;
                  return (
                    <div key={model.name} className="ml-4 space-y-2">
                      <button
                        onClick={() => toggleModel(modelKey)}
                        className="w-full flex items-center justify-between py-2 text-gray-300 hover:text-white transition-colors"
                      >
                        <span className="font-medium">{model.name}</span>
                        {expandedModels.includes(modelKey) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {expandedModels.includes(modelKey) && (
                        <div className="ml-4 overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead>
                              <tr className="text-gray-400 border-b border-white/10">
                                <th className="pb-2 font-medium">Trim</th>
                                <th className="pb-2 font-medium">MSRP</th>
                                <th className="pb-2 font-medium">Rebate</th>
                                <th className="pb-2 font-medium">MF</th>
                                <th className="pb-2 font-medium">APR</th>
                                <th className="pb-2 font-medium">RV %</th>
                                <th className="pb-2 font-medium text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {model.trims.map(trim => {
                                const data = trim;
                                const isEditing = editingTrim?.make === make.name && editingTrim?.model === model.name && editingTrim?.trim === trim.name;

                                return (
                                  <tr key={trim.name} className="group hover:bg-white/5 transition-colors">
                                    <td className="py-3 text-white font-medium">{trim.name}</td>
                                    <td className="py-3">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={editingTrim.data.msrp}
                                          onChange={(e) => setEditingTrim({ ...editingTrim, data: { ...editingTrim.data, msrp: Number(e.target.value) } })}
                                          className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                                        />
                                      ) : (
                                        <span className="text-gray-300">${data.msrp.toLocaleString()}</span>
                                      )}
                                    </td>
                                    <td className="py-3">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={editingTrim.data.leaseCash || 0}
                                          onChange={(e) => setEditingTrim({ ...editingTrim, data: { ...editingTrim.data, leaseCash: Number(e.target.value) } })}
                                          className="w-20 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                                        />
                                      ) : (
                                        <span className="text-emerald-400">-${(data.leaseCash || 0).toLocaleString()}</span>
                                      )}
                                    </td>
                                    <td className="py-3">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          step="0.00001"
                                          value={editingTrim.data.mf}
                                          onChange={(e) => setEditingTrim({ ...editingTrim, data: { ...editingTrim.data, mf: Number(e.target.value) } })}
                                          className="w-20 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                                        />
                                      ) : (
                                        <span className="text-gray-300">{(data.mf || 0).toFixed(5)}</span>
                                      )}
                                    </td>
                                    <td className="py-3">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={editingTrim.data.baseAPR}
                                          onChange={(e) => setEditingTrim({ ...editingTrim, data: { ...editingTrim.data, baseAPR: Number(e.target.value) } })}
                                          className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                                        />
                                      ) : (
                                        <span className="text-gray-300">{data.baseAPR || 0}%</span>
                                      )}
                                    </td>
                                    <td className="py-3">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editingTrim.data.rv36}
                                          onChange={(e) => setEditingTrim({ ...editingTrim, data: { ...editingTrim.data, rv36: Number(e.target.value) } })}
                                          className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
                                        />
                                      ) : (
                                        <span className="text-gray-300">{((data.rv36 || 0) * 100).toFixed(1)}%</span>
                                      )}
                                    </td>
                                    <td className="py-3 text-right">
                                      {isEditing ? (
                                        <div className="flex items-center justify-end gap-2">
                                          <button
                                            onClick={handleSaveTrim}
                                            className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                                          >
                                            <Save className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => setEditingTrim(null)}
                                            className="p-1.5 bg-white/10 text-gray-400 rounded hover:bg-white/20 transition-colors"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setEditingTrim({ make: make.name, model: model.name, trim: trim.name, data: trim })}
                                          className="text-[var(--lime)] hover:underline text-xs font-medium"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
