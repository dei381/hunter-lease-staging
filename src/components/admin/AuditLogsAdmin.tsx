import React, { useState, useEffect } from 'react';
import { Activity, Clock, User, Database } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const AuditLogsAdmin = () => {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;
      try {
        const res = await fetch('/api/admin/audit-logs', {
          headers: {
            'x-user-uid': user.uid
          }
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[var(--s1)] rounded-xl"></div>)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--lime)]" />
          Audit Logs
        </h2>
      </div>

      <div className="bg-[var(--s1)] rounded-2xl border border-[var(--b2)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--s2)] text-[var(--mu2)] uppercase tracking-widest text-[10px]">
            <tr>
              <th className="p-4">Time</th>
              <th className="p-4">User ID</th>
              <th className="p-4">Action</th>
              <th className="p-4">Entity</th>
              <th className="p-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--b2)]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--mu2)]">No audit logs found</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--s2)] transition-colors">
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--mu2)]" />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-[var(--mu2)]">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {log.userId.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="bg-[var(--s2)] px-2 py-1 rounded text-xs font-bold uppercase tracking-widest border border-[var(--b2)]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-[var(--lime)]" />
                      {log.entity}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs font-mono text-[var(--mu2)]" title={log.details}>
                      {log.details || '-'}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
