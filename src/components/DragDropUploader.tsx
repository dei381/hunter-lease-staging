import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getAuthToken } from '../utils/auth';

interface DragDropUploaderProps {
  onUploadSuccess: (dealId: string) => void;
}

export function DragDropUploader({ onUploadSuccess }: DragDropUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('offer', file);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadStatus('success');
      
      // Notify parent to refresh the deal list
      if (data.dealId) {
        onUploadSuccess(data.dealId);
      }
      
      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage('Failed to upload file. Check your API key or try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-10 transition-all duration-200 ease-in-out text-center cursor-pointer
          ${isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'}
          ${isUploading ? 'opacity-75 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,application/pdf"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          {isUploading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 className="w-12 h-12 text-indigo-500" />
            </motion.div>
          ) : uploadStatus === 'success' ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </motion.div>
          ) : uploadStatus === 'error' ? (
            <AlertCircle className="w-12 h-12 text-red-500" />
          ) : (
            <div className="p-4 bg-slate-100 rounded-full">
              <UploadCloud className="w-8 h-8 text-slate-600" />
            </div>
          )}

          <div className="space-y-1">
            {isUploading ? (
              <p className="text-lg font-medium text-slate-700">Uploading and analyzing...</p>
            ) : uploadStatus === 'success' ? (
              <p className="text-lg font-medium text-emerald-600">Upload complete!</p>
            ) : uploadStatus === 'error' ? (
              <p className="text-lg font-medium text-red-600">{errorMessage}</p>
            ) : (
              <>
                <p className="text-lg font-medium text-slate-900">
                  Drag & drop your offer here
                </p>
                <p className="text-sm text-slate-500">
                  Supports PDF, PNG, JPG up to 10MB
                </p>
              </>
            )}
          </div>
          
          {!isUploading && uploadStatus === 'idle' && (
            <button className="px-4 py-2 mt-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Browse Files
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
