/**
 * LoanGuard Module 7: Dashboard Statistics & Visual Distribution Charts
 * Displays risk category breakdowns, warning indicator frequencies, and key metrics.
 */

import React, { useMemo } from 'react';
import { AdRecord } from '../types';
import { ShieldAlert, AlertTriangle, ShieldCheck, FileSearch, TrendingUp } from 'lucide-react';

interface DashboardStatsProps {
  ads: AdRecord[];
  onSelectCategory?: (category: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ ads, onSelectCategory }) => {
  const stats = useMemo(() => {
    let highRisk = 0;
    let needsChecking = 0;
    let lowerRisk = 0;

    const warningCounts: Record<string, number> = {
      'Advance Fee Demand': 0,
      'Unrealistic 100% Approval': 0,
      'Zero Underwriting / No CIBIL': 0,
      'Predatory Short Tenure': 0,
      'Daily Interest Rate Trap': 0,
      'Entity Identity Mismatch': 0,
    };

    for (const ad of ads) {
      const riskCat = ad.riskCategory || (ad as any).risk_category || 'LOWER DETECTED RISK';
      if (riskCat === 'HIGH RISK') highRisk++;
      else if (riskCat === 'NEEDS CHECKING') needsChecking++;
      else lowerRisk++;

      const verification = ad.verification || (ad as any).lender_verification || {};
      if (verification.status === 'MISMATCH') {
        warningCounts['Entity Identity Mismatch']++;
      }

      const claims = ad.detectedClaims || (ad as any).detected_claims || [];
      for (const claim of claims) {
        if (claim.category === 'advance_fee') warningCounts['Advance Fee Demand']++;
        if (claim.category === 'approval') warningCounts['Unrealistic 100% Approval']++;
        if (claim.category === 'documentation') warningCounts['Zero Underwriting / No CIBIL']++;
        if (claim.category === 'interest' && (claim.phrase || '').toLowerCase().includes('day')) {
          warningCounts['Daily Interest Rate Trap']++;
        }
      }

      const fin = (ad.financialAnalysis || (ad as any).financial_analysis) as any;
      const flags = fin?.transparencyFlags || fin?.transparency_flags;
      if (flags?.predatoryTenure || flags?.predatory_tenure) {
        warningCounts['Predatory Short Tenure']++;
      }
    }

    const total = ads.length || 1;
    return {
      total: ads.length,
      highRisk,
      needsChecking,
      lowerRisk,
      highPct: Math.round((highRisk / total) * 100),
      checkPct: Math.round((needsChecking / total) * 100),
      lowerPct: Math.round((lowerRisk / total) * 100),
      warningCounts
    };
  }, [ads]);

  return (
    <div className="space-y-6">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyzed */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Advertisements</span>
            <FileSearch className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {stats.total}
          </div>
          <span className="text-[11px] text-slate-500 block">Submitted across all channels</span>
        </div>

        {/* High Risk Flagged */}
        <div
          onClick={() => onSelectCategory && onSelectCategory('HIGH RISK')}
          className="p-4 bg-slate-900 border border-red-900/30 hover:border-red-500/50 rounded-xl space-y-1 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-red-400">
            <span>High Risk Detected</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400 tabular-nums">
            {stats.highRisk}
          </div>
          <span className="text-[11px] text-slate-500 block font-mono">{stats.highPct}% of ad corpus</span>
        </div>

        {/* Needs Checking */}
        <div
          onClick={() => onSelectCategory && onSelectCategory('NEEDS CHECKING')}
          className="p-4 bg-slate-900 border border-amber-900/30 hover:border-amber-500/50 rounded-xl space-y-1 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>Needs Checking</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {stats.needsChecking}
          </div>
          <span className="text-[11px] text-slate-500 block font-mono">{stats.checkPct}% of ad corpus</span>
        </div>

        {/* Lower Detected Risk */}
        <div
          onClick={() => onSelectCategory && onSelectCategory('LOWER DETECTED RISK')}
          className="p-4 bg-slate-900 border border-emerald-900/30 hover:border-emerald-500/50 rounded-xl space-y-1 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span>Lower Detected Risk</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {stats.lowerRisk}
          </div>
          <span className="text-[11px] text-slate-500 block font-mono">{stats.lowerPct}% of ad corpus</span>
        </div>
      </div>

      {/* Visual Distribution Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Category Distribution Bar */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Risk Classification Distribution
            </h3>
            <span className="text-xs text-slate-500 font-mono">N = {stats.total}</span>
          </div>

          <div className="space-y-4">
            {/* Segmented Bar */}
            <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex">
              <div style={{ width: `${stats.highPct}%` }} className="bg-red-500 transition-all duration-500" title={`High Risk: ${stats.highRisk}`} />
              <div style={{ width: `${stats.checkPct}%` }} className="bg-amber-500 transition-all duration-500" title={`Needs Checking: ${stats.needsChecking}`} />
              <div style={{ width: `${stats.lowerPct}%` }} className="bg-emerald-500 transition-all duration-500" title={`Lower Risk: ${stats.lowerRisk}`} />
            </div>

            {/* Legend & Details */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">High Risk</span>
                <span className="font-bold text-red-400 font-mono text-base tabular-nums">{stats.highRisk}</span>
                <span className="text-[11px] text-slate-500 block font-mono">({stats.highPct}%)</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Needs Checking</span>
                <span className="font-bold text-amber-400 font-mono text-base tabular-nums">{stats.needsChecking}</span>
                <span className="text-[11px] text-slate-500 block font-mono">({stats.checkPct}%)</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Lower Risk</span>
                <span className="font-bold text-emerald-400 font-mono text-base tabular-nums">{stats.lowerRisk}</span>
                <span className="text-[11px] text-slate-500 block font-mono">({stats.lowerPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Indicator Frequency Chart */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Warning Indicator Frequency
            </h3>
            <span className="text-xs text-slate-500 font-mono">Top Patterns</span>
          </div>

          <div className="space-y-3">
            {Object.entries(stats.warningCounts).map(([label, count]) => {
              const maxCount = Math.max(1, ...Object.values(stats.warningCounts));
              const barWidth = Math.round((count / maxCount) * 100);

              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{label}</span>
                    <span className="text-slate-400 font-mono tabular-nums">{count} ads</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        count > 0 ? 'bg-indigo-500' : 'bg-slate-800'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
