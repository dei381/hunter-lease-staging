import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { getAuthToken } from '../utils/auth';
import { toast } from 'react-hot-toast';

export const BlogAIGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(10);
  const [generatedCount, setGeneratedCount] = useState(0);

  const generateBatch = async (batchSize: number) => {
    try {
      const response = await fetch('/api/admin/blog/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ batchSize })
      });

      if (!response.ok) {
        throw new Error('Failed to generate posts');
      }

      const articles = await response.json();
      const token = await getAuthToken();
      
      for (const article of articles) {
        await fetch('/api/admin/blog', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...article,
            isActive: true,
            publishedAt: new Date().toISOString()
          })
        });
      }

      return articles.length;
    } catch (error) {
      console.error("Error generating batch:", error);
      throw error;
    }
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGeneratedCount(0);
    setProgress(0);

    let currentCount = 0;
    const batchSize = 5; // Generate 5 at a time to avoid timeouts/limits

    try {
      while (currentCount < totalToGenerate) {
        const remaining = totalToGenerate - currentCount;
        const currentBatchSize = Math.min(batchSize, remaining);
        
        const generated = await generateBatch(currentBatchSize);
        currentCount += generated;
        setGeneratedCount(currentCount);
        setProgress(Math.round((currentCount / totalToGenerate) * 100));
        
        if (currentCount < totalToGenerate) {
          // Wait 2 seconds between batches to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      // Reload page to show new posts
      window.location.reload();
    } catch (error) {
      toast.error("An error occurred during generation. Please check the console.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[var(--lime)]/10 rounded-lg">
          <Sparkles className="w-5 h-5 text-[var(--lime)]" />
        </div>
        <h3 className="text-xl font-display uppercase tracking-widest">AI Blog Generator</h3>
      </div>
      
      <p className="text-[var(--mu2)] text-sm mb-6">
        Automatically generate high-quality blog posts about the most painful topics of buying a car in the USA. Each article will be ~3000 characters.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">
            Number of Articles
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={totalToGenerate}
            onChange={(e) => setTotalToGenerate(parseInt(e.target.value) || 1)}
            disabled={isGenerating}
            className="w-32 bg-[var(--bg)] border border-[var(--b2)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--lime)] disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-[var(--lime)] text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[var(--lime2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating ({generatedCount}/{totalToGenerate})...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Articles
            </>
          )}
        </button>
      </div>

      {isGenerating && (
        <div className="mt-6">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-[var(--bg)] rounded-full h-2 overflow-hidden border border-[var(--b2)]">
            <div 
              className="bg-[var(--lime)] h-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--mu2)] mt-2">
            Generating in batches of 5 to ensure high quality and prevent timeouts. This may take a few minutes.
          </p>
        </div>
      )}
    </div>
  );
};
