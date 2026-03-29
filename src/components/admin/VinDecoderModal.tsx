import React, { useState } from 'react';
import { X, Search, Check, AlertTriangle } from 'lucide-react';
import { useLanguageStore } from '../../store/languageStore';
import { translations } from '../../translations';

interface VinDecoderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  carDb?: any;
}

export const VinDecoderModal = ({ isOpen, onClose, onSave, carDb }: VinDecoderModalProps) => {
  const { language } = useLanguageStore();
  const t = (translations[language] as any).admin || {};
  const mainT = translations[language] as any;
  
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [decodedData, setDecodedData] = useState<any>(null);

  const handleDecode = async () => {
    if (!vin || vin.length !== 17) {
      setError('Please enter a valid 17-character VIN');
      return;
    }

    setLoading(true);
    setError('');
    setDecodedData(null);

    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
      const data = await response.json();
      
      if (data.Results && data.Results.length > 0) {
        const result = data.Results[0];
        if (result.ErrorCode && result.ErrorCode !== "0" && !result.ErrorCode.includes("0 -")) {
          setError(`VIN Decode Error: ${result.ErrorText}`);
          return;
        }

        let trim = result.Trim || '';
        if (trim === 'Base' || !trim) {
          trim = result.Series || trim;
        }
        if (result.CabType) {
          trim += ` ${result.CabType}`;
        }
        trim = trim.trim() || 'Base';

        let msrp = 0;
        if (carDb && carDb.makes) {
          const make = carDb.makes.find((m: any) => m.name?.toLowerCase() === result.Make?.toLowerCase());
          if (make && make.models) {
            const model = make.models.find((m: any) => m.name?.toLowerCase() === result.Model?.toLowerCase());
            if (model && model.trims) {
              const trimData = model.trims.find((t: any) => t.name?.toLowerCase() === trim?.toLowerCase());
              if (trimData && trimData.msrp) {
                msrp = trimData.msrp;
              }
            }
          }
        }

        setDecodedData({
          year: parseInt(result.ModelYear) || new Date().getFullYear(),
          make: result.Make,
          model: result.Model,
          trim: trim,
          driveType: result.DriveType || '',
          engine: result.DisplacementL ? `${result.DisplacementL}L ${result.EngineCylinders} Cyl` : '',
          transmission: result.TransmissionStyle || '',
          bodyClass: result.BodyClass || 'Sedan',
          msrp: msrp, // Use MSRP from DB if available
          discount: 0 // Optional discount field
        });
      } else {
        setError('No data found for this VIN');
      }
    } catch (err) {
      console.error('VIN decode error:', err);
      setError('Failed to decode VIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (decodedData) {
      onSave(decodedData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg)] border border-[var(--b1)] p-6 rounded-xl w-full max-w-lg flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-display tracking-widest text-[var(--lime)] uppercase">Create from VIN</h3>
          <button onClick={onClose} className="text-[var(--mu2)] hover:text-[var(--w)]">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
              placeholder="Enter 17-character VIN"
              maxLength={17}
              className="flex-1 bg-[var(--s1)] border border-[var(--b2)] rounded-lg px-4 py-2 text-sm outline-none focus:border-[var(--lime)] uppercase"
            />
            <button
              onClick={handleDecode}
              disabled={loading || vin.length !== 17}
              className="bg-[var(--s2)] border border-[var(--b1)] text-[var(--w)] px-4 py-2 rounded-lg font-bold hover:bg-[var(--b1)] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-[var(--lime)] border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
              Decode
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {decodedData && (
            <div className="space-y-4 bg-[var(--s1)] p-4 rounded-lg border border-[var(--b2)]">
              <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--mu2)] mb-4">Decoded Vehicle Data</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Year</span>
                  <input
                    type="number"
                    value={decodedData.year}
                    onChange={(e) => setDecodedData({...decodedData, year: parseInt(e.target.value)})}
                    className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Make</span>
                  <input
                    type="text"
                    value={decodedData.make}
                    onChange={(e) => setDecodedData({...decodedData, make: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Model</span>
                  <input
                    type="text"
                    value={decodedData.model}
                    onChange={(e) => setDecodedData({...decodedData, model: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Trim</span>
                  <input
                    type="text"
                    value={decodedData.trim}
                    onChange={(e) => setDecodedData({...decodedData, trim: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Drive Type</span>
                  <input
                    type="text"
                    value={decodedData.driveType}
                    onChange={(e) => setDecodedData({...decodedData, driveType: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Body Class</span>
                  <input
                    type="text"
                    value={decodedData.bodyClass}
                    onChange={(e) => setDecodedData({...decodedData, bodyClass: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Engine</span>
                  <input
                    type="text"
                    value={decodedData.engine}
                    onChange={(e) => setDecodedData({...decodedData, engine: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">Transmission</span>
                  <input
                    type="text"
                    value={decodedData.transmission}
                    onChange={(e) => setDecodedData({...decodedData, transmission: e.target.value})}
                    className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">MSRP ($)</span>
                  <input
                    type="number"
                    value={decodedData.msrp}
                    onChange={(e) => setDecodedData({...decodedData, msrp: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mu2)]">{mainT.hunterLeaseDiscount || 'Hunter Lease Discount'} ($)</span>
                  <input
                    type="number"
                    value={decodedData.discount}
                    onChange={(e) => setDecodedData({...decodedData, discount: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[var(--bg)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                    placeholder="Optional"
                  />
                </label>
              </div>

              <button
                onClick={handleSave}
                className="w-full mt-4 bg-[var(--lime)] text-white px-4 py-3 rounded-lg font-bold text-sm hover:bg-[var(--lime)]/90 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Add to Catalog
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
