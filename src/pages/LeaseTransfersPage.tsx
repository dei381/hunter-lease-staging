import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, ShieldCheck, MapPin, Calendar, Gauge, DollarSign, ArrowRight, Plus } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { cn } from '../utils/cn';
import { ListLeaseModal } from '../components/ListLeaseModal';

// Mock data for lease transfers
const MOCK_TRANSFERS = [
  {
    id: 1,
    make: 'BMW',
    model: 'M340i xDrive',
    year: 2023,
    payment: 685,
    monthsLeft: 14,
    currentMileage: 12500,
    allowedMileage: 30000,
    incentive: 1500,
    location: 'Los Angeles, CA',
    image: 'https://images.unsplash.com/photo-1555353540-64fd8b0ebd36?auto=format&fit=crop&q=80',
    originalDown: 3000,
    transferFee: 500,
    seller: 'Alex M.',
    verified: true
  },
  {
    id: 2,
    make: 'Tesla',
    model: 'Model Y Long Range',
    year: 2024,
    payment: 499,
    monthsLeft: 22,
    currentMileage: 8000,
    allowedMileage: 36000,
    incentive: 0,
    location: 'Miami, FL',
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80',
    originalDown: 0,
    transferFee: 150,
    seller: 'Sarah J.',
    verified: true
  },
  {
    id: 3,
    make: 'Porsche',
    model: 'Macan S',
    year: 2022,
    payment: 890,
    monthsLeft: 8,
    currentMileage: 24000,
    allowedMileage: 30000,
    incentive: 2000,
    location: 'New York, NY',
    image: 'https://images.unsplash.com/photo-1503376713356-20f6266b41ce?auto=format&fit=crop&q=80',
    originalDown: 5000,
    transferFee: 900,
    seller: 'Michael T.',
    verified: false
  },
  {
    id: 4,
    make: 'Lexus',
    model: 'RX 350 Premium',
    year: 2023,
    payment: 550,
    monthsLeft: 18,
    currentMileage: 15000,
    allowedMileage: 36000,
    incentive: 500,
    location: 'Dallas, TX',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&q=80',
    originalDown: 2000,
    transferFee: 200,
    seller: 'David W.',
    verified: true
  }
];

export const LeaseTransfersPage = () => {
  const { language } = useLanguageStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  const t = {
    en: {
      title: 'Lease Assumption Marketplace',
      subtitle: 'Take over a short-term lease with no down payment, or exit your current lease early without penalties.',
      searchPlaceholder: 'Search makes, models...',
      listBtn: 'List Your Lease',
      filters: 'Filters',
      mo: '/mo',
      monthsLeft: 'Months Left',
      milesLeft: 'Miles Left',
      incentive: 'Cash Incentive',
      effective: 'Effective',
      verified: 'Verified Seller',
      takeOver: 'Take Over Lease',
      listModalTitle: 'List Your Lease',
      listModalDesc: 'Enter your vehicle details to find a buyer and exit your lease early.',
      comingSoon: 'Listing feature is coming soon!'
    },
    ru: {
      title: 'Биржа передачи лизинга',
      subtitle: 'Возьмите краткосрочный лизинг без первого взноса или выйдите из текущего лизинга без штрафов.',
      searchPlaceholder: 'Поиск марок, моделей...',
      listBtn: 'Выставить авто',
      filters: 'Фильтры',
      mo: '/мес',
      monthsLeft: 'Осталось мес.',
      milesLeft: 'Остаток миль',
      incentive: 'Бонус наличными',
      effective: 'Эффективный',
      verified: 'Проверенный продавец',
      takeOver: 'Забрать лизинг',
      listModalTitle: 'Выставить авто',
      listModalDesc: 'Введите данные вашего автомобиля, чтобы найти покупателя и выйти из лизинга досрочно.',
      comingSoon: 'Функция добавления авто скоро появится!'
    }
  }[language];

  const filteredTransfers = MOCK_TRANSFERS.filter(t => 
    t.make.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="inline-block bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1 rounded-full mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--lime)]">
                Beta
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl uppercase mb-4">
              {t.title}
            </h1>
            <p className="text-[var(--mu)] text-lg">
              {t.subtitle}
            </p>
          </div>
          
          <button 
            onClick={() => setIsListModalOpen(true)}
            className="bg-[var(--w)] text-black px-8 py-4 rounded-xl font-display text-xl uppercase tracking-widest hover:bg-[var(--lime)] transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Plus size={24} />
            {t.listBtn}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--mu2)]" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-4 pl-12 pr-4 text-[var(--w)] focus:outline-none focus:border-[var(--lime)] transition-colors"
            />
          </div>
          <button className="px-6 py-4 bg-[var(--s2)] border border-[var(--b2)] rounded-xl text-[var(--w)] hover:border-[var(--lime)] transition-colors flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs shrink-0">
            <Filter size={16} />
            {t.filters}
          </button>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTransfers.map((transfer) => {
            const milesLeft = transfer.allowedMileage - transfer.currentMileage;
            const effectivePayment = Math.round(transfer.payment - (transfer.incentive / transfer.monthsLeft));

            return (
              <motion.div
                key={transfer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--s2)] border border-[var(--b2)] rounded-2xl overflow-hidden hover:border-[var(--lime)]/50 transition-colors group flex flex-col"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={transfer.image} 
                    alt={`${transfer.year} ${transfer.make} ${transfer.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--s2)] to-transparent" />
                  
                  {transfer.incentive > 0 && (
                    <div className="absolute top-4 right-4 bg-[var(--lime)] text-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                      ${transfer.incentive.toLocaleString()} {t.incentive}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-display text-2xl uppercase">
                        {transfer.year} {transfer.make}
                      </h3>
                      <p className="text-[var(--mu)]">{transfer.model}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-3xl text-[var(--lime)]">
                        ${effectivePayment}
                      </div>
                      <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">
                        {transfer.incentive > 0 ? t.effective + ' ' + t.mo : t.mo}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-[var(--b1)] rounded-xl p-3">
                      <div className="flex items-center gap-2 text-[var(--mu2)] mb-1">
                        <Calendar size={14} />
                        <span className="text-[10px] uppercase tracking-widest">{t.monthsLeft}</span>
                      </div>
                      <div className="font-bold text-lg">{transfer.monthsLeft}</div>
                    </div>
                    <div className="bg-[var(--b1)] rounded-xl p-3">
                      <div className="flex items-center gap-2 text-[var(--mu2)] mb-1">
                        <Gauge size={14} />
                        <span className="text-[10px] uppercase tracking-widest">{t.milesLeft}</span>
                      </div>
                      <div className="font-bold text-lg">{milesLeft.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-6 border-t border-[var(--b2)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[var(--mu2)]" />
                      <span className="text-xs text-[var(--mu)]">{transfer.location}</span>
                    </div>
                    {transfer.verified && (
                      <div className="flex items-center gap-1 text-[var(--lime)] text-[10px] uppercase tracking-widest font-bold">
                        <ShieldCheck size={14} />
                        {t.verified}
                      </div>
                    )}
                  </div>

                  <button className="w-full mt-6 py-4 bg-[var(--b1)] hover:bg-[var(--lime)] hover:text-black text-[var(--w)] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                    {t.takeOver}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredTransfers.length === 0 && (
          <div className="text-center py-24 text-[var(--mu2)]">
            No transfers found matching your search.
          </div>
        )}
      </div>

      {/* List Modal */}
      <ListLeaseModal 
        isOpen={isListModalOpen} 
        onClose={() => setIsListModalOpen(false)} 
      />
    </div>
  );
};
