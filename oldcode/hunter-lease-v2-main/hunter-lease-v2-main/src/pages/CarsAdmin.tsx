import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronRight, RefreshCw, Terminal, Database } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const CarsAdmin = () => {
  const { language } = useLanguageStore();
  const t = translations[language].admin;
  const [carDb, setCarDb] = useState<any>(null);
  const [expandedMake, setExpandedMake] = useState<string | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [debugData, setDebugData] = useState<string | null>(null);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'prompt';
    inputValue?: string;
    onConfirm?: (val?: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const showAlert = (title: string, message: string) => {
    setModal({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModal({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const showPrompt = (title: string, message: string, defaultValue: string, onConfirm: (val: string) => void) => {
    setModal({ isOpen: true, title, message, type: 'prompt', inputValue: defaultValue, onConfirm });
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const duplicateModel = (makeId: string, model: any) => {
    showPrompt(t.newModelNamePrompt, '', `${model.name} (Copy)`, (newName) => {
      if (!newName) return;
      const newId = newName.toLowerCase().replace(/\s+/g, '-');
      const newDb = { ...carDb };
      const make = newDb.makes.find((m: any) => m.id === makeId);
      make.models.push({
        ...model,
        id: newId,
        name: newName
      });
      saveCars(newDb);
    });
  };

  const syncExternal = async (makeName?: string, modelName?: string) => {
    const targetMsg = modelName ? `for ${makeName} ${modelName}` : (makeName ? `for all ${makeName} models` : 'for all models');
    showConfirm('Sync with API', `Are you sure you want to sync with the external API? This will update financial data ${targetMsg}.`, async () => {
      setIsSyncing(true);
      try {
        const res = await fetch('/api/admin/sync-external', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ make: makeName, model: modelName })
        });
        const data = await res.json();
        if (res.ok) {
          const { stats } = data;
          let msg = `Sync completed!\n\nModels updated: ${stats.updatedModelsCount}\nTrims updated: ${stats.updatedTrimsCount}\nAPI Requests: ${stats.requestCount}`;
          if (stats.errors && stats.errors.length > 0) {
            msg += `\n\nWarnings:\n${stats.errors.join('\n')}`;
          }
          showAlert('Sync Success', msg);
          fetchCars(); // Refresh local state
        } else {
          showAlert('Sync Failed', `${data.error}${data.details ? '\n\n' + data.details : ''}`);
        }
      } catch (err) {
        console.error('Failed to sync external data', err);
        showAlert('Error', 'Failed to sync external data. Check console for details.');
      } finally {
        setIsSyncing(false);
      }
    });
  };

  const testApi = async () => {
    setIsTestingApi(true);
    try {
      const res = await fetch('/api/admin/test-marketcheck?make=Toyota&model=Camry', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        }
      });
      const data = await res.json();
      
      if (res.status === 401 && data.error === "Invalid Marketcheck API Key") {
        showAlert("Marketcheck API Key Error", "The API key is invalid or unauthorized (401). Please check your MARKETCHECK_API_KEY in the AI Studio Secrets panel.");
      }
      
      setDebugData(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to test API', err);
      showAlert('Error', 'Failed to test API');
    } finally {
      setIsTestingApi(false);
    }
  };

  const snapshotCalculator = async () => {
    showConfirm('Snapshot to Calculator', 'This will copy the current car database to the isolated Calculation Engine. Are you sure?', async () => {
      try {
        const res = await fetch('/api/admin/snapshot-calculator', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          showAlert('Snapshot Success', 'The Calculation Engine has been updated with the current data.');
        } else {
          showAlert('Snapshot Failed', data.error);
        }
      } catch (err) {
        console.error('Failed to create snapshot', err);
        showAlert('Error', 'Failed to create snapshot');
      }
    });
  };

  const fetchCars = async () => {
    try {
      const res = await fetch('/api/cars');
      const data = await res.json();
      setCarDb(data);
    } catch (err) {
      console.error('Failed to fetch cars', err);
    }
  };

  const saveCars = async (newDb: any) => {
    try {
      await fetch('/api/cars', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify(newDb),
      });
      setCarDb(newDb);
    } catch (err) {
      console.error('Failed to save cars', err);
    }
  };

  const addMake = () => {
    showPrompt(t.manufacturerNamePrompt, '', 'New Brand', (name) => {
      if (!name) return;
      const id = name.toLowerCase().replace(/\s+/g, '-');
      const defaultTiers = [
        { id: "t1", label: "Tier 1", score: "740+", aprAdd: 0, mfAdd: 0, cls: "r1" },
        { id: "t2", label: "Tier 2", score: "700–739", aprAdd: 1.5, mfAdd: 0.00040, cls: "r2" },
        { id: "t3", label: "Tier 3", score: "660–699", aprAdd: 4.5, mfAdd: 0.00120, cls: "r3" },
        { id: "t4", label: "Tier 4", score: "620–659", aprAdd: 9.0, mfAdd: 0.00240, cls: "r4" }
      ];
      const newDb = { ...carDb, makes: [...carDb.makes, { id, name, models: [], tiers: defaultTiers, baseMF: 0.002, baseAPR: 6.9 }] };
      saveCars(newDb);
    });
  };

  const addModel = (makeId: string) => {
    showPrompt(t.modelNamePrompt, '', 'New Model', (name) => {
      if (!name) return;
      const id = name.toLowerCase().replace(/\s+/g, '-');
      const newDb = { ...carDb };
      const make = newDb.makes.find((m: any) => m.id === makeId);
      make.models.push({
        id, name, class: 'Sedan', msrpRange: '$30k - $40k', years: '2025-2026',
        mf: 0.00150, rv36: 0.60, baseAPR: 4.9, leaseCash: 0,
        trims: []
      });
      saveCars(newDb);
    });
  };

  const addTrim = (makeId: string, modelId: string) => {
    showPrompt(t.trimNamePrompt, '', 'New Trim', (name) => {
      if (!name) return;
      const newDb = { ...carDb };
      const make = newDb.makes.find((m: any) => m.id === makeId);
      const model = make.models.find((m: any) => m.id === modelId);
      model.trims.push({ name, msrp: 0 });
      saveCars(newDb);
    });
  };

  const duplicateTrim = (makeId: string, modelId: string, trim: any) => {
    showPrompt(t.newTrimNamePrompt, '', `${trim.name} (Copy)`, (newName) => {
      if (!newName) return;
      const newDb = { ...carDb };
      const make = newDb.makes.find((m: any) => m.id === makeId);
      const model = make.models.find((m: any) => m.id === modelId);
      model.trims.push({
        ...trim,
        name: newName
      });
      saveCars(newDb);
    });
  };

  const deleteMake = (makeId: string) => {
    showConfirm('Delete Manufacturer', t.deleteMakeConfirm, () => {
      const newDb = { ...carDb, makes: carDb.makes.filter((m: any) => m.id !== makeId) };
      saveCars(newDb);
    });
  };

  const deleteModel = (makeId: string, modelId: string) => {
    showConfirm('Delete Model', t.deleteModelConfirm, () => {
      const newDb = { ...carDb };
      const make = newDb.makes.find((m: any) => m.id === makeId);
      make.models = make.models.filter((m: any) => m.id !== modelId);
      saveCars(newDb);
    });
  };

  const deleteTrim = (makeId: string, modelId: string, trimName: string) => {
    showConfirm('Delete Trim', t.deleteTrimConfirm, () => {
      const newDb = { ...carDb };
      const make = newDb.makes.find((m: any) => m.id === makeId);
      const model = make.models.find((m: any) => m.id === modelId);
      model.trims = model.trims.filter((t: any) => t.name !== trimName);
      saveCars(newDb);
    });
  };

  const updateModel = (makeId: string, modelId: string, field: string, value: any) => {
    const newDb = { ...carDb };
    const make = newDb.makes.find((m: any) => m.id === makeId);
    const model = make.models.find((m: any) => m.id === modelId);
    model[field] = value;
    saveCars(newDb);
  };

  const updateTrim = (makeId: string, modelId: string, trimName: string, field: string, value: any) => {
    const newDb = { ...carDb };
    const make = newDb.makes.find((m: any) => m.id === makeId);
    const model = make.models.find((m: any) => m.id === modelId);
    const trim = model.trims.find((t: any) => t.name === trimName);
    trim[field] = value;
    saveCars(newDb);
  };

  const updateModelTier = (makeId: string, modelId: string, tierId: string, field: string, value: any) => {
    const newDb = { ...carDb };
    const make = newDb.makes.find((m: any) => m.id === makeId);
    const model = make.models.find((m: any) => m.id === modelId);
    if (!model.tiersData) model.tiersData = {};
    if (!model.tiersData[tierId]) {
      const t = (make.tiers || []).find((x: any) => x.id === tierId) || { mfAdd: 0, aprAdd: 0 };
      model.tiersData[tierId] = {
        mfAdd: t.mfAdd || 0,
        aprAdd: t.aprAdd || 0
      };
    }
    model.tiersData[tierId][field] = isNaN(value) ? 0 : value;
    saveCars(newDb);
  };

  const updateTrimTier = (makeId: string, modelId: string, trimName: string, tierId: string, field: string, value: any) => {
    const newDb = { ...carDb };
    const make = newDb.makes.find((m: any) => m.id === makeId);
    const model = make.models.find((m: any) => m.id === modelId);
    const trim = model.trims.find((t: any) => t.name === trimName);
    if (!trim.tiersData) trim.tiersData = {};
    if (!trim.tiersData[tierId]) {
      const makeTier = (make.tiers || []).find((x: any) => x.id === tierId) || { mfAdd: 0, aprAdd: 0 };
      const modelTier = model.tiersData?.[tierId] || makeTier;
      trim.tiersData[tierId] = {
        mf: (trim.mf || 0) + (modelTier.mfAdd || 0),
        rv36: trim.rv36 || 0,
        baseAPR: (trim.baseAPR || 0) + (modelTier.aprAdd || 0),
        leaseCash: trim.leaseCash || 0
      };
    }
    trim.tiersData[tierId][field] = isNaN(value) ? 0 : value;
    saveCars(newDb);
  };

  const updateMake = (makeId: string, field: string, value: any) => {
    const newDb = { ...carDb };
    const make = newDb.makes.find((m: any) => m.id === makeId);
    if (make) {
      make[field] = value;
      saveCars(newDb);
    }
  };

  const updateMakeTier = (makeId: string, tierId: string, field: string, value: any) => {
    const newDb = { ...carDb };
    const make = newDb.makes.find((m: any) => m.id === makeId);
    if (make && make.tiers) {
      const tier = make.tiers.find((t: any) => t.id === tierId);
      if (tier) {
        tier[field] = isNaN(value) ? 0 : value;
        saveCars(newDb);
      }
    }
  };

  if (!carDb) return <div className="text-center py-12">{t.loadingCars}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-8">
        <h2 className="text-2xl font-display tracking-widest text-[var(--lime)]">{t.carDatabaseCalc}</h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={testApi}
            disabled={isTestingApi}
            className="flex items-center gap-2 bg-[var(--s2)] border border-[var(--b1)] text-[var(--w)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--b1)] transition-all disabled:opacity-50"
          >
            <Terminal className={`w-3 h-3 ${isTestingApi ? 'animate-pulse' : ''}`} />
            {isTestingApi ? 'Testing...' : 'Test API'}
          </button>
          <button 
            onClick={() => syncExternal()}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-[var(--s2)] border border-[var(--b1)] text-[var(--w)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--b1)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync with API'}
          </button>
          <button 
            onClick={snapshotCalculator}
            className="flex items-center gap-2 bg-[var(--s2)] border border-[var(--b1)] text-[var(--w)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--b1)] transition-all"
            title="Snapshot current data to the isolated Calculation Engine"
          >
            <Database className="w-3 h-3" />
            Snapshot
          </button>
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder={t.searchMakeModel} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-lg px-4 py-2 text-sm outline-none focus:border-[var(--lime)]"
            />
          </div>
          <button onClick={addMake} className="bg-[var(--lime)] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[var(--lime)]/90 whitespace-nowrap">
            {t.addManufacturer}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {carDb.makes
          .filter((make: any) => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return make.name.toLowerCase().includes(term) || 
                   make.models.some((m: any) => m.name.toLowerCase().includes(term));
          })
          .map((make: any) => (
          <div key={make.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--s2)] transition-colors"
              onClick={() => setExpandedMake(expandedMake === make.id ? null : make.id)}
            >
              <div className="flex items-center gap-2 font-bold text-lg">
                {expandedMake === make.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                {make.name}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); syncExternal(make.name); }} 
                  className="text-[var(--lime)] hover:bg-[var(--lime)]/10 px-3 py-1 rounded-md text-sm font-bold flex items-center gap-2 transition-colors"
                  disabled={isSyncing}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Brand
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteMake(make.id); }} className="text-[var(--mu2)] hover:text-red-400 p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expandedMake === make.id && (
              <div className="p-4 border-t border-[var(--b2)] bg-[var(--bg)]/50 space-y-4">
                {/* Brand Global Settings */}
                <div className="bg-[var(--s2)] border border-[var(--b1)] rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-bold text-[var(--w)] mb-3">Brand Global Financial Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-widest text-[var(--lime)] font-bold">Global Money Factor (Brand Default)</span>
                      <p className="text-[10px] text-[var(--mu2)] italic">Used if model/trim MF is 0.</p>
                      <input 
                        type="number" 
                        step="0.00001" 
                        value={make.baseMF || 0} 
                        onChange={e => updateMake(make.id, 'baseMF', parseFloat(e.target.value))} 
                        className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" 
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-widest text-[var(--lime)] font-bold">Global APR % (Brand Default)</span>
                      <p className="text-[10px] text-[var(--mu2)] italic">Used if model/trim APR is 0.</p>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={make.baseAPR || 0} 
                        onChange={e => updateMake(make.id, 'baseAPR', parseFloat(e.target.value))} 
                        className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" 
                      />
                    </label>
                  </div>
                </div>

                {/* Brand Tiers Configuration */}
                {make.tiers && (
                  <div className="bg-[var(--s2)] border border-[var(--b1)] rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-bold text-[var(--w)] mb-3">Brand Tiers Configuration</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-widest text-[var(--mu2)] border-b border-[var(--b2)]">
                            <th className="pb-2 font-normal">{t.tier}</th>
                            <th className="pb-2 font-normal">{t.score}</th>
                            <th className="pb-2 font-normal">{t.mfAdd}</th>
                            <th className="pb-2 font-normal">{t.aprAdd}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {make.tiers.map((t_item: any) => (
                            <tr key={t_item.id} className="border-b border-[var(--b2)]/50">
                              <td className="py-2 font-bold text-[var(--w)]">{t_item.label}</td>
                              <td className="py-2 text-[var(--mu2)]">{t_item.score}</td>
                              <td className="py-2 pr-2">
                                <input 
                                  type="number" 
                                  step="0.00001" 
                                  value={t_item.mfAdd} 
                                  onChange={e => updateMakeTier(make.id, t_item.id, 'mfAdd', parseFloat(e.target.value))} 
                                  className="w-full max-w-[120px] bg-[var(--bg)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" 
                                />
                              </td>
                              <td className="py-2">
                                <input 
                                  type="number" 
                                  step="0.1" 
                                  value={t_item.aprAdd} 
                                  onChange={e => updateMakeTier(make.id, t_item.id, 'aprAdd', parseFloat(e.target.value))} 
                                  className="w-full max-w-[120px] bg-[var(--bg)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" 
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button onClick={() => addModel(make.id)} className="text-xs font-bold text-[var(--lime)] hover:text-white px-3 py-1 border border-[var(--lime)]/30 rounded-lg">
                    {t.addModel}
                  </button>
                </div>

                <div className="space-y-4">
                  {make.models.map((model: any) => (
                    <div key={model.id} className="bg-[var(--s2)] border border-[var(--b1)] rounded-lg overflow-hidden">
                      <div 
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-[var(--s1)] transition-colors"
                        onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
                      >
                        <div className="font-bold flex items-center gap-2">
                          {expandedModel === model.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          {model.name} <span className="text-xs text-[var(--mu2)] font-normal">({model.class})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); syncExternal(make.name, model.name); }} 
                            className="text-[var(--lime)] hover:bg-[var(--lime)]/10 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-colors"
                            disabled={isSyncing}
                            title="Sync Model"
                          >
                            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                            Sync
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); duplicateModel(make.id, model); }} 
                            className="text-[var(--mu2)] hover:text-[var(--lime)] p-1"
                            title={t.duplicateModel}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteModel(make.id, model.id); }} className="text-[var(--mu2)] hover:text-red-400 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {expandedModel === model.id && (
                        <div className="p-4 border-t border-[var(--b1)] space-y-6">
                          {/* Model Settings */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <label className="space-y-1">
                                <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">{t.class}</span>
                                <input type="text" value={model.class || ''} onChange={e => updateModel(make.id, model.id, 'class', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Image URL</span>
                                <input type="text" value={model.imageUrl || ''} onChange={e => updateModel(make.id, model.id, 'imageUrl', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] uppercase tracking-widest text-[var(--lime)] font-bold">Base Money Factor (Model Default)</span>
                                <p className="text-[10px] text-[var(--mu2)] italic">This is the baseline MF before any tier markups.</p>
                                <input type="number" step="0.00001" value={model.mf || 0} onChange={e => updateModel(make.id, model.id, 'mf', parseFloat(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] uppercase tracking-widest text-[var(--lime)] font-bold">Base Residual Value (Model Default)</span>
                                <p className="text-[10px] text-[var(--mu2)] italic">This is the baseline RV % (e.g. 0.60 for 60%) before any tier markups.</p>
                                <input type="number" step="0.01" value={model.rv36 || 0} onChange={e => updateModel(make.id, model.id, 'rv36', parseFloat(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                              </label>
                            </div>

                            <div className="space-y-6">
                              <h4 className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Model Tier Markups (Overrides Make Tier Markups)</h4>
                              <div className="bg-[var(--bg)] border border-[var(--b2)] rounded-lg p-4">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-sm">
                                    <thead>
                                      <tr className="text-[10px] uppercase tracking-widest text-[var(--mu2)] border-b border-[var(--b2)]">
                                        <th className="pb-2 font-normal">{t.tier}</th>
                                        <th className="pb-2 font-normal">MF Add</th>
                                        <th className="pb-2 font-normal">APR Add (%)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {make.tiers && make.tiers.map((t_item: any) => {
                                        const tData = model.tiersData?.[t_item.id] || {
                                          mfAdd: t_item.mfAdd || 0,
                                          aprAdd: t_item.aprAdd || 0
                                        };
                                        return (
                                          <tr key={t_item.id} className="border-b border-[var(--b2)]/50">
                                            <td className="py-2 font-bold text-[var(--w)]">{t_item.label}</td>
                                            <td className="py-2 pr-2">
                                              <input type="number" step="0.00001" value={tData.mfAdd} onChange={e => updateModelTier(make.id, model.id, t_item.id, 'mfAdd', parseFloat(e.target.value))} className="w-full max-w-[120px] bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                            </td>
                                            <td className="py-2 pr-2">
                                              <input type="number" step="0.1" value={tData.aprAdd} onChange={e => updateModelTier(make.id, model.id, t_item.id, 'aprAdd', parseFloat(e.target.value))} className="w-full max-w-[120px] bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <h4 className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">{t.trims}</h4>
                              {model.trims.map((trim: any) => (
                                <div key={trim.name} className="bg-[var(--bg)] border border-[var(--b2)] rounded-lg p-4 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <h5 className="font-bold text-[var(--w)]">{trim.name}</h5>
                                      {trim.lastUpdated && (
                                        <span className="text-[8px] text-[var(--mu2)] italic">
                                          Synced: {new Date(trim.lastUpdated).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-4">
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-[var(--lime)] font-bold">Base MF</span>
                                        <input 
                                          type="number" 
                                          step="0.00001" 
                                          value={trim.mf || 0} 
                                          onChange={e => updateTrim(make.id, model.id, trim.name, 'mf', parseFloat(e.target.value))}
                                          className="bg-transparent border-b border-[var(--b2)] outline-none text-xs w-20"
                                        />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-[var(--lime)] font-bold">Base RV</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={trim.rv36 || 0} 
                                          onChange={e => updateTrim(make.id, model.id, trim.name, 'rv36', parseFloat(e.target.value))}
                                          className="bg-transparent border-b border-[var(--b2)] outline-none text-xs w-16"
                                        />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-[var(--mu2)]">MSRP</span>
                                        <span className="text-xs text-[var(--w)] font-bold">{trim.msrp}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                      <thead>
                                        <tr className="text-[10px] uppercase tracking-widest text-[var(--mu2)] border-b border-[var(--b2)]">
                                          <th className="pb-2 font-normal">{t.tier}</th>
                                          <th className="pb-2 font-normal">{t.mf}</th>
                                          <th className="pb-2 font-normal">{t.rv}</th>
                                          <th className="pb-2 font-normal">{t.aprPercent}</th>
                                          <th className="pb-2 font-normal">{t.leaseCashDollar}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {make.tiers && make.tiers.map((t_item: any) => {
                                          const modelTier = model.tiersData?.[t_item.id] || t_item;
                                          const tData = trim.tiersData?.[t_item.id] || {
                                            mf: (trim.mf || 0) + (modelTier.mfAdd || 0),
                                            rv36: trim.rv36 || 0,
                                            baseAPR: (trim.baseAPR || 0) + (modelTier.aprAdd || 0),
                                            leaseCash: trim.leaseCash || 0
                                          };
                                          return (
                                            <tr key={t_item.id} className="border-b border-[var(--b2)]/50">
                                              <td className="py-2 font-bold text-[var(--w)]">{t_item.label}</td>
                                              <td className="py-2 pr-2">
                                                <input type="number" step="0.00001" value={tData.mf} onChange={e => updateTrimTier(make.id, model.id, trim.name, t_item.id, 'mf', parseFloat(e.target.value))} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                              </td>
                                              <td className="py-2 pr-2">
                                                <input type="number" step="0.01" value={tData.rv36} onChange={e => updateTrimTier(make.id, model.id, trim.name, t_item.id, 'rv36', parseFloat(e.target.value))} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                              </td>
                                              <td className="py-2 pr-2">
                                                <input type="number" step="0.1" value={tData.baseAPR} onChange={e => updateTrimTier(make.id, model.id, trim.name, t_item.id, 'baseAPR', parseFloat(e.target.value))} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                              </td>
                                              <td className="py-2">
                                                <input type="number" value={tData.leaseCash} onChange={e => updateTrimTier(make.id, model.id, trim.name, t_item.id, 'leaseCash', parseInt(e.target.value))} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Trims */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--mu)]">{t.trims}</h4>
                              <button onClick={() => addTrim(make.id, model.id)} className="text-[10px] font-bold text-[var(--lime)] hover:text-white">
                                {t.addTrim}
                              </button>
                            </div>
                            <div className="grid gap-2">
                              {model.trims.map((trim: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-4 bg-[var(--bg)] border border-[var(--b2)] rounded-lg p-2">
                                  <input 
                                    type="text" 
                                    value={trim.name} 
                                    onChange={e => {
                                      const newDb = {...carDb};
                                      newDb.makes.find((m:any)=>m.id===make.id).models.find((m:any)=>m.id===model.id).trims[idx].name = e.target.value;
                                      saveCars(newDb);
                                    }}
                                    className="flex-1 bg-transparent outline-none text-sm" 
                                    placeholder="Name"
                                  />
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-[var(--mu2)]">{t.msrpLabel}</span>
                                    <input 
                                      type="number" 
                                      value={trim.msrp} 
                                      onChange={e => {
                                        const newDb = {...carDb};
                                        newDb.makes.find((m:any)=>m.id===make.id).models.find((m:any)=>m.id===model.id).trims[idx].msrp = parseInt(e.target.value);
                                        saveCars(newDb);
                                      }}
                                      className="w-24 bg-transparent outline-none text-sm text-right" 
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => duplicateTrim(make.id, model.id, trim)} 
                                      className="text-[var(--mu2)] hover:text-[var(--lime)] p-1"
                                      title={t.duplicateTrim}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => deleteTrim(make.id, model.id, trim.name)} className="text-[var(--mu2)] hover:text-red-400 p-1">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {debugData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg)] border border-[var(--b1)] p-6 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-display tracking-widest text-[var(--lime)]">Marketcheck API Test (Toyota Camry 2024)</h3>
              <button onClick={() => setDebugData(null)} className="text-[var(--mu2)] hover:text-[var(--w)]">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-[var(--mu1)] mb-4">
              Review the request URL, status, and raw JSON response below.
            </p>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="p-3 bg-[#0a0a0a] border border-[var(--b1)] rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-[var(--mu1)] mb-1">Request URL</p>
                <code className="text-xs text-[var(--lime)] break-all">
                  {JSON.parse(debugData).request_url}
                </code>
              </div>
              <div className="p-3 bg-[#0a0a0a] border border-[var(--b1)] rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-[var(--mu1)] mb-1">Key Verification (Masked)</p>
                <code className="text-xs text-[var(--lime)]">
                  {JSON.parse(debugData).key_verification}
                </code>
              </div>
              <div className="p-3 bg-[#0a0a0a] border border-[var(--b1)] rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-[var(--mu1)] mb-1">Status Code</p>
                <code className="text-xs text-[var(--w)]">
                  {JSON.parse(debugData).status}
                </code>
              </div>
              <div className="flex-1 min-h-[300px] relative border border-[var(--b1)] rounded-lg bg-[#0a0a0a]">
                <p className="absolute top-2 left-3 text-[10px] uppercase tracking-widest text-[var(--mu1)] z-10">Raw JSON Response</p>
                <textarea 
                  className="w-full h-full bg-transparent text-[var(--w)] p-8 pt-10 font-mono text-xs outline-none resize-none" 
                  readOnly 
                  value={JSON.stringify(JSON.parse(debugData).raw_response, null, 2)} 
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button 
                onClick={() => setDebugData(null)}
                className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs border border-[var(--b1)] text-[var(--w)] hover:bg-[var(--s1)]"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(debugData);
                  showAlert('Success', 'Copied to clipboard!');
                }}
                className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-[var(--lime)] text-[var(--bg)] hover:scale-105 transition-all"
              >
                Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal System */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[var(--s2)] border border-[var(--b1)] rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-display tracking-widest text-[var(--lime)] mb-4 uppercase">{modal.title}</h3>
            <div className="text-[var(--mu2)] mb-8 whitespace-pre-wrap leading-relaxed">
              {modal.message}
            </div>
            
            {modal.type === 'prompt' && (
              <input 
                type="text"
                value={modal.inputValue}
                onChange={(e) => setModal({ ...modal, inputValue: e.target.value })}
                className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl px-4 py-3 mb-8 outline-none focus:border-[var(--lime)] text-[var(--w)]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    modal.onConfirm?.(modal.inputValue);
                    setModal({ ...modal, isOpen: false });
                  }
                }}
              />
            )}

            <div className="flex justify-end gap-3">
              {(modal.type === 'confirm' || modal.type === 'prompt') && (
                <button 
                  onClick={() => setModal({ ...modal, isOpen: false })}
                  className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] border border-[var(--b1)] text-[var(--w)] hover:bg-[var(--s1)] transition-all"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={() => {
                  if (modal.type === 'prompt') {
                    modal.onConfirm?.(modal.inputValue);
                  } else {
                    modal.onConfirm?.();
                  }
                  setModal({ ...modal, isOpen: false });
                }}
                className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-[var(--lime)] text-[var(--bg)] hover:scale-105 transition-all"
              >
                {modal.type === 'alert' ? 'OK' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
