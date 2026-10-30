/**
 * LoanGuard Module 6 & 7: Comprehensive Explainable Risk Report Component
 * Presents multidimensional evidence across claims, lender verification, financials,
 * and scam connections with zero-fluff transparency.
 */

import React from 'react';
import { AdRecord } from '../types';
import {
  AlertTriangle,
  ShieldCheck,
  AlertCircle,
  Building2,
  Calculator,
  Share2,
  CheckCircle2,
  ArrowRight,
  Printer,
  FileText,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface RiskReportCardProps {
  ad: AdRecord;
  onNavigateToAd?: (adId: string) => void;
  onOpenMapper?: () => void;
}

export const RiskReportCard: React.FC<RiskReportCardProps> = ({
  ad,
  onNavigateToAd,
  onOpenMapper
}) => {
  const getRiskColor = (cat: string) => {
    switch (cat) {
      case 'HIGH RISK':
        return {
          bg: 'bg-red-950/40 border-red-800/80',
          text: 'text-red-400',
          badge: 'bg-red-500/20 text-red-300 border-red-500/30',
          icon: <AlertTriangle className="w-6 h-6 text-red-400" />
        };
      case 'NEEDS CHECKING':
        return {
          bg: 'bg-amber-950/40 border-amber-800/80',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <AlertCircle className="w-6 h-6 text-amber-400" />
        };
      default:
        return {
          bg: 'bg-emerald-950/40 border-emerald-800/80',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />
        };
    }
  };

  const riskStyle = getRiskColor(ad.riskCategory);

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Risk Overview */}
      <div className={`p-6 rounded-2xl border ${riskStyle.bg} backdrop-blur-md shadow-xl transition-all`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/60 shrink-0">
              {riskStyle.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${riskStyle.badge}`}>
                  {ad.riskCategory}
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {ad.id}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400 capitalize">Input: {ad.inputType}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {new Date(ad.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">{ad.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-center shrink-0">
            {/* Calibrated Risk Score Indicator */}
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">Risk Index</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-extrabold font-mono tabular-nums ${riskStyle.text}`}>
                  {ad.riskScore}
                </span>
                <span className="text-xs text-slate-500 font-mono">/ 100</span>
              </div>
            </div>

            <button
              onClick={printReport}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Audit</span>
            </button>
          </div>
        </div>

        {/* Explainable Executive Summary */}
        <div className="pt-4">
          <p className="text-sm text-slate-300 leading-relaxed">{ad.riskSummary}</p>
        </div>
      </div>

      {/* Grid of Key Modules: Claims & Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 2: Detected Claims & Deceptive Language */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Suspicious Claims & Red Flags ({ad.detectedClaims.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Module 2</span>
          </div>

          {ad.detectedClaims.length === 0 ? (
            <div className="p-4 bg-slate-950/60 rounded-lg text-center text-xs text-slate-400 border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              No explicitly deceptive, coercive, or predatory claims detected in the advertisement wording.
            </div>
          ) : (
            <div className="space-y-3">
              {ad.detectedClaims.map((claim) => (
                <div key={claim.id} className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200">{claim.warning}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                      claim.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                      claim.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {claim.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">{claim.explanation}</p>
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-900/90 p-2 rounded border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5 text-[10px] uppercase font-sans">Extracted Evidence:</span>
                    <span className="text-amber-300/90 italic">{claim.evidence}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Module 3: Lender and Loan App Verification */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Lender & App Regulatory Verification
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Module 3</span>
          </div>

          <div className="space-y-3">
            {/* Status Card */}
            <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wide block">Verification Result</span>
                <span className={`text-sm font-bold ${
                  ad.verification.status === 'MATCHED' ? 'text-emerald-400' :
                  ad.verification.status === 'MISMATCH' ? 'text-red-400' :
                  ad.verification.status === 'NOT FOUND' ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {ad.verification.status}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase tracking-wide block">Claimed Entity</span>
                <span className="text-xs font-medium text-slate-200">{ad.verification.claimedEntity}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
              {ad.verification.explanation}
            </p>

            {/* Evidence details */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wide block">
                Verification Details & Reference Trail
              </span>
              {ad.verification.evidence.map((ev, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-300 bg-slate-950/50 p-2 rounded">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>{ev}</span>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex items-center justify-between">
              <span>Source: {ad.verification.source}</span>
              <span className="font-mono">Updated: {ad.verification.lastUpdated}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Key Modules: Financial Transparency & Scam Mapper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 4: Financial Transparency & Loan Cost Analyzer */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Financial Transparency & Cost Calculations
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Module 4</span>
          </div>

          <div className="space-y-3">
            {/* Actuarial Calculation Card */}
            {ad.financialAnalysis?.isCalculable ? (
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block">
                  Actuarial Reducing-Balance Amortization
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Estimated EMI</span>
                    <span className="text-sm font-bold text-slate-100 font-mono tabular-nums">
                      ₹{ad.financialAnalysis?.calculatedEmi?.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Total Repayment</span>
                    <span className="text-sm font-bold text-slate-100 font-mono tabular-nums">
                      ₹{ad.financialAnalysis?.calculatedTotalRepayment?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Total Interest</span>
                    <span className="text-sm font-bold text-slate-100 font-mono tabular-nums">
                      ₹{ad.financialAnalysis?.calculatedTotalInterest?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Estimated APR</span>
                    <span className="text-sm font-bold text-indigo-400 font-mono tabular-nums">
                      {ad.financialAnalysis?.calculatedApr}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-lg text-xs text-amber-300">
                <strong className="block mb-1">Insufficient information to calculate standard reducing-balance EMI.</strong>
                Mandatory variables (Principal, Interest Rate, or Tenure) were not disclosed in the advertisement.
              </div>
            )}

            {/* Financial Transparency Warnings */}
            {(ad.financialAnalysis?.warnings || []).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide block">
                  Transparency Warnings ({(ad.financialAnalysis?.warnings || []).length})
                </span>
                {(ad.financialAnalysis?.warnings || []).map((warn, i) => (
                  <div key={i} className="p-2 bg-amber-950/30 border border-amber-800/40 rounded text-xs text-amber-200">
                    {warn}
                  </div>
                ))}
              </div>
            )}

            {/* Disclosures Audit */}
            <div className="space-y-1 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">
                Disclosed Entity Data
              </span>
              {!(ad.financialAnalysis?.extraction?.rawDisclosures?.length) ? (
                <div className="text-slate-500 italic">No explicit financial disclosures extracted.</div>
              ) : (
                ad.financialAnalysis.extraction.rawDisclosures.map((d, i) => (
                  <div key={i} className="text-slate-300 bg-slate-950/40 p-1.5 rounded flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                    <span>{d}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Module 5: Scam Connection Mapper Summary */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Scam Connection Mapper Insights ({ad.connections.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">Module 5</span>
            </div>

            <div className="space-y-3 mt-3">
              {ad.connections.length === 0 ? (
                <div className="p-4 bg-slate-950/60 rounded-lg text-center text-xs text-slate-400 border border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-slate-500 mx-auto mb-1.5" />
                  No overlapping phone numbers, web domains, or syndicated text templates detected with other advertisements in the repository.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {ad.connections.map(conn => (
                    <div
                      key={conn.connectionId}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-300">{conn.sharedIdentifier}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase px-1.5 py-0.5 bg-slate-800 rounded">
                          {conn.relationshipType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-normal">{conn.explanation}</p>
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-400">Target Ad: <strong className="text-slate-200">{conn.targetAdTitle}</strong></span>
                        {onNavigateToAd && (
                          <button
                            onClick={() => onNavigateToAd(conn.targetAdId)}
                            className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                          >
                            Inspect Ad <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {onOpenMapper && (
            <button
              onClick={onOpenMapper}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Launch Full Interactive Network Graph</span>
            </button>
          )}
        </div>
      </div>

      {/* Module 6: Missing Information & Safe Next Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Missing Info */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold pb-2 border-b border-slate-800">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Missing Regulatory & Financial Information</span>
          </div>
          {ad.missingInformation.length === 0 ? (
            <p className="text-xs text-emerald-400">All essential disclosures were identified.</p>
          ) : (
            <ul className="space-y-2 text-xs text-slate-300">
              {ad.missingInformation.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-950/40 p-2 rounded">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Suggested Safe Next Steps */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold pb-2 border-b border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Recommended Safe Next Steps for Consumer</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            {ad.safeNextSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-slate-950/40 p-2 rounded">
                <span className="text-emerald-400 font-bold">•</span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Original Submitted Content Inspector */}
      <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider">Submitted Advertisement Content</span>
          {ad.submittedUrl && (
            <a
              href={ad.submittedUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-indigo-400 hover:underline"
            >
              <span>{ad.submittedUrl}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800">
          {ad.extractedText}
        </pre>
      </div>
    </div>
  );
};
