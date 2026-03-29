import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Clock, MousePointerClick, Filter, DollarSign, TrendingUp, Download, Building } from 'lucide-react';
import { getAuthToken } from '../utils/auth';

export const AnalyticsAdmin = ({ adminRole }: { adminRole?: string | null }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    uniqueVisitors: 0,
    totalVisits: 0,
    avgDuration: 0,
    topPages: [] as any[],
    events: [] as any[]
  });
  const [businessStats, setBusinessStats] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
    fetchBusinessAnalytics();
  }, []);

  const fetchBusinessAnalytics = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/analytics/business', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBusinessStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch business analytics', error);
    }
  };

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

  const exportToCsv = () => {
    if (!businessStats) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Total Leads,${businessStats.funnel.leads}\n`
      + `Credit Apps,${businessStats.funnel.creditApps}\n`
      + `Closed Deals,${businessStats.funnel.closedDeals}\n`
      + `Total Broker Fee,$${(businessStats.revenue.totalBrokerFee / 100).toFixed(2)}\n`
      + `Total Dealer Reserve,$${(businessStats.revenue.totalDealerReserve / 100).toFixed(2)}\n`
      + `Total Profit,$${(businessStats.revenue.totalProfit / 100).toFixed(2)}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "business_analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading analytics...</div>;

  const funnelData = businessStats ? [
    { name: 'Visitors', value: stats.uniqueVisitors || 1000 }, // Using web visitors or placeholder
    { name: 'Leads', value: businessStats.funnel.leads },
    { name: 'Credit Apps', value: businessStats.funnel.creditApps },
    { name: 'Closed Deals', value: businessStats.funnel.closedDeals },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900">Analytics Overview</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportToCsv} className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button onClick={() => { fetchAnalytics(); fetchBusinessAnalytics(); }} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100">
            Refresh Data
          </button>
        </div>
      </div>

      {businessStats && adminRole !== 'CONTENT_MANAGER' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">${(businessStats.revenue.totalProfit / 100).toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Total Profit</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">${(businessStats.revenue.totalBrokerFee / 100).toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Broker Fees</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Building className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">${(businessStats.revenue.totalDealerReserve / 100).toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Dealer Reserve</p>
          </div>
        </div>
      )}

      {businessStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Conversion Funnel</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Manager KPIs (Closed Leads)</h3>
            <div className="space-y-4">
              {businessStats.kpis.length > 0 ? businessStats.kpis.map((kpi: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-900">{kpi.manager}</span>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
                    {kpi.closedLeads} closed
                  </span>
                </div>
              )) : (
                <p className="text-slate-500 text-center py-8">No closed leads assigned to managers yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

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
          <p className="text-sm text-slate-500 mt-1">Total Pageviews</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.avgDuration}s</p>
          <p className="text-sm text-slate-500 mt-1">Avg. Time on Site</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Top Pages</h3>
          <div className="space-y-4">
            {stats.topPages.map((page, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900 truncate max-w-[200px] sm:max-w-xs">{page.path}</span>
                  <span className="text-xs text-slate-500">Avg. {page.avgDuration}s</span>
                </div>
                <span className="font-bold text-slate-700">{page.views} views</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Events</h3>
          <div className="space-y-4">
            {stats.events.slice(0, 10).map((event, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900">{event.eventName || event.name}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(event.timestamp?.toDate ? event.timestamp.toDate() : event.timestamp).toLocaleString()}
                  </span>
                </div>
                {event.properties && (
                  <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                    {Object.keys(event.properties).length} props
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
