/**
 * LoanGuard Module 7: Advertisement History & Audit Ledger
 * Searchable, filterable list of all submitted advertisement assessments with drill-down and deletion.
 */

import React, { useState } from 'react';
import { AdRecord, RiskCategory } from '../types';
import { Search, Trash2, ArrowRight, Download, Filter, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

interface AdHistoryViewProps {
  ads: AdRecord[];
  onSelectAd: (adId: string) => void;
  onDeleteAd: (adId: string) => void;
}

export const AdHistoryView: React.FC<AdHistoryViewProps> = ({
  ads,
  onSelectAd,
  onDeleteAd
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | RiskCategory>('ALL');

  const filteredAds = ads.filter(ad => {
    const matchesCategory = categoryFilter === 'ALL' || ad.riskCategory === categoryFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      ad.title.toLowerCase().includes(term) ||
      ad.id.toLowerCase().includes(term) ||
      ad.claimedLender.toLowerCase().includes(term) ||
      ad.domains.some(d => d.toLowerCase().includes(term)) ||
      ad.phoneNumbers.some(p => p.includes(term));
    return matchesCategory && matchesSearch;
  });

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(ads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LoanGuard_Audit_Records_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Advertisement Risk History & Audit Ledger</h2>
            <p className="text-xs text-slate-400 mt-1">
              Complete archive of submitted digital loan advertisements, multi-factor scores, and regulatory findings.
            </p>
          </div>

          <button
            onClick={exportJson}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors self-start sm:self-center"
          >
            <Download className="w-4 h-4" />
            <span>Export Corpus JSON</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Ad title, ID, lender name, domain, or phone..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-stretch sm:self-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-2" />
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({ads.length})
            </button>
            <button
              onClick={() => setCategoryFilter('HIGH RISK')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === 'HIGH RISK' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              High Risk
            </button>
            <button
              onClick={() => setCategoryFilter('NEEDS CHECKING')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === 'NEEDS CHECKING' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Needs Checking
            </button>
            <button
              onClick={() => setCategoryFilter('LOWER DETECTED RISK')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                categoryFilter === 'LOWER DETECTED RISK' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lower Risk
            </button>
          </div>
        </div>
      </div>

      {/* Ads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800">
          {filteredAds.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No loan advertisement records found matching the current search criteria.
            </div>
          ) : (
            filteredAds.map((ad) => (
              <div
                key={ad.id}
                className="p-5 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 cursor-pointer" onClick={() => onSelectAd(ad.id)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                      ad.riskCategory === 'HIGH RISK' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                      ad.riskCategory === 'NEEDS CHECKING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {ad.riskCategory}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{ad.id}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-400 capitalize">{ad.inputType}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {new Date(ad.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 hover:text-indigo-400 transition-colors">
                    {ad.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                    <span>Lender: <strong className="text-slate-300">{ad.claimedLender}</strong></span>
                    {ad.domains.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-cyan-400">{ad.domains[0]}</span>
                      </>
                    )}
                    {ad.phoneNumbers.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-indigo-400">📞 {ad.phoneNumbers[0]}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Score</span>
                    <span className="text-xl font-bold font-mono text-slate-200 tabular-nums">
                      {ad.riskScore}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectAd(ad.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                  >
                    <span>View Audit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteAd(ad.id)}
                    title="Delete record from ledger"
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
