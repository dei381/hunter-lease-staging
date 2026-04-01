import React, { useState, useEffect } from 'react';
import { Calculator, Search, AlertTriangle, CheckCircle2, Copy, FileJson, ChevronDown } from 'lucide-react';
import { getAuthToken } from '../../utils/auth';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { useCarData } from '../../hooks/useCarData';

export function CalculatorAuditAdmin() {
  const [makes, setMakes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [trims, setTrims] = useState<any[]>([]);

  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedTrim, setSelectedTrim] = useState<any>(null);

  const [year, setYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState(36);
  const [mileage, setMileage] = useState(10000);
  const [downPayment, setDownPayment] = useState(0);
  const [creditTier, setCreditTier] = useState('t1');
  const [quoteType, setQuoteType] = useState('LEASE');
  const [expectedPayment, setExpectedPayment] = useState<number | ''>('');
  
  const [trace, setTrace] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: makesData, error: makesError } = useCarData<any[]>('/api/v2/makes');
  const { data: modelsData } = useCarData<any[]>(selectedMake?.id ? `/api/v2/models?makeId=${selectedMake.id}` : null);
  const { data: trimsData } = useCarData<any[]>(selectedModel?.id ? `/api/v2/trims?modelId=${selectedModel.id}` : null);

  useEffect(() => {
    if (makesError) {
      toast.error('Failed to load vehicle database');
    }
    if (makesData) {
      setMakes(makesData);
      if (makesData.length > 0 && !selectedMake) {
        setSelectedMake(makesData[0]);
      }
    }
  }, [makesData, makesError]);

  useEffect(() => {
    if (modelsData) {
      setModels(modelsData);
      if (modelsData.length > 0) {
        if (!selectedModel || selectedModel.makeId !== selectedMake?.id) {
          setSelectedModel(modelsData[0]);
        }
      } else {
        setSelectedModel(null);
        setSelectedTrim(null);
      }
    } else if (!selectedMake?.id) {
      setModels([]);
    }
  }, [modelsData, selectedMake?.id]);

  useEffect(() => {
    if (trimsData) {
      setTrims(trimsData);
      if (trimsData.length > 0) {
        if (!selectedTrim || selectedTrim.modelId !== selectedModel?.id) {
          setSelectedTrim(trimsData[0]);
        }
      } else {
        setSelectedTrim(null);
      }
    } else if (!selectedModel?.id) {
      setTrims([]);
    }
  }, [trimsData, selectedModel?.id]);

  const handleAudit = async () => {
    if (!selectedMake || !selectedModel || !selectedTrim) {
      toast.error('Please select Make, Model, and Trim');
      return;
    }

    setLoading(true);
    setTrace(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/calculator/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          make: selectedMake.name, 
          model: selectedModel.name, 
          trim: selectedTrim.name, 
          year, 
          term, 
          mileage, 
          downPaymentCents: downPayment * 100, 
          creditTier, 
          quoteType
        })
      });

      if (!res.ok) throw new Error('Failed to fetch audit trace');
      const data = await res.json();
      setTrace(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyTrace = () => {
    if (trace) {
      navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
      toast.success('Trace copied to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display">Calculator Audit & Debug</h2>
          <p className="text-[var(--text-secondary)]">Verify and debug lease payment calculations step-by-step.</p>
        </div>
        <button onClick={copyTrace} disabled={!trace} className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:border-[var(--lime)] transition-colors disabled:opacity-50">
          <Copy className="w-4 h-4" />
          Copy Trace
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-lg font-medium mb-4">Input Parameters</h3>
            {makes.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--lime)]"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">Make</label>
                  <div className="relative">
                    <select 
                      value={selectedMake?.id || ''}
                      onChange={(e) => {
                        const make = makes.find((m: any) => m.id === e.target.value);
                        setSelectedMake(make);
                      }}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 appearance-none pr-8"
                    >
                      {makes.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">Model</label>
                  <div className="relative">
                    <select 
                      value={selectedModel?.id || ''}
                      onChange={(e) => {
                        const model = models.find((m: any) => m.id === e.target.value);
                        setSelectedModel(model);
                      }}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 appearance-none pr-8"
                      disabled={models.length === 0}
                    >
                      {models.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">Trim</label>
                  <div className="relative">
                    <select 
                      value={selectedTrim?.id || ''}
                      onChange={(e) => {
                        const trim = trims.find((t: any) => t.id === e.target.value);
                        setSelectedTrim(trim);
                      }}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 appearance-none pr-8"
                      disabled={trims.length === 0}
                    >
                      {trims.map((tr: any) => (
                        <option key={tr.id} value={tr.id}>{tr.name} (${(tr.msrp / 100).toLocaleString()})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Year</label>
                    <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Term (mo)</label>
                    <input type="number" value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Mileage</label>
                    <input type="number" value={mileage} onChange={e => setMileage(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Down Payment</label>
                    <input type="number" value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-[var(--border)]">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Compare vs Expected</label>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Expected Monthly Payment ($)</label>
                    <input type="number" value={expectedPayment} onChange={e => setExpectedPayment(e.target.value ? Number(e.target.value) : '')} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" placeholder="e.g. 548.00" />
                  </div>
                </div>

                <button onClick={handleAudit} disabled={loading || !selectedTrim} className="w-full bg-[var(--lime)] text-black font-medium py-2 rounded-lg hover:bg-[#b3ff00] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                  {loading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Calculator className="w-5 h-5" />}
                  Run Audit
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {trace ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {expectedPayment !== '' && trace.finalPayment > 0 && (
                <div className={`p-6 rounded-xl border ${Math.abs(trace.finalPayment - Number(expectedPayment)) < 1 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <h3 className="text-lg font-medium mb-2 flex items-center justify-between">
                    <span>Comparison Result</span>
                    {Math.abs(trace.finalPayment - Number(expectedPayment)) < 1 ? (
                      <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-5 h-5" /> Match</span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-5 h-5" /> Mismatch</span>
                    )}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-sm text-[var(--text-secondary)]">Expected</div>
                      <div className="text-xl font-mono">${Number(expectedPayment).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--text-secondary)]">Calculated</div>
                      <div className="text-xl font-mono">${trace.finalPayment.toFixed(2)}</div>
                    </div>
                  </div>
                  {Math.abs(trace.finalPayment - Number(expectedPayment)) >= 1 && (
                    <div className="mt-4 text-sm text-red-400">
                      Difference: ${Math.abs(trace.finalPayment - Number(expectedPayment)).toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Формула расчета (Lease Payment Formula)
                </h3>
                <div className="space-y-2 text-sm font-mono bg-black/20 p-4 rounded-lg text-[var(--text-secondary)]">
                  <p>Residual Value = MSRP × Residual %</p>
                  <p>Depreciation Fee = (Adjusted Cap Cost - Residual Value) / Term</p>
                  <p>Finance Fee = (Adjusted Cap Cost + Residual Value) × Money Factor</p>
                  <p>Base Payment = Depreciation Fee + Finance Fee</p>
                  <p>Tax = Base Payment × Tax Rate</p>
                  <p>Final Payment = Base Payment + Tax</p>
                </div>
              </div>
              
              {trace.errors?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                  <h3 className="text-red-500 font-medium flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5" />
                    Что engine придумал сам (Engine Hallucinations / Errors)
                  </h3>
                  <ul className="space-y-2">
                    {trace.errors.map((err: string, i: number) => (
                      <li key={i} className="text-red-400 text-sm">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {trace.warnings?.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
                  <h3 className="text-yellow-500 font-medium flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5" />
                    Warnings
                  </h3>
                  <ul className="space-y-2">
                    {trace.warnings.map((warn: string, i: number) => (
                      <li key={i} className="text-yellow-400 text-sm">{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {trace.integrityChecks?.length > 0 && (
                <div className={`border rounded-xl p-6 ${
                  trace.status === 'TRUSTED' ? 'bg-green-500/10 border-green-500/20' : 
                  trace.status === 'WARNING' ? 'bg-yellow-500/10 border-yellow-500/20' : 
                  'bg-red-500/10 border-red-500/20'
                }`}>
                  <h3 className="text-lg font-medium mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {trace.status === 'TRUSTED' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
                      Integrity Checks
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      trace.status === 'TRUSTED' ? 'bg-green-500/20 text-green-400' : 
                      trace.status === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' : 
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {trace.status}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {trace.integrityChecks.map((check: any, i: number) => (
                      <div key={i} className={`flex items-start gap-3 p-3 bg-black/20 rounded-lg border-l-4 ${
                        check.severity === 'HIGH' ? 'border-red-500' :
                        check.severity === 'MEDIUM' ? 'border-yellow-500' :
                        'border-green-500'
                      }`}>
                        <div className="mt-0.5">
                          {check.status === 'PASS' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : 
                           check.status === 'WARN' ? <AlertTriangle className="w-4 h-4 text-yellow-400" /> : 
                           <AlertTriangle className="w-4 h-4 text-red-400" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{check.name}</div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              check.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                              check.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {check.severity}
                            </span>
                          </div>
                          {check.details && <div className="text-xs text-[var(--text-secondary)] mt-1">{check.details}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center justify-between">
                  <span>Data Sources</span>
                  <span className="text-sm text-[var(--text-secondary)] font-mono">v{trace.formulaVersion}</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                      <tr>
                        <th className="pb-3 font-medium">Variable</th>
                        <th className="pb-3 font-medium">Value</th>
                        <th className="pb-3 font-medium">Source</th>
                        <th className="pb-3 font-medium">Table/Field</th>
                        <th className="pb-3 font-medium">Status / Usage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {trace.variables.map((v: any, i: number) => (
                        <tr key={i} className={v.isFallback || v.source === 'Missing' ? 'bg-red-500/5' : ''}>
                          <td className="py-3 font-medium">
                            {v.name}
                            {v.metadata && (
                              <div className="text-xs text-[var(--text-secondary)] mt-1 flex flex-col gap-0.5">
                                {v.metadata.programId && <span>Program: {v.metadata.programId}</span>}
                                {v.metadata.batchId && <span>Batch: {v.metadata.batchId}</span>}
                                {v.metadata.bank && <span>Bank: {v.metadata.bank}</span>}
                                {v.metadata.tier && <span>Tier: {v.metadata.tier}</span>}
                                {v.metadata.termBucket && <span>Term Bucket: {v.metadata.termBucket}mo</span>}
                                {v.metadata.mileageBucket && <span>Mileage Bucket: {v.metadata.mileageBucket}mi</span>}
                                {v.metadata.appliedIncentives && <span>Applied Incentives: {v.metadata.appliedIncentives.length}</span>}
                                {v.metadata.verifiedByAdmin !== undefined && <span>Verified: {v.metadata.verifiedByAdmin ? 'Yes' : 'No'}</span>}
                                {v.metadata.verifiedAt && <span>Verified At: {new Date(v.metadata.verifiedAt).toLocaleString()}</span>}
                                {v.metadata.modelYear && <span>Model Year: {v.metadata.modelYear}</span>}
                                {v.metadata.trimMatchStatus && <span>Trim Match: {v.metadata.trimMatchStatus}</span>}
                                {v.metadata.totalRulesFound !== undefined && <span>Total Rules Found: {v.metadata.totalRulesFound}</span>}
                                {v.metadata.appliedCount !== undefined && <span>Applied Count: {v.metadata.appliedCount}</span>}
                                {v.metadata.rejectedCount !== undefined && <span>Rejected Count: {v.metadata.rejectedCount}</span>}
                              </div>
                            )}
                          </td>
                          <td className="py-3 font-mono">{v.value !== null ? v.value : 'N/A'}</td>
                          <td className="py-3">{v.source}</td>
                          <td className="py-3 text-[var(--text-secondary)]">{v.sourceTable}.{v.sourceField}</td>
                          <td className="py-3">
                            <div className="flex flex-col gap-1">
                              {v.isFallback ? <span className="text-red-400">Fallback</span> :
                               v.isCalculated ? <span className="text-blue-400">Calculated</span> :
                               <span className="text-green-400">Exact</span>}
                              
                              {v.includedInCalculation === false && <span className="text-yellow-400 text-xs">Not Used in Calc</span>}
                              {v.includedInCapCost && <span className="text-[var(--lime)] text-xs">Capitalized</span>}
                              {v.includedUpfront && <span className="text-[var(--lime)] text-xs">Paid Upfront</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {trace.variables.find((v: any) => v.name === 'Total Rebates')?.metadata?.evaluatedIncentives && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                  <h3 className="text-lg font-medium mb-4">Rebate Eligibility</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                        <tr>
                          <th className="pb-3 font-medium">Incentive</th>
                          <th className="pb-3 font-medium">Type</th>
                          <th className="pb-3 font-medium">Amount</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {trace.variables.find((v: any) => v.name === 'Total Rebates').metadata.evaluatedIncentives.map((inc: any, i: number) => (
                          <tr key={i} className={inc.status === 'REJECTED' ? 'opacity-60' : ''}>
                            <td className="py-3 font-medium">{inc.name}</td>
                            <td className="py-3 capitalize">{inc.type.replace('_', ' ')}</td>
                            <td className="py-3 font-mono">${(inc.amountCents / 100).toFixed(2)}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded text-xs ${inc.status === 'APPLIED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {inc.status}
                              </span>
                            </td>
                            <td className="py-3 text-[var(--text-secondary)]">{inc.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-lg font-medium mb-4">Step-by-Step Calculation</h3>
                <div className="space-y-4">
                  {trace.steps.map((step: any, i: number) => (
                    <div key={i} className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{step.description}</span>
                        <div className="text-right">
                          <span className="font-mono text-[var(--lime)] block">{step.displayResult}</span>
                          <span className="text-xs text-[var(--text-secondary)]">Raw: {step.rawResult} ({step.roundingMode})</span>
                        </div>
                      </div>
                      <div className="text-sm text-[var(--text-secondary)] font-mono bg-black/20 p-2 rounded">
                        {step.formula}
                      </div>
                    </div>
                  ))}
                </div>
                {trace.finalPayment > 0 && (
                  <div className="mt-6 p-4 bg-[var(--lime)]/10 border border-[var(--lime)]/20 rounded-lg flex justify-between items-center">
                    <span className="font-medium text-[var(--lime)]">Final Monthly Payment</span>
                    <span className="text-2xl font-display text-[var(--lime)]">${trace.finalPayment}/mo</span>
                  </div>
                )}
              </div>

            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-[var(--border)] rounded-xl p-12 text-center text-[var(--text-secondary)]">
              <div>
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Enter vehicle parameters and run audit to see the calculation trace.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
