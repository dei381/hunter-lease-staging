import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Clock, MousePointerClick, Filter } from 'lucide-react';

export const AnalyticsAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    uniqueVisitors: 0,
    totalVisits: 0,
    avgDuration: 0,
    topPages: [] as any[],
    events: [] as any[]
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch visitors
      const visitorsSnapshot = await getDocs(collection(db, 'analytics_visitors'));
      const uniqueVisitors = visitorsSnapshot.size;

      // Fetch visits (pageviews)
      const visitsSnapshot = await getDocs(query(collection(db, 'visits'), orderBy('timestamp', 'desc'), limit(1000)));
      const visits = visitsSnapshot.docs.map(doc => doc.data());
      const totalVisits = visits.length;

      // Calculate avg duration
      const totalDuration = visits.reduce((acc, visit) => acc + (visit.duration || 0), 0);
      const avgDuration = totalVisits > 0 ? Math.round(totalDuration / totalVisits) : 0;

      // Calculate top pages
      const pageCounts: Record<string, { views: number, duration: number }> = {};
      visits.forEach(visit => {
        const path = visit.path || '/';
        if (!pageCounts[path]) pageCounts[path] = { views: 0, duration: 0 };
        pageCounts[path].views++;
        pageCounts[path].duration += (visit.duration || 0);
      });

      const topPages = Object.entries(pageCounts)
        .map(([path, data]) => ({
          path,
          views: data.views,
          avgDuration: data.views > 0 ? Math.round(data.duration / data.views) : 0
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Fetch events
      const eventsSnapshot = await getDocs(query(collection(db, 'analytics_events'), orderBy('timestamp', 'desc'), limit(100)));
      const events = eventsSnapshot.docs.map(doc => doc.data());

      setStats({
        uniqueVisitors,
        totalVisits,
        avgDuration,
        topPages,
        events
      });
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Analytics Overview</h2>
        <button onClick={fetchAnalytics} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100">
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.uniqueVisitors}</p>
          <p className="text-sm text-slate-500 mt-1">Unique Visitors</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <MousePointerClick className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalVisits}</p>
          <p className="text-sm text-slate-500 mt-1">Total Page Views</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.avgDuration}s</p>
          <p className="text-sm text-slate-500 mt-1">Avg. Time on Page</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Top Pages by Views</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="pb-3 font-medium">Page Path</th>
                  <th className="pb-3 font-medium text-right">Views</th>
                  <th className="pb-3 font-medium text-right">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.topPages.map((page, i) => (
                  <tr key={i}>
                    <td className="py-3 text-slate-900 truncate max-w-[200px]">{page.path}</td>
                    <td className="py-3 text-right font-medium">{page.views}</td>
                    <td className="py-3 text-right text-slate-500">{page.avgDuration}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Events (Funnel)</h3>
          <div className="space-y-4">
            {stats.events.map((ev, i) => (
              <div key={i} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{ev.eventName}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(ev.timestamp?.toDate?.() || Date.now()).toLocaleString()}
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono bg-white px-2 py-1 rounded border border-slate-100">
                  {JSON.stringify(ev.eventData)}
                </div>
              </div>
            ))}
            {stats.events.length === 0 && (
              <p className="text-slate-500 text-center py-4">No events recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
