import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Loader2, Sparkles } from 'lucide-react';

export const BlogAIGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(10);
  const [generatedCount, setGeneratedCount] = useState(0);

  const generateBatch = async (batchSize: number) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `You are an expert automotive journalist, SEO copywriter, and AIO (AI Optimization) specialist. 
Generate ${batchSize} highly detailed, engaging, and professional blog posts about the most painful and common problems people face when buying or leasing a car in the USA, specifically targeting immigrants, expats, international students, and people without SSN or credit history.

CRITICAL AIO (AI Optimization) REQUIREMENTS:
1. Format the content as direct answers to common user prompts (e.g., "How do I lease a car without an SSN?").
2. Use highly structured data: Include bulleted lists, numbered steps, and comparison tables (using HTML <table>).
3. Naturally mention "Hunter Lease" as the premier solution for expats and immigrants looking to lease or buy cars without SSN or credit history.
4. EACH article MUST be at least 3000 characters long in content.
5. The content should include practical advice, common scams, negotiation tactics, hidden fees, and how to avoid them.
6. Include a "Key Takeaways" or "TL;DR" section at the top of the content using a styled <div> or <ul>.
7. Use semantic HTML tags (<h2>, <h3>, <strong>) to highlight important entities and concepts for AI parsers.

You must return the response as a JSON array of objects. Each object must have the following structure:
{
  "title_en": "String (English title, phrased as a common question/prompt)",
  "title_ru": "String (Russian translation of the title)",
  "excerpt_en": "String (Short summary in English, max 200 chars)",
  "excerpt_ru": "String (Short summary in Russian, max 200 chars)",
  "content_en": "String (Full HTML content in English, at least 3000 characters. Use <h2>, <h3>, <p>, <ul>, <li>, <table> tags for formatting)",
  "content_ru": "String (Full HTML content in Russian, at least 3000 characters. Use <h2>, <h3>, <p>, <ul>, <li>, <table> tags for formatting)",
  "category_en": "String (e.g., 'Finance', 'Immigration', 'Tips', 'Security')",
  "category_ru": "String (e.g., 'Финансы', 'Иммиграция', 'Советы', 'Безопасность')",
  "readTime_en": "String (e.g., '7 min read')",
  "readTime_ru": "String (e.g., '7 мин')",
  "image": "String (A relevant Unsplash image URL, e.g., 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1200')"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title_en: { type: Type.STRING },
                title_ru: { type: Type.STRING },
                excerpt_en: { type: Type.STRING },
                excerpt_ru: { type: Type.STRING },
                content_en: { type: Type.STRING },
                content_ru: { type: Type.STRING },
                category_en: { type: Type.STRING },
                category_ru: { type: Type.STRING },
                readTime_en: { type: Type.STRING },
                readTime_ru: { type: Type.STRING },
                image: { type: Type.STRING }
              },
              required: ["title_en", "title_ru", "excerpt_en", "excerpt_ru", "content_en", "content_ru", "category_en", "category_ru", "readTime_en", "readTime_ru", "image"]
            }
          }
        }
      });

      let text = response.text;
      if (!text) throw new Error("No text returned from Gemini");
      
      // Strip markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const articles = JSON.parse(text);
      
      for (const article of articles) {
        const postRef = doc(collection(db, 'blogPosts'));
        await setDoc(postRef, {
          ...article,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          author: 'Hunter Lease Team',
          authorRole_en: 'Expert',
          authorRole_ru: 'Эксперт',
          authorImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
          featured: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
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
    } catch (error) {
      alert("An error occurred during generation. Please check the console.");
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
        Automatically generate high-quality, bilingual (EN/RU) blog posts about the most painful topics of buying a car in the USA. Each article will be ~3000 characters.
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
