import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, User, Car, CreditCard, Briefcase, 
  CheckCircle2, AlertTriangle, MessageSquare, Copy, Save,
  ChevronRight, ChevronDown, Info, Calculator as CalcIcon, FileText
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Calculator } from '../components/Calculator';

const OBJECTIONS = [
  {
    title: 'Хард чеки?',
    text: 'Когда мы обзвоним до 15 дилерских и найдем лучшее предложение под вашу кредитную историю, Вы согласуете условия - и только тогда мы подаем заявку в банк и будет 1-2 хард чека (сам дилер и банк).'
  },
  {
    title: 'Зачем аппликация?',
    text: 'Мы можем обсудить рынок и общую картину, но без аппликации это будут предположения, а не реальные цифры. Это стандартная процедура, которая позволяет максимально близко понять без хардчеков: одобрение, реальный платёж, первый взнос.'
  },
  {
    title: 'Зачем SSN?',
    text: 'Эти данные нужны не нам, а банкам. По сути, я выполняю роль кредитного специалиста дилера. На основании SSN, дохода и занятости я выстраиваю стратегию подбора: с какими банками работать, какие бренды реально одобряют.'
  },
  {
    title: 'Зачем депозит?',
    text: 'Депозит — это не оплата услуги. Это сигнал дилерам, что клиент реальный и готов купить. Именно поэтому условия становятся лучше. Дилеры не оставляют запас "на торг", а сразу дают лучшие условия.'
  },
  {
    title: 'Нужно подумать',
    text: 'Правильно понимаю, что вопрос не в самом варианте, а нужно время? Предложения от дилеров действуют ограниченное время (до конца дня). Я выхожу с вариантом, вы смотрите, решение принимаете в рамках окна (макс 2 дня). Такой формат ок?'
  }
];

