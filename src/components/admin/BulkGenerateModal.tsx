import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import { getAuthToken } from '../../utils/auth';
import { toast } from 'react-hot-toast';
import { useLanguageStore } from '../../store/languageStore';
import { translations } from '../../translations';

interface BulkGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  carDb: any;
}

export const BulkGenerateModal: React.FC<BulkGenerateModalProps> = ({ isOpen, onClose, onComplete, carDb }) => {
  const { language } = useLanguageStore();
  const t = translations[language].admin;
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTrims, setSelectedTrims] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(0);
  const [expandedBrands, setExpandedBrands] = useState<string[]>([]);
  const [expandedModels, setExpandedModels] = useState<string[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedBrands([]);
      setSelectedTrims([]);
      setProgress(0);
      setTotalToGenerate(0);
      setExpandedBrands([]);
      setExpandedModels([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const makes = carDb?.makes || [];

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) ? prev.filter(id => id !== brandId) : [...prev, brandId]
    );
  };

  const handleSelectAllBrands = () => {
    if (selectedBrands.length === makes.length) {
      setSelectedBrands([]);
    } else {
      setSelectedBrands(makes.map((m: any) => m.id));
    }
  };

  const generateTrimList = () => {
    const trims: any[] = [];
    makes.forEach((make: any) => {
      if (selectedBrands.includes(make.id)) {
        make.models?.forEach((model: any) => {
          model.years?.forEach((year: any) => {
            year.trims?.forEach((trim: any) => {
              const id = `${make.id}|${model.id}|${year.year}|${trim.name}`;
              trims.push({
                id,
                make: make.name,
                model: model.name,
                year: year.year,
                trim: trim.name,
                msrp: trim.msrp || 0,
                baseMF: model.mf || make.baseMF || 0.002,
                baseRV: model.rv36 || 0.60,
                baseAPR: model.baseAPR || make.baseAPR || 6.9
              });
            });
          });
        });
      }
    });
    return trims;
  };

  const handleNextToPreview = () => {
    if (selectedBrands.length === 0) {
      toast.error(t.noBrandsSelected);
      return;
    }
    const allTrims = generateTrimList();
    setSelectedTrims(allTrims.map(t => t.id));
    setExpandedBrands(selectedBrands);
    const allModels = makes.filter((m: any) => selectedBrands.includes(m.id)).flatMap((m: any) => m.models?.map((mod: any) => mod.id) || []);
    setExpandedModels(allModels);
    setStep(2);
  };

  const handleTrimToggle = (trimId: string) => {
    setSelectedTrims(prev => 
      prev.includes(trimId) ? prev.filter(id => id !== trimId) : [...prev, trimId]
    );
  };

  const handleSelectAllTrims = () => {
    const allTrims = generateTrimList();
    if (selectedTrims.length === allTrims.length) {
      setSelectedTrims([]);
    } else {
      setSelectedTrims(allTrims.map(t => t.id));
    }
  };

  const calculateMonthlyPayment = (msrp: number, rv: number, mf: number) => {
    const term = 36;
    const rvAmount = msrp * rv;
    const depreciation = (msrp - rvAmount) / term;
    const rentCharge = (msrp + rvAmount) * mf;
    return Math.round(depreciation + rentCharge);
  };

  const handleGenerate = async () => {
    if (selectedTrims.length === 0) {
      toast.error(t.noTrimsSelected);
      return;
    }

    setStep(3);
    setTotalToGenerate(selectedTrims.length);
    setProgress(0);

    const allTrims = generateTrimList();
    const trimsToGenerate = allTrims.filter(t => selectedTrims.includes(t.id));

    const token = await getAuthToken();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < trimsToGenerate.length; i++) {
      const trimData = trimsToGenerate[i];
      const monthlyPayment = calculateMonthlyPayment(trimData.msrp, trimData.baseRV, trimData.baseMF);

      const payload = {
        financialData: {
          make: trimData.make,
          model: trimData.model,
          trim: trimData.trim,
          year: trimData.year,
          msrp: { value: trimData.msrp, provenance_status: "catalog" },
          sellingPrice: { value: trimData.msrp, provenance_status: "catalog" },
          monthlyPayment: { value: monthlyPayment, provenance_status: "calculated" },
          term: { value: 36, provenance_status: "catalog" },
          mileage: { value: 10000, provenance_status: "catalog" },
          downPayment: { value: 0, provenance_status: "catalog" },
          apr: { value: trimData.baseAPR, provenance_status: "catalog" },
          mf: { value: trimData.baseMF, provenance_status: "catalog" },
          rv: { value: trimData.baseRV * 100, provenance_status: "catalog" },
          type: "lease",
          lenderId: null,
          programId: null,
          incentives: [],
          dealerDiscount: 0
        },
        reviewStatus: "APPROVED",
        publishStatus: "PUBLISHED"
      };

      try {
        const res = await fetch('/api/admin/deals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }

      setProgress(i + 1);
    }

    toast.success(t.generatedSuccessfully.replace('{success}', successCount.toString()).replace('{fail}', failCount.toString()));
    onComplete();
    onClose();
  };

  const toggleBrandExpand = (brandId: string) => {
    setExpandedBrands(prev => prev.includes(brandId) ? prev.filter(id => id !== brandId) : [...prev, brandId]);
  };

  const toggleModelExpand = (modelId: string) => {
    setExpandedModels(prev => prev.includes(modelId) ? prev.filter(id => id !== modelId) : [...prev, modelId]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{t.bulkGenerateTitle}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">{t.step1SelectBrands}</h3>
                <button 
                  onClick={handleSelectAllBrands}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {selectedBrands.length === makes.length ? t.deselectAllTrims : t.selectAll}
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {makes.map((make: any) => (
                  <div 
                    key={make.id}
                    onClick={() => handleBrandToggle(make.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      selectedBrands.includes(make.id) 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span className="font-medium text-slate-900">{make.name}</span>
                    {selectedBrands.includes(make.id) && <Check className="w-5 h-5 text-indigo-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">{t.step2SelectTrims}</h3>
                <button 
                  onClick={handleSelectAllTrims}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {selectedTrims.length === generateTrimList().length ? t.deselectAllTrims : t.selectAll}
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                {makes.filter((m: any) => selectedBrands.includes(m.id)).map((make: any) => (
                  <div key={make.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 bg-slate-100 cursor-pointer"
                      onClick={() => toggleBrandExpand(make.id)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedBrands.includes(make.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-bold text-slate-800">{make.name}</span>
                      </div>
                    </div>
                    
                    {expandedBrands.includes(make.id) && (
                      <div className="p-2 space-y-2">
                        {make.models?.map((model: any) => (
                          <div key={model.id} className="ml-4 border-l-2 border-slate-200 pl-4">
                            <div 
                              className="flex items-center gap-2 py-2 cursor-pointer"
                              onClick={() => toggleModelExpand(model.id)}
                            >
                              {expandedModels.includes(model.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <span className="font-semibold text-slate-700">{model.name}</span>
                            </div>
                            
                            {expandedModels.includes(model.id) && (
                              <div className="ml-6 space-y-1 mt-1">
                                {model.years?.map((year: any) => (
                                  <div key={year.year} className="space-y-1">
                                    <div className="text-xs font-bold text-slate-500 uppercase mt-2 mb-1">{year.year}</div>
                                    {year.trims?.map((trim: any) => {
                                      const trimId = `${make.id}|${model.id}|${year.year}|${trim.name}`;
                                      const isSelected = selectedTrims.includes(trimId);
                                      const monthlyPayment = calculateMonthlyPayment(
                                        trim.msrp || 0, 
                                        model.rv36 || 0.60, 
                                        model.mf || make.baseMF || 0.002
                                      );

                                      return (
                                        <div 
                                          key={trimId}
                                          className={`flex items-center justify-between p-2 rounded-md border ${
                                            isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 opacity-60'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <input 
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => handleTrimToggle(trimId)}
                                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700">{trim.name}</span>
                                          </div>
                                          <div className="flex items-center gap-4 text-sm">
                                            <span className="text-slate-500">MSRP: ${trim.msrp?.toLocaleString() || 0}</span>
                                            <span className="font-bold text-indigo-600">~${monthlyPayment}{t.mo}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900">{t.generatingDeals}</h3>
              </div>
              
              <div className="w-full max-w-md bg-slate-100 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${(progress / totalToGenerate) * 100}%` }}
                />
              </div>
              <div className="text-sm font-medium text-slate-600">
                {progress} / {totalToGenerate} {t.completed}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          {step === 1 && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                {t.close}
              </button>
              <button 
                onClick={handleNextToPreview}
                disabled={selectedBrands.length === 0}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {t.next}
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                {t.back}
              </button>
              <button 
                onClick={handleGenerate}
                disabled={selectedTrims.length === 0}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {t.generateDeals} ({selectedTrims.length})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
