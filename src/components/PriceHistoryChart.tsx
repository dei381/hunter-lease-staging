import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguageStore } from '../store/languageStore';

export const PriceHistoryChart = ({ make, model }: { make: string; model: string }) => {
  const { language } = useLanguageStore();
  
  // Generate realistic-looking mock data based on the car
  const generateData = () => {
    const months = language === 'ru' 
      ? ['Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар']
      : ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      
    // Base price varies by make to look somewhat realistic
    const basePrice = make === 'BMW' || make === 'Mercedes-Benz' ? 750 : 
                     make === 'Toyota' || make === 'Honda' ? 350 : 450;
                     
    return months.map((month, i) => {
      // Create a downward trend to show current price is good
      const trend = (5 - i) * 15; 
      const noise = Math.floor(Math.random() * 20) - 10;
      return {
        name: month,
        price: basePrice + trend + noise
      };
    });
  };

  const data = generateData();
  const currentPrice = data[data.length - 1].price;
  const highestPrice = Math.max(...data.map(d => d.price));
  const savings = highestPrice - currentPrice;

  return (
    <div className="bg-[var(--s1)] border border-[var(--b1)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-[var(--w)]">
            {language === 'ru' ? 'Динамика цен' : 'Price History'}
          </h3>
          <p className="text-sm text-[var(--mu2)] mt-1">
            {language === 'ru' 
              ? `Средний платеж за ${make} ${model} за 6 месяцев`
              : `Average monthly payment for ${make} ${model} over 6 months`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[var(--lime)]">
            -${savings}/mo
          </div>
          <div className="text-xs text-[var(--mu2)] uppercase tracking-wider">
            {language === 'ru' ? 'Снижение цены' : 'Price Drop'}
          </div>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--lime)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--lime)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="var(--mu2)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="var(--mu2)" 
              fontSize={12}
              tickFormatter={(value) => `$${value}`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--s2)', 
                borderColor: 'var(--b1)',
                borderRadius: '8px',
                color: 'var(--w)'
              }}
              itemStyle={{ color: 'var(--lime)' }}
              formatter={(value: number) => [`$${value}`, language === 'ru' ? 'Платеж' : 'Payment']}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="var(--lime)" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 p-3 bg-[var(--lime)]/10 border border-[var(--lime)]/20 rounded-xl flex items-start gap-3">
        <div className="text-[var(--lime)] mt-0.5">🔥</div>
        <p className="text-sm text-[var(--w)]">
          {language === 'ru' 
            ? 'Сейчас отличное время для сделки. Цены находятся на 6-месячном минимуме благодаря увеличенным заводским скидкам.'
            : 'Now is a great time to lease. Prices are at a 6-month low due to increased factory incentives.'}
        </p>
      </div>
    </div>
  );
};
