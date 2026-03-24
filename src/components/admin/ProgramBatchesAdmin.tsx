import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, Play, AlertTriangle, FileJson, Clock, Check, X } from 'lucide-react';

export const ProgramBatchesAdmin = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/calculator/batches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch batches');
      setBatches(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportMock = async () => {
    setImporting(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token') || '';
      
      // Generate some mock data for the MVP test
      const mockPrograms = [
        {
          programType: "LEASE",
          make: "Toyota",
          model: "Camry",
          trim: "LE",
          year: 2024,
          term: 36,
          mileage: 10000,
          rv: 0.55,
          mf: 0.00125,
          apr: null,
          rebates: 500
        },
        {
          programType: "FINANCE",
          make: "Toyota",
          model: "Camry",
          trim: "LE",
          year: 2024,
          term: 60,
          mileage: null,
          rv: null,
          mf: null,
          apr: 0.049,
          rebates: 1000
        }
      ];

      const res = await fetch('/api/admin/calculator/batches/import', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ programs: mockPrograms })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Import failed');
      }
      
      await fetchBatches();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleValidate = async (id: string) => {
    setValidating(id);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch(`/api/admin/calculator/batches/${id}/validate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Validation failed');
      }
      
      await fetchBatches();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(null);
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Are you sure you want to publish this batch? This will supersede the currently active batch.')) return;
    
    setPublishing(id);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch(`/api/admin/calculator/batches/${id}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Publish failed');
      }
      
      await fetchBatches();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'DRAFT': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'SUPERSEDED': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Financial Program Batches</h2>
          <p className="text-sm text-[var(--mu2)] mt-1">Manage lease and finance programs imports.</p>
        </div>
        <button 
          onClick={handleImportMock}
          disabled={importing}
          className="flex items-center gap-2 bg-[var(--lime)] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[var(--lime)]/90 transition-colors disabled:opacity-50"
        >
          {importing ? <Clock className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Import Test Batch
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--mu2)]">Loading batches...</div>
      ) : (
        <div className="grid gap-4">
          {batches.length === 0 ? (
            <div className="text-center py-12 text-[var(--mu2)] bg-[var(--s1)] rounded-xl border border-[var(--b2)]">
              No batches found. Import a test batch to get started.
            </div>
          ) : (
            batches.map(batch => (
              <div key={batch.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-mono text-sm font-bold">{batch.id.split('-')[0]}</div>
                    <div className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getStatusColor(batch.status)}`}>
                      {batch.status}
                    </div>
                    {batch.isValid === true && (
                      <div className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                        <Check className="w-3 h-3" /> Valid
                      </div>
                    )}
                    {batch.isValid === false && (
                      <div className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
                        <X className="w-3 h-3" /> Invalid
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-[var(--mu2)] flex items-center gap-4">
                    <span>Imported: {new Date(batch.createdAt).toLocaleString()}</span>
                    <span>Programs: {batch._count?.programs || 0}</span>
                  </div>
                  {batch.validationErrors && (
                    <div className="mt-2 text-xs text-red-400 font-mono bg-red-400/5 p-2 rounded border border-red-400/10">
                      {JSON.stringify(batch.validationErrors)}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {batch.status === 'DRAFT' && (
                    <>
                      <button 
                        onClick={() => handleValidate(batch.id)}
                        disabled={validating === batch.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--s2)] hover:bg-[var(--s2)]/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {validating === batch.id ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Validate
                      </button>
                      
                      <button 
                        onClick={() => handlePublish(batch.id)}
                        disabled={publishing === batch.id || batch.isValid !== true}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--lime)] text-white rounded-lg text-sm font-bold hover:bg-[var(--lime)]/90 transition-colors disabled:opacity-50 disabled:bg-gray-600 disabled:text-gray-300"
                        title={batch.isValid !== true ? "Batch must be validated first" : ""}
                      >
                        {publishing === batch.id ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Publish
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
