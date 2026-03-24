import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MediaAdmin } from './MediaAdmin';
import { BanksAdmin } from './BanksAdmin';
import { AnalyticsAdmin } from './AnalyticsAdmin';
import { DragDropUploader } from './DragDropUploader';
import { CarsAdmin } from '../pages/CarsAdmin';
import { ReviewsAdmin } from './ReviewsAdmin';
import { FeedbackAdmin } from './FeedbackAdmin';
import { Activity, Clock, CheckCircle2, AlertTriangle, FileText, ChevronRight, ChevronDown, Key, ExternalLink, Trash2, Plus, Save, Database, Users, Settings, BarChart3, UserCheck, UserX, Mail, LogIn, ShieldCheck, Image as ImageIcon, Star, MessageSquare } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface Deal {
  id: string;
  ingestionId: string;
  reviewStatus: string;
  publishStatus: string;
  createdAt: string;
  financialData: string;
  eligibility: string;
  lenderId?: string;
  isFirstTimeBuyerEligible: boolean;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'deals' | 'leads' | 'cars' | 'users' | 'settings' | 'media' | 'banks' | 'analytics' | 'reviews' | 'feedback'>('overview');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [lenders, setLenders] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    brokerFee: 595,
    taxRateDefault: 8.875,
    supportEmail: 'support@dealengine.ai',
    maintenanceMode: false,
    dmvFee: 400,
    docFee: 85,
    acquisitionFee: 650,
    dispositionFee: 395
  });
  const [loading, setLoading] = useState(true);
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [selectedLenderId, setSelectedLenderId] = useState<string | null>(null);
  const [isFirstTimeBuyerEligible, setIsFirstTimeBuyerEligible] = useState<boolean>(true);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [leadFilter, setLeadFilter] = useState<'all' | 'new' | 'contacted' | 'closed' | 'rejected'>('all');
  const [stats, setStats] = useState<any>({
    totalLeads: 0,
    activeDeals: 0,
    pendingReviews: 0,
    totalUsers: 0,
    recentActivity: []
  });
  const [showLogin, setShowLogin] = useState(!localStorage.getItem('admin_token'));
  const [adminSecret, setAdminSecret] = useState('');
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [carDb, setCarDb] = useState<any>(null);
  const [syncReport, setSyncReport] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmColor?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const { user, role } = useAuthStore();
  const { language } = useLanguageStore();
  const t = translations[language].admin;

  const handleFirebaseLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Firebase login failed:', error);
      alert('Firebase login failed. Please try again.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('admin_token', adminSecret);
    setShowLogin(false);
    window.location.reload(); // Refresh to trigger all fetches with new token
  };

  const checkApiKey = async () => {
    // Check AI Studio environment first
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (hasKey) {
        setHasApiKey(true);
        return;
      }
    }

    // Fallback: Check backend environment variables
    try {
      const response = await fetch('/api/admin/api-key-status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHasApiKey(data.hasKey);
      }
    } catch (error) {
      console.error('Failed to check API key status from backend:', error);
    }
  };

  const handleSelectKey = async () => {
    console.log('Attempting to open select key dialog...');
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        console.log('Select key dialog opened');
        await checkApiKey();
      } catch (err) {
        console.error('Failed to open select key dialog:', err);
        alert('Failed to open select key dialog. Please try again.');
      }
    } else {
      console.warn('window.aistudio is not available');
      alert('This feature is only available within the AI Studio environment.');
    }
  };

  const fetchDeals = async () => {
    try {
      const response = await fetch('/api/admin/deals', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDeals(data);
      }
      
      const carRes = await fetch('/api/cars');
      if (carRes.ok) {
        setCarDb(await carRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch deals or cars:', error);
    } finally {
      if (activeTab === 'deals') setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      if (activeTab === 'leads') setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      if (activeTab === 'users') setLoading(false);
    }
  };

  const fetchLenders = async () => {
    try {
      const response = await fetch('/api/admin/lenders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLenders(data);
      }
    } catch (error) {
      console.error('Failed to fetch lenders:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      if (activeTab === 'settings') setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Fetch visits from Firestore
        try {
          const visitsSnap = await getDocs(collection(db, 'visits'));
          const visits = visitsSnap.docs.map(d => d.data());
          data.totalVisits = visits.length;
          
          const uniquePaths = [...new Set(visits.map(v => v.path))];
          data.visitsByPath = uniquePaths.map(path => ({
            path,
            count: visits.filter(v => v.path === path).length
          })).sort((a, b) => b.count - a.count).slice(0, 10);
        } catch (e) {
          console.warn("Failed to fetch visits from Firestore:", e);
        }

        setStats(data);
      }

      // Fetch sync report
      const syncRes = await fetch('/api/admin/sync-report', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (syncRes.ok) {
        setSyncReport(await syncRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      if (activeTab === 'overview') setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    switch (activeTab) {
      case 'overview': fetchStats(); break;
      case 'deals': 
        fetchDeals(); 
        fetchLenders();
        break;
      case 'leads': fetchLeads(); break;
      case 'users': fetchUsers(); break;
      case 'settings': fetchSettings(); break;
      case 'cars': setLoading(false); break;
      case 'media': setLoading(false); break;
    }
    checkApiKey();
  }, [activeTab]);

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      const response = await fetch(`/api/lead/${leadId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchLeads();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to update lead status:', error);
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/lead/${leadId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (response.ok) {
        fetchLeads();
        fetchStats();
      } else {
        const err = await response.text();
        alert(`Failed to delete lead: ${err}`);
      }
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const exportLeads = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "leads_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        alert('Settings saved successfully!');
      } else {
        const err = await response.text();
        alert(`Failed to save settings: ${err}`);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleUploadSuccess = (dealId: string) => {
    fetchDeals();
  };

  const handleFieldChange = (key: string, value: any) => {
    setEditingData((prev: any) => {
      const currentField = prev[key];
      if (typeof currentField === 'object' && currentField !== null && 'value' in currentField) {
        return {
          ...prev,
          [key]: {
            ...currentField,
            value: typeof currentField.value === 'number' ? parseFloat(value) || 0 : value
          }
        };
      } else {
        return {
          ...prev,
          [key]: value
        };
      }
    });
  };

  const handleAddField = () => {
    const fieldName = prompt('Enter field name (e.g. money_factor, residual_value):');
    if (!fieldName) return;
    
    const isNumeric = confirm('Is this a numeric field?');
    
    setEditingData({
      ...editingData,
      [fieldName]: isNumeric 
        ? { value: 0, provenance_status: 'manual' }
        : ''
    });
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
      await fetch(`/api/admin/deals/${dealId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      fetchDeals();
    } catch (error) {
      console.error('Failed to delete deal:', error);
    }
  };

  const handleCreateManualDeal = async () => {
    try {
      const response = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          financialData: {
            make: 'New',
            model: 'Vehicle',
            trim: 'Base',
            msrp: { value: 0, provenance_status: 'manual' },
            monthlyPayment: { value: 0, provenance_status: 'manual' },
            term: { value: 36, provenance_status: 'manual' }
          },
          reviewStatus: 'NEEDS_REVIEW',
          publishStatus: 'DRAFT'
        })
      });
      if (response.ok) {
        alert('Manual deal created successfully!');
        fetchDeals();
        fetchStats();
      } else {
        const err = await response.text();
        alert(`Failed to create manual deal: ${err}`);
      }
    } catch (error) {
      console.error('Failed to create manual deal:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSyncDeals = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Sync Deals',
      message: 'This will import all static deals from the code into the database. Existing deals with same IDs will be updated. Continue?',
      confirmText: 'Sync Now',
      confirmColor: 'bg-indigo-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          const response = await fetch('/api/admin/deals/sync', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
          });
          if (response.ok) {
            const result = await response.json();
            alert(`Sync complete! Created: ${result.createdCount}, Updated: ${result.updatedCount}`);
            fetchDeals();
            fetchStats();
          } else {
            const err = await response.text();
            alert(`Sync failed: ${err}`);
          }
        } catch (error) {
          console.error('Failed to sync deals:', error);
          alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDuplicateDeal = async (deal: Deal) => {
    try {
      const financialData = JSON.parse(deal.financialData);
      const response = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          financialData,
          reviewStatus: 'NEEDS_REVIEW',
          publishStatus: 'DRAFT',
          lenderId: deal.lenderId,
          isFirstTimeBuyerEligible: deal.isFirstTimeBuyerEligible
        })
      });
      if (response.ok) {
        fetchDeals();
      }
    } catch (error) {
      console.error('Failed to duplicate deal:', error);
    }
  };

  const handleBulkDeleteDeals = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Deals',
      message: `Are you sure you want to delete ${selectedDeals.length} deals? This action cannot be undone.`,
      confirmText: 'Delete All',
      confirmColor: 'bg-red-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          await Promise.all(selectedDeals.map(id => 
            fetch(`/api/admin/deals/${id}`, { 
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
            })
          ));
          setSelectedDeals([]);
          fetchDeals();
          fetchStats();
          alert('Selected deals deleted successfully');
        } catch (error) {
          console.error('Failed to delete deals:', error);
          alert('Failed to delete some deals');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleBulkUpdateDealsStatus = async (status: string) => {
    try {
      setLoading(true);
      await Promise.all(selectedDeals.map(id => 
        fetch(`/api/admin/deals/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
          },
          body: JSON.stringify({
            reviewStatus: status,
            publishStatus: status === 'APPROVED' ? 'PUBLISHED' : 'DRAFT'
          })
        })
      ));
      setSelectedDeals([]);
      fetchDeals();
    } catch (error) {
      console.error('Failed to update deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteLeads = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Leads',
      message: `Are you sure you want to delete ${selectedLeads.length} leads? This action cannot be undone.`,
      confirmText: 'Delete All',
      confirmColor: 'bg-red-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          await Promise.all(selectedLeads.map(id => 
            fetch(`/api/lead/${id}`, { 
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
            })
          ));
          setSelectedLeads([]);
          fetchLeads();
          fetchStats();
          alert('Selected leads deleted successfully');
        } catch (error) {
          console.error('Failed to delete leads:', error);
          alert('Failed to delete some leads');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleBulkUpdateLeadsStatus = async (status: string) => {
    try {
      setLoading(true);
      await Promise.all(selectedLeads.map(id => 
        fetch(`/api/lead/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
          },
          body: JSON.stringify({ status })
        })
      ));
      setSelectedLeads([]);
      fetchLeads();
      fetchStats();
    } catch (error) {
      console.error('Failed to update leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeal = async (dealId: string, status: string) => {
    try {
      await fetch(`/api/admin/deals/${dealId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          financialData: editingData,
          reviewStatus: status,
          publishStatus: status === 'APPROVED' ? 'PUBLISHED' : 'DRAFT',
          lenderId: selectedLenderId,
          isFirstTimeBuyerEligible: isFirstTimeBuyerEligible
        })
      });
      fetchDeals();
      setExpandedDealId(null);
      setEditingData(null);
    } catch (error) {
      console.error('Failed to update deal:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 mr-1" /> {t.needsReview}
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {t.approved}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" /> {t.rejected}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  if (showLogin) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-3 bg-indigo-50 rounded-2xl mb-4">
              <Settings className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{t.adminAccess}</h2>
            <p className="text-slate-500 mt-2">{t.enterSecret}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.adminSecret}</label>
              <input 
                type="password" 
                value={adminSecret}
                onChange={e => setAdminSecret(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder={t.enterSecret}
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
            >
              {t.login}
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              Please enter the admin secret configured in your environment variables.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                {t.dashboard}
              </h1>
              {!user && (
                <button 
                  onClick={handleFirebaseLogin}
                  className="flex items-center space-x-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors ml-4"
                >
                  <LogIn className="w-3 h-3" />
                  <span>{t.loginWithGoogle}</span>
                </button>
              )}
              {user && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold ml-4">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Firebase: {user.email}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectKey}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  hasApiKey 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>{hasApiKey ? t.verified11Key : t.selectLender}</span>
              </button>
              <div className="text-sm text-slate-500">
                System Status: <span className="text-emerald-600 font-medium">{t.active}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* API Key Notice */}
        {!hasApiKey && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start space-x-4">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Key className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-indigo-900">Paid API Key Recommended</h3>
              <p className="text-xs text-indigo-700 mt-1">
                Для стабильной работы извлечения данных рекомендуется выбрать платный API ключ. 
                Это поможет избежать ограничений по квоте (Unexpected Error).
              </p>
              <div className="mt-3 flex items-center space-x-4">
                <button
                  onClick={handleSelectKey}
                  className="text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {t.selectLender}
                </button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500 flex items-center"
                >
                  Документация по биллингу <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t.overview}</span>
            </button>
            <button
              onClick={() => setActiveTab('deals')}
              className={`${
                activeTab === 'deals'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.deals}</span>
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`${
                activeTab === 'leads'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Activity className="w-4 h-4" />
              <span>{t.leads}</span>
            </button>
            <button
              onClick={() => setActiveTab('cars')}
              className={`${
                activeTab === 'cars'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Database className="w-4 h-4" />
              <span>{t.cars}</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Users className="w-4 h-4" />
              <span>{t.users}</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Settings className="w-4 h-4" />
              <span>{t.settings}</span>
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`${
                activeTab === 'media'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>{translations[language].admin.mediaLibrary || 'Media Library'}</span>
            </button>
            <button
              onClick={() => setActiveTab('banks')}
              className={`${
                activeTab === 'banks'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Database className="w-4 h-4" />
              <span>{t.banks}</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`${
                activeTab === 'analytics'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t.analytics}</span>
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`${
                activeTab === 'reviews'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Star className="w-4 h-4" />
              <span>{t.reviews}</span>
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`${
                activeTab === 'feedback'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t.feedback}</span>
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Activity className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{t.allTime}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalLeads}</p>
                <p className="text-sm text-slate-500">{t.totalLeads}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{t.live}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.activeDeals}</p>
                <p className="text-sm text-slate-500">{t.activeDeals}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">Analytics</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalVisits || 0}</p>
                <p className="text-sm text-slate-500">Total Visits</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{t.registered}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
                <p className="text-sm text-slate-500">{t.users}</p>
              </div>
            </div>

            {/* Marketcheck Auto-Sync Status */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Marketcheck Auto-Sync Status</h3>
                </div>
                {syncReport?.isSyncing ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                    <Activity className="w-3 h-3 mr-1" /> Syncing...
                  </span>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    syncReport?.report?.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {syncReport?.report?.status === 'success' ? 'Healthy' : 'Sync Required'}
                  </span>
                )}
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Last Global Sync</p>
                  <p className="text-sm font-bold text-slate-900">
                    {syncReport?.lastSync ? new Date(syncReport.lastSync).toLocaleString() : 'Never'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Next scheduled sync: {syncReport?.nextSync ? new Date(syncReport.nextSync).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Sync Performance</p>
                  {syncReport?.report?.stats ? (
                    <div className="space-y-1">
                      <p className="text-sm text-slate-700">
                        <span className="font-bold">{syncReport.report.stats.updatedModelsCount}</span> models updated
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-bold">{syncReport.report.stats.updatedTrimsCount}</span> trims updated
                      </p>
                      <p className="text-xs text-slate-400">
                        {syncReport.report.stats.requestCount} API requests used
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No recent sync stats available</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Status Message</p>
                  <p className={`text-sm ${syncReport?.report?.status === 'error' ? 'text-red-600 font-medium' : 'text-slate-700'}`}>
                    {syncReport?.report?.message || 'Waiting for first sync...'}
                  </p>
                  {syncReport?.report?.stats?.errors?.length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 rounded border border-red-100">
                      <p className="text-[10px] font-bold text-red-700 mb-1">Recent Errors:</p>
                      <ul className="text-[10px] text-red-600 list-disc pl-3 space-y-0.5">
                        {syncReport.report.stats.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <p className="text-[10px] text-slate-500 max-w-md">
                  Auto-sync runs every 15 days on server startup. It fetches the latest MSRP, rebates, and finance data from Marketcheck.
                </p>
                <button 
                  onClick={async () => {
                    if (confirm('Manually trigger a full sync? This will use about 480 API requests.')) {
                      try {
                        const res = await fetch('/api/admin/sync-external', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
                        });
                        if (res.ok) {
                          alert('Sync started in background. Refresh in a few minutes.');
                          fetchStats();
                        }
                      } catch (e) {
                        alert('Failed to trigger sync');
                      }
                    }
                  }}
                  disabled={syncReport?.isSyncing}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                >
                  Trigger Manual Sync
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{t.recentActivity}</h3>
                  <Activity className="w-4 h-4 text-slate-400" />
                </div>
                <div className="divide-y divide-slate-200">
                  {stats.recentActivity.map((activity: any) => (
                    <div key={activity.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-50 rounded-full">
                          <UserCheck className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {t.newLeadFrom} <span className="font-bold">{activity.clientName}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            Status: <span className="capitalize">{activity.status}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(activity.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {stats.recentActivity.length === 0 && (
                    <div className="px-6 py-8 text-center text-slate-500 text-sm">
                      {t.noRecentActivity}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Visits Visualization</h3>
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="p-6 h-80">
                  {stats.visitsByPath && stats.visitsByPath.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.visitsByPath}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="path" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fill: '#64748b' }}
                        />
                        <YAxis 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tick={{ fill: '#64748b' }}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {stats.visitsByPath.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#818cf8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      No data to visualize
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Top Visited Pages</h3>
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="divide-y divide-slate-200">
                  {stats.visitsByPath?.map((v: any, i: number) => (
                    <div key={i} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-xs font-bold text-slate-400 w-4">{i + 1}</div>
                        <p className="text-sm font-medium text-slate-900 font-mono">{v.path}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500" 
                            style={{ width: `${(v.count / stats.totalVisits) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-900">{v.count}</span>
                      </div>
                    </div>
                  ))}
                  {(!stats.visitsByPath || stats.visitsByPath.length === 0) && (
                    <div className="px-6 py-8 text-center text-slate-500 text-sm">
                      No visit data collected yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deals' && (
          <>
            {/* Ingestion Section */}
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">{t.ingestNewOffer}</h2>
                <p className="text-sm text-slate-500">{t.ingestDesc}</p>
              </div>
              <DragDropUploader onUploadSuccess={handleUploadSuccess} />
            </section>

            {/* Queue Section */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{t.inventoryQueue}</h2>
                  <p className="text-sm text-slate-500">{t.manageDeals}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleSyncDeals}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-100"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{t.syncStaticDeals}</span>
                  </button>
                  <button 
                    onClick={handleCreateManualDeal}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.createManualOffer}</span>
                  </button>
                  <button 
                    onClick={fetchDeals}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {t.refresh}
                  </button>
                </div>
              </div>

              <div className="mb-6 flex flex-col space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Activity className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder={t.searchDealsPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {selectedDeals.length > 0 && (
                  <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-indigo-900">{selectedDeals.length} {t.dealsSelected}</span>
                      <button 
                        onClick={() => setSelectedDeals([])}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        {t.deselectAll}
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBulkUpdateDealsStatus('APPROVED')}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                      >
                        {t.approveAll}
                      </button>
                      <button
                        onClick={() => handleBulkUpdateDealsStatus('REJECTED')}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors"
                      >
                        {t.rejectAll}
                      </button>
                      <button
                        onClick={handleBulkDeleteDeals}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                      >
                        {t.deleteAll}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center text-slate-500">{t.loadingDeals}</div>
                ) : deals.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">{t.noDealsFound}</h3>
                    <p className="mt-1 text-sm text-slate-500">{t.uploadOfferToStart}</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {deals
                      .filter(deal => {
                        if (!searchTerm) return true;
                        const data = deal.financialData ? JSON.parse(deal.financialData) : {};
                        const searchStr = `${deal.ingestionId} ${data.make || ''} ${data.model || ''} ${data.trim || ''}`.toLowerCase();
                        return searchStr.includes(searchTerm.toLowerCase());
                      })
                      .map((deal) => (
                        <li key={deal.id} className={`hover:bg-slate-50 transition-colors ${selectedDeals.includes(deal.id) ? 'bg-indigo-50/50' : ''}`}>
                          <div className="flex items-center px-6">
                            <input 
                              type="checkbox"
                              checked={selectedDeals.includes(deal.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDeals([...selectedDeals, deal.id]);
                                } else {
                                  setSelectedDeals(selectedDeals.filter(id => id !== deal.id));
                                }
                              }}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                            />
                            <div 
                              className="flex-1 py-4 flex items-center justify-between cursor-pointer ml-4"
                              onClick={() => {
                                if (expandedDealId === deal.id) {
                                  setExpandedDealId(null);
                                  setEditingData(null);
                                  setSelectedLenderId(null);
                                } else {
                                  setExpandedDealId(deal.id);
                                  const data = deal.financialData ? JSON.parse(deal.financialData) : {};
                                  // Ensure new fields exist
                                  if (!data.hunterDiscount) data.hunterDiscount = { value: 0, provenance_status: 'unresolved', disclosure_required: false, isGlobal: true };
                                  if (!data.manufacturerRebate) data.manufacturerRebate = { value: 0, provenance_status: 'unresolved', disclosure_required: false, isGlobal: true };
                                  setEditingData(data);
                                  setSelectedLenderId(deal.lenderId || null);
                                  setIsFirstTimeBuyerEligible(deal.isFirstTimeBuyerEligible);
                                }
                              }}
                            >
                              <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                    <FileText className="h-5 w-5 text-indigo-600" />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <p className="text-sm font-medium text-slate-900">
                                      {deal.ingestionId}
                                    </p>
                                    {deal.financialData && (
                                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                        {JSON.parse(deal.financialData).make} {JSON.parse(deal.financialData).model}
                                      </span>
                                    )}
                                    {deal.publishStatus === 'PUBLISHED' && (
                                      <a 
                                        href={`/deals?id=${deal.id}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-indigo-600 hover:text-indigo-800"
                                        title="View on site"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {t.ingested} {new Date(deal.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-6">
                                <div className="flex flex-col items-end space-y-1">
                                  {getStatusBadge(deal.reviewStatus)}
                                  <span className="text-xs text-slate-500 font-mono">
                                    {t.publish}: {deal.publishStatus}
                                  </span>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateDeal(deal);
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                  title={t.duplicateDeal}
                                >
                                  <Plus className="h-5 w-5" />
                                </button>
                                <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                                  {expandedDealId === deal.id ? (
                                    <ChevronDown className="h-5 w-5" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5" />
                                  )}
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDeal(deal.id);
                                  }}
                                  className="text-slate-300 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        
                        {/* Expanded Details - Moderator Form */}
                        {expandedDealId === deal.id && editingData && (
                          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900">{t.dataExtractionReview}</h4>
                                <span className="text-xs text-slate-500">{t.extractionReviewDesc}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-mono text-slate-500 block">{t.eligibilityStatus}:</span>
                                <span className={`text-xs font-bold ${JSON.parse(deal.eligibility || '{}').is_publishable ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {JSON.parse(deal.eligibility || '{}').is_publishable ? t.publishable : t.blocked}
                                </span>
                              </div>
                            </div>

                            {JSON.parse(deal.eligibility || '{}').blocking_reasons?.length > 0 && (
                              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                                <h5 className="text-sm font-bold text-red-800 mb-2">{t.blockingReasons}</h5>
                                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                                  {JSON.parse(deal.eligibility || '{}').blocking_reasons.map((reason: string, idx: number) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                              <div>
                                <label className="block text-xs font-bold text-indigo-900 uppercase mb-2">
                                  {t.lenderBank}
                                </label>
                                <select
                                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                  value={selectedLenderId || ''}
                                  onChange={(e) => setSelectedLenderId(e.target.value || null)}
                                >
                                  <option value="">{t.defaultCaptive}</option>
                                  {lenders.map(lender => (
                                      <option key={lender.id} value={lender.id}>
                                        {lender.name} {lender.isFirstTimeBuyerFriendly ? `(${t.ftbFriendly})` : ''}
                                      </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-indigo-900 uppercase mb-2">
                                  {t.ftbEligibility}
                                </label>
                                <div className="flex items-center space-x-4 mt-2">
                                  <button
                                    onClick={() => setIsFirstTimeBuyerEligible(true)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                      isFirstTimeBuyerEligible 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {t.eligible}
                                  </button>
                                  <button
                                    onClick={() => setIsFirstTimeBuyerEligible(false)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                      !isFirstTimeBuyerEligible 
                                        ? 'bg-red-600 text-white shadow-sm' 
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {t.notEligible}
                                  </button>
                                </div>
                                <p className="text-[10px] text-indigo-600 mt-2 italic">
                                  {t.ftbEligibilityDesc}
                                </p>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-indigo-900 uppercase mb-2">
                                  Image URL
                                </label>
                                <p className="text-[10px] text-slate-500 mb-2">
                                  Вы можете использовать внешнюю ссылку или загрузить фото в <strong>Библиотеку медиа</strong> и скопировать путь (например, /uploads/cars/filename.png).
                                </p>
                                <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    value={editingData.image || ''} 
                                    onChange={e => handleFieldChange('image', e.target.value)}
                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="https://images.unsplash.com/..."
                                  />
                                  <button 
                                    onClick={async () => {
                                      if (!editingData.make || !editingData.model) {
                                        alert('Please enter Make and Model first');
                                        return;
                                      }
                                      try {
                                        const res = await fetch('/api/cars');
                                        const carDb = await res.json();
                                        const make = carDb.makes.find((m: any) => m.name.toLowerCase() === editingData.make.toLowerCase());
                                        if (make) {
                                          const model = make.models.find((m: any) => 
                                            editingData.model.toLowerCase().includes(m.name.toLowerCase()) || 
                                            m.name.toLowerCase().includes(editingData.model.toLowerCase())
                                          );
                                          if (model && model.imageUrl) {
                                            handleFieldChange('image', model.imageUrl);
                                          } else {
                                            alert('No image found for this model in database');
                                          }
                                        } else {
                                          alert('Manufacturer not found in database');
                                        }
                                      } catch (err) {
                                        console.error('Failed to fetch car image', err);
                                      }
                                    }}
                                    className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                                  >
                                    Fetch
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              {Object.entries(editingData).map(([key, data]: [string, any]) => {
                                if (key === 'image') return null; // Handled above
                                
                                if (typeof data === 'string' || typeof data === 'number') {
                                  let inputElement = (
                                    <input
                                      type={typeof data === 'number' ? 'number' : 'text'}
                                      className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                      value={data}
                                      onChange={(e) => handleFieldChange(key, e.target.value)}
                                    />
                                  );

                                  if (carDb && (key === 'make' || key === 'model' || key === 'trim')) {
                                    if (key === 'make') {
                                      inputElement = (
                                        <select
                                          className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                          value={data}
                                          onChange={(e) => handleFieldChange(key, e.target.value)}
                                        >
                                          <option value="">Select Make</option>
                                          {carDb.makes.map((m: any) => <option key={m.name} value={m.name}>{m.name}</option>)}
                                        </select>
                                      );
                                    } else if (key === 'model' && editingData.make) {
                                      const makeObj = carDb.makes.find((m: any) => m.name.toLowerCase() === editingData.make.toLowerCase());
                                      if (makeObj) {
                                        inputElement = (
                                          <select
                                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                            value={data}
                                            onChange={(e) => handleFieldChange(key, e.target.value)}
                                          >
                                            <option value="">Select Model</option>
                                            {makeObj.models.map((m: any) => <option key={m.name} value={m.name}>{m.name}</option>)}
                                          </select>
                                        );
                                      }
                                    } else if (key === 'trim' && editingData.make && editingData.model) {
                                      const makeObj = carDb.makes.find((m: any) => m.name.toLowerCase() === editingData.make.toLowerCase());
                                      const modelObj = makeObj?.models.find((m: any) => m.name.toLowerCase() === editingData.model.toLowerCase());
                                      if (modelObj) {
                                        inputElement = (
                                          <select
                                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                                            value={data}
                                            onChange={(e) => {
                                              handleFieldChange(key, e.target.value);
                                              const trimObj = modelObj.trims.find((t: any) => t.name === e.target.value);
                                              if (trimObj) {
                                                if (trimObj.msrp) handleFieldChange('msrp', trimObj.msrp);
                                                if (trimObj.mf) handleFieldChange('moneyFactor', trimObj.mf);
                                                if (trimObj.rv36) handleFieldChange('residualValue', trimObj.rv36);
                                                if (trimObj.leaseCash) handleFieldChange('manufacturerRebate', trimObj.leaseCash);
                                                // Default hunter discount could be 5-10% for a "good" deal
                                              }
                                            }}
                                          >
                                            <option value="">Select Trim</option>
                                            {modelObj.trims.map((t: any) => <option key={t.name} value={t.name}>{t.name}</option>)}
                                          </select>
                                        );
                                      }
                                    }
                                  }

                                  return (
                                    <div key={key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                      <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                                        {key.replace(/_/g, ' ')}
                                      </label>
                                      <div className="relative">
                                        {inputElement}
                                      </div>
                                    </div>
                                  );
                                }
                                if (typeof data !== 'object' || data === null || !('value' in data)) return null;
                                return (
                                  <div key={key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                                      {key.replace(/_/g, ' ')}
                                    </label>
                                    <div className="relative">
                                      <input
                                        type={typeof data.value === 'number' ? 'number' : 'text'}
                                        step="any"
                                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                        value={data.value || ''}
                                        onChange={(e) => handleFieldChange(key, e.target.value)}
                                      />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                        data.provenance_status === 'extracted_from_document' 
                                          ? 'bg-emerald-100 text-emerald-800' 
                                          : data.provenance_status === 'matched_from_verified_program'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {data.provenance_status === 'extracted_from_document' ? t.foundInDoc : 
                                         data.provenance_status === 'matched_from_verified_program' ? t.verified11Key : t.missingAssumed}
                                      </span>

                                      {(key === 'hunterDiscount' || key === 'manufacturerRebate' || key === 'rebates' || key === 'savings') && (
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                          <input 
                                            type="checkbox" 
                                            className="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                                            checked={data.isGlobal || false}
                                            onChange={(e) => {
                                              setEditingData((prev: any) => ({
                                                ...prev,
                                                [key]: {
                                                  ...prev[key],
                                                  isGlobal: e.target.checked
                                                }
                                              }));
                                            }}
                                          />
                                          <span className="text-[10px] font-medium text-slate-600">For Everyone</span>
                                        </label>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              <button 
                                onClick={handleAddField}
                                className="flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-3 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                <span className="text-xs font-bold">{t.addField}</span>
                              </button>
                            </div>

                            <div className="flex justify-end space-x-3 border-t border-slate-200 pt-4">
                              <button
                                onClick={() => handleUpdateDeal(deal.id, 'REJECTED')}
                                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                              >
                                {t.rejectDeal}
                              </button>
                              <button
                                onClick={() => handleUpdateDeal(deal.id, 'NEEDS_REVIEW')}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
                              >
                                {t.saveDraft}
                              </button>
                              <button
                                onClick={() => handleUpdateDeal(deal.id, 'APPROVED')}
                                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors flex items-center"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {t.approvePublish}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'cars' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <CarsAdmin />
          </section>
        )}

        {activeTab === 'users' && (
          <section>
            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{t.userManagement}</h2>
                <p className="text-sm text-slate-500">{t.manageUsersDesc}</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t.searchUsers}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Users className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                </div>
                <button 
                  onClick={fetchUsers}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  {t.refresh}
                </button>
              </div>
            </div>
            <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.user}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.email}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.joined}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {users
                    .filter((u: any) => (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())))
                    .map((user: any) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                            {user.displayName?.[0] || user.email?.[0] || '?'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">{user.displayName || t.anonymous}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : t.unknown}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                          {t.active}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">{t.siteConfiguration}</h2>
              <p className="text-sm text-slate-500">
                Настройте глобальные параметры, которые влияют на расчеты калькулятора и поведение сайта.
              </p>
            </div>
            <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t.brokerFee}</label>
                  <p className="text-[10px] text-slate-500 mb-1">Комиссия брокера, добавляемая к стоимости сделки.</p>
                  <input
                    type="number"
                    value={settings.brokerFee}
                    onChange={(e) => setSettings({...settings, brokerFee: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t.defaultTaxRate}</label>
                  <p className="text-[10px] text-slate-500 mb-1">Налоговая ставка по умолчанию (в %). Используется в расчетах.</p>
                  <input
                    type="number"
                    step="0.001"
                    value={settings.taxRateDefault}
                    onChange={(e) => setSettings({...settings, taxRateDefault: parseFloat(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                
                {/* New Fees */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">DMV Fee</label>
                  <p className="text-[10px] text-slate-500 mb-1">Сбор за регистрацию ТС по умолчанию.</p>
                  <input
                    type="number"
                    value={settings.dmvFee || 400}
                    onChange={(e) => setSettings({...settings, dmvFee: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Doc Fee</label>
                  <p className="text-[10px] text-slate-500 mb-1">Дилерский сбор за оформление документов.</p>
                  <input
                    type="number"
                    value={settings.docFee || 85}
                    onChange={(e) => setSettings({...settings, docFee: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Acquisition Fee</label>
                  <p className="text-[10px] text-slate-500 mb-1">Банковский сбор за открытие лизинга.</p>
                  <input
                    type="number"
                    value={settings.acquisitionFee || 650}
                    onChange={(e) => setSettings({...settings, acquisitionFee: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Disposition Fee</label>
                  <p className="text-[10px] text-slate-500 mb-1">Сбор за возврат авто в конце лизинга.</p>
                  <input
                    type="number"
                    value={settings.dispositionFee || 395}
                    onChange={(e) => setSettings({...settings, dispositionFee: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">{t.supportEmail}</label>
                  <p className="text-[10px] text-slate-500 mb-1">Email для уведомлений о новых лидах и поддержки.</p>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Gemini API Key</label>
                  <p className="text-[10px] text-slate-500 mb-1">Ключ для автоматического извлечения данных из предложений (Gemini AI).</p>
                  <input
                    type="password"
                    value={settings.geminiApiKey || ''}
                    onChange={(e) => setSettings({...settings, geminiApiKey: e.target.value})}
                    placeholder="Введите ваш API ключ"
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900">{t.maintenanceMode}</h4>
                      <p className="text-xs text-slate-500">{t.maintenanceDesc}</p>
                    </div>
                    <button
                      onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.maintenanceMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={saveSettings}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{t.saveConfiguration}</span>
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">System Status</h3>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-700">Domain Authorization</span>
                      {window.location.hostname === 'hunter.lease' ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Verified</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">Action Required</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      {window.location.hostname === 'hunter.lease' 
                        ? 'Your domain is correctly configured and authorized for Firebase Authentication.'
                        : 'If authentication fails on hunter.lease, ensure it\'s added to "Authorized Domains" in Firebase Console.'}
                    </p>
                    <a 
                      href="https://console.firebase.google.com/project/_/authentication/settings" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Open Firebase Console <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-700">Site Preview</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Active</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      If the preview doesn't load in the dashboard, try opening it in a new tab.
                    </p>
                    <button 
                      onClick={() => window.open('/', '_blank')}
                      className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="w-3 h-3" /> Open Live Site
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Danger Zone</h3>
                <p className="text-sm text-slate-500 mb-6">Irreversible actions for your application data.</p>
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 border border-red-100 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                    <div className="text-left">
                      <p className="text-sm font-bold">Maintenance Mode</p>
                      <p className="text-xs opacity-70">Disable public access to the calculator</p>
                    </div>
                    <div className="w-10 h-5 bg-slate-200 rounded-full relative">
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.maintenanceMode ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        {activeTab === 'media' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <MediaAdmin />
          </section>
        )}
        {activeTab === 'banks' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <BanksAdmin />
          </section>
        )}
        {activeTab === 'analytics' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <AnalyticsAdmin />
          </section>
        )}
        {activeTab === 'reviews' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <ReviewsAdmin />
          </section>
        )}
        {activeTab === 'feedback' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <FeedbackAdmin />
          </section>
        )}
        {activeTab === 'leads' && (
          <section>
            <div className="mb-4 flex flex-col space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{t.leads}</h2>
                  <p className="text-sm text-slate-500">{t.leadsDesc}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t.searchLeads}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Activity className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                  </div>
                  <select 
                    value={leadFilter}
                    onChange={(e) => setLeadFilter(e.target.value as any)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">{t.allStatus}</option>
                    <option value="new">{t.new}</option>
                    <option value="contacted">{t.contacted}</option>
                    <option value="closed">{t.closedWon}</option>
                    <option value="rejected">{t.deadJunk}</option>
                  </select>
                  <button 
                    onClick={exportLeads}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    {t.export}
                  </button>
                  <button 
                    onClick={fetchLeads}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {t.refresh}
                  </button>
                </div>
              </div>

              {selectedLeads.length > 0 && (
                <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-emerald-900">{selectedLeads.length} {t.leadsSelected}</span>
                    <button 
                      onClick={() => setSelectedLeads([])}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      {t.deselectAll}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleBulkUpdateLeadsStatus('contacted')}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                    >
                      {t.markContacted}
                    </button>
                    <button
                      onClick={() => handleBulkUpdateLeadsStatus('closed')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                    >
                      {t.markClosed}
                    </button>
                    <button
                      onClick={handleBulkDeleteLeads}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                      {t.deleteAll}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-500">{t.loadingLeads}</div>
              ) : leads.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-2 text-sm font-semibold text-slate-900">{t.noLeadsFound}</h3>
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {leads
                    .filter(l => {
                      const matchesSearch = (l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                          l.email?.toLowerCase().includes(searchTerm.toLowerCase()));
                      const matchesFilter = leadFilter === 'all' || l.status === leadFilter;
                      return matchesSearch && matchesFilter;
                    })
                    .map((lead) => (
                    <li key={lead.id} className={`hover:bg-slate-50 transition-colors ${selectedLeads.includes(lead.id) ? 'bg-emerald-50/50' : ''}`}>
                      <div className="flex items-center px-6">
                        <input 
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeads([...selectedLeads, lead.id]);
                            } else {
                              setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                            }
                          }}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                        />
                        <div 
                          className="flex-1 py-4 flex items-center justify-between cursor-pointer ml-4"
                          onClick={() => {
                            if (expandedDealId === lead.id) {
                              setExpandedDealId(null);
                            } else {
                              setExpandedDealId(lead.id);
                            }
                          }}
                        >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
                              <Activity className="h-5 w-5 text-emerald-600" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {lead.name} ({lead.email})
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {lead.vehicle?.make} {lead.vehicle?.model} {lead.vehicle?.trim} - {lead.calc?.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="flex flex-col items-end space-y-1">
                            <div className="flex items-center space-x-2">
                              {lead.isFirstTimeBuyer && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  {t.ftb}
                                </span>
                              )}
                              {lead.hasCosigner && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  Cosigner
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                lead.status === 'closed' ? 'bg-emerald-100 text-emerald-800' :
                                lead.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                                lead.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {lead.status === 'closed' ? t.closedWon : 
                                 lead.status === 'contacted' ? t.contacted :
                                 lead.status === 'rejected' ? t.deadJunk :
                                 t.new}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 font-mono">
                              {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleString() : new Date(lead.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteLead(lead.id);
                              }}
                              className="p-1.5 text-slate-300 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                              {expandedDealId === lead.id ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      </div>
                      
                      {/* Expanded Details - Lead Form */}
                      {expandedDealId === lead.id && (
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 mb-2">{t.customerInfo}</h4>
                              <div className="space-y-1 text-sm text-slate-700">
                                <p><span className="font-medium">{t.name}:</span> {lead.name}</p>
                                <p><span className="font-medium">{t.email}:</span> {lead.email}</p>
                                <p><span className="font-medium">{t.phone}:</span> {lead.phone}</p>
                                <p><span className="font-medium">{t.paymentMethod}:</span> {lead.payMethod === 'z' ? 'Zelle' : lead.payMethod === 'v' ? 'Venmo' : 'Credit Card'}</p>
                                {lead.paymentName && <p><span className="font-medium">{t.paymentName}:</span> {lead.paymentName}</p>}
                                <p><span className="font-medium">{t.tcpaConsent}:</span> {lead.legalConsent?.tcpa ? t.yes : t.no}</p>
                                <p><span className="font-medium">{t.termsConsent}:</span> {lead.legalConsent?.terms ? t.yes : t.no}</p>
                                <p><span className="font-medium">{t.ftb}:</span> {lead.isFirstTimeBuyer ? t.yes : t.no}</p>
                                <p><span className="font-medium">Has Cosigner:</span> {lead.hasCosigner ? t.yes : t.no}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 mb-2">{t.vehicleDealInfo}</h4>
                              <div className="space-y-1 text-sm text-slate-700">
                                <p><span className="font-medium">{t.vehicle}:</span> {lead.vehicle?.year} {lead.vehicle?.make} {lead.vehicle?.model} {lead.vehicle?.trim}</p>
                                <p><span className="font-medium">{t.msrp}:</span> ${lead.vehicle?.msrp?.toLocaleString()}</p>
                                <p><span className="font-medium">{t.type}:</span> {lead.calc?.type}</p>
                                <p><span className="font-medium">{t.payment}:</span> ${lead.calc?.payment}/mo</p>
                                <p><span className="font-medium">{t.down}:</span> ${lead.calc?.down}</p>
                                <p><span className="font-medium">{t.mileage}:</span> {lead.calc?.mileage}</p>
                                <p><span className="font-medium">{t.tier}:</span> {lead.calc?.tier}</p>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button 
                                  onClick={() => updateLeadStatus(lead.id, 'new')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${lead.status === 'new' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  {t.markNew}
                                </button>
                                <button 
                                  onClick={() => updateLeadStatus(lead.id, 'contacted')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${lead.status === 'contacted' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  {t.contacted}
                                </button>
                                <button 
                                  onClick={() => updateLeadStatus(lead.id, 'closed')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${lead.status === 'closed' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  {t.closedWon}
                                </button>
                                <button 
                                  onClick={() => updateLeadStatus(lead.id, 'rejected')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${lead.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  {t.deadJunk}
                                </button>
                              </div>
                            </div>
                            {lead.tradeIn && (
                              <div className="md:col-span-2">
                                <h4 className="text-sm font-bold text-slate-900 mb-2">{t.tradeInInfo}</h4>
                                <div className="space-y-1 text-sm text-slate-700">
                                  <p><span className="font-medium">{t.vehicle}:</span> {lead.tradeIn.year} {lead.tradeIn.make} {lead.tradeIn.model}</p>
                                  <p><span className="font-medium">{t.mileage}:</span> {lead.tradeIn.mileage}</p>
                                  <p><span className="font-medium">{t.vin}:</span> {lead.tradeIn.vin}</p>
                                  <p><span className="font-medium">{t.hasLoan}:</span> {lead.tradeIn.hasLoan ? t.yes : t.no}</p>
                                  {lead.tradeIn.hasLoan && <p><span className="font-medium">{t.payoffAmount}:</span> ${lead.tradeIn.payoff}</p>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmColor={confirmModal.confirmColor}
      />
    </div>
  );
}

function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Delete', 
  confirmColor = 'bg-red-600' 
}: any) {
  const { language } = useLanguageStore();
  const t = translations[language].admin;
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-600">{message}</p>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            {t.cancel}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white ${confirmColor} rounded-lg transition-colors`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
