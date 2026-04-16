import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Send, CheckCircle, XCircle, RefreshCw, Settings, MessageSquare, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthToken } from '../../utils/auth';

interface PromoPost {
  id: string;
  dealId: string;
  make: string;
  model: string;
  trim: string;
  discountPercent: number;
  telegramText: string;
  facebookText: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
}

export function PromoAIAdmin() {
  const [activeTab, setActiveTab] = useState<'posts' | 'prompts' | 'integrations'>('posts');
  const [posts, setPosts] = useState<PromoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [settings, setSettings] = useState({
    promptRu: '',
    promptEn: '',
    tgBotToken: '',
    tgChatId: '',
    fbPageAccessToken: '',
    fbPageId: ''
  });

  const [errorModal, setErrorModal] = useState<{show: boolean, title: string, message: string, details?: string}>({ show: false, title: '', message: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      const [postsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/promo-ai/posts', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/promo-ai/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (postsRes.ok) {
        setPosts(await postsRes.json());
      }
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings({
          promptRu: s.promptRu || '',
          promptEn: s.promptEn || '',
          tgBotToken: s.tgBotToken || '',
          tgChatId: s.tgChatId || '',
          fbPageAccessToken: s.fbPageAccessToken || '',
          fbPageId: s.fbPageId || ''
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      const token = await getAuthToken();
      const res = await fetch('/api/admin/promo-ai/settings', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      toast.success('Настройки успешно сохранены!');
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSavingSettings(false);
    }
  };

  const generatePosts = async () => {
    try {
      setGenerating(true);
      const token = await getAuthToken();
      const res = await fetch('/api/admin/promo-ai/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate posts');
      toast.success('Новые посты успешно сгенерированы!');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при генерации постов');
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const post = posts.find(p => p.id === id);
      if (!post) return;

      const token = await getAuthToken();
      const res = await fetch(`/api/admin/promo-ai/posts/${id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status,
          telegramText: post.telegramText,
          facebookText: post.facebookText
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Show detailed error modal
        setErrorModal({
          show: true,
          title: data.error || 'Ошибка публикации',
          message: data.message || 'Произошла неизвестная ошибка при публикации.',
          details: data.details || JSON.stringify(data)
        });
        fetchData(); // Refresh to revert status to pending
        return;
      }
      
      toast.success(status === 'published' ? 'Опубликовано!' : 'Отклонено');
      fetchData();
    } catch (error: any) {
      console.error(error);
      setErrorModal({
        show: true,
        title: 'Сетевая ошибка',
        message: 'Не удалось связаться с сервером.',
        details: error.message
      });
    }
  };

  const updatePostText = (id: string, field: 'telegramText' | 'facebookText', value: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-start gap-4">
              <div className="p-3 bg-rose-100 rounded-full text-rose-600">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-rose-900">{errorModal.title}</h3>
                <p className="text-rose-700 mt-1">{errorModal.message}</p>
              </div>
            </div>
            <div className="p-6">
              <h4 className="text-sm font-bold text-slate-900 mb-2">Технические детали (для отладки):</h4>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap">
                {errorModal.details}
              </pre>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setErrorModal({ show: false, title: '', message: '' })}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-gradient-to-r from-indigo-900 to-purple-900 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-yellow-400" /> AI Deal Hunter</h2>
          <p className="text-indigo-200 mt-1">ИИ автоматически находит лучшие сделки и пишет для них продающие посты.</p>
        </div>
        <button 
          onClick={generatePosts}
          disabled={generating}
          className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {generating ? <><RefreshCw className="w-5 h-5 animate-spin" /> Ищем сделки...</> : <><Sparkles className="w-5 h-5" /> Сгенерировать новые посты</>}
        </button>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'posts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Посты</div>
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'prompts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Промпты (Скрипты)</div>
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'integrations' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> Интеграции</div>
        </button>
      </div>

      {activeTab === 'posts' && (
        <div className="grid grid-cols-1 gap-6">
          {posts.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-slate-200">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">Нет ожидающих постов</h3>
              <p className="text-slate-500">Нажмите "Сгенерировать новые посты", чтобы ИИ нашел лучшие сделки.</p>
            </div>
          ) : posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt={post.model} className="w-16 h-12 object-cover rounded-lg" referrerPolicy="no-referrer" />
                  )}
                  <div>
                    <span className="font-bold text-slate-900 text-lg">{post.make} {post.model} {post.trim}</span>
                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Выгода: {post.discountPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {post.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(post.id, 'rejected')} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Отклонить">
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button onClick={() => updateStatus(post.id, 'published')} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                        <Send className="w-4 h-4" /> Одобрить и Опубликовать
                      </button>
                    </>
                  )}
                  {post.status === 'published' && <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm"><CheckCircle className="w-4 h-4" /> Опубликовано</span>}
                  {post.status === 'rejected' && <span className="flex items-center gap-1 text-rose-600 font-bold text-sm"><XCircle className="w-4 h-4" /> Отклонено</span>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
                    <Send className="w-4 h-4" /> Telegram Post (RU)
                  </div>
                  <textarea 
                    className="w-full h-48 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    value={post.telegramText}
                    onChange={(e) => updatePostText(post.id, 'telegramText', e.target.value)}
                  />
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> Facebook Post (EN)
                  </div>
                  <textarea 
                    className="w-full h-48 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    value={post.facebookText}
                    onChange={(e) => updatePostText(post.id, 'facebookText', e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                Deep Link: <a href={`/deal/${post.dealId}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">https://hunter.lease/deal/{post.dealId}</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Скрипты для генерации текстов</h3>
            <p className="text-slate-500 text-sm">Здесь вы можете задать свои инструкции для нейросети. ИИ автоматически получит данные об автомобиле (MSRP, скидка, платеж) и ссылку на оффер. Ваша задача — задать стиль, структуру и призыв к действию.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Промпт для Telegram (Русский)</label>
              <textarea 
                className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Например: Напиши короткий, эмоциональный пост. Используй эмодзи. Обязательно укажи размер скидки и призови кликнуть по ссылке..."
                value={settings.promptRu}
                onChange={(e) => setSettings({...settings, promptRu: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Промпт для Facebook (Английский)</label>
              <textarea 
                className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Example: Write a conversational and engaging post explaining why this is a great deal. Mention the DAS and monthly payment. Include the deep link..."
                value={settings.promptEn}
                onChange={(e) => setSettings({...settings, promptEn: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              onClick={saveSettings}
              disabled={savingSettings}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Сохранить промпты
            </button>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-8">
          
          {/* Telegram Instructions */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Send className="w-6 h-6 text-blue-500" /> Интеграция с Telegram
            </h3>
            
            <div className="bg-blue-50 text-blue-900 p-4 rounded-xl text-sm mb-6 space-y-2">
              <p className="font-bold">Как подключить Telegram канал:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Откройте Telegram и найдите бота <strong>@BotFather</strong>.</li>
                <li>Отправьте команду <code>/newbot</code> и следуйте инструкциям для создания бота.</li>
                <li>Скопируйте полученный <strong>Bot Token</strong> (например, <code>123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11</code>) и вставьте в поле ниже.</li>
                <li>Добавьте созданного бота в ваш Telegram-канал в качестве <strong>Администратора</strong> (с правом публикации сообщений).</li>
                <li>Чтобы узнать <strong>Chat ID</strong> вашего канала, перешлите любое сообщение из канала боту <strong>@userinfobot</strong> или <strong>@getmyid_bot</strong>. Chat ID канала обычно начинается с <code>-100</code> (например, <code>-1001234567890</code>).</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Telegram Bot Token</label>
                <input 
                  type="text"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={settings.tgBotToken}
                  onChange={(e) => setSettings({...settings, tgBotToken: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Telegram Chat ID</label>
                <input 
                  type="text"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="-1001234567890"
                  value={settings.tgChatId}
                  onChange={(e) => setSettings({...settings, tgChatId: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Facebook Instructions */}
          <div className="pt-8 border-t border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> Интеграция с Facebook
            </h3>
            
            <div className="bg-blue-50 text-blue-900 p-4 rounded-xl text-sm mb-6 space-y-2">
              <p className="font-bold">Как подключить Facebook Page:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Создайте приложение на <strong>developers.facebook.com</strong>.</li>
                <li>Добавьте продукт <strong>Facebook Login for Business</strong>.</li>
                <li>Получите <strong>Page Access Token</strong> с правами <code>pages_manage_posts</code> и <code>pages_read_engagement</code>.</li>
                <li>Скопируйте <strong>Page ID</strong> из настроек вашей страницы.</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Facebook Page Access Token</label>
                <input 
                  type="password"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="EAAB..."
                  value={settings.fbPageAccessToken}
                  onChange={(e) => setSettings({...settings, fbPageAccessToken: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Facebook Page ID</label>
                <input 
                  type="text"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="1234567890"
                  value={settings.fbPageId}
                  onChange={(e) => setSettings({...settings, fbPageId: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              onClick={saveSettings}
              disabled={savingSettings}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Сохранить настройки
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
