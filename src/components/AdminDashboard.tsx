import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DragDropUploader } from './DragDropUploader';
import { DealEditor } from './DealEditor';
import { Activity, Clock, CheckCircle2, AlertTriangle, FileText, ChevronRight, ChevronDown, Key, ExternalLink, Trash2, ArchiveRestore, Plus, Save, Database, Users, Settings, BarChart3, UserCheck, UserX, Mail, LogIn, ShieldCheck, Image as ImageIcon, Star, MessageSquare, List, PenTool, Tag, Layers, Building2, Ticket, LogOut, X, Edit3, Calculator, Target, Sparkles } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { getAuthToken } from '../utils/auth';
import { toast } from 'react-hot-toast';
import { clearClientCache } from '../utils/fetchWithCache';

// Lazy loaded admin components
const MediaAdmin = lazy(() => import('./MediaAdmin').then(m => ({ default: m.MediaAdmin })));
const BanksAdmin = lazy(() => import('./BanksAdmin').then(m => ({ default: m.BanksAdmin })));
const AnalyticsAdmin = lazy(() => import('./AnalyticsAdmin').then(m => ({ default: m.AnalyticsAdmin })));
const CarsAdmin = lazy(() => import('../pages/CarsAdmin').then(m => ({ default: m.CarsAdmin })));
const ReviewsAdmin = lazy(() => import('./ReviewsAdmin').then(m => ({ default: m.ReviewsAdmin })));
const FeedbackAdmin = lazy(() => import('./FeedbackAdmin').then(m => ({ default: m.FeedbackAdmin })));
const AuditLogsAdmin = lazy(() => import('./admin/AuditLogsAdmin').then(m => ({ default: m.AuditLogsAdmin })));
const BlogAdmin = lazy(() => import('./BlogAdmin').then(m => ({ default: m.BlogAdmin })));
const IncentivesAdmin = lazy(() => import('./IncentivesAdmin').then(m => ({ default: m.IncentivesAdmin })));
const BulkEditAdmin = lazy(() => import('./BulkEditAdmin').then(m => ({ default: m.BulkEditAdmin })));
const DealersAdmin = lazy(() => import('./DealersAdmin').then(m => ({ default: m.DealersAdmin })));
const PromoCodesAdmin = lazy(() => import('./PromoCodesAdmin').then(m => ({ default: m.PromoCodesAdmin })));
const CalculatorAuditAdmin = lazy(() => import('./admin/CalculatorAuditAdmin').then(m => ({ default: m.CalculatorAuditAdmin })));
const CalibratorLeadsAdmin = lazy(() => import('./admin/CalibratorLeadsAdmin').then(m => ({ default: m.CalibratorLeadsAdmin })));
const PromoAIAdmin = lazy(() => import('./admin/PromoAIAdmin').then(m => ({ default: m.PromoAIAdmin })));
const OfferBuilderModal = lazy(() => import('./admin/OfferBuilderModal').then(m => ({ default: m.OfferBuilderModal })));
const VinDecoderModal = lazy(() => import('./admin/VinDecoderModal').then(m => ({ default: m.VinDecoderModal })));
const BulkGenerateModal = lazy(() => import('./admin/BulkGenerateModal').then(m => ({ default: m.BulkGenerateModal })));
const BulkEditDealsModal = lazy(() => import('./admin/BulkEditDealsModal').then(m => ({ default: m.BulkEditDealsModal })));

