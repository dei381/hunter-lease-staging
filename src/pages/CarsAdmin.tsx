import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronRight, RefreshCw, Terminal, Database, Copy } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { getAuthToken } from '../utils/auth';
import { VinDecoderModal } from '../components/admin/VinDecoderModal';
import { SyncPreviewModal } from '../components/admin/SyncPreviewModal';
import { toast } from 'react-hot-toast';
import { fetchWithCache, clearClientCache } from '../utils/fetchWithCache';

export const CarsAdmin = () => {
  const { language } = useLanguageStore();
  const t = translations[language].admin;
  const [carDb, setCarDb] = useState<any>(null);
  const [expandedMake, setExpandedMake] = useState<string | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<any | null>(null);
  const [isApplyingSync, setIsApplyingSync] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [debugData, setDebugData] = useState<string | null>(null);
  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
  const [syncReport, setSyncReport] = useState<any[] | null>(null);
  const [isVinModalOpen, setIsVinModalOpen] = useState(false);
  const [syncOptions, setSyncOptions] = useState<{msrp: boolean, mf: boolean, rv: boolean, apr: boolean, rebates: boolean}>(() => {
    const saved = localStorage.getItem('car_sync_options');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      msrp: true,
      mf: true,
      rv: true,
      apr: true,
      rebates: true
    };
  });

  useEffect(() => {
    localStorage.setItem('car_sync_options', JSON.stringify(syncOptions));
  }, [syncOptions]);

  const availableYears = (Array.from(new Set(
    carDb?.makes?.flatMap((m: any) => 
      m.models.flatMap((mod: any) => Array.isArray(mod.years) ? mod.years : [parseInt(mod.years) || new Date().getFullYear()])
    ) || []
  )).filter(y => y && typeof y === 'number' && !isNaN(y)) as number[]).sort((a: any, b: any) => b - a);

  const toggleMakeSelection = (makeName: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedMakes(prev => [...prev, makeName]);
    } else {
      setSelectedMakes(prev => prev.filter(m => m !== makeName));
    }
  };

  const selectAllMakes = (isSelected: boolean) => {
    if (isSelected && carDb?.makes) {
      setSelectedMakes(carDb.makes.map((m: any) => m.name));
    } else {
      setSelectedMakes([]);
    }
  };

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

  const syncExternal = async (makeName?: string | string[], modelName?: string) => {
    let targetMsg = 'for all models';
    if (modelName && typeof makeName === 'string') {
      targetMsg = `for ${makeName} ${modelName}`;
    } else if (typeof makeName === 'string') {
      targetMsg = `for all ${makeName} models`;
    } else if (Array.isArray(makeName) && makeName.length > 0) {
      targetMsg = `for ${makeName.length} selected brands`;
    }

    showConfirm('Preview API Updates', `Are you sure you want to preview updates from the external API ${targetMsg}? No changes will be saved until you approve them.`, async () => {
      setIsSyncing(true);
      try {
        const payload: any = {};
        if (Array.isArray(makeName)) {
          payload.makes = makeName;
        } else if (typeof makeName === 'string') {
          payload.makes = [makeName];
        }
        if (modelName) {
          payload.models = [modelName];
        }
        payload.syncOptions = syncOptions;

        const res = await fetch('/api/admin/sync-external/preview', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${await getAuthToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          setSyncPreview(data.diff || []);
        } else {
          toast.error(`${data.error}${data.details ? '\n\n' + data.details : ''}`);
        }
      } catch (err) {
        console.error('Failed to preview external data', err);
        toast.error('Failed to preview external data. Check console for details.');
      } finally {
        setIsSyncing(false);
      }
    });
  };

  const applySync = async (diff: any) => {
    setIsApplyingSync(true);
    try {
      const res = await fetch('/api/admin/sync-external/apply', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ diff })
      });
      const data = await res.json();
      if (res.ok && data.jobId) {
        toast(`Sync job started. Please wait...`);
        
        // Poll for job status
        const pollJob = async () => {
          try {
            const jobRes = await fetch(`/api/admin/jobs/${data.jobId}`, {
              headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
            });
            const jobData = await jobRes.json();
            
            if (jobData.status === 'completed') {
              toast.success(`Successfully applied ${jobData.result?.appliedCount || 0} updates!`);
              setSyncPreview(null);
              fetchCars();
              setSelectedMakes([]);
              setIsApplyingSync(false);
            } else if (jobData.status === 'failed') {
              toast.error(`Sync failed: ${jobData.error}`);
              setIsApplyingSync(false);
            } else {
              // Still processing, poll again
              setTimeout(pollJob, 2000);
            }
          } catch (e) {
            console.error('Error polling job:', e);
            setIsApplyingSync(false);
          }
        };
        
        pollJob();
      } else if (res.ok) {
        // Fallback if no job ID returned
        toast.success(`Successfully applied ${data.appliedCount} updates!`);
        setSyncPreview(null);
        fetchCars();
        setSelectedMakes([]);
        setIsApplyingSync(false);
      } else {
        toast.error(`${data.error}${data.details ? '\n\n' + data.details : ''}`);
        setIsApplyingSync(false);
      }
    } catch (err) {
      console.error('Failed to apply sync', err);
      toast.error('Failed to apply sync. Check console for details.');
      setIsApplyingSync(false);
    }
  };

  const testApi = async () => {
    setIsTestingApi(true);
    try {
      const res = await fetch('/api/admin/test-marketcheck?make=Toyota&model=Camry', {
        headers: { 
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      const data = await res.json();
      
      if (res.status === 401 && data.error === "Invalid Marketcheck API Key") {
        toast.error("The API key is invalid or unauthorized (401). Please check your MARKETCHECK_API_KEY in the AI Studio Secrets panel.");
      }
      
      setDebugData(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to test API', err);
      toast.error('Failed to test API');
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
            'Authorization': `Bearer ${await getAuthToken()}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          toast.success('The Calculation Engine has been updated with the current data.');
        } else {
          toast.error(data.error);
        }
      } catch (err) {
        console.error('Failed to create snapshot', err);
        toast.error('Failed to create snapshot');
      }
    });
  };

  const syncFromDeals = async () => {
    showConfirm('Sync from Deals', 'This will add missing brands and models from the Deals database into the Car Catalog. Are you sure?', async () => {
      try {
        const res = await fetch('/api/admin/cars/sync-from-deals', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${await getAuthToken()}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message);
          fetchCars();
        } else {
          toast.error(data.error);
        }
      } catch (err) {
        console.error('Failed to sync from deals', err);
        toast.error('Failed to sync from deals');
      }
    });
  };

  const fetchCars = async () => {
    try {
      const data = await fetchWithCache('/api/cars');
      setCarDb(data);
    } catch (err) {
      console.error('Failed to fetch cars', err);
    }
  };

  const saveCars = async (newDb: any) => {
    try {
      const res = await fetch('/api/cars', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(newDb),
      });
      if (!res.ok) throw new Error('Failed to save');
      clearClientCache();
      setCarDb(newDb);
      toast.success('Car database updated successfully');
    } catch (err) {
      console.error('Failed to save cars', err);
      toast.error('Failed to update car database');
    }
  };

  const handleVinSave = (data: any) => {
    const newDb = { ...carDb, makes: [...carDb.makes] };
    
    // Find or create make
    let makeId = data.make?.toLowerCase().replace(/\s+/g, '-');
    let makeIndex = newDb.makes.findIndex((m: any) => m.id === makeId || m.name?.toLowerCase() === data.make?.toLowerCase());
    let make;
    
    if (makeIndex === -1) {
      const defaultTiers = [
        { id: "t1", label: "Tier 1", score: "740+", aprAdd: 0, mfAdd: 0, cls: "r1" },
        { id: "t2", label: "Tier 2", score: "700–739", aprAdd: 1.5, mfAdd: 0.00040, cls: "r2" },
        { id: "t3", label: "Tier 3", score: "660–699", aprAdd: 4.5, mfAdd: 0.00120, cls: "r3" },
        { id: "t4", label: "Tier 4", score: "620–659", aprAdd: 9.0, mfAdd: 0.00240, cls: "r4" }
      ];
      make = { id: makeId, name: data.make, models: [], tiers: defaultTiers, baseMF: 0.002, baseAPR: 6.9 };
      newDb.makes.push(make);
    } else {
      // Deep copy the make to avoid mutating state
      make = JSON.parse(JSON.stringify(newDb.makes[makeIndex]));
      newDb.makes[makeIndex] = make;
      makeId = make.id;
    }

    // Find or create model
    let modelId = data.model?.toLowerCase().replace(/\s+/g, '-');
    let model = make.models.find((m: any) => m.id === modelId || m.name?.toLowerCase() === data.model?.toLowerCase());
    
    if (!model) {
      model = {
        id: modelId, 
        name: data.model, 
        class: data.bodyClass || 'Sedan', 
        msrpRange: '', 
        years: [data.year],
        mf: 0.00150, 
        rv36: 0.60, 
        baseAPR: 4.9, 
        leaseCash: 0,
        trims: []
      };
      make.models.push(model);
    } else {
      modelId = model.id;
      // Add year if not present
      const years = Array.isArray(model.years) ? model.years : [parseInt(model.years) || new Date().getFullYear()];
      if (!years.includes(data.year)) {
        model.years = [...years, data.year].sort((a: number, b: number) => b - a);
      }
    }

    // Find or create trim
    let trim = model.trims.find((t: any) => t.name?.toLowerCase() === data.trim?.toLowerCase());
    if (!trim) {
      trim = { 
        name: data.trim, 
        msrp: data.msrp || 0,
        specs: {
          engine: data.engine || '',
          transmission: data.transmission || ''
        }
      };
      model.trims.push(trim);
    } else {
      if (!trim.specs) trim.specs = {};
      if (data.engine) trim.specs.engine = data.engine;
      if (data.transmission) trim.specs.transmission = data.transmission;
      if (data.msrp && data.msrp > 0) trim.msrp = data.msrp;
    }

    saveCars(newDb);
    setExpandedMake(makeId);
    setExpandedModel(modelId);
    toast.success(`Vehicle ${data.year} ${data.make} ${data.model} ${data.trim} added to catalog.`);
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
        id, name, class: 'Sedan', msrpRange: '$30k - $40k', years: selectedYear === 'all' ? [new Date().getFullYear()] : [selectedYear],
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
    showPrompt(t.trimNamePrompt || 'New Trim Name', '', `${trim.name} (Copy)`, (newName) => {
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
    model.tiersData[tierId][field] = value === '' ? '' : (isNaN(Number(value)) ? 0 : value);
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
        mfAdd: modelTier.mfAdd || 0,
        rv36: trim.rv36 || 0,
        aprAdd: modelTier.aprAdd || 0,
        leaseCash: trim.leaseCash || 0
      };
    }
    trim.tiersData[tierId][field] = value === '' ? '' : (isNaN(Number(value)) ? 0 : value);
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
        tier[field] = value === '' ? '' : (isNaN(Number(value)) ? 0 : value);
        saveCars(newDb);
      }
    }
  };

  const initializeTiers = (makeId: string) => {
    const newDb = { ...carDb };
    const make = newDb.makes.find((m: any) => m.id === makeId);
    if (make && (!make.tiers || make.tiers.length === 0)) {
      make.tiers = [
        { id: "t1", label: "Tier 1", score: "740+", aprAdd: 0, mfAdd: 0, cls: "r1" },
        { id: "t2", label: "Tier 2", score: "700–739", aprAdd: 1.5, mfAdd: 0.00040, cls: "r2" },
        { id: "t3", label: "Tier 3", score: "660–699", aprAdd: 4.5, mfAdd: 0.00120, cls: "r3" },
        { id: "t4", label: "Tier 4", score: "620–659", aprAdd: 9.0, mfAdd: 0.00240, cls: "r4" }
      ];
      saveCars(newDb);
    }
  };

  if (!carDb) return <div className="text-center py-12">{t.loadingCars}</div>;
  
  // Ensure makes array exists
  if (!carDb.makes) {
    carDb.makes = [];
  }

  return (
    <div className="space-y-6">
      <VinDecoderModal 
        isOpen={isVinModalOpen} 
        onClose={() => setIsVinModalOpen(false)} 
        onSave={handleVinSave} 
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-8">
        <h2 className="text-2xl font-display tracking-widest text-[var(--lime)]">{t.carDatabaseCalc}</h2>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={testApi}
            disabled={isTestingApi}
            className="flex items-center gap-2 bg-[var(--s2)] border border-[var(--b1)] text-[var(--w)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--b1)] transition-all disabled:opacity-50"
          >
            <Terminal className={`w-3 h-3 ${isTestingApi ? 'animate-pulse' : ''}`} />
            {isTestingApi ? t.testing : t.testApi}
          </button>
          
          {selectedMakes.length > 0 ? (
            <button 
              onClick={() => syncExternal(selectedMakes)}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-[var(--lime)] text-[var(--ink)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-opacity-80 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? t.syncing : `Sync Selected (${selectedMakes.length})`}
            </button>
          ) : (
            <button 
              onClick={() => syncExternal()}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-[var(--s2)] border border-[var(--b1)] text-[var(--w)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--b1)] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? t.syncing : t.syncWithApi}
            </button>
          )}

          <button 
            onClick={snapshotCalculator}
            className="flex items-center gap-2 bg-[var(--s2)] border border-[var(--b1)] text-[var(--w)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--b1)] transition-all"
            title={t.snapshotDesc}
          >
            <Database className="w-3 h-3" />
            {t.snapshot}
          </button>
          <button 
            onClick={syncFromDeals}
            className="flex items-center gap-2 bg-[var(--s2)] border border-[var(--b1)] text-[var(--w)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--b1)] transition-all"
            title={t.syncFromDealsDesc}
          >
            <RefreshCw className="w-3 h-3" />
            {t.syncDeals}
          </button>
          <div className="flex gap-2 flex-1 md:w-auto">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-[var(--s1)] border border-[var(--b2)] rounded-lg px-4 py-2 text-sm outline-none focus:border-[var(--lime)]"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder={t.searchMakeModel} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-lg px-4 py-2 text-sm outline-none focus:border-[var(--lime)]"
              />
            </div>
          </div>
          <button onClick={addMake} className="bg-[var(--lime)] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[var(--lime)]/90 whitespace-nowrap">
            {t.addManufacturer}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-4 bg-[var(--s1)] border border-[var(--b2)] rounded-xl">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--mu2)]">Fields to Sync:</span>
        {Object.entries(syncOptions).map(([key, value]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={value} 
              onChange={(e) => setSyncOptions(prev => ({ ...prev, [key]: e.target.checked }))}
              className="accent-[var(--lime)] w-4 h-4"
            />
            <span className="text-sm text-[var(--w)] uppercase">{key}</span>
          </label>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-[var(--s1)] border border-[var(--b2)] rounded-xl">
          <input 
            type="checkbox" 
            className="w-4 h-4 accent-[var(--lime)] cursor-pointer"
            checked={carDb.makes.length > 0 && selectedMakes.length === carDb.makes.length}
            onChange={(e) => selectAllMakes(e.target.checked)}
          />
          <span className="font-bold text-sm text-[var(--mu2)] uppercase tracking-widest">Select All Brands</span>
        </div>
        
        {carDb.makes
          .filter((make: any) => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || make.name.toLowerCase().includes(term) || 
                   make.models.some((m: any) => m.name.toLowerCase().includes(term));
            
            const matchesYear = selectedYear === 'all' || make.models.some((m: any) => {
              const years = Array.isArray(m.years) ? m.years : [parseInt(m.years) || new Date().getFullYear()];
              return years.includes(selectedYear);
            });
            
            return matchesSearch && matchesYear;
          })
          .map((make: any, idx: number) => {
            const filteredModels = make.models.filter((m: any) => {
              if (selectedYear === 'all') return true;
              const years = Array.isArray(m.years) ? m.years : [parseInt(m.years) || new Date().getFullYear()];
              return years.includes(selectedYear);
            });
            
            return (
          <div key={`${make.id}-${idx}`} className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--s2)] transition-colors"
              onClick={() => setExpandedMake(expandedMake === make.id ? null : make.id)}
            >
              <div className="flex items-center gap-3 font-bold text-lg">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 accent-[var(--lime)] cursor-pointer"
                  checked={selectedMakes.includes(make.name)}
                  onChange={(e) => toggleMakeSelection(make.name, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
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
                  <h3 className="text-sm font-bold text-[var(--w)] mb-3">{t.brandGlobalSettings}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-widest text-[var(--lime)] font-bold">Global Money Factor (Brand Default)</span>
                      <p className="text-[10px] text-[var(--mu2)] italic">Used if model/trim MF is 0.</p>
                      <input 
                        type="number" 
                        step="0.00001" 
                        value={make.baseMF || 0} 
                        onChange={e => updateMake(make.id, 'baseMF', e.target.value)} 
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
                        onChange={e => updateMake(make.id, 'baseAPR', e.target.value)} 
                        className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" 
                      />
                    </label>
                  </div>
                </div>

                {/* Brand Tiers Configuration */}
                {make.tiers && make.tiers.length > 0 ? (
                  <div className="bg-[var(--s2)] border border-[var(--b1)] rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-bold text-[var(--w)] mb-3">{t.brandTiersConfig}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-widest text-[var(--mu2)] border-b border-[var(--b2)]">
                            <th className="pb-2 font-normal">{t.tier}</th>
                            <th className="pb-2 font-normal">{t.score}</th>
                            <th className="pb-2 font-normal">{t.mfAdd}</th>
                            <th className="pb-2 font-normal">{t.finalMf}</th>
                            <th className="pb-2 font-normal">{t.aprAdd}</th>
                            <th className="pb-2 font-normal">{t.finalApr}</th>
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
                                  onChange={e => updateMakeTier(make.id, t_item.id, 'mfAdd', e.target.value)} 
                                  className="w-full max-w-[120px] bg-[var(--bg)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" 
                                />
                              </td>
                              <td className="py-2 pr-2 text-xs text-[var(--mu2)]">
                                {((Number(make.baseMF) || 0) + (Number(t_item.mfAdd) || 0)).toFixed(5)}
                              </td>
                              <td className="py-2 pr-2">
                                <input 
                                  type="number" 
                                  step="0.1" 
                                  value={t_item.aprAdd} 
                                  onChange={e => updateMakeTier(make.id, t_item.id, 'aprAdd', e.target.value)} 
                                  className="w-full max-w-[120px] bg-[var(--bg)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" 
                                />
                              </td>
                              <td className="py-2 text-xs text-[var(--mu2)]">
                                {((Number(make.baseAPR) || 0) + (Number(t_item.aprAdd) || 0)).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[var(--s2)] border border-[var(--b1)] rounded-lg p-4 mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--w)] mb-1">{t.brandTiersConfig}</h3>
                      <p className="text-xs text-[var(--mu2)]">Tiers are missing for this brand. Initialize them to configure markups.</p>
                    </div>
                    <button 
                      onClick={() => initializeTiers(make.id)}
                      className="bg-[var(--lime)] text-[var(--ink)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-opacity-80 transition-all"
                    >
                      Initialize Tiers
                    </button>
                  </div>
                )}

                <div className="flex justify-end">
                  <button onClick={() => addModel(make.id)} className="text-xs font-bold text-[var(--lime)] hover:text-white px-3 py-1 border border-[var(--lime)]/30 rounded-lg">
                    {t.addModel}
                  </button>
                </div>

                <div className="space-y-4">
                  {filteredModels.map((model: any, idx: number) => (
                    <div key={`${model.id}-${idx}`} className="bg-[var(--s2)] border border-[var(--b1)] rounded-lg overflow-hidden">
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
                                <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Years (comma separated)</span>
                                <input 
                                  type="text" 
                                  value={Array.isArray(model.years) ? model.years.join(', ') : (model.years || '')} 
                                  onChange={e => {
                                    const val = e.target.value;
                                    const parsed = val.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
                                    updateModel(make.id, model.id, 'years', parsed.length > 0 ? parsed : val);
                                  }} 
                                  className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" 
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Image URL</span>
                                <input type="text" value={model.imageUrl || ''} onChange={e => updateModel(make.id, model.id, 'imageUrl', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] uppercase tracking-widest text-[var(--lime)] font-bold">{t.baseMfModelDefault}</span>
                                <p className="text-[10px] text-[var(--mu2)] italic">This is the baseline MF before any tier markups.</p>
                                <input type="number" step="0.00001" value={model.mf || 0} onChange={e => updateModel(make.id, model.id, 'mf', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] uppercase tracking-widest text-[var(--lime)] font-bold">{t.baseRvModelDefault}</span>
                                <p className="text-[10px] text-[var(--mu2)] italic">This is the baseline RV % (e.g. 0.60 for 60%) before any tier markups.</p>
                                <input type="number" step="0.01" value={model.rv36 || 0} onChange={e => updateModel(make.id, model.id, 'rv36', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                              </label>
                            </div>

                            <div className="space-y-6">
                              <h4 className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">{t.modelTierMarkups}</h4>
                              <div className="bg-[var(--bg)] border border-[var(--b2)] rounded-lg p-4">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-sm">
                                    <thead>
                                      <tr className="text-[10px] uppercase tracking-widest text-[var(--mu2)] border-b border-[var(--b2)]">
                                        <th className="pb-2 font-normal">{t.tier}</th>
                                        <th className="pb-2 font-normal">{t.mfAdd}</th>
                                        <th className="pb-2 font-normal">{t.finalMf}</th>
                                        <th className="pb-2 font-normal">{t.aprAdd}</th>
                                        <th className="pb-2 font-normal">{t.finalApr}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(!make.tiers || make.tiers.length === 0) ? (
                                        <tr>
                                          <td colSpan={5} className="py-4 text-center">
                                            <button 
                                              onClick={() => initializeTiers(make.id)}
                                              className="bg-[var(--lime)] text-[var(--ink)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-opacity-80 transition-all"
                                            >
                                              Initialize Tiers
                                            </button>
                                          </td>
                                        </tr>
                                      ) : (
                                        make.tiers.map((t_item: any) => {
                                          const tData = model.tiersData?.[t_item.id] || {
                                            mfAdd: t_item.mfAdd || 0,
                                            aprAdd: t_item.aprAdd || 0
                                          };
                                          return (
                                            <tr key={t_item.id} className="border-b border-[var(--b2)]/50">
                                              <td className="py-2 font-bold text-[var(--w)]">{t_item.label}</td>
                                              <td className="py-2 pr-2">
                                                <input type="number" step="0.00001" value={tData.mfAdd} onChange={e => updateModelTier(make.id, model.id, t_item.id, 'mfAdd', e.target.value)} className="w-full max-w-[120px] bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                              </td>
                                              <td className="py-2 pr-2 text-xs text-[var(--mu2)]">
                                                {((Number(model.mf) || Number(make.baseMF) || 0) + (Number(tData.mfAdd) || 0)).toFixed(5)}
                                              </td>
                                              <td className="py-2 pr-2">
                                                <input type="number" step="0.1" value={tData.aprAdd} onChange={e => updateModelTier(make.id, model.id, t_item.id, 'aprAdd', e.target.value)} className="w-full max-w-[120px] bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                              </td>
                                              <td className="py-2 text-xs text-[var(--mu2)]">
                                                {((Number(model.baseAPR) || Number(make.baseAPR) || 0) + (Number(tData.aprAdd) || 0)).toFixed(2)}%
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <h4 className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">{t.trims}</h4>
                              {model.trims.map((trim: any, idx: number) => (
                                <div key={`${trim.name}-${idx}`} className="bg-[var(--bg)] border border-[var(--b2)] rounded-lg p-4 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-bold text-[var(--w)]">{trim.name}</h5>
                                        {trim.trimId && (
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                const token = await getAuthToken();
                                                const res = await fetch(`/api/v2/catalog/${trim.trimId}/toggle`, {
                                                  method: 'PATCH',
                                                  headers: { Authorization: `Bearer ${token}` }
                                                });
                                                const data = await res.json();
                                                if (res.ok) {
                                                  trim._catalogActive = data.isActive;
                                                  setCarDb({ ...carDb });
                                                  toast.success(`Catalog: ${data.isActive ? 'Active' : 'Hidden'}`);
                                                }
                                              } catch (err) {
                                                toast.error('Toggle failed');
                                              }
                                            }}
                                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition-colors ${
                                              trim._catalogActive === false
                                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                            }`}
                                          >
                                            {trim._catalogActive === false ? '⊘ Hidden' : '● Catalog'}
                                          </button>
                                        )}
                                      </div>
                                      {trim.lastUpdated && (
                                        <span className="text-[8px] text-[var(--mu2)] italic">
                                          Synced: {new Date(trim.lastUpdated).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-4">
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-[var(--lime)] font-bold">{t.baseMf}</span>
                                        <input 
                                          type="number" 
                                          step="0.00001" 
                                          value={trim.mf || 0} 
                                          onChange={e => updateTrim(make.id, model.id, trim.name, 'mf', e.target.value)}
                                          className="bg-transparent border-b border-[var(--b2)] outline-none text-xs w-20"
                                        />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-[var(--lime)] font-bold">{t.baseRv}</span>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={trim.rv36 || 0} 
                                          onChange={e => updateTrim(make.id, model.id, trim.name, 'rv36', e.target.value)}
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
                                          <th className="pb-2 font-normal">{t.mfAdd}</th>
                                          <th className="pb-2 font-normal">{t.finalMf}</th>
                                          <th className="pb-2 font-normal">{t.rv}</th>
                                          <th className="pb-2 font-normal">{t.aprAdd}</th>
                                          <th className="pb-2 font-normal">{t.finalApr}</th>
                                          <th className="pb-2 font-normal">{t.leaseCashDollar}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(!make.tiers || make.tiers.length === 0) ? (
                                          <tr>
                                            <td colSpan={7} className="py-4 text-center">
                                              <button 
                                                onClick={() => initializeTiers(make.id)}
                                                className="bg-[var(--lime)] text-[var(--ink)] px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-opacity-80 transition-all"
                                              >
                                                Initialize Tiers
                                              </button>
                                            </td>
                                          </tr>
                                        ) : (
                                          make.tiers.map((t_item: any) => {
                                            const modelTier = model.tiersData?.[t_item.id] || t_item;
                                            const tData = trim.tiersData?.[t_item.id] || {
                                              mfAdd: modelTier.mfAdd || 0,
                                              rv36: trim.rv36 || 0,
                                              aprAdd: modelTier.aprAdd || 0,
                                              leaseCash: trim.leaseCash || 0
                                            };
                                            
                                            // Backwards compatibility for UI
                                            const baseMfForTrim = Number(trim.mf) || Number(model.mf) || Number(make.baseMF) || 0;
                                            const baseAprForTrim = Number(trim.baseAPR) || Number(trim.apr) || Number(model.baseAPR) || Number(make.baseAPR) || 0;
                                            
                                            const displayMfAdd = tData.mfAdd !== undefined ? tData.mfAdd : (tData.mf !== undefined ? Number(tData.mf) - baseMfForTrim : (modelTier.mfAdd || 0));
                                            const displayAprAdd = tData.aprAdd !== undefined ? tData.aprAdd : (tData.baseAPR !== undefined ? Number(tData.baseAPR) - baseAprForTrim : (modelTier.aprAdd || 0));

                                            return (
                                              <tr key={t_item.id} className="border-b border-[var(--b2)]/50">
                                                <td className="py-2 font-bold text-[var(--w)]">{t_item.label}</td>
                                                <td className="py-2 pr-2">
                                                  <input type="number" step="0.00001" value={displayMfAdd} onChange={e => updateTrimTier(make.id, model.id, trim.name, t_item.id, 'mfAdd', e.target.value)} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                                </td>
                                                <td className="py-2 pr-2 text-xs text-[var(--mu2)]">
                                                  {(baseMfForTrim + (Number(displayMfAdd) || 0)).toFixed(5)}
                                                </td>
                                                <td className="py-2 pr-2">
                                                  <input type="number" step="0.01" value={tData.rv36 !== undefined ? tData.rv36 : (trim.rv36 || 0)} onChange={e => updateTrimTier(make.id, model.id, trim.name, t_item.id, 'rv36', e.target.value)} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                                </td>
                                                <td className="py-2 pr-2">
                                                  <input type="number" step="0.1" value={displayAprAdd} onChange={e => updateTrimTier(make.id, model.id, trim.name, t_item.id, 'aprAdd', e.target.value)} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                                </td>
                                                <td className="py-2 pr-2 text-xs text-[var(--mu2)]">
                                                  {(baseAprForTrim + (Number(displayAprAdd) || 0)).toFixed(2)}%
                                                </td>
                                                <td className="py-2">
                                                  <input type="number" value={tData.leaseCash !== undefined ? tData.leaseCash : (trim.leaseCash || 0)} onChange={e => updateTrimTier(make.id, model.id, trim.name, t_item.id, 'leaseCash', e.target.value)} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--lime)]" />
                                                </td>
                                              </tr>
                                            );
                                          })
                                        )}
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
                                        newDb.makes.find((m:any)=>m.id===make.id).models.find((m:any)=>m.id===model.id).trims[idx].msrp = e.target.value;
                                        saveCars(newDb);
                                      }}
                                      className="w-24 bg-transparent outline-none text-sm text-right" 
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-[var(--mu2)]">Engine</span>
                                    <input 
                                      type="text" 
                                      value={trim.specs?.engine || ''} 
                                      onChange={e => {
                                        const newDb = {...carDb};
                                        const t = newDb.makes.find((m:any)=>m.id===make.id).models.find((m:any)=>m.id===model.id).trims[idx];
                                        if (!t.specs) t.specs = {};
                                        t.specs.engine = e.target.value;
                                        saveCars(newDb);
                                      }}
                                      className="w-24 bg-transparent outline-none text-sm text-right" 
                                      placeholder="Engine"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-[var(--mu2)]">Trans</span>
                                    <input 
                                      type="text" 
                                      value={trim.specs?.transmission || ''} 
                                      onChange={e => {
                                        const newDb = {...carDb};
                                        const t = newDb.makes.find((m:any)=>m.id===make.id).models.find((m:any)=>m.id===model.id).trims[idx];
                                        if (!t.specs) t.specs = {};
                                        t.specs.transmission = e.target.value;
                                        saveCars(newDb);
                                      }}
                                      className="w-24 bg-transparent outline-none text-sm text-right" 
                                      placeholder="Transmission"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => duplicateTrim(make.id, model.id, trim)} 
                                      className="text-[var(--mu2)] hover:text-[var(--lime)] p-1"
                                      title={t.duplicateTrim || 'Duplicate Trim'}
                                    >
                                      <Copy className="w-3 h-3" />
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
          );
        })}
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
                  toast.success('Copied to clipboard!');
                }}
                className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-[var(--lime)] text-[var(--bg)] hover:scale-105 transition-all"
              >
                Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Report Modal */}
      {syncReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[var(--s2)] border border-[var(--b1)] rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-display tracking-widest text-[var(--lime)] uppercase">Sync Report</h3>
              <button onClick={() => setSyncReport(null)} className="text-[var(--mu2)] hover:text-[var(--w)] transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {syncReport.map((item, idx) => (
                <div key={idx} className="bg-[var(--bg)] border border-[var(--b2)] rounded-lg p-4">
                  <h4 className="font-bold text-[var(--w)] mb-2">{item.make} {item.model} - {item.trim}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-[var(--mu2)]">MSRP</span>
                      <div className="flex items-center gap-2">
                        {item.changes.msrp.old !== item.changes.msrp.new && (
                          <span className="line-through text-[var(--mu2)]">${item.changes.msrp.old}</span>
                        )}
                        <span className={item.changes.msrp.old !== item.changes.msrp.new ? "text-[var(--lime)] font-bold" : "text-[var(--w)]"}>${item.changes.msrp.new}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-[var(--mu2)]">MF</span>
                      <div className="flex items-center gap-2">
                        {item.changes.mf.old !== item.changes.mf.new && (
                          <span className="line-through text-[var(--mu2)]">{item.changes.mf.old ?? '-'}</span>
                        )}
                        <span className={item.changes.mf.old !== item.changes.mf.new ? "text-[var(--lime)] font-bold" : "text-[var(--w)]"}>
                          {item.changes.mf.new ?? '-'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-[var(--mu2)]">RV</span>
                      <div className="flex items-center gap-2">
                        {item.changes.rv.old !== item.changes.rv.new && (
                          <span className="line-through text-[var(--mu2)]">{item.changes.rv.old ?? '-'}</span>
                        )}
                        <span className={item.changes.rv.old !== item.changes.rv.new ? "text-[var(--lime)] font-bold" : "text-[var(--w)]"}>
                          {item.changes.rv.new ?? '-'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-[var(--mu2)]">APR</span>
                      <div className="flex items-center gap-2">
                        {item.changes.apr.old !== item.changes.apr.new && (
                          <span className="line-through text-[var(--mu2)]">{item.changes.apr.old != null ? `${item.changes.apr.old}%` : '-'}</span>
                        )}
                        <span className={item.changes.apr.old !== item.changes.apr.new ? "text-[var(--lime)] font-bold" : "text-[var(--w)]"}>
                          {item.changes.apr.new != null ? `${item.changes.apr.new}%` : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-[var(--mu2)]">Rebates</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--lime)] font-bold">${item.changes.rebates.new}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSyncReport(null)}
                className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-[var(--lime)] text-[var(--bg)] hover:scale-105 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {syncPreview !== null && (
        <SyncPreviewModal
          isOpen={true}
          onClose={() => setSyncPreview(null)}
          onApply={applySync}
          diff={syncPreview}
          isApplying={isApplyingSync}
        />
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
