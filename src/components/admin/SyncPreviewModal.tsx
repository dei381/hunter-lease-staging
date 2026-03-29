import React from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

interface SyncPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (diff: any[]) => void;
  diff: any[];
  isApplying: boolean;
}

export const SyncPreviewModal: React.FC<SyncPreviewModalProps> = ({ isOpen, onClose, onApply, diff, isApplying }) => {
  if (!isOpen) return null;

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

        <div className="p-6 overflow-y-auto flex-1">
          {diff.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[var(--w)]">Everything is up to date!</h3>
              <p className="text-[var(--mu2)]">No changes were found between the API and your database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--b1)] text-[var(--mu2)] text-xs uppercase tracking-wider">
                    <th className="p-3 font-medium">Vehicle</th>
                    <th className="p-3 font-medium">Field</th>
                    <th className="p-3 font-medium text-red-400">Current Value</th>
                    <th className="p-3 font-medium text-green-400">New Value</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {diff.map((item, index) => (
                    <React.Fragment key={index}>
                      {Object.entries(item.changes).map(([field, values]: [string, any], changeIndex) => (
                        <tr key={`${index}-${changeIndex}`} className="border-b border-[var(--b2)] hover:bg-[var(--s2)] transition-colors">
                          <td className="p-3 text-[var(--w)]">
                            <span className="font-bold">{item.make} {item.model}</span>
                            <span className="text-[var(--mu2)] ml-2">{item.trim}</span>
                          </td>
                          <td className="p-3 text-[var(--w)] font-mono text-xs uppercase bg-[var(--s2)] rounded px-2 py-1 inline-block mt-2">
                            {field}
                          </td>
                          <td className="p-3 text-red-400 font-mono line-through opacity-80">
                            {field === 'msrp' || field === 'leaseCash' ? `$${values.old.toLocaleString()}` : values.old}
                          </td>
                          <td className="p-3 text-green-400 font-mono font-bold">
                            {field === 'msrp' || field === 'leaseCash' ? `$${values.new.toLocaleString()}` : values.new}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
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
          {diff.length > 0 && (
            <button
              onClick={() => onApply(diff)}
              disabled={isApplying}
              className="px-6 py-2 rounded-xl font-bold bg-[var(--lime)] text-[var(--ink)] hover:bg-opacity-80 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isApplying ? (
                <span className="animate-pulse">Applying...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve & Apply {diff.length} Updates
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