const AdminLoader = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--lime)]"></div>
  </div>
);

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
  seoTitle?: string;
  seoDescription?: string;
  customUrl?: string;
  brokerFeeCents?: number;
  dealerReserveCents?: number;
  profitCents?: number;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'deals' | 'leads' | 'calibrator' | 'promo-ai' | 'cars' | 'users' | 'settings' | 'media' | 'banks' | 'analytics' | 'reviews' | 'feedback' | 'audit' | 'blog' | 'incentives' | 'bulk-edit' | 'dealers' | 'promos' | 'calculator-audit'>('overview');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealsPage, setDealsPage] = useState(1);
  const [dealsTotalPages, setDealsTotalPages] = useState(1);
  const [showArchivedDeals, setShowArchivedDeals] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterMake, setFilterMake] = useState<string>('ALL');
  const [filterModel, setFilterModel] = useState<string>('ALL');
  const [filterTrim, setFilterTrim] = useState<string>('ALL');
  const [lenders, setLenders] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [settings, setSettings] = useState<any>({
    platformFee: 95,
    taxRateDefault: 8.875,
    supportEmail: 'support@dealengine.ai',
    maintenanceMode: false,
    dmvFee: 400,
    docFee: 85,
    acquisitionFee: 650,
    dispositionFee: 395,
    routingStrategy: 'BEST_FOR_CUSTOMER'
  });
  const [loading, setLoading] = useState(true);
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [dismissApiKeyBanner, setDismissApiKeyBanner] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'make' | 'price'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [leadFilter, setLeadFilter] = useState<'all' | 'new' | 'contacted' | 'closed' | 'rejected'>('all');
  const [stats, setStats] = useState<any>({
    totalLeads: 0,
    activeDeals: 0,
    pendingReviews: 0,
    totalUsers: 0,
    recentActivity: []
  });
  const [showLogin, setShowLogin] = useState(true);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [showOfferBuilder, setShowOfferBuilder] = useState(false);
  const [isVinModalOpen, setIsVinModalOpen] = useState(false);
  const [isBulkGenerateModalOpen, setIsBulkGenerateModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
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

  const [closeLeadModal, setCloseLeadModal] = useState<{
    isOpen: boolean;
    leadId: string;
    brokerFee: number;
    dealerReserve: number;
  }>({ isOpen: false, leadId: '', brokerFee: 0, dealerReserve: 0 });

  const { user, role } = useAuthStore();
  const { language } = useLanguageStore();
  const t = translations[language].admin;

  const saveCars = async (newDb: any) => {
    try {
      const res = await fetch('/api/admin/cars', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(newDb),
      });
      if (!res.ok) throw new Error('Failed to save');
      clearClientCache();
      setCarDb(newDb);
      toast.success('Car database updated successfully');
    } catch (err) {
      console.error('Failed to save cars', err);
      toast.error('Failed to update car database');
    }
  };

  const handleVinSave = async (data: any) => {
    // Create new deal
    try {
      const financialData = {
        make: data.make,
        model: data.model,
        trim: data.trim,
        driveType: data.driveType,
        year: data.year,
        msrp: { value: data.msrp || 0, provenance_status: 'manual' },
        hunterDiscount: { value: data.discount || 0, provenance_status: 'manual' }
      };

      const response = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          financialData,
          reviewStatus: 'NEEDS_REVIEW',
          publishStatus: 'DRAFT',
          lenderId: '',
          isFirstTimeBuyerEligible: false
        })
      });
      
      if (!response.ok) throw new Error('Failed to create deal from VIN');
      toast.success('Deal created successfully');
      fetchDeals(true, dealsPage);
    } catch (error) {
      console.error('Failed to create deal from VIN:', error);
      toast.error('Failed to create deal');
    }

    setIsVinModalOpen(false);
  };

  const canAccess = (tab: string) => {
    if (adminRole === 'SUPER_ADMIN') return true;
    if (adminRole === 'SALES_AGENT') {
      return ['overview', 'analytics', 'deals', 'leads'].includes(tab);
    }
    if (adminRole === 'CONTENT_MANAGER') {
      return ['overview', 'analytics', 'cars', 'promos', 'media', 'blog', 'reviews', 'feedback'].includes(tab);
    }
    return false;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAuthToken();
      if (token && role === 'admin') {
        setShowLogin(false);
        try {
          const response = await fetch('/api/admin/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setAdminRole(data.user.role);
          }
        } catch (err) {
          console.error('Failed to fetch admin role:', err);
        }
      } else if (localStorage.getItem('admin_token')) {
        setShowLogin(false);
        setAdminRole('SUPER_ADMIN'); // Fallback for legacy token
      } else {
        setShowLogin(true);
        setAdminRole(null);
      }
    };
    checkAuth();
  }, [user, role]);

  const handleFirebaseLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Firebase login failed:', error);
      toast.error('Firebase login failed. Please try again.');
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
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
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
        toast.error('Failed to open select key dialog. Please try again.');
      }
    } else {
      console.warn('window.aistudio is not available');
      toast.error('This feature is only available within the AI Studio environment.');
    }
  };

  const fetchDeals = async (showToast = false, pageNum = dealsPage) => {
    try {
      clearClientCache();
      const response = await fetch(`/api/admin/deals?page=${pageNum}&limit=100`, {
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setDeals(data.data);
          setDealsTotalPages(Math.ceil(data.total / data.limit));
        } else {
          setDeals(data);
        }
        if (showToast) toast.success('Deals refreshed successfully');
      } else {
        if (showToast) toast.error('Failed to refresh deals');
      }
      
      const carRes = await fetch('/api/cars');
      if (carRes.ok) {
        setCarDb(await carRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch deals or cars:', error);
      if (showToast) toast.error('Failed to refresh deals');
    } finally {
      if (activeTab === 'deals') setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads', {
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
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

  const fetchUsers = async (pageNum = usersPage) => {
    try {
      const response = await fetch(`/api/admin/users?page=${pageNum}&limit=50`, {
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setUsers(data.data);
          setUsersTotalPages(Math.ceil(data.total / data.limit));
        } else {
          setUsers(data);
        }
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
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
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
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
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
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
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
    if (['overview', 'deals', 'leads', 'users', 'settings'].includes(activeTab)) {
      setLoading(true);
    } else {
      setLoading(false);
    }
    
    switch (activeTab) {
      case 'overview': fetchStats(); break;
      case 'deals': 
        fetchDeals(false, dealsPage); 
        fetchLenders();
        break;
      case 'leads': fetchLeads(); break;
      case 'users': fetchUsers(usersPage); break;
      case 'settings': fetchSettings(); break;
    }
    checkApiKey();
  }, [activeTab, dealsPage, usersPage]);

  const updateLeadStatus = async (leadId: string, status: string, brokerFeeCents?: number, dealerReserveCents?: number) => {
    try {
      const body: any = { status };
      if (brokerFeeCents !== undefined) body.brokerFeeCents = brokerFeeCents;
      if (dealerReserveCents !== undefined) body.dealerReserveCents = dealerReserveCents;

      const response = await fetch(`/api/lead/${leadId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        fetchLeads();
        fetchStats();
        setCloseLeadModal({ isOpen: false, leadId: '', brokerFee: 0, dealerReserve: 0 });
      }
    } catch (error) {
      console.error('Failed to update lead status:', error);
    }
  };

  const deleteLead = async (leadId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t.deleteLead,
      message: t.confirmDeleteLead,
      confirmText: t.delete,
      confirmColor: 'bg-red-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/lead/${leadId}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
          });
          if (response.ok) {
            fetchLeads();
            fetchStats();
          } else {
            const err = await response.text();
            toast.error(`Failed to delete lead: ${err}`);
          }
        } catch (error) {
          console.error('Failed to delete lead:', error);
        }
      }
    });
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
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        toast.success('Settings saved successfully!');
      } else {
        const err = await response.text();
        toast.error(`Failed to save settings: ${err}`);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleUploadSuccess = (dealId: string) => {
    fetchDeals(false, dealsPage);
  };

  const handleArchiveDeal = async (dealId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t.archiveDeal,
      message: t.confirmArchiveDeal,
      confirmText: t.archiveDeal,
      confirmColor: 'bg-amber-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`/api/admin/deals/${dealId}`, { 
            method: 'PUT',
            headers: { 
              'Authorization': `Bearer ${await getAuthToken()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ publishStatus: 'ARCHIVED' })
          });
          fetchDeals(false, dealsPage);
          toast.success('Deal archived successfully');
        } catch (error) {
          console.error('Failed to archive deal:', error);
          toast.error('Failed to archive deal');
        }
      }
    });
  };

  const handleRestoreDeal = async (dealId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t.restoreDeal,
      message: t.confirmRestoreDeal,
      confirmText: t.restoreDeal,
      confirmColor: 'bg-emerald-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`/api/admin/deals/${dealId}`, { 
            method: 'PUT',
            headers: { 
              'Authorization': `Bearer ${await getAuthToken()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ publishStatus: 'DRAFT', reviewStatus: 'NEEDS_REVIEW' })
          });
          fetchDeals(false, dealsPage);
          toast.success('Deal restored successfully');
        } catch (error) {
          console.error('Failed to restore deal:', error);
          toast.error('Failed to restore deal');
        }
      }
    });
  };

  const handleHardDeleteDeal = async (dealId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t.hardDeleteDeal,
      message: t.confirmHardDeleteDeal,
      confirmText: t.delete,
      confirmColor: 'bg-red-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`/api/admin/deals/${dealId}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
          });
          fetchDeals(false, dealsPage);
          toast.success('Deal permanently deleted');
        } catch (error) {
          console.error('Failed to delete deal:', error);
          toast.error('Failed to delete deal');
        }
      }
    });
  };

  const handleCreateManualDeal = () => {
    setShowOfferBuilder(true);
  };

  const handleDuplicateDeal = async (deal: any) => {
    try {
      const financialData = deal.financialData ? JSON.parse(deal.financialData) : {};
      const response = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
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
        toast.success('Deal duplicated successfully');
        fetchDeals(false, dealsPage);
      } else {
        const data = await response.json();
        toast.error(`Failed to duplicate deal: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to duplicate deal:', error);
      toast.error('Failed to duplicate deal');
    }
  };

  const handleBulkArchiveDeals = async () => {
    setConfirmModal({
      isOpen: true,
      title: t.bulkArchiveDeals,
      message: t.confirmBulkDeleteDeals.replace('{count}', selectedDeals.length.toString()),
      confirmText: t.archiveDeal,
      confirmColor: 'bg-amber-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          const token = await getAuthToken();
          const results = await Promise.allSettled(selectedDeals.map(id => 
            fetch(`/api/admin/deals/${id}`, { 
              method: 'PUT',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ publishStatus: 'ARCHIVED' })
            }).then(res => {
              if (!res.ok) throw new Error('Failed to archive');
              return id;
            })
          ));
          
          const successful = results.filter(r => r.status === 'fulfilled');
          const failed = results.filter(r => r.status === 'rejected');
          
          if (failed.length > 0) {
            toast.success(`Successfully archived ${successful.length} deals. Failed to archive ${failed.length} deals.`);
          } else {
            toast.success('Selected deals archived successfully');
          }
          
          setSelectedDeals([]);
          fetchDeals(false, dealsPage);
          fetchStats();
        } catch (error) {
          console.error('Failed to archive deals:', error);
          toast.error('Failed to archive some deals');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleBulkRestoreDeals = async () => {
    setConfirmModal({
      isOpen: true,
      title: t.bulkRestoreDeals,
      message: t.confirmBulkDeleteDeals.replace('{count}', selectedDeals.length.toString()),
      confirmText: t.restoreDeal,
      confirmColor: 'bg-emerald-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          const token = await getAuthToken();
          const results = await Promise.allSettled(selectedDeals.map(id => 
            fetch(`/api/admin/deals/${id}`, { 
              method: 'PUT',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ publishStatus: 'DRAFT', reviewStatus: 'NEEDS_REVIEW' })
            }).then(res => {
              if (!res.ok) throw new Error('Failed to restore');
              return id;
            })
          ));
          
          const successful = results.filter(r => r.status === 'fulfilled');
          const failed = results.filter(r => r.status === 'rejected');
          
          if (failed.length > 0) {
            toast.success(`Successfully restored ${successful.length} deals. Failed to restore ${failed.length} deals.`);
          } else {
            toast.success('Selected deals restored successfully');
          }
          
          setSelectedDeals([]);
          fetchDeals(false, dealsPage);
          fetchStats();
        } catch (error) {
          console.error('Failed to restore deals:', error);
          toast.error('Failed to restore some deals');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleBulkHardDeleteDeals = async () => {
    setConfirmModal({
      isOpen: true,
      title: t.bulkHardDeleteDeals,
      message: t.confirmBulkDeleteDeals.replace('{count}', selectedDeals.length.toString()),
      confirmText: t.deleteAll,
      confirmColor: 'bg-red-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          const token = await getAuthToken();
          const results = await Promise.allSettled(selectedDeals.map(id => 
            fetch(`/api/admin/deals/${id}`, { 
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => {
              if (!res.ok) throw new Error('Failed to delete');
              return id;
            })
          ));
          
          const successful = results.filter(r => r.status === 'fulfilled');
          const failed = results.filter(r => r.status === 'rejected');
          
          if (failed.length > 0) {
            toast.success(`Successfully deleted ${successful.length} deals. Failed to delete ${failed.length} deals.`);
          } else {
            toast.success('Selected deals deleted successfully');
          }
          
          setSelectedDeals([]);
          fetchDeals(false, dealsPage);
          fetchStats();
        } catch (error) {
          console.error('Failed to delete deals:', error);
          toast.error('Failed to delete some deals');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleBulkUpdateDealsStatus = async (status: string) => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const results = await Promise.allSettled(selectedDeals.map(id => 
        fetch(`/api/admin/deals/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            reviewStatus: status,
            publishStatus: status === 'APPROVED' ? 'PUBLISHED' : 'DRAFT'
          })
        }).then(res => {
          if (!res.ok) throw new Error('Failed to update');
          return id;
        })
      ));
      
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      if (failed.length > 0) {
        toast.success(`Successfully updated ${successful.length} deals. Failed to update ${failed.length} deals.`);
      }
      
      setSelectedDeals([]);
      fetchDeals(false, dealsPage);
    } catch (error) {
      console.error('Failed to update deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteLeads = async () => {
    setConfirmModal({
      isOpen: true,
      title: t.bulkDeleteLeads,
      message: t.confirmBulkDeleteLeads.replace('{count}', selectedLeads.length.toString()),
      confirmText: t.deleteAll,
      confirmColor: 'bg-red-600',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          const token = await getAuthToken();
          const results = await Promise.allSettled(selectedLeads.map(id => 
            fetch(`/api/lead/${id}`, { 
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => {
              if (!res.ok) throw new Error('Failed to delete');
              return id;
            })
          ));
          
          const successful = results.filter(r => r.status === 'fulfilled');
          const failed = results.filter(r => r.status === 'rejected');
          
          if (failed.length > 0) {
            toast.success(`Successfully deleted ${successful.length} leads. Failed to delete ${failed.length} leads.`);
          } else {
            toast.success('Selected leads deleted successfully');
          }
          
          setSelectedLeads([]);
          fetchLeads();
          fetchStats();
        } catch (error) {
          console.error('Failed to delete leads:', error);
          toast.error('Failed to delete some leads');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleBulkUpdateLeadsStatus = async (status: string) => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const results = await Promise.allSettled(selectedLeads.map(id => 
        fetch(`/api/lead/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        }).then(res => {
          if (!res.ok) throw new Error('Failed to update');
          return id;
        })
      ));
      
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      if (failed.length > 0) {
        toast.success(`Successfully updated ${successful.length} leads. Failed to update ${failed.length} leads.`);
      }
      
      setSelectedLeads([]);
      fetchLeads();
      fetchStats();
    } catch (error) {
      console.error('Failed to update leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeal = async (dealId: string, status: string, payload?: any) => {
    try {
      const deal = deals.find(d => d.id === dealId);
      const isArchived = deal?.publishStatus === 'ARCHIVED';
      
      const bodyData: any = {
        reviewStatus: status,
        publishStatus: isArchived ? 'ARCHIVED' : (status === 'APPROVED' ? 'PUBLISHED' : 'DRAFT')
      };
      
      if (payload) {
        Object.assign(bodyData, payload);
      }

      const res = await fetch(`/api/admin/deals/${dealId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(bodyData)
      });

      if (!res.ok) {
        throw new Error('Failed to update deal');
      }

      clearClientCache();
      fetchDeals(false, dealsPage);
      setExpandedDealId(null);
    } catch (error) {
      console.error('Failed to update deal:', error);
      toast.error('Failed to save deal. Please try again.');
      throw error;
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
      case 'NEEDS_WORK':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3 mr-1" /> {t.needsWork || "Needs Work"}
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
            <p className="text-slate-500 mt-2">Sign in with your admin account to continue.</p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={handleFirebaseLogin}
              className="w-full flex items-center justify-center space-x-2 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Sign in with Google</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or use legacy access</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
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
                className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-200 transition-colors"
              >
                {t.login}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-20">
        <div className="p-4 border-b border-slate-200 flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            {t.dashboard}
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          {/* Dashboard Group */}
          <div className="px-4 mb-6">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">Dashboard</h2>
            <div className="space-y-1">
              {canAccess('overview') && (
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t.overview}</span>
              </button>
              )}
              {canAccess('analytics') && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'analytics' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t.analytics}</span>
              </button>
              )}
            </div>
          </div>

          {/* CRM & Sales Group */}
          <div className="px-4 mb-6">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">CRM & Sales</h2>
            <div className="space-y-1">
              {canAccess('leads') && (
              <button
                onClick={() => setActiveTab('leads')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'leads' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>{t.leads}</span>
              </button>
              )}
              {canAccess('leads') && (
              <button
                onClick={() => setActiveTab('calibrator')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'calibrator' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>Калибратор</span>
              </button>
              )}
              {canAccess('deals') && (
              <button
                onClick={() => setActiveTab('promo-ai')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'promo-ai' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Promo AI</span>
              </button>
              )}
              {canAccess('users') && (
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'users' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{t.users}</span>
              </button>
              )}
              {canAccess('reviews') && (
              <button
                onClick={() => setActiveTab('reviews')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'reviews' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Star className="w-4 h-4" />
                <span>{t.reviews}</span>
              </button>
              )}
              {canAccess('feedback') && (
              <button
                onClick={() => setActiveTab('feedback')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'feedback' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{t.feedback}</span>
              </button>
              )}
            </div>
          </div>

          {/* Inventory & Pricing Group */}
          <div className="px-4 mb-6">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">Inventory & Pricing</h2>
            <div className="space-y-1">
              {canAccess('deals') && (
              <button
                onClick={() => setActiveTab('deals')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'deals' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{t.deals}</span>
              </button>
              )}
              {canAccess('cars') && (
              <button
                onClick={() => setActiveTab('cars')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'cars' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>{t.cars}</span>
              </button>
              )}
              {canAccess('dealers') && (
              <button
                onClick={() => setActiveTab('dealers')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'dealers' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Dealers</span>
              </button>
              )}
              {canAccess('incentives') && (
              <button
                onClick={() => setActiveTab('incentives')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'incentives' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>OEM Incentives</span>
              </button>
              )}
              {canAccess('banks') && (
              <button
                onClick={() => setActiveTab('banks')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'banks' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>{t.banks}</span>
              </button>
              )}
              {canAccess('bulk-edit') && (
              <button
                onClick={() => setActiveTab('bulk-edit')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'bulk-edit' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Bulk Edit</span>
              </button>
              )}
            </div>
          </div>

          {/* Marketing Group */}
          <div className="px-4 mb-6">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">Marketing</h2>
            <div className="space-y-1">
              {canAccess('promos') && (
              <button
                onClick={() => setActiveTab('promos')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'promos' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>Promo Codes</span>
              </button>
              )}
              {canAccess('blog') && (
              <button
                onClick={() => setActiveTab('blog')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'blog' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <PenTool className="w-4 h-4" />
                <span>Blog</span>
              </button>
              )}
              {canAccess('media') && (
              <button
                onClick={() => setActiveTab('media')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'media' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>{t.mediaLibrary}</span>
              </button>
              )}
            </div>
          </div>

          {/* System Group */}
          <div className="px-4 mb-6">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">System</h2>
            <div className="space-y-1">
              {canAccess('settings') && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>{t.settings}</span>
              </button>
              )}
              {canAccess('audit') && (
              <button
                onClick={() => setActiveTab('audit')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'audit' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
                <span>{t.auditLogs}</span>
              </button>
              )}
              {canAccess('audit') && (
              <button
                onClick={() => setActiveTab('calculator-audit')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'calculator-audit' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Calculator Audit</span>
              </button>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem('admin_token');
                  auth.signOut();
                  window.location.reload();
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-4"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center space-x-3">
                {!user && (
                  <button 
                    onClick={handleFirebaseLogin}
                    className="flex items-center space-x-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>{t.loginWithGoogle}</span>
                  </button>
                )}
                {user && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
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

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* API Key Notice */}
            {!hasApiKey && !dismissApiKeyBanner && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start space-x-4 relative">
                <button 
                  onClick={() => setDismissApiKeyBanner(true)}
                  className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Key className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 pr-8">
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
              <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{t.inventoryQueue}</h2>
                  <p className="text-sm text-slate-500">{t.manageDeals}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => setIsVinModalOpen(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create from VIN</span>
                  </button>
                  <button 
                    onClick={() => setIsBulkGenerateModalOpen(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.bulkGenerate}</span>
                  </button>
                  <button 
                    onClick={handleCreateManualDeal}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.createManualOffer}</span>
                  </button>
                  <button 
                    onClick={() => fetchDeals(true, dealsPage)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {t.refresh}
                  </button>
                </div>
              </div>

              <div className="mb-6 flex flex-col space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setShowArchivedDeals(!showArchivedDeals);
                        setSelectedDeals([]);
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        showArchivedDeals 
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {showArchivedDeals ? t.activeDeals : t.archivedDeals}
                    </button>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="block pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="APPROVED">Approved</option>
                      <option value="NEEDS_WORK">Needs Work</option>
                      <option value="NEEDS_REVIEW">Needs Review</option>
                    </select>

                    {(() => {
                      const parsedDeals = deals.map(d => d.financialData ? JSON.parse(d.financialData) : {});
                      const uniqueMakes = Array.from(new Set(parsedDeals.map(d => d.make).filter(Boolean))).sort();
                      const uniqueModels = Array.from(new Set(parsedDeals.filter(d => filterMake === 'ALL' || d.make === filterMake).map(d => d.model).filter(Boolean))).sort();
                      const uniqueTrims = Array.from(new Set(parsedDeals.filter(d => (filterMake === 'ALL' || d.make === filterMake) && (filterModel === 'ALL' || d.model === filterModel)).map(d => d.trim).filter(Boolean))).sort();

                      return (
                        <>
                          <select
                            value={filterMake}
                            onChange={(e) => {
                              setFilterMake(e.target.value);
                              setFilterModel('ALL');
                              setFilterTrim('ALL');
                            }}
                            className="block pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          >
                            <option value="ALL">All Makes</option>
                            {uniqueMakes.map((make: any) => (
                              <option key={make} value={make}>{make}</option>
                            ))}
                          </select>

                          <select
                            value={filterModel}
                            onChange={(e) => {
                              setFilterModel(e.target.value);
                              setFilterTrim('ALL');
                            }}
                            className="block pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            disabled={filterMake === 'ALL'}
                          >
                            <option value="ALL">All Models</option>
                            {uniqueModels.map((model: any) => (
                              <option key={model} value={model}>{model}</option>
                            ))}
                          </select>

                          <select
                            value={filterTrim}
                            onChange={(e) => setFilterTrim(e.target.value)}
                            className="block pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            disabled={filterModel === 'ALL'}
                          >
                            <option value="ALL">All Trims</option>
                            {uniqueTrims.map((trim: any) => (
                              <option key={trim} value={trim}>{trim}</option>
                            ))}
                          </select>
                        </>
                      );
                    })()}

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="block pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="date">{t.sortByDate}</option>
                      <option value="make">{t.sortByMake}</option>
                      <option value="price">{t.sortByPrice}</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2 border border-slate-300 rounded-md bg-white hover:bg-slate-50"
                      title={sortOrder === 'asc' ? t.sortAscending : t.sortDescending}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
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
                        onClick={() => setIsBulkEditModalOpen(true)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Bulk Edit</span>
                      </button>
                      {!showArchivedDeals && (
                        <>
                          <button
                            onClick={() => handleBulkUpdateDealsStatus('APPROVED')}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                          >
                            {t.approveAll}
                          </button>
                          <button
                            onClick={() => handleBulkUpdateDealsStatus('REJECTED')}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                          >
                            {t.rejectAll}
                          </button>
                        </>
                      )}
                      {!showArchivedDeals ? (
                        <button
                          onClick={handleBulkArchiveDeals}
                          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors"
                        >
                          {t.bulkArchiveDeals}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleBulkRestoreDeals}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                          >
                            {t.bulkRestoreDeals}
                          </button>
                          <button
                            onClick={handleBulkHardDeleteDeals}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                          >
                            {t.bulkHardDeleteDeals}
                          </button>
                        </>
                      )}
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
                  <>
                    <div>
                      {(() => {
                      const filteredDeals = deals
                        .filter(deal => {
                          const isArchived = deal.publishStatus === 'ARCHIVED';
                          if (showArchivedDeals && !isArchived) return false;
                          if (!showArchivedDeals && isArchived) return false;
                          
                          if (filterStatus !== 'ALL' && deal.reviewStatus !== filterStatus) return false;

                          const data = deal.financialData ? JSON.parse(deal.financialData) : {};
                          
                          if (filterMake !== 'ALL' && data.make !== filterMake) return false;
                          if (filterModel !== 'ALL' && data.model !== filterModel) return false;
                          if (filterTrim !== 'ALL' && data.trim !== filterTrim) return false;

                          if (!searchTerm) return true;
                          const searchStr = `${deal.ingestionId} ${data.make || ''} ${data.model || ''} ${data.trim || ''}`.toLowerCase();
                          return searchStr.includes(searchTerm.toLowerCase());
                        })
                        .sort((a, b) => {
                          const dataA = a.financialData ? JSON.parse(a.financialData) : {};
                          const dataB = b.financialData ? JSON.parse(b.financialData) : {};
                          
                          let comparison = 0;
                          if (sortBy === 'date') {
                            comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                          } else if (sortBy === 'make') {
                            const makeModelA = `${dataA.make || ''} ${dataA.model || ''}`.toLowerCase();
                            const makeModelB = `${dataB.make || ''} ${dataB.model || ''}`.toLowerCase();
                            comparison = makeModelA.localeCompare(makeModelB);
                          } else if (sortBy === 'price') {
                            const priceA = parseFloat(dataA.monthlyPayment) || 0;
                            const priceB = parseFloat(dataB.monthlyPayment) || 0;
                            comparison = priceA - priceB;
                          }
                          
                          return sortOrder === 'asc' ? comparison : -comparison;
                        });

                      return (
                        <>
                          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center">
                            <input 
                              type="checkbox"
                              checked={filteredDeals.length > 0 && selectedDeals.length === filteredDeals.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDeals(filteredDeals.map(d => d.id));
                                } else {
                                  setSelectedDeals([]);
                                }
                              }}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                            />
                            <span className="ml-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{t.selectAll}</span>
                          </div>
                          <ul className="divide-y divide-slate-200">
                            {filteredDeals.map((deal) => (
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
                                } else {
                                  setExpandedDealId(deal.id);
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
                                        href={`/deal/${deal.id}`} 
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
                                {!showArchivedDeals ? (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleArchiveDeal(deal.id);
                                    }}
                                    className="text-slate-300 hover:text-amber-600 transition-colors"
                                    title={t.archiveDeal}
                                  >
                                    <ArchiveRestore className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRestoreDeal(deal.id);
                                      }}
                                      className="text-slate-300 hover:text-emerald-600 transition-colors"
                                      title={t.restoreDeal}
                                    >
                                      <ArchiveRestore className="h-4 w-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleHardDeleteDeal(deal.id);
                                      }}
                                      className="text-slate-300 hover:text-red-600 transition-colors"
                                      title={t.hardDeleteDeal}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        
                        {/* Expanded Details - Moderator Form */}
                        {expandedDealId === deal.id && (
                          <DealEditor 
                            deal={deal} 
                            carDb={carDb} 
                            lenders={lenders} 
                            onSave={handleUpdateDeal} 
                            onCancel={() => setExpandedDealId(null)} 
                            t={t} 
                          />
                        )}
                      </li>
                            ))}
                          </ul>
                        </>
                      );
                    })()}
                  </div>
                  
                  {dealsTotalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6 p-4 border-t border-slate-200">
                      <button
                        onClick={() => setDealsPage(p => Math.max(1, p - 1))}
                        disabled={dealsPage === 1 || loading}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 text-sm text-slate-500">
                        Page {dealsPage} of {dealsTotalPages}
                      </span>
                      <button
                        onClick={() => setDealsPage(p => Math.min(dealsTotalPages, p + 1))}
                        disabled={dealsPage === dealsTotalPages || loading}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'cars' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <Suspense fallback={<AdminLoader />}>
              <CarsAdmin />
            </Suspense>
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
                  onClick={() => fetchUsers()}
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
              {usersTotalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6 p-4 border-t border-slate-200">
                  <button
                    onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                    disabled={usersPage === 1 || loading}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-slate-500">
                    Page {usersPage} of {usersTotalPages}
                  </span>
                  <button
                    onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                    disabled={usersPage === usersTotalPages || loading}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">{t.siteConfiguration || 'Site Configuration'}</h2>
              <p className="text-sm text-slate-500">
                {t.siteConfigDesc || 'Configure global settings that affect calculator calculations and site behavior.'}
              </p>
            </div>
            <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t.platformFee}</label>
                  <p className="text-[10px] text-slate-500 mb-1">Комиссия платформы (Platform Fee).</p>
                  <input
                    type="number"
                    value={settings.platformFee}
                    onChange={(e) => setSettings({...settings, platformFee: parseInt(e.target.value)})}
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
                  <label className="block text-sm font-medium text-slate-700">{t.dmvFee || 'DMV Fee'}</label>
                  <p className="text-[10px] text-slate-500 mb-1">{t.dmvFeeDesc || 'Default vehicle registration fee.'}</p>
                  <input
                    type="number"
                    value={settings.dmvFee || 400}
                    onChange={(e) => setSettings({...settings, dmvFee: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t.docFee || 'Doc Fee'}</label>
                  <p className="text-[10px] text-slate-500 mb-1">{t.docFeeDesc || 'Dealer document processing fee.'}</p>
                  <input
                    type="number"
                    value={settings.docFee || 85}
                    onChange={(e) => setSettings({...settings, docFee: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t.acquisitionFee || 'Acquisition Fee'}</label>
                  <p className="text-[10px] text-slate-500 mb-1">{t.acquisitionFeeDesc || 'Bank fee for opening a lease.'}</p>
                  <input
                    type="number"
                    value={settings.acquisitionFee || 650}
                    onChange={(e) => setSettings({...settings, acquisitionFee: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">{t.dispositionFee || 'Disposition Fee'}</label>
                  <p className="text-[10px] text-slate-500 mb-1">{t.dispositionFeeDesc || 'Fee for returning the car at the end of the lease.'}</p>
                  <input
                    type="number"
                    value={settings.dispositionFee || 395}
                    onChange={(e) => setSettings({...settings, dispositionFee: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Smart Routing Strategy</label>
                  <p className="text-xs text-slate-500 mb-2">Determines how the Deal Engine selects the best lender when multiple programs are available.</p>
                  <select
                    value={settings.routingStrategy || 'BEST_FOR_CUSTOMER'}
                    onChange={(e) => setSettings({...settings, routingStrategy: e.target.value})}
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="BEST_FOR_CUSTOMER">Best for Customer (Lowest Monthly Payment)</option>
                    <option value="HIGHEST_PROFIT">Highest Profit (Prioritize Dealer Reserve / Markup)</option>
                    <option value="HIGHEST_APPROVAL">Highest Approval Rate (Prioritize Captive/Preferred Lenders)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">{t.supportEmail}</label>
                  <p className="text-[10px] text-slate-500 mb-1">{t.supportEmailDesc || 'Email for new lead notifications and support.'}</p>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
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

                <div className="sm:col-span-2 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">700Credit Integration</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Account ID</label>
                      <input
                        type="text"
                        value={settings.credit700AccountId || ''}
                        onChange={(e) => setSettings({...settings, credit700AccountId: e.target.value})}
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Password</label>
                      <input
                        type="password"
                        value={settings.credit700Password || ''}
                        onChange={(e) => setSettings({...settings, credit700Password: e.target.value})}
                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      />
                    </div>
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
                  <h3 className="text-lg font-bold text-slate-900">{t.systemStatus || 'System Status'}</h3>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-700">{t.domainAuthorization || 'Domain Authorization'}</span>
                      {window.location.hostname === 'hunter.lease' ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">{t.verified || 'Verified'}</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">{t.actionRequired || 'Action Required'}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      {window.location.hostname === 'hunter.lease' 
                        ? (t.domainVerifiedDesc || 'Your domain is correctly configured and authorized for Firebase Authentication.')
                        : (t.domainActionRequiredDesc || 'If authentication fails on hunter.lease, ensure it\'s added to "Authorized Domains" in Firebase Console.')}
                    </p>
                    <a 
                      href="https://console.firebase.google.com/project/_/authentication/settings" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      {t.goToFirebaseConsole || 'Open Firebase Console'} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-700">{t.sitePreview || 'Site Preview'}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">{t.active || 'Active'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      {t.sitePreviewDesc || 'If the preview doesn\'t load in the dashboard, try opening it in a new tab.'}
                    </p>
                    <button 
                      onClick={() => window.open('/', '_blank')}
                      className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="w-3 h-3" /> {t.openLiveSite || 'Open Live Site'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">{t.dangerZone || 'Danger Zone'}</h3>
                <p className="text-sm text-slate-500 mb-6">{t.dangerZoneDesc || 'Irreversible actions for your application data.'}</p>
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 border border-red-100 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                    <div className="text-left">
                      <p className="text-sm font-bold">{t.maintenanceMode || 'Maintenance Mode'}</p>
                      <p className="text-xs opacity-70">{t.maintenanceDesc || 'Disable public access to the calculator'}</p>
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
            <Suspense fallback={<AdminLoader />}>
              <MediaAdmin />
            </Suspense>
          </section>
        )}
        {activeTab === 'banks' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <Suspense fallback={<AdminLoader />}>
              <BanksAdmin />
            </Suspense>
          </section>
        )}
        {activeTab === 'analytics' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <Suspense fallback={<AdminLoader />}>
              <AnalyticsAdmin adminRole={adminRole} />
            </Suspense>
          </section>
        )}
        {activeTab === 'reviews' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <Suspense fallback={<AdminLoader />}>
              <ReviewsAdmin />
            </Suspense>
          </section>
        )}
        {activeTab === 'feedback' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <Suspense fallback={<AdminLoader />}>
              <FeedbackAdmin />
            </Suspense>
          </section>
        )}
        {activeTab === 'audit' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <Suspense fallback={<AdminLoader />}>
              <AuditLogsAdmin />
            </Suspense>
          </section>
        )}
        {activeTab === 'calculator-audit' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <Suspense fallback={<AdminLoader />}>
              <CalculatorAuditAdmin />
            </Suspense>
          </section>
        )}
        {activeTab === 'blog' && (
          <section className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-6">
            <Suspense fallback={<AdminLoader />}>
              <BlogAdmin />
            </Suspense>
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
                              {lead.source === 'custom_calculator' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                  Custom Calculator
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                lead.depositStatus === 'paid' 
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                              }`}>
                                Deposit: {lead.depositStatus || 'pending'}
                              </span>
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
                                <p><span className="font-medium">{t.depositStatus}:</span> <span className={`font-bold ${lead.depositStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{lead.depositStatus || 'pending'}</span></p>
                                {lead.depositAmount && <p><span className="font-medium">{t.depositAmount}:</span> ${(lead.depositAmount / 100).toFixed(2)}</p>}
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
                                <p><span className="font-medium">{t.payment}:</span> ${lead.calc?.payment}{t.mo}</p>
                                <p><span className="font-medium">{t.down}:</span> ${lead.calc?.down}</p>
                                <p><span className="font-medium">{(t as any).term || 'Term'}:</span> {lead.calc?.term}</p>
                                <p><span className="font-medium">{t.mileage}:</span> {lead.calc?.mileage}</p>
                                <p><span className="font-medium">{t.tier}:</span> {lead.calc?.tier}</p>
                                <p><span className="font-medium">{(t as any).zipCode || 'ZIP'}:</span> {lead.calc?.zip}</p>
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
                                  onClick={() => setCloseLeadModal({ isOpen: true, leadId: lead.id, brokerFee: 0, dealerReserve: 0 })}
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

        {activeTab === 'calibrator' && (
          <section className="animate-fade-in">
            <Suspense fallback={<AdminLoader />}>
              <CalibratorLeadsAdmin />
            </Suspense>
          </section>
        )}

        {activeTab === 'promo-ai' && (
          <section className="animate-fade-in">
            <Suspense fallback={<AdminLoader />}>
              <PromoAIAdmin />
            </Suspense>
          </section>
        )}
        
        {activeTab === 'incentives' && (
          <section className="animate-fade-in">
            <Suspense fallback={<AdminLoader />}>
              <IncentivesAdmin />
            </Suspense>
          </section>
        )}
        
        {activeTab === 'bulk-edit' && (
          <section className="animate-fade-in">
            <Suspense fallback={<AdminLoader />}>
              <BulkEditAdmin />
            </Suspense>
          </section>
        )}
        
        {activeTab === 'dealers' && (
          <section className="animate-fade-in">
            <Suspense fallback={<AdminLoader />}>
              <DealersAdmin />
            </Suspense>
          </section>
        )}

        {activeTab === 'promos' && (
          <section className="animate-fade-in">
            <Suspense fallback={<AdminLoader />}>
              <PromoCodesAdmin />
            </Suspense>
          </section>
        )}
          </div>
        </main>
      </div>
      {closeLeadModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Close Deal & Record Revenue</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Broker Fee ($)</label>
                  <input
                    type="number"
                    value={closeLeadModal.brokerFee}
                    onChange={(e) => setCloseLeadModal(prev => ({ ...prev, brokerFee: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dealer Reserve ($)</label>
                  <input
                    type="number"
                    value={closeLeadModal.dealerReserve}
                    onChange={(e) => setCloseLeadModal(prev => ({ ...prev, dealerReserve: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3 border-t border-slate-100">
              <button
                onClick={() => setCloseLeadModal({ isOpen: false, leadId: '', brokerFee: 0, dealerReserve: 0 })}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => updateLeadStatus(closeLeadModal.leadId, 'closed', closeLeadModal.brokerFee * 100, closeLeadModal.dealerReserve * 100)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Mark as Closed
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmColor={confirmModal.confirmColor}
      />
      <OfferBuilderModal
        isOpen={showOfferBuilder}
        onClose={() => setShowOfferBuilder(false)}
        onSave={() => {
          fetchDeals(false, dealsPage);
          fetchStats();
        }}
      />
      <VinDecoderModal 
        isOpen={isVinModalOpen} 
        onClose={() => setIsVinModalOpen(false)} 
        onSave={handleVinSave} 
        carDb={carDb}
      />
      <BulkEditDealsModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        selectedDealIds={selectedDeals}
        lenders={lenders}
        onSuccess={() => {
          setSelectedDeals([]);
          fetchDeals(true, dealsPage);
        }}
      />
      <BulkGenerateModal
        isOpen={isBulkGenerateModalOpen}
        onClose={() => setIsBulkGenerateModalOpen(false)}
        onComplete={() => {
          fetchDeals(true, dealsPage);
        }}
        carDb={carDb}
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
