import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Check, Image as ImageIcon, Plus, X } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const MediaAdmin = () => {
  const { language } = useLanguageStore();
  const adminTranslations = (translations[language] as any).admin || {};
  const t = {
    mediaLibrary: adminTranslations.mediaLibrary || 'Media Library',
    uploadPhoto: adminTranslations.uploadPhoto || 'Upload Photo',
    selectMake: adminTranslations.selectMake || 'Select Manufacturer',
    selectModel: adminTranslations.selectModel || 'Select Model',
    selectYear: adminTranslations.selectYear || 'Select Year',
    selectColor: adminTranslations.selectColor || 'Select Color (Optional)',
    isDefault: adminTranslations.isDefault || 'Set as Default Photo',
    uploading: adminTranslations.uploading || 'Uploading...',
    deleteConfirm: adminTranslations.deleteConfirm || 'Are you sure you want to delete this photo?',
    noPhotos: adminTranslations.noPhotos || 'No photos in library yet.'
  };

  const [carDb, setCarDb] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uploadData, setUploadData] = useState({
    makeId: '',
    modelId: '',
    year: new Date().getFullYear(),
    colorId: '',
    isDefault: true
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCustomColor, setIsCustomColor] = useState(false);

  const commonColors = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Brown'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [carsRes, photosRes] = await Promise.all([
        fetch('/api/cars'),
        fetch('/api/car-photos')
      ]);
      const carsData = await carsRes.json();
      const photosData = await photosRes.json();
      
      setCarDb(carsData);
      setPhotos(photosData);
      
      if (carsData.makes.length > 0) {
        setUploadData(prev => ({
          ...prev,
          makeId: carsData.makes[0].id,
          modelId: carsData.makes[0].models[0].id
        }));
      }
    } catch (err) {
      console.error('Failed to fetch media data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadData.makeId || !uploadData.modelId) return;

    setIsUploading(true);
    try {
      // 1. Upload to Firebase Storage
      
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `cars/${uploadData.makeId}_${uploadData.modelId}_${uploadData.year}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, selectedFile);
      const imageUrl = await getDownloadURL(storageRef);

      // 2. Save metadata to backend
      const res = await fetch('/api/admin/car-photos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || 'default_dev_secret'}`
        },
        body: JSON.stringify({
          makeId: uploadData.makeId,
          modelId: uploadData.modelId,
          year: uploadData.year,
          colorId: uploadData.colorId || 'default',
          isDefault: uploadData.isDefault,
          imageUrl
        })
      });

      if (res.ok) {
        setSelectedFile(null);
        setUploadData(prev => ({ ...prev, colorId: '' }));
        setIsCustomColor(false);
        // Reset file input
        const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error', err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;

    try {
      const res = await fetch(`/api/admin/car-photos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || 'default_dev_secret'}`
        }
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/car-photos/${id}/default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || 'default_dev_secret'}`
        }
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Set default error', err);
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  const selectedMake = carDb?.makes.find((m: any) => m.id === uploadData.makeId);

  return (
    <div className="space-y-8">
      <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[var(--lime)]" />
          {t.uploadPhoto}
        </h2>

        <form onSubmit={handleUpload} className="grid md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-[var(--mu2)] uppercase tracking-widest font-bold mb-2 block">{t.selectMake}</span>
              <select 
                value={uploadData.makeId}
                onChange={(e) => {
                  const makeId = e.target.value;
                  const make = carDb.makes.find((m: any) => m.id === makeId);
                  setUploadData({
                    ...uploadData,
                    makeId,
                    modelId: make?.models[0]?.id || ''
                  });
                }}
                className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-4 py-2 text-sm outline-none focus:border-[var(--lime)]"
              >
                {carDb?.makes.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-[var(--mu2)] uppercase tracking-widest font-bold mb-2 block">{t.selectModel}</span>
              <select 
                value={uploadData.modelId}
                onChange={(e) => setUploadData({ ...uploadData, modelId: e.target.value })}
                className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-4 py-2 text-sm outline-none focus:border-[var(--lime)]"
              >
                {selectedMake?.models.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-[var(--mu2)] uppercase tracking-widest font-bold mb-2 block">{t.selectYear}</span>
              <input 
                type="number"
                value={uploadData.year}
                onChange={(e) => setUploadData({ ...uploadData, year: parseInt(e.target.value) })}
                className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-4 py-2 text-sm outline-none focus:border-[var(--lime)]"
              />
            </label>

            <label className="block">
              <span className="text-xs text-[var(--mu2)] uppercase tracking-widest font-bold mb-2 block">{t.selectColor}</span>
              {!isCustomColor ? (
                <select 
                  value={uploadData.colorId}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomColor(true);
                      setUploadData({ ...uploadData, colorId: '' });
                    } else {
                      setUploadData({ ...uploadData, colorId: e.target.value });
                    }
                  }}
                  className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-4 py-2 text-sm outline-none focus:border-[var(--lime)]"
                >
                  <option value="">Default / All Colors</option>
                  {commonColors.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="custom">+ Add custom color...</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Enter color name"
                    value={uploadData.colorId}
                    onChange={(e) => setUploadData({ ...uploadData, colorId: e.target.value })}
                    className="flex-1 bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-4 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCustomColor(false);
                      setUploadData({ ...uploadData, colorId: '' });
                    }}
                    className="p-2 bg-[var(--s2)] border border-[var(--b2)] rounded-lg hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </label>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-[var(--mu2)] uppercase tracking-widest font-bold mb-2 block">Photo File</span>
              <input 
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-[var(--mu2)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[var(--lime)] file:text-black hover:file:bg-[var(--lime2)] cursor-pointer"
              />
            </label>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={uploadData.isDefault}
                  onChange={(e) => setUploadData({ ...uploadData, isDefault: e.target.checked })}
                  className="accent-[var(--lime)] w-4 h-4"
                />
                <span className="text-sm font-bold text-[var(--w)]">{t.isDefault}</span>
              </label>

              <button 
                disabled={!selectedFile || isUploading}
                className="flex-1 bg-[var(--lime)] text-white font-bold py-2 rounded-lg text-sm hover:bg-[var(--lime2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? t.uploading : t.uploadPhoto}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {photos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[var(--mu2)] bg-[var(--s1)] rounded-2xl border border-dashed border-[var(--b2)]">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{t.noPhotos}</p>
          </div>
        ) : (
          photos.map((photo) => {
            const make = carDb?.makes.find((m: any) => m.id === photo.makeId);
            const model = make?.models.find((m: any) => m.id === photo.modelId);
            
            return (
              <div key={photo.id} className="group relative bg-[var(--s1)] border border-[var(--b2)] rounded-2xl overflow-hidden hover:border-[var(--lime)]/30 transition-all">
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={photo.imageUrl} 
                    alt={`${photo.makeId} ${photo.modelId}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {photo.isDefault && (
                    <div className="absolute top-2 left-2 bg-[var(--lime)] text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-lg">
                      Default
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    {!photo.isDefault && (
                      <button 
                        onClick={() => handleSetDefault(photo.id)}
                        className="p-2 bg-white/10 hover:bg-[var(--lime)] hover:text-black rounded-full transition-all"
                        title="Set as Default"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(photo.imageUrl);
                        alert('URL copied to clipboard!');
                      }}
                      className="p-2 bg-white/10 hover:bg-indigo-500 rounded-full transition-all"
                      title="Copy URL"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(photo.id)}
                      className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-all"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-bold text-sm truncate">{make?.name} {model?.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold">{photo.year}</span>
                    <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold">{photo.colorId}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
