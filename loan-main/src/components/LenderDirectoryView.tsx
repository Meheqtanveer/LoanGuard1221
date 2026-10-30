/**
 * LoanGuard Module 3: RBI Digital Lending Apps & NBFC Reference Directory
 * Allows searching verified lenders and importing custom CSV/JSON reference datasets.
 */

import React, { useState } from 'react';
import { ReferenceLender } from '../types';
import { Search, Building2, UploadCloud, CheckCircle2, ShieldCheck, FileSpreadsheet, ExternalLink } from 'lucide-react';

interface LenderDirectoryViewProps {
  referenceLenders: ReferenceLender[];
  onImportLenders: (lenders: ReferenceLender[]) => void;
}

export const LenderDirectoryView: React.FC<LenderDirectoryViewProps> = ({
  referenceLenders,
  onImportLenders
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Filtered results
  const filtered = referenceLenders.filter(l => {
    const s = searchTerm.toLowerCase();
    return (
      l.lenderName.toLowerCase().includes(s) ||
      l.regulatedEntity.toLowerCase().includes(s) ||
      l.appNames.some(a => a.toLowerCase().includes(s)) ||
      l.officialDomains.some(d => d.toLowerCase().includes(s))
    );
  });

  // Handle CSV/JSON import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let newLenders: ReferenceLender[] = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            newLenders = parsed;
          }
        } else {
          // Parse CSV (header: lender_id,lender_name,regulated_entity,app_names,official_domains,contact_phone,contact_email,source)
          const lines = text.split('\n').filter(l => l.trim().length > 0);
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length >= 4) {
              newLenders.push({
                lenderId: cols[0] || `IMPORT-${Date.now()}-${i}`,
                lenderName: cols[1],
                regulatedEntity: cols[2] || 'NBFC',
                appNames: cols[3] ? cols[3].split(';').map(a => a.trim()) : [],
                officialDomains: cols[4] ? cols[4].split(';').map(d => d.trim()) : [],
                contactPhone: cols[5] || undefined,
                contactEmail: cols[6] || undefined,
                source: cols[7] || 'Administrator CSV Import',
                lastUpdated: new Date().toISOString().split('T')[0]
              });
            }
          }
        }

        if (newLenders.length > 0) {
          onImportLenders(newLenders);
          setImportStatus(`Successfully imported ${newLenders.length} lender reference records.`);
          // Also persist to backend API
          import('../services/apiClient').then(({ apiClient }) => {
            apiClient.importReferenceLenders(file).catch(err => console.warn('Backend sync:', err));
          });
        } else {
          setImportStatus('No valid lender records found in the uploaded file.');
        }
      } catch {
        setImportStatus('Error parsing uploaded file. Please ensure valid CSV or JSON format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              RBI Digital Lending Apps & NBFC Master Registry
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verified catalog of scheduled banks, non-banking financial companies, authorized digital lending apps, and official domains.
            </p>
          </div>

          {/* Import CSV / JSON Button */}
          <label className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors self-start md:self-center">
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Import Reference CSV/JSON</span>
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {importStatus && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by lender name (e.g. Bajaj, HDFC, Krazybee), app name, or official domain..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Regulatory Safeguard Notice */}
        <div className="text-[11px] text-slate-400 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
          <span className="font-semibold text-slate-300">Important Regulatory Context: </span>
          Presence in this local reference directory verifies regulatory registration and authorized digital channels.
          It does <strong className="text-slate-200">not</strong> constitute an RBI endorsement or safety guarantee.
          Entities absent from this local table may be unlisted intermediaries, cooperative banks, or new entities.
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider">
            Verified Lenders ({filtered.length} entries)
          </span>
          <span className="font-mono">Reference Database Version 2026.10</span>
        </div>

        <div className="divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching regulated lenders found for &quot;{searchTerm}&quot;.
            </div>
          ) : (
            filtered.map((lender) => (
              <div key={lender.lenderId} className="p-4 hover:bg-slate-800/30 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-slate-100 text-sm">{lender.lenderName}</span>
                    {lender.registrationNumber && (
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {lender.registrationNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 self-start sm:self-auto">
                    {lender.regulatedEntity}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Authorized Digital Lending Apps:</span>
                    <span className="text-slate-300 font-medium">{lender.appNames.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Official Web Domains:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {lender.officialDomains.map(d => (
                        <span key={d} className="text-cyan-400 font-mono flex items-center gap-1">
                          {d} <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Official Helpline / Email:</span>
                    <span className="text-slate-300 font-mono">
                      {lender.contactPhone || '—'} {lender.contactEmail ? `· ${lender.contactEmail}` : ''}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Source: {lender.source}</span>
                  <span className="font-mono tabular-nums">Last Checked: {lender.lastUpdated}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
