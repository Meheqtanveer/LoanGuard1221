/**
 * LoanGuard – AI-Powered Multidimensional Loan Advertisement Risk Analyzer
 * Main Application Shell & State Orchestrator
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AdRecord, ReferenceLender } from './types';
import { SAMPLE_ADVERTISEMENTS } from './data/sampleAds';
import { RBI_REFERENCE_LENDERS } from './data/rbiReferenceData';
import { runLoanGuardAnalysis, AnalysisInput } from './services/analysisPipeline';
import { buildNetworkGraph } from './services/scamMapper';

import { AdInputSection } from './components/AdInputSection';
import { RiskReportCard } from './components/RiskReportCard';
import { NetworkGraph } from './components/NetworkGraph';
import { DashboardStats } from './components/DashboardStats';
import { LenderDirectoryView } from './components/LenderDirectoryView';
import { FinancialCalculatorView } from './components/FinancialCalculatorView';
import { AdHistoryView } from './components/AdHistoryView';
import { AboutView } from './components/AboutView';

import {
  ShieldAlert,
  PlusCircle,
  FileSearch,
  Share2,
  Building2,
  Calculator,
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react';

import { apiClient } from './services/apiClient';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'home' | 'analyze' | 'report' | 'mapper' | 'lenders' | 'calculator' | 'history' | 'about'
  >('home');

  // Ad corpus state
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customLenders, setCustomLenders] = useState<ReferenceLender[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState<string>('SQLite Local');

  // Load advertisements from database on initial mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const dbAds = await apiClient.getHistory();
        if (isMounted && dbAds && dbAds.length > 0) {
          setAds(dbAds);
          setActiveAdId(dbAds[0].id);
          setDatabaseStatus('Connected (SQLite DB)');
          return;
        }
      } catch (err) {
        console.warn('Initial backend fetch fallback:', err);
      }

      // Fallback seed corpus
      if (isMounted) {
        let initialAds: AdRecord[] = [];
        for (const sample of SAMPLE_ADVERTISEMENTS) {
          const record = runLoanGuardAnalysis(
            {
              inputType: sample.inputType,
              title: sample.title,
              text: sample.text,
              submittedUrl: sample.domain ? `https://${sample.domain}/apply` : undefined
            },
            initialAds,
            []
          );
          initialAds = [record, ...initialAds];
        }
        setAds(initialAds);
        if (initialAds.length > 0) {
          setActiveAdId(initialAds[0].id);
        }
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Compute graph nodes and edges
  const { nodes, edges, clusters } = useMemo(() => {
    return buildNetworkGraph(ads);
  }, [ads]);

  // Selected ad record for report view
  const activeAd = useMemo(() => {
    return ads.find(a => a.id === activeAdId) || ads[0] || null;
  }, [ads, activeAdId]);

  // Handle new ad analysis with real backend API call
  const handleAnalyzeNewAd = async (input: AnalysisInput, screenshotFile?: File | null) => {
    setIsAnalyzing(true);
    try {
      const newRecord = await apiClient.analyzeAd(input, screenshotFile);
      setAds(prev => [newRecord, ...prev]);
      setActiveAdId(newRecord.id);
      setIsAnalyzing(false);
      setActiveTab('report');
    } catch (err) {
      console.warn('Backend analyze error, using local pipeline:', err);
      const newRecord = runLoanGuardAnalysis(input, ads, customLenders);
      setAds(prev => [newRecord, ...prev]);
      setActiveAdId(newRecord.id);
      setIsAnalyzing(false);
      setActiveTab('report');
    }
  };

  // Delete ad handler with real backend API deletion
  const handleDeleteAd = async (adId: string) => {
    await apiClient.deleteAd(adId);
    setAds(prev => prev.filter(a => a.id !== adId));
    if (activeAdId === adId) {
      const remaining = ads.filter(a => a.id !== adId);
      setActiveAdId(remaining[0]?.id || null);
    }
  };

  // Add imported reference lenders
  const handleImportLenders = (imported: ReferenceLender[]) => {
    setCustomLenders(prev => [...prev, ...imported]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* =========================================================================
          TOP BAR CONTRACT (Section 2 of Constitution):
          [Brand wordmark, one line] — [4-5 single-line nav links] — [1 primary action]
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Brand Wordmark (Single text element) */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 group"
          >
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30 group-hover:bg-indigo-500 transition-colors">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-100">
              LoanGuard
            </span>
          </div>

          {/* Zone 2: Single-line Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
            <button
              onClick={() => setActiveTab('home')}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'home' ? 'text-indigo-400' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('mapper')}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'mapper' ? 'text-indigo-400' : ''
              }`}
            >
              Scam Connection Mapper
            </button>
            <button
              onClick={() => setActiveTab('lenders')}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'lenders' ? 'text-indigo-400' : ''
              }`}
            >
              RBI Lender Registry
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'calculator' ? 'text-indigo-400' : ''
              }`}
            >
              Loan Cost Calculator
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'history' ? 'text-indigo-400' : ''
              }`}
            >
              Ad History
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'about' ? 'text-indigo-400' : ''
              }`}
            >
              About
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('analyze')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/20 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Analyze Advertisement</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Section: Home View */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Hero Banner with Executive Overview */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-8 shadow-2xl">
              <div className="max-w-3xl space-y-4">
                <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono">
                  <span>FINANCIAL CYBER-INTELLIGENCE PLATFORM</span>
                  <span>·</span>
                  <span>INDIA DIGITAL LENDING INITIATIVE</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100 text-balance leading-tight">
                  Multidimensional Risk Intelligence for Digital Loan Advertisements
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed text-pretty">
                  Detect fraudulent loan schemes, advance-fee traps, predatory daily interest rates, and unauthorized lender impersonation before sharing documents or transferring funds.
                </p>

                {/* Quick Action Button Strip */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('analyze')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Submit New Advertisement</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('mapper')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-indigo-400" />
                    <span>Explore Scam Connection Network</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dashboard Analytics & Category Distribution */}
            <DashboardStats
              ads={ads}
              onSelectCategory={() => setActiveTab('history')}
            />

            {/* Signature Feature Spotlight: Scam Connection Mapper */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-indigo-400" />
                    Signature Feature: Cross-Advertisement Scam Connection Mapper
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Visualizes relationships across loan promotions sharing identical contact numbers, web domains, and coordinated text templates.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('mapper')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Full View</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <NetworkGraph
                nodes={nodes}
                edges={edges}
                clusters={clusters}
                ads={ads}
                onSelectAd={(id) => {
                  setActiveAdId(id);
                  setActiveTab('report');
                }}
              />
            </div>

            {/* Recent Analysis Feed with Quick Inspection */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-slate-400" />
                  Recent Advertisement Audits ({ads.length})
                </h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                >
                  View All in Ledger →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ads.slice(0, 3).map((ad) => (
                  <div
                    key={ad.id}
                    onClick={() => {
                      setActiveAdId(ad.id);
                      setActiveTab('report');
                    }}
                    className="p-4 bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-all space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          ad.riskCategory === 'HIGH RISK' ? 'bg-red-500/20 text-red-300' :
                          ad.riskCategory === 'NEEDS CHECKING' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {ad.riskCategory}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-200 tabular-nums">
                          {ad.riskScore}/100
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{ad.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{ad.riskSummary}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{ad.claimedLender}</span>
                      <span className="text-indigo-400 font-semibold flex items-center gap-0.5">
                        Audit <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section: Analyze Advertisement (Module 1) */}
        {activeTab === 'analyze' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-100">Analyze Loan Advertisement</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload a screenshot, paste advertisement text, or submit a public URL to run the multidimensional risk pipeline.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Browse Previous Analyses ({ads.length})
              </button>
            </div>

            <AdInputSection
              onAnalyze={handleAnalyzeNewAd}
              isAnalyzing={isAnalyzing}
            />
          </div>
        )}

        {/* Section: Risk Report Card (Modules 2, 3, 4, 5, 6) */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            {activeAd ? (
              <RiskReportCard
                ad={activeAd}
                onNavigateToAd={(targetId) => {
                  setActiveAdId(targetId);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenMapper={() => setActiveTab('mapper')}
              />
            ) : (
              <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
                No active advertisement selected. Submit an ad or choose one from history.
              </div>
            )}
          </div>
        )}

        {/* Section: Scam Connection Mapper (Module 5) */}
        {activeTab === 'mapper' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                Scam Connection Mapper (Cross-Advertisement Graph)
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Discovers hidden relationships, common telephone contact centers, shared hosting domains, and syndicated advertisement templates across all submitted promotions.
              </p>
            </div>

            <NetworkGraph
              nodes={nodes}
              edges={edges}
              clusters={clusters}
              ads={ads}
              onSelectAd={(id) => {
                setActiveAdId(id);
                setActiveTab('report');
              }}
            />
          </div>
        )}

        {/* Section: RBI Lender Registry (Module 3) */}
        {activeTab === 'lenders' && (
          <LenderDirectoryView
            referenceLenders={[...customLenders, ...RBI_REFERENCE_LENDERS]}
            onImportLenders={handleImportLenders}
          />
        )}

        {/* Section: Financial Transparency & Calculator (Module 4) */}
        {activeTab === 'calculator' && (
          <FinancialCalculatorView />
        )}

        {/* Section: Ad History (Module 7 & 8) */}
        {activeTab === 'history' && (
          <AdHistoryView
            ads={ads}
            onSelectAd={(id) => {
              setActiveAdId(id);
              setActiveTab('report');
            }}
            onDeleteAd={handleDeleteAd}
          />
        )}

        {/* Section: About LoanGuard (Module 7) */}
        {activeTab === 'about' && (
          <AboutView />
        )}
      </main>

      {/* Clean Footer (Compliant with Section 1.B Anti-Slop - No decorative engine tickers) */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">LoanGuard</span>
            <span>—</span>
            <span>AI-Powered Multidimensional Loan Advertisement Risk Analyzer</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Evidence-Based Regulatory Intelligence</span>
            <span>·</span>
            <span>Strict Privacy (Zero PII Ingestion)</span>
            <span>·</span>
            <span>RBI DLA Directory Integration</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
