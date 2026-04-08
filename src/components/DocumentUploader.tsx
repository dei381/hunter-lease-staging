import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

interface DocumentUploaderProps {
  leadId: string;
  documentType: string;
  onUploadSuccess?: (url: string) => void;
  label?: string;
  description?: string;
}

export function DocumentUploader({ leadId, documentType, onUploadSuccess, label, description }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
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
    if (!file) return;

    // Validate file type (images and pdfs)
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    setProgress(0);

    const fileExtension = file.name.split('.').pop();
    const fileName = `${documentType}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `leads/${leadId}/documents/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(p);
      },
      (error) => {
        console.error('Upload failed:', error);
        toast.error('Failed to upload document. Please try again.');
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Save document reference to Firestore lead
          const leadRef = doc(db, 'leads', leadId);
          await updateDoc(leadRef, {
            documents: arrayUnion({
              type: documentType,
              url: downloadURL,
              name: file.name,
              uploadedAt: new Date().toISOString()
            })
          });

          setUploadedUrl(downloadURL);
          setIsUploading(false);
          toast.success('Document uploaded successfully!');
          
          if (onUploadSuccess) {
            onUploadSuccess(downloadURL);
          }
        } catch (err) {
          console.error('Error saving document URL:', err);
          toast.error('Failed to save document reference.');
          setIsUploading(false);
        }
      }
    );
  };

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-[var(--mu)] uppercase tracking-widest mb-1">{label}</label>}
      {description && <p className="text-[10px] text-[var(--mu2)] mb-3">{description}</p>}
      
      {!uploadedUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            isDragging 
              ? 'border-[var(--lime)] bg-[var(--lime)]/5' 
              : 'border-[var(--b2)] hover:border-[var(--b3)] bg-[var(--s1)]'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf"
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[var(--lime)] animate-spin" />
              <div className="text-sm font-medium">Uploading... {Math.round(progress)}%</div>
              <div className="w-full max-w-xs h-1.5 bg-[var(--b2)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--lime)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[var(--s2)] flex items-center justify-center mb-2">
                <UploadCloud className="w-6 h-6 text-[var(--mu2)]" />
              </div>
              <p className="text-sm font-medium">Click or drag file to upload</p>
              <p className="text-[10px] text-[var(--mu2)]">PDF, JPG, PNG (max 10MB)</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-[var(--s1)] border border-[var(--b2)] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--lime)]/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[var(--lime)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--w)]">Document Uploaded</p>
              <a 
                href={uploadedUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-[var(--mu2)] hover:text-[var(--lime)] transition-colors"
              >
                View File
              </a>
            </div>
          </div>
          <button 
            onClick={() => setUploadedUrl(null)}
            className="p-2 text-[var(--mu2)] hover:text-red-400 transition-colors"
            title="Remove and upload again"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
