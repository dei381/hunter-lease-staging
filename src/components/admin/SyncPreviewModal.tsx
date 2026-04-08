import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle, AlertTriangle, Car, Building2, Tag } from 'lucide-react';

interface SyncPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (diff: any) => void;
  diff: any;
  isApplying: boolean;
}

export const SyncPreviewModal: React.FC<SyncPreviewModalProps> = ({ isOpen, onClose, onApply, diff, isApplying }) => {
  const [activeTab, setActiveTab] = useState<'cars' | 'dealers' | 'incentives' | 'dealerDiscounts'>('cars');
  const [selectedCars, setSelectedCars] = useState<Set<number>>(new Set());
  const [selectedDealers, setSelectedDealers] = useState<Set<number>>(new Set());
  const [selectedIncentives, setSelectedIncentives] = useState<Set<number>>(new Set());
  const [selectedDealerDiscounts, setSelectedDealerDiscounts] = useState<Set<number>>(new Set());
  const [localCars, setLocalCars] = useState<any[]>([]);
  const [localIncentives, setLocalIncentives] = useState<any[]>([]);
  const [localDealerDiscounts, setLocalDealerDiscounts] = useState<any[]>([]);

  useEffect(() => {
    if (diff) {
      const isArray = Array.isArray(diff);
      const c = isArray ? diff : (diff.cars || []);
      const d = isArray ? [] : (diff.dealers || []);
      const i = isArray ? [] : (diff.incentives || []);
      const dd = isArray ? [] : (diff.dealerDiscounts || []);
      setSelectedCars(new Set(c.map((_: any, idx: number) => idx)));
      setSelectedDealers(new Set(d.map((_: any, idx: number) => idx)));
      setSelectedIncentives(new Set(i.map((_: any, idx: number) => idx)));
      setSelectedDealerDiscounts(new Set(dd.map((_: any, idx: number) => idx)));
      setLocalCars(JSON.parse(JSON.stringify(c)));
      setLocalIncentives(JSON.parse(JSON.stringify(i)));
      setLocalDealerDiscounts(JSON.parse(JSON.stringify(dd)));
    }
  }, [diff]);

  if (!isOpen || !diff) return null;

  // Handle both old array format and new object format
  const isArray = Array.isArray(diff);
  const cars = localCars;
  const dealers = isArray ? [] : (diff.dealers || []);
  const incentives = localIncentives;
  const dealerDiscounts = localDealerDiscounts;

  const totalChanges = cars.length + dealers.length + incentives.length + dealerDiscounts.length;
  const totalSelected = selectedCars.size + selectedDealers.size + selectedIncentives.size + selectedDealerDiscounts.size;

  const handleApply = () => {
    if (isArray) {
      onApply(cars.filter((_: any, i: number) => selectedCars.has(i)));
    } else {
      onApply({
        cars: cars.filter((_: any, i: number) => selectedCars.has(i)),
        dealers: dealers.filter((_: any, i: number) => selectedDealers.has(i)),
        incentives: incentives.filter((_: any, i: number) => selectedIncentives.has(i)),
        dealerDiscounts: dealerDiscounts.filter((_: any, i: number) => selectedDealerDiscounts.has(i))
      });
    }
  };

  const zeroOutCarLeaseCash = (index: number) => {
    const newCars = [...localCars];
    newCars[index].changes.leaseCash.new = 0;
    setLocalCars(newCars);
  };

  const zeroOutIncentive = (index: number) => {
    const newIncentives = [...localIncentives];
    newIncentives[index].amountCents = 0;
    setLocalIncentives(newIncentives);
  };

  const toggleCar = (index: number) => {
    const newSet = new Set(selectedCars);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedCars(newSet);
  };

  const toggleDealer = (index: number) => {
    const newSet = new Set(selectedDealers);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedDealers(newSet);
  };

  const toggleIncentive = (index: number) => {
    const newSet = new Set(selectedIncentives);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIncentives(newSet);
  };

  const toggleAllCars = () => {
    if (selectedCars.size === cars.length) setSelectedCars(new Set());
    else setSelectedCars(new Set(cars.map((_: any, i: number) => i)));
  };

  const toggleAllDealers = () => {
    if (selectedDealers.size === dealers.length) setSelectedDealers(new Set());
    else setSelectedDealers(new Set(dealers.map((_: any, i: number) => i)));
  };

  const toggleAllIncentives = () => {
    if (selectedIncentives.size === incentives.length) setSelectedIncentives(new Set());
    else setSelectedIncentives(new Set(incentives.map((_: any, i: number) => i)));
  };

  const toggleDealerDiscount = (index: number) => {
    const newSet = new Set(selectedDealerDiscounts);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedDealerDiscounts(newSet);
  };

  const toggleAllDealerDiscounts = () => {
    if (selectedDealerDiscounts.size === dealerDiscounts.length) setSelectedDealerDiscounts(new Set());
    else setSelectedDealerDiscounts(new Set(dealerDiscounts.map((_: any, i: number) => i)));
  };

  const zeroOutDealerDiscount = (index: number) => {
    const newDiscounts = [...localDealerDiscounts];
    newDiscounts[index].amount = 0;
    setLocalDealerDiscounts(newDiscounts);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[var(--s1)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-[var(--b1)]"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--b1)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--w)] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Preview API Updates
            </h2>
            <p className="text-sm text-[var(--mu2)] mt-1">Review the changes proposed by the external API before applying them.</p>
          </div>
          <button onClick={onClose} className="text-[var(--mu2)] hover:text-[var(--w)] transition-colors p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        {totalChanges > 0 && !isArray && (
          <div className="flex border-b border-[var(--b1)] bg-[var(--s2)]">
            <button
              onClick={() => setActiveTab('cars')}
              className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'cars' ? 'text-[var(--lime)] border-b-2 border-[var(--lime)]' : 'text-[var(--mu2)] hover:text-[var(--w)]'}`}
            >
              <Car className="w-4 h-4" />
              Car Updates ({cars.length})
            </button>
            <button
              onClick={() => setActiveTab('dealers')}
              className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'dealers' ? 'text-[var(--lime)] border-b-2 border-[var(--lime)]' : 'text-[var(--mu2)] hover:text-[var(--w)]'}`}
            >
              <Building2 className="w-4 h-4" />
              New Dealers ({dealers.length})
            </button>
            <button
              onClick={() => setActiveTab('incentives')}
              className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'incentives' ? 'text-[var(--lime)] border-b-2 border-[var(--lime)]' : 'text-[var(--mu2)] hover:text-[var(--w)]'}`}
            >
              <Tag className="w-4 h-4" />
              New Incentives ({incentives.length})
            </button>
            <button
              onClick={() => setActiveTab('dealerDiscounts')}
              className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'dealerDiscounts' ? 'text-[var(--lime)] border-b-2 border-[var(--lime)]' : 'text-[var(--mu2)] hover:text-[var(--w)]'}`}
            >
              <Tag className="w-4 h-4" />
              Dealer Discounts ({dealerDiscounts.length})
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1">
          {totalChanges === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[var(--w)]">Everything is up to date!</h3>
              <p className="text-[var(--mu2)]">No changes were found between the API and your database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'cars' && (
                cars.length === 0 ? (
                  <p className="text-[var(--mu2)] text-center py-8">No car updates found.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--b1)] text-[var(--mu2)] text-xs uppercase tracking-wider">
                        <th className="p-3 font-medium w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedCars.size === cars.length && cars.length > 0}
                            onChange={toggleAllCars}
                            className="rounded border-[var(--b2)] bg-[var(--s2)] text-[var(--lime)] focus:ring-[var(--lime)]"
                          />
                        </th>
                        <th className="p-3 font-medium">Vehicle</th>
                        <th className="p-3 font-medium">Field</th>
                        <th className="p-3 font-medium text-red-400">Current Value</th>
                        <th className="p-3 font-medium text-green-400">New Value</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {cars.map((item: any, index: number) => (
                        <React.Fragment key={index}>
                          {Object.entries(item.changes).map(([field, values]: [string, any], changeIndex) => (
                            <tr key={`${index}-${changeIndex}`} className="border-b border-[var(--b2)] hover:bg-[var(--s2)] transition-colors">
                              {changeIndex === 0 ? (
                                <td className="p-3" rowSpan={Object.keys(item.changes).length}>
                                  <input 
                                    type="checkbox" 
                                    checked={selectedCars.has(index)}
                                    onChange={() => toggleCar(index)}
                                    className="rounded border-[var(--b2)] bg-[var(--s2)] text-[var(--lime)] focus:ring-[var(--lime)]"
                                  />
                                </td>
                              ) : null}
                              {changeIndex === 0 ? (
                                <td className="p-3 text-[var(--w)]" rowSpan={Object.keys(item.changes).length}>
                                  <span className="font-bold">{item.make} {item.model}</span>
                                  <span className="text-[var(--mu2)] ml-2">{item.trim}</span>
                                  {item.isNew && (
                                    <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase">New</span>
                                  )}
                                </td>
                              ) : null}
                              <td className="p-3 text-[var(--w)] font-mono text-xs uppercase bg-[var(--s2)] rounded px-2 py-1 inline-block mt-2">
                                {field}
                              </td>
                              <td className="p-3 text-red-400 font-mono line-through opacity-80">
                                {item.isNew ? <span className="text-[var(--mu2)] no-underline">—</span> : (field === 'msrp' || field === 'leaseCash' ? `$${values.old.toLocaleString()}` : values.old)}
                              </td>
                              <td className="p-3 text-green-400 font-mono font-bold">
                                <div className="flex items-center gap-2">
                                  {field === 'msrp' || field === 'leaseCash' ? `$${values.new.toLocaleString()}` : values.new}
                                  {field === 'leaseCash' && values.new > 0 && (
                                    <button
                                      onClick={() => zeroOutCarLeaseCash(index)}
                                      className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40 transition-colors"
                                      title="Zero out amount"
                                    >
                                      $0
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'dealers' && (
                dealers.length === 0 ? (
                  <p className="text-[var(--mu2)] text-center py-8">No new dealers found.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--b1)] text-[var(--mu2)] text-xs uppercase tracking-wider">
                        <th className="p-3 font-medium w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedDealers.size === dealers.length && dealers.length > 0}
                            onChange={toggleAllDealers}
                            className="rounded border-[var(--b2)] bg-[var(--s2)] text-[var(--lime)] focus:ring-[var(--lime)]"
                          />
                        </th>
                        <th className="p-3 font-medium">Name</th>
                        <th className="p-3 font-medium">Address</th>
                        <th className="p-3 font-medium">Phone</th>
                        <th className="p-3 font-medium">Website</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {dealers.map((dealer: any, index: number) => (
                        <tr key={index} className="border-b border-[var(--b2)] hover:bg-[var(--s2)] transition-colors">
                          <td className="p-3">
                            <input 
                              type="checkbox" 
                              checked={selectedDealers.has(index)}
                              onChange={() => toggleDealer(index)}
                              className="rounded border-[var(--b2)] bg-[var(--s2)] text-[var(--lime)] focus:ring-[var(--lime)]"
                            />
                          </td>
                          <td className="p-3 text-[var(--w)] font-bold">{dealer.name}</td>
                          <td className="p-3 text-[var(--mu2)]">{dealer.street}, {dealer.city}, {dealer.state} {dealer.zip}</td>
                          <td className="p-3 text-[var(--mu2)]">{dealer.phone}</td>
                          <td className="p-3 text-[var(--mu2)]">
                            {dealer.website && (
                              <a href={dealer.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                Link
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'incentives' && (
                incentives.length === 0 ? (
                  <p className="text-[var(--mu2)] text-center py-8">No new incentives found.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--b1)] text-[var(--mu2)] text-xs uppercase tracking-wider">
                        <th className="p-3 font-medium w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedIncentives.size === incentives.length && incentives.length > 0}
                            onChange={toggleAllIncentives}
                            className="rounded border-[var(--b2)] bg-[var(--s2)] text-[var(--lime)] focus:ring-[var(--lime)]"
                          />
                        </th>
                        <th className="p-3 font-medium">Vehicle</th>
                        <th className="p-3 font-medium">Type</th>
                        <th className="p-3 font-medium">Amount</th>
                        <th className="p-3 font-medium">Applicability</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {incentives.map((incentive: any, index: number) => (
                        <tr key={index} className="border-b border-[var(--b2)] hover:bg-[var(--s2)] transition-colors">
                          <td className="p-3">
                            <input 
                              type="checkbox" 
                              checked={selectedIncentives.has(index)}
                              onChange={() => toggleIncentive(index)}
                              className="rounded border-[var(--b2)] bg-[var(--s2)] text-[var(--lime)] focus:ring-[var(--lime)]"
                            />
                          </td>
                          <td className="p-3 text-[var(--w)] font-bold">{incentive.make} {incentive.model} {incentive.trim}</td>
                          <td className="p-3 text-[var(--mu2)]">
                            <span className="bg-[var(--s2)] px-2 py-1 rounded text-xs uppercase tracking-wider">{incentive.type}</span>
                          </td>
                          <td className="p-3 text-green-400 font-mono font-bold">
                            <div className="flex items-center gap-2">
                              ${(incentive.amountCents / 100).toLocaleString()}
                              {incentive.amountCents > 0 && (
                                <button
                                  onClick={() => zeroOutIncentive(index)}
                                  className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40 transition-colors"
                                  title="Zero out amount"
                                >
                                  $0
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-[var(--mu2)] capitalize">{incentive.dealApplicability}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {activeTab === 'dealerDiscounts' && (
                dealerDiscounts.length === 0 ? (
                  <p className="text-[var(--mu2)] text-center py-8">No new dealer discounts found.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--b1)] text-[var(--mu2)] text-xs uppercase tracking-wider">
                        <th className="p-3 font-medium w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedDealerDiscounts.size === dealerDiscounts.length && dealerDiscounts.length > 0}
                            onChange={toggleAllDealerDiscounts}
                            className="rounded border-[var(--b2)] bg-[var(--s2)] text-[var(--lime)] focus:ring-[var(--lime)]"
                          />
                        </th>
                        <th className="p-3 font-medium">Vehicle</th>
                        <th className="p-3 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {dealerDiscounts.map((discount: any, index: number) => (
                        <tr key={index} className="border-b border-[var(--b2)] hover:bg-[var(--s2)] transition-colors">
                          <td className="p-3">
                            <input 
                              type="checkbox" 
                              checked={selectedDealerDiscounts.has(index)}
                              onChange={() => toggleDealerDiscount(index)}
                              className="rounded border-[var(--b2)] bg-[var(--s2)] text-[var(--lime)] focus:ring-[var(--lime)]"
                            />
                          </td>
                          <td className="p-3 text-[var(--w)] font-bold">{discount.make} {discount.model} {discount.trim}</td>
                          <td className="p-3 text-green-400 font-mono font-bold">
                            <div className="flex items-center gap-2">
                              ${(discount.amount / 100).toLocaleString()}
                              {discount.amount > 0 && (
                                <button
                                  onClick={() => zeroOutDealerDiscount(index)}
                                  className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40 transition-colors"
                                  title="Zero out amount"
                                >
                                  $0
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[var(--b1)] flex justify-end gap-3 bg-[var(--s2)] rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl font-bold text-[var(--w)] hover:bg-[var(--b1)] transition-colors"
          >
            Cancel
          </button>
          {totalChanges > 0 && (
            <button
              onClick={handleApply}
              disabled={isApplying || totalSelected === 0}
              className="px-6 py-2 rounded-xl font-bold bg-[var(--lime)] text-[var(--ink)] hover:bg-opacity-80 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isApplying ? (
                <span className="animate-pulse">Applying...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve & Apply {totalSelected} Updates
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
