/**
 * LoanGuard Module 1: Multi-Input Advertisement Analyzer
 * Supports Screenshot Upload (with Canvas preprocessing & Tesseract OCR),
 * Plain Text Input (WhatsApp/SMS/Social), and Safe Webpage URL fetching.
 */

import React, { useState, useRef } from 'react';
import { AnalysisInput } from '../services/analysisPipeline';
import { preprocessImage, performOcr } from '../services/ocrService';
import { fetchWebpageText, validateSafeUrl } from '../services/urlService';
import { SAMPLE_ADVERTISEMENTS } from '../data/sampleAds';
import {
  UploadCloud,
  FileText,
  Globe,
  Loader2,
  Sparkles,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';

interface AdInputSectionProps {
  onAnalyze: (input: AnalysisInput, file?: File | null) => void;
  isAnalyzing: boolean;
}

export const AdInputSection: React.FC<AdInputSectionProps> = ({
  onAnalyze,
  isAnalyzing
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'screenshot' | 'url'>('text');

  // Input states
  const [title, setTitle] = useState('');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Screenshot states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [preprocessedPreview, setPreprocessedPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ percent: number; status: string }>({ percent: 0, status: '' });
  const [ocrError, setOcrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // KFS Comparison (Optional)
  const [showKfsOptions, setShowKfsOptions] = useState(false);
  const [kfsApr, setKfsApr] = useState<string>('');
  const [kfsFee, setKfsFee] = useState<string>('');
  const [kfsTenure, setKfsTenure] = useState<string>('');

  // Handle Quick Sample selection
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_ADVERTISEMENTS.find(s => s.id === sampleId);
    if (!sample) return;

    setTitle(sample.title);
    setTextInput(sample.text);
    if (sample.domain) {
      setUrlInput(`https://${sample.domain}/apply`);
    }
  };

  // Handle Image Upload & OCR
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setOcrError('Invalid image format. Supported: PNG, JPG, JPEG, WEBP.');
      return;
    }

    setOcrError(null);
    setImageFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));

    // Create raw preview
    const rawUrl = URL.createObjectURL(file);
    setImagePreview(rawUrl);

    try {
      setOcrLoading(true);
      setOcrProgress({ percent: 15, status: 'Performing canvas grayscale and contrast enhancement...' });

      const preprocessed = await preprocessImage(file);
      setPreprocessedPreview(preprocessed.dataUrl);

      setOcrProgress({ percent: 40, status: 'Running Tesseract OCR engine on preprocessed image...' });
      const recognized = await performOcr(preprocessed.dataUrl, (p, status) => {
        setOcrProgress({ percent: p, status });
      });

      setTextInput(recognized);
      setOcrLoading(false);
    } catch (err: unknown) {
      setOcrLoading(false);
      const msg = err instanceof Error ? err.message : 'OCR extraction failed';
      setOcrError(`${msg}. You can review and manually enter the advertisement text below.`);
    }
  };

  // Handle URL fetch
  const handleFetchUrl = async () => {
    setUrlError(null);
    const validation = validateSafeUrl(urlInput);
    if (!validation.isValid) {
      setUrlError(validation.error || 'Invalid URL');
      return;
    }

    setUrlLoading(true);
    try {
      const result = await fetchWebpageText(urlInput);
      setUrlLoading(false);
      if (result.status === 'success') {
        setTextInput(result.extractedText);
        if (!title) {
          setTitle(`Web Ad: ${result.domain}`);
        }
      } else {
        setUrlError(result.errorMessage || 'Failed to extract text from URL');
      }
    } catch {
      setUrlLoading(false);
      setUrlError('Failed to fetch public webpage text.');
    }
  };

  // Submit for analysis
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const inputData: AnalysisInput = {
      inputType: activeTab,
      title: title.trim() || undefined,
      text: textInput,
      submittedUrl: activeTab === 'url' ? urlInput : undefined,
      screenshotUrl: activeTab === 'screenshot' && imagePreview ? imagePreview : undefined,
      kfsComparison: showKfsOptions && (kfsApr || kfsFee || kfsTenure) ? {
        kfsApr: kfsApr ? parseFloat(kfsApr) : undefined,
        kfsFee: kfsFee ? parseFloat(kfsFee) : undefined,
        kfsTenure: kfsTenure ? parseInt(kfsTenure, 10) : undefined
      } : undefined
    };

    onAnalyze(inputData, activeTab === 'screenshot' ? imageFile : null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Tab Switcher & Quick Load Sample Menu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        {/* Input Method Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'text'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Paste Ad Text
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('screenshot')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'screenshot'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload Screenshot
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'url'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Webpage URL
          </button>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Quick-Load Ad Sample:</span>
          <select
            onChange={(e) => handleLoadSample(e.target.value)}
            defaultValue=""
            className="text-xs bg-slate-950 text-slate-200 border border-slate-700/80 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="" disabled>Select demonstration case...</option>
            {SAMPLE_ADVERTISEMENTS.map(s => (
              <option key={s.id} value={s.id}>
                [{s.category.toUpperCase()}] {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Ad Title Field */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Advertisement Title / Description (Optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. WhatsApp Forward 50k Instant Loan, Instagram Sponsored Ad"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Tab 1: Screenshot Upload */}
        {activeTab === 'screenshot' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-200">
                Click to upload advertisement screenshot
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Supports PNG, JPG, JPEG, WEBP. Automatic OpenCV-style grayscale, contrast enhancement & OCR.
              </div>
            </div>

            {/* OCR Processing State */}
            {ocrLoading && (
              <div className="p-4 bg-slate-950 rounded-xl border border-indigo-500/30 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{ocrProgress.status}</span>
                    <span className="text-indigo-400 font-mono">{ocrProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{ width: `${ocrProgress.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* OCR Error Notice */}
            {ocrError && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{ocrError}</span>
              </div>
            )}

            {/* Side-by-side Image Previews (Original vs Preprocessed) */}
            {(imagePreview || preprocessedPreview) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
                {imagePreview && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      Uploaded Screenshot
                    </div>
                    <img
                      src={imagePreview}
                      alt="Uploaded Ad"
                      className="max-h-48 w-full object-contain rounded bg-black/40 border border-slate-800"
                    />
                  </div>
                )}
                {preprocessedPreview && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      OpenCV Preprocessed (Grayscale + Threshold)
                    </div>
                    <img
                      src={preprocessedPreview}
                      alt="Preprocessed OCR Target"
                      className="max-h-48 w-full object-contain rounded bg-black/40 border border-slate-800"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: URL Input */}
        {activeTab === 'url' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://exampleloan.in/apply (HTTP or HTTPS only)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={urlLoading || !urlInput.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {urlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                <span>Fetch Public Page</span>
              </button>
            </div>

            {urlError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{urlError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-medium">SSRF-Protected:</span>
              <span>Blocks localhost & RFC 1918 private IPs · 6s timeout · Max 3,000 characters</span>
            </div>
          </div>
        )}

        {/* Unified Editable Advertisement Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Extracted / Pasted Advertisement Content</span>
              <span className="text-[11px] text-slate-400 font-normal">(Review and edit before analysis)</span>
            </label>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              {textInput.length} characters
            </span>
          </div>
          <textarea
            rows={5}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste advertisement message received via WhatsApp, SMS, Facebook, Instagram, or promotional email..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
            required
          />
        </div>

        {/* Optional KFS (Key Fact Statement) Accordion */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowKfsOptions(!showKfsOptions)}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showKfsOptions ? 'Hide Key Fact Statement (KFS) Cross-Check' : '+ Cross-Check Against Official Key Fact Statement (KFS)'}</span>
          </button>

          {showKfsOptions && (
            <div className="mt-3 p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">KFS Disclosed APR (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={kfsApr}
                  onChange={(e) => setKfsApr(e.target.value)}
                  placeholder="e.g. 18.5"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">KFS Upfront Fee (₹)</label>
                <input
                  type="number"
                  value={kfsFee}
                  onChange={(e) => setKfsFee(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">KFS Tenure (Months)</label>
                <input
                  type="number"
                  value={kfsTenure}
                  onChange={(e) => setKfsTenure(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isAnalyzing || !textInput.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Multi-Module Risk Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze Loan Advertisement</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
