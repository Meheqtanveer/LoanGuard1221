/**
 * LoanGuard Module 7: About LoanGuard, Academic Background & Research Methodology
 * Documents problem statement, regulatory context, system architecture, and safeguards.
 */

import React from 'react';
import { ShieldCheck, Database, GitMerge, FileSpreadsheet, Lock, AlertTriangle, Cpu, BookOpen } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              LoanGuard
            </h1>
            <p className="text-xs text-indigo-400 font-mono">
              AI-Powered Multidimensional Loan Advertisement Risk Analyzer · Major Project
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          LoanGuard is an intelligent cyber-intelligence and financial safety system built to protect Indian consumers from predatory, deceptive, and fraudulent digital loan advertisements distributed across WhatsApp, SMS, search engines, and social media.
        </p>
      </div>

      {/* Problem Statement & Research Gap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Problem Statement</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The proliferation of unverified digital lending platforms in India has led to severe consumer risks:
            upfront processing fee scams (Advance-Fee Fraud), deceptive daily interest rates masking 150%+ APRs,
            predatory 7-day tenure traps, unauthorized contact list harvesting, and unauthorized impersonation of
            legitimate Scheduled Commercial Banks and NBFCs. Consumers routinely lack the tools to verify whether
            an advertisement represents an authorized RBI Digital Lending App.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
            <BookOpen className="w-4 h-4" />
            <span>Research Gap & Novelty</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Existing cybersecurity filters operate primarily on static blacklist lookups or simple keyword triggers.
            LoanGuard bridges this gap through a <strong>multidimensional risk intelligence model</strong> that
            simultaneously evaluates linguistic claims, queries official regulatory registries, mathematically verifies
            actuarial reducing-balance loan costs, and maps hidden syndicate networks using cross-ad graph analysis.
          </p>
        </div>
      </div>

      {/* Multi-Module Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
          Core Multidimensional Architecture
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-indigo-400 uppercase block">Module 1</span>
            <h3 className="text-sm font-bold text-slate-100">Multi-Input Pipeline</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Accepts screenshot uploads with Canvas/OpenCV image preprocessing (grayscale, contrast stretching, binarization) and Tesseract OCR, alongside safe SSRF-protected webpage URL extraction and raw text inputs.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-indigo-400 uppercase block">Module 2</span>
            <h3 className="text-sm font-bold text-slate-100">Claim Detector</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Rule-based NLP and TF-IDF feature classification flagging advance fee demands, 100% approval guarantees, zero underwriting claims, daily interest traps, and extrusive permission requests.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-indigo-400 uppercase block">Module 3</span>
            <h3 className="text-sm font-bold text-slate-100">Lender Verification</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Cross-references claimed lender names and web domains against the RBI Digital Lending Apps (DLA) Directory and NBFC master database to detect credential mismatches and impersonation.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-indigo-400 uppercase block">Module 4</span>
            <h3 className="text-sm font-bold text-slate-100">Financial Transparency</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Actuarial reducing-balance EMI calculator: $P \times r \times (1+r)^n / ((1+r)^n - 1)$, factoring in 18% GST and fees to calculate true effective APR and uncover hidden loan costs.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-indigo-400 uppercase block">Module 5</span>
            <h3 className="text-sm font-bold text-slate-100">Scam Connection Mapper</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Signature graph network engine tracking shared contact numbers, hosting domains, email desks, and TF-IDF text similarity to detect coordinated multi-app scam syndicates.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-indigo-400 uppercase block">Module 6</span>
            <h3 className="text-sm font-bold text-slate-100">Explainable Risk Engine</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Combines multi-module findings into 3 transparent categories (HIGH RISK, NEEDS CHECKING, LOWER DETECTED RISK) with extracted evidence trails and actionable consumer safeguards.
            </p>
          </div>
        </div>
      </div>

      {/* Ethical & Regulatory Safeguards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          Ethical Standards & Regulatory Disclaimers
        </h2>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            1. <strong>No Uncalibrated Certainty:</strong> LoanGuard does not declare an advertisement or lender to be conclusively fraudulent based solely on algorithmic flags. Findings are reported as &quot;indicators&quot; and &quot;potential associations&quot;.
          </p>
          <p>
            2. <strong>Regulatory Nuance:</strong> The RBI directory is referenced as a public registration record, not an RBI safety certification. An entity missing from the local reference dataset is designated &quot;NOT FOUND&quot; rather than automatically labelled fraudulent.
          </p>
          <p>
            3. <strong>Data Privacy:</strong> LoanGuard never asks for, records, or stores sensitive personal financial credentials such as Aadhaar numbers, PAN numbers, bank account passwords, or OTPs.
          </p>
        </div>
      </div>
    </div>
  );
};