export const Calibrator = () => {
  const { user, role } = useAuthStore();
  const isAdmin = role === 'admin';
  
  const [activeTab, setActiveTab] = useState<'form' | 'calculator'>('form');

  // Form State
  const [formData, setFormData] = useState({
    brokerName: '',
    clientNameCity: '',
    selectedCarFromCalc: null as any,
    carOptions: [] as string[],
    carPurpose: '',
    firstTimeBuyer: '',
    buyType: '',
    previousCarDetails: '',
    currentLoanStatus: '',
    cosigner: '',
    hasCosigner: false,
    creditHistoryLength: '',
    firstCreditCard: '',
    creditLimits: '',
    workplace: '',
    incomeType: '',
    timeAtJob: '',
    monthlyIncome: '',
    incomeProof: '',
    selfRating: '',
    ficoScore: '',
    preference: '',
    comfortablePayment: '',
    downPayment: '',
    priority: '',
    alternativeCars: '',
    readyToListen: '',
    understandProcess: '',
    readySameDay: ''
  });

  const [activeObjection, setActiveObjection] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAltCalc, setShowAltCalc] = useState(false);
  const [altCalcData, setAltCalcData] = useState<any>(null);

  // Hotkeys for objections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        const key = parseInt(e.key);
        if (key >= 1 && key <= OBJECTIONS.length) {
          e.preventDefault();
          setActiveObjection(prev => prev === key - 1 ? null : key - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle input changes
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckbox = (field: string, value: string) => {
    setFormData(prev => {
      const current = prev[field as keyof typeof prev] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const handleCalculatorChange = (calcData: any) => {
    setFormData(prev => ({ ...prev, selectedCarFromCalc: calcData }));
  };

  // Lead Scoring Logic
  const leadScore = useMemo(() => {
    let score = 100;
    let color = 'bg-green-500';
    let text = 'Легкая сделка';

    if (formData.firstTimeBuyer === 'Нет, не покупал, первый авто' && !formData.hasCosigner) score -= 20;
    if (formData.incomeType === '1099 / self-employed' || formData.incomeType === 'Собственный бизнес') score -= 15;
    if (formData.incomeType === 'Временно без работы') score -= 40;
    if (formData.currentLoanStatus === 'Есть, кредит активный') score -= 10;
    
    const fico = parseInt(formData.ficoScore);
    if (fico) {
      if (fico < 600 && !formData.hasCosigner) score -= 40;
      else if (fico < 660 && !formData.hasCosigner) score -= 20;
      else if (fico > 730 || formData.hasCosigner) score += 10;
    }

    if (score >= 80) { color = 'bg-emerald-500'; text = 'Высокая вероятность (Зеленый)'; }
    else if (score >= 50) { color = 'bg-amber-500'; text = 'Требует работы (Желтый)'; }
    else { color = 'bg-rose-500'; text = 'Тяжелый лид / Отказ (Красный)'; }

    return { score, color, text };
  }, [formData]);

  // Risk Matrix Logic
  const riskCategory = useMemo(() => {
    if (formData.hasCosigner) return 1; // Strong cosigner bypasses all penalties

    const fico = parseInt(formData.ficoScore);
    if (!fico) return null;
    
    let cat = 5;
    if (fico >= 700) cat = 1;
    else if (fico >= 660) cat = 3;
    else if (fico >= 620) cat = 4;
    else cat = 5;

    // FTB Rule: Max Category 3
    if (formData.firstTimeBuyer === 'Нет, не покупал, первый авто' && cat < 3) {
      cat = 3;
    }
    
    // Authorized User / Secured Card Rule (simplified: if low limit or short history)
    if (cat === 3 && (formData.firstCreditCard === 'До 6 мес' || formData.firstCreditCard === 'До 12 мес')) {
      cat = 4;
    }

    return cat;
  }, [formData.ficoScore, formData.firstTimeBuyer, formData.firstCreditCard, formData.hasCosigner]);

  const BRAND_MATRIX: Record<string, Record<number, string>> = {
    'Kia / Hyundai / Nissan': { 1: '$0 - $1k', 3: '$0 - $1k', 4: '$1k - $3k', 5: '$3k' },
    'Toyota / Honda / Subaru': { 1: '$0 - $2k', 3: '$0 - $3k', 4: '$2k - $4k', 5: 'от $15k (Отказ)' },
    'Lexus / Acura': { 1: '$0 - $1k', 3: '$3k - $5k', 4: '$5k - $8k', 5: 'от $15k (Отказ)' },
    'BMW / MBZ / Audi': { 1: '$0 - $3k', 3: '$3k - $8k', 4: '$8k - $12k', 5: 'от $15k (Отказ)' },
    'Porsche / Land Rover': { 1: '$1k - $5k', 3: 'от $10k', 4: 'СТОП', 5: 'СТОП' }
  };

  const generateMessage = () => {
    let brandsList = '- Toyota\n- Lexus\n- Kia';
    if (formData.alternativeCars) {
      const brands = formData.alternativeCars.split(',').map(b => b.trim()).filter(b => b);
      if (brands.length > 0) brandsList = brands.map(b => `- ${b}`).join('\n');
    } else if (formData.selectedCarFromCalc) {
      brandsList = `- ${formData.selectedCarFromCalc.make} ${formData.selectedCarFromCalc.model}`;
      if (altCalcData) {
        brandsList += `\n- ${altCalcData.make} ${altCalcData.model}`;
      }
    }
    
    const msg = `Добрый день, ${formData.clientNameCity.split(',')[0] || 'Имя'}.

В продолжение нашего диалога направляю реквизиты для внесения депозита.

Zelle: Cargwin4555@gmail.com
Получатель: Cargwin LLC
Сумма: $95

Депозит принимается для работы по следующим брендам:
${brandsList}

Условия работы:
- Работа по депозиту ведется только в рамках указанных брендов
- Срок первичного поиска и получения одобрения - 4 рабочих дня
- Если в течение 4 рабочих дней по указанным брендам не получено ни одного одобрения - депозит возвращается
- Если одобрение получено хотя бы в одном из указанных брендов, но вы принимаете решение не продолжать сделку - депозит считается отработанным
- Переход на другие бренды возможен только после письменного согласования

Оплачивая депозит - вы автоматически соглашаетесь с условиями.
Просьба направить скриншот перевода.

Ниже ссылка для заполнения кредитной анкеты:
https://hunter.lease/

Далее, отправьте мне фото Driver License в этот чат.
Напишите пожалуйста, когда заполните и отправите. Спасибо!`;

    navigator.clipboard.writeText(msg);
    toast.success('Сообщение скопировано в буфер обмена!');
  };

  const saveLead = async () => {
    if (!isAdmin) {
      toast.error('Только администраторы могут сохранять калибровки');
      return;
    }
    
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'calibrator_leads'), {
        ...formData,
        score: leadScore.score,
        scoreText: leadScore.text,
        brokerId: user?.uid,
        status: 'new',
        createdAt: serverTimestamp()
      });
      toast.success('Калибровка успешно сохранена!');
      // Reset form or keep it depending on preference
    } catch (error) {
      console.error('Error saving calibrator lead:', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Доступ запрещен</h1>
          <p className="text-slate-500 mt-2">Эта страница доступна только брокерам.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* LEFT PANEL: SCRIPT & HINTS (TELEPROMPTER) */}
      <div className="w-full md:w-1/2 h-screen overflow-y-auto border-r border-slate-200 bg-white p-6 md:p-10 custom-scrollbar relative pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">Скрипт Калибровки</h1>
            <p className="text-slate-500">Помощь брокеру в определении реальных возможностей клиента.</p>
            <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-3">
              <Info className="w-5 h-5 text-indigo-600 shrink-0" />
              <p className="text-sm text-indigo-900 font-medium">Менеджеру: говори спокойно, не быстро. Это сразу поднимает доверие.</p>
            </div>
          </div>

          <div className="space-y-10">
            {/* Вступление */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">1</span>
                Вступление
              </h2>
              <div className="prose prose-slate prose-sm">
                <p><strong>— Здравствуйте, {formData.clientNameCity.split(',')[0] || '[ИМЯ]'}! Вы знаете в каком формате мы работаем?</strong></p>
                <p><em>(Если нет, рассказываем):</em></p>
                <ol>
                  <li>Вы рассказываете какой авто хотите - я записываю, помогаю определиться.</li>
                  <li>Анализирую ваш кредитный профиль, чтобы не делать лишних хард чеков, отказов в истории и помочь скорректировать запрос.</li>
                  <li>Приступаю к обратному аукциону и связываюсь до 15 дилерских центров.</li>
                  <li>Работаю с генеральным менеджером или флит отделом - ТОЛЬКО они могут принять окончательное решение о цене.</li>
                </ol>
                <p><strong>Как я получаю от них лучший платеж?</strong></p>
                <ul>
                  <li>У меня уже сложившаяся репутация. Дилер честно сразу говорит, сделает он мне предельную цену или нет.</li>
                  <li>Наша покупка поможет им сделать план продаж и получить бонус от завода.</li>
                </ul>
                <p><strong>На что я давлю при общении с дилером?</strong></p>
                <ul>
                  <li>Мои клиенты готовы к покупке и они с депозитом - для дилера это сильный сигнал.</li>
                  <li>Дилеры знают, что я все равно позвоню еще 3-4 конкурентам. У них отпадает желание играть в игры.</li>
                </ul>
                <div className="p-4 bg-slate-100 rounded-lg border-l-4 border-slate-400 mt-4">
                  <p className="font-bold mb-2">Поэтому я заранее договариваюсь с клиентом:</p>
                  <p>— Если я приступаю к работе, вы готовы к сделке день в день?</p>
                  <p>— Что касаемо депозита, после того, как я получу лучший платеж под ваш профиль и одобрение, и вы по любой своей причине решите не забирать автомобиль - моя работа сделана и депозит невозвратный. Для вас это справедливо?</p>
                </div>
                <p className="mt-4 font-bold text-indigo-700">— Хорошо, продолжим. Сейчас я задам вопросы. Отвечайте так, как есть. Это не проверка и не оценка. Это основа, чтобы потом не было сюрпризов. Поехали.</p>
              </div>
            </section>

            {/* Динамические подсказки */}
            <AnimatePresence>
              {formData.firstTimeBuyer === 'Нет, не покупал, первый авто' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> First-time buyer</h4>
                  <p className="text-sm text-amber-900">Почти всегда завышенные ожидания. <strong>Цель:</strong> Увеличить глубину разъяснений. Первый авто всегда НЕ самый выгодный - это нормально, кредитная история только начинает формироваться.</p>
                </motion.div>
              )}

              {formData.currentLoanStatus === 'Есть, кредит активный' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                  <h4 className="font-bold text-rose-800 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> Активный кредит</h4>
                  <p className="text-sm text-rose-900">Возможный негативный остаток (Negative Equity). Каждая $1000 негатива = +$35 в лизинге или +$18 в кредите. Клиент обязан знать, что негатив увеличит платеж!</p>
                </motion.div>
              )}

              {(formData.incomeType === '1099 / self-employed' || formData.incomeType === 'Временно без работы') && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> Сложный доход</h4>
                  <p className="text-sm text-orange-900">Без подтверждённого дохода Toyota, Lexus, MBZ, BMW, Audi почти недоступны (разве что скор &gt;750 и закрытый кредит). Возможен только через большой down payment ($5 000+).</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Калибровка */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">2</span>
                Калибровка запроса
              </h2>
              <div className="prose prose-slate prose-sm">
                <p><strong>Текст, который брокер проговаривает клиенту:</strong></p>
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p>— По тем данным, которые вы дали, уже видно, как рынок будет на это реагировать.</p>
                  <p>При таких вводных часть вариантов либо не подтверждается банками, либо подтверждается на других цифрах. Это не вопрос желания. Это вопрос условий.</p>
                  <p>В этой ситуации рынок предлагает два рабочих сценария:</p>
                  <ol>
                    <li>Оставаться в желаемом классе автомобиля и принимать более высокий платеж или первый взнос.</li>
                    <li>Выбрать вариант проще сейчас и через 6–12 месяцев перейти на уровень выше уже на более комфортных условиях.</li>
                  </ol>
                  <p>Я могу разложить оба сценария по цифрам. Вы выбираете, что для вас сейчас логичнее.</p>
                </div>
                
                <p className="mt-4 font-bold text-slate-900">— Скажите сразу, чтобы мы не тратили время зря. Вы готовы рассматривать мои рекомендации, если они будут отличаться от первоначального запроса, но будут безопаснее и выгоднее для вас?</p>
                <p className="text-xs text-slate-500">Если да - двигаемся дальше. Если нет - я честно не буду начинать подбор, чтобы не создавать ложных ожиданий.</p>
              </div>
            </section>

            {/* Депозит */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">3</span>
                Закрытие на Депозит
              </h2>
              <div className="prose prose-slate prose-sm">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p>— Перед тем как мы начнём активную работу с дилерами, мы просим внести депозит.</p>
                  <p>Это не оплата услуг. Эти деньги никуда не пропадают и полностью идут в ваш первый взнос за автомобиль.</p>
                  <p>Депозит нужен для одного простого момента. Мы общаемся напрямую с руководством дилерских центров. Они знают, что наши клиенты заходят в процесс уже с депозитом.</p>
                  <p>Для дилера это означает одно. Перед ним не человек «просто спросить», а покупатель. Поэтому нам отвечают быстрее, сразу дают лучшие условия и не тянут с разговорами.</p>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Floating Objection Handling Bar */}
        <div className="fixed bottom-0 left-0 w-full md:w-1/2 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Отработка возражений</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {OBJECTIONS.map((obj, idx) => (
              <button
                key={idx}
                onClick={() => setActiveObjection(activeObjection === idx ? null : idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeObjection === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <span className="opacity-50 mr-1">[Alt+{idx + 1}]</span> {obj.title}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {activeObjection !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-3 p-3 bg-slate-800 text-white rounded-xl text-sm leading-relaxed relative"
              >
                {OBJECTIONS[activeObjection].text}
                <button onClick={() => setActiveObjection(null)} className="absolute top-2 right-2 text-slate-400 hover:text-white">✕</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT PANEL: FORM & CALCULATOR */}
      <div className="w-full md:w-1/2 h-screen overflow-y-auto bg-slate-50 p-6 md:p-10 custom-scrollbar">
        <div className="max-w-xl mx-auto space-y-8">
          
          {/* Header & Score */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-900">Анкета клиента</h2>
                <p className="text-xs text-slate-500">Заполняйте в процессе разговора</p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 ${leadScore.color} transition-colors`}>
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {leadScore.text} ({leadScore.score})
              </div>
            </div>

          </div>

          <div className="space-y-6">
            
            {/* 1. Базовая инфа */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><User className="w-5 h-5 text-indigo-500" /> Базовая информация</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Менеджер</label>
                  <select value={formData.brokerName} onChange={e => handleChange('brokerName', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Выберите...</option>
                    <option value="Марк">Марк</option>
                    <option value="Катя">Катя</option>
                    <option value="Азат">Азат</option>
                    <option value="Давид">Давид</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Имя клиента, Город</label>
                  <input type="text" value={formData.clientNameCity} onChange={e => handleChange('clientNameCity', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Иван, Майами" />
                </div>
              </div>
            </div>

            {/* 2. Автомобиль (Калькулятор) */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Car className="w-5 h-5 text-indigo-500" /> Основной вариант</h3>
                {!showAltCalc && (
                  <button onClick={() => setShowAltCalc(true)} className="text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors">+ Сравнить с другим</button>
                )}
              </div>
              <Calculator mode="calibrator" onChange={handleCalculatorChange} />
              
              {showAltCalc && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><Car className="w-5 h-5 text-slate-400" /> Альтернативный вариант</h3>
                    <button onClick={() => { setShowAltCalc(false); setAltCalcData(null); }} className="text-xs text-rose-500 font-bold hover:text-rose-700 transition-colors">Убрать</button>
                  </div>
                  <Calculator mode="calibrator" onChange={setAltCalcData} />
                </div>
              )}

              <div className="mt-6 px-2 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Важные опции</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Адаптивный круиз', 'Камера 360', 'Премиум музыка', 'Слепые зоны', '3 ряд', 'Apple/Android', 'Не имеет значения'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={formData.carOptions.includes(opt)} onChange={() => handleCheckbox('carOptions', opt)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Для каких целей?</label>
                  <input type="text" value={formData.carPurpose} onChange={e => handleChange('carPurpose', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Семья, работа, Uber..." />
                </div>
              </div>
            </div>

            {/* 3. Опыт и Кредиты */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-500" /> Опыт и Кредиты</h3>
              
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.hasCosigner} 
                    onChange={e => handleChange('hasCosigner', e.target.checked)} 
                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" 
                  />
                  <div>
                    <div className="font-bold text-indigo-900 text-sm">Есть сильный Cosigner (FICO 700+)</div>
                    <div className="text-xs text-indigo-700">Снимает штрафы за First Time Buyer и низкий FICO</div>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">4. Покупали авто в США?</label>
                <select value={formData.firstTimeBuyer} onChange={e => handleChange('firstTimeBuyer', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Выберите...</option>
                  <option value="Нет, не покупал, первый авто">Нет, первый авто (First-time buyer)</option>
                  <option value="Да, покупал">Да, покупал</option>
                </select>
              </div>

              {formData.firstTimeBuyer === 'Да, покупал' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">6. Как покупали?</label>
                    <select value={formData.buyType} onChange={e => handleChange('buyType', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Выберите...</option>
                      <option value="Кредит">Кредит</option>
                      <option value="Лизинг">Лизинг</option>
                      <option value="Наличные">Наличные</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">7. Какой авто? Платеж? Pay-off?</label>
                    <input type="text" value={formData.previousCarDetails} onChange={e => handleChange('previousCarDetails', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Camry 2020, $400/mo, pay-off $15k" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">8. Статус кредита сейчас?</label>
                    <select value={formData.currentLoanStatus} onChange={e => handleChange('currentLoanStatus', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Выберите...</option>
                      <option value="Есть, покупал за наличные">Покупал за наличные</option>
                      <option value="Есть, кредит активный">Кредит активный</option>
                      <option value="Есть, кредит закрыт">Кредит закрыт</option>
                      <option value="Нет автомобиля">Нет автомобиля</option>
                      <option value="Нет, но кредит закрыт">Нет, но кредит закрыт</option>
                    </select>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">10. Возраст первой кредитки</label>
                  <select value={formData.firstCreditCard} onChange={e => handleChange('firstCreditCard', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Выберите...</option>
                    <option value="До 6 мес">До 6 мес</option>
                    <option value="До 12 мес">До 12 мес</option>
                    <option value="До 24 мес">До 24 мес</option>
                    <option value="Более 24 мес">Более 24 мес</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">18. FICO Score</label>
                  <input type="number" value={formData.ficoScore} onChange={e => handleChange('ficoScore', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Например: 720" />
                </div>
              </div>

              {/* Dynamic Risk Matrix Display */}
              {riskCategory !== null && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-slate-900 rounded-xl text-white shadow-lg">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-3">
                    <h4 className="font-bold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-emerald-400" /> 
                      Оценка рисков
                    </h4>
                    <span className="px-2 py-1 bg-slate-800 rounded text-xs font-bold text-slate-300">
                      Категория {riskCategory}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 mb-2">Требуемый первый взнос (Down Payment) по брендам:</div>
                    {Object.entries(BRAND_MATRIX).map(([brand, tiers]) => (
                      <div key={brand} className="flex justify-between items-center text-sm">
                        <span className="text-slate-300">{brand}</span>
                        <span className={`font-bold ${tiers[riskCategory].includes('СТОП') || tiers[riskCategory].includes('Отказ') ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {tiers[riskCategory]}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* 4. Работа и Доход */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-500" /> Работа и Доход</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">13. Тип дохода</label>
                  <select value={formData.incomeType} onChange={e => handleChange('incomeType', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Выберите...</option>
                    <option value="W2 (официальная работа)">W2 (официальная работа)</option>
                    <option value="1099 / self-employed">1099 / self-employed</option>
                    <option value="Собственный бизнес">Собственный бизнес</option>
                    <option value="Временно без работы">Временно без работы</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">15. Доход в месяц (Gross)</label>
                  <input type="number" value={formData.monthlyIncome} onChange={e => handleChange('monthlyIncome', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="$" />
                </div>
              </div>
            </div>

            {/* 5. Финансы и Ожидания */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-indigo-500" /> Ожидания</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">20. Комфортный платеж</label>
                  <input type="text" value={formData.comfortablePayment} onChange={e => handleChange('comfortablePayment', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="$400 - $500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">21. Первый взнос (Down)</label>
                  <input type="text" value={formData.downPayment} onChange={e => handleChange('downPayment', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="$2000" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">23. Альтернативные авто (2-3 шт)</label>
                <input type="text" value={formData.alternativeCars} onChange={e => handleChange('alternativeCars', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Honda Accord, Kia K5..." />
                <p className="text-[10px] text-slate-400 mt-1">Без 1 основного + 2 альтернатив подбор запрещён.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button 
                onClick={saveLead}
                disabled={isSaving || !formData.clientNameCity}
                className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold text-sm py-4 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : <><Save className="w-4 h-4" /> Сохранить профиль</>}
              </button>
              <button 
                onClick={generateMessage}
                className="flex-1 bg-indigo-600 text-white font-bold text-sm py-4 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Copy className="w-4 h-4" /> Генерация сообщения
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
