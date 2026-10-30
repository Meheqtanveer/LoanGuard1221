/**
 * LoanGuard Module 4: Standalone Financial Transparency & Loan Cost Calculator
 * Actuarial Reducing-Balance EMI calculator, Daily Rate Converter & Hidden Charge Detector.
 */

import React, { useState, useMemo } from 'react';
import { Calculator, AlertTriangle, ArrowRight, Info, Percent } from 'lucide-react';

export const FinancialCalculatorView: React.FC = () => {
  // Calculator inputs
  const [principal, setPrincipal] = useState<number>(100000);
  const [annualRate, setAnnualRate] = useState<number>(12);
  const [tenureMonths, setTenureMonths] = useState<number>(24);
  const [feePercent, setFeePercent] = useState<number>(2);
  const [includeGst, setIncludeGst] = useState<boolean>(true);

  // Daily interest trap simulation
  const [dailyRate, setDailyRate] = useState<number>(0.1);
  const [shortDays, setShortDays] = useState<number>(7);

  // Actuarial reducing-balance calculations
  const calculations = useMemo(() => {
    const P = principal;
    const n = tenureMonths;
    const rate = annualRate;

    if (P <= 0 || n <= 0) return null;

    let emi = 0;
    let totalInterest = 0;
    let totalRepayment = 0;

    if (rate === 0) {
      emi = Math.round(P / n);
      totalInterest = 0;
      totalRepayment = P;
    } else {
      const monthlyR = rate / 100 / 12;
      const factor = Math.pow(1 + monthlyR, n);
      emi = Math.round((P * monthlyR * factor) / (factor - 1));
      totalRepayment = Math.round(emi * n);
      totalInterest = Math.round(totalRepayment - P);
    }

    let feeAmount = (P * feePercent) / 100;
    let gstAmount = 0;
    if (includeGst) {
      gstAmount = feeAmount * 0.18;
    }
    const totalUpfrontFees = Math.round(feeAmount + gstAmount);
    const netDisbursed = P - totalUpfrontFees;

    // Estimate APR from borrower cash flows:
    // borrower receives principal less upfront fees, then pays the EMI monthly.
    // Solve the monthly IRR by bisection, then convert to an effective annual rate.
    const monthlyPayment = emi;
    const targetNetDisbursed = netDisbursed;
    let low = 0;
    let high = 1; // 100% monthly upper bound; expand if needed.
    const presentValue = (monthlyRate: number) => {
      if (monthlyRate === 0) return monthlyPayment * n;
      return monthlyPayment * (1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate;
    };
    while (presentValue(high) > targetNetDisbursed && high < 100) high *= 2;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      if (presentValue(mid) > targetNetDisbursed) low = mid;
      else high = mid;
    }
    const monthlyIrr = (low + high) / 2;
    const effectiveApr = parseFloat(((Math.pow(1 + monthlyIrr, 12) - 1) * 100).toFixed(2));

    return {
      emi,
      totalInterest,
      totalRepayment,
      feeAmount: Math.round(feeAmount),
      gstAmount: Math.round(gstAmount),
      totalUpfrontFees,
      netDisbursed,
      effectiveApr
    };
  }, [principal, annualRate, tenureMonths, feePercent, includeGst]);

  // Daily rate math
  const dailyAnnualized = (dailyRate * 365).toFixed(1);
  const shortTenureRepayment = Math.round(principal + (principal * (dailyRate / 100) * shortDays));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-400" />
          Financial Transparency & Reducing-Balance Loan Cost Analyzer
        </h2>
        <p className="text-xs text-slate-400">
          Calculate actuarial reducing-balance Equated Monthly Instalments (EMI), uncover true Annual Percentage Rates (APR), and analyze predatory daily interest traps.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
            Loan Parameters
          </h3>

          {/* Principal */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Principal Loan Amount (₹)</span>
              <span className="font-mono text-emerald-400 font-bold tabular-nums">
                ₹{principal.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min={10000}
              max={2500000}
              step={10000}
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>₹10,000</span>
              <span>₹25 Lakhs</span>
            </div>
          </div>

          {/* Annual Interest Rate */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Annual Interest Rate (% p.a.)</span>
              <span className="font-mono text-emerald-400 font-bold tabular-nums">{annualRate}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={48}
              step={0.5}
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>0% (Promo)</span>
              <span>12% (Standard Bank)</span>
              <span>48% (High-Risk NBFC)</span>
            </div>
          </div>

          {/* Tenure */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Repayment Tenure (Months)</span>
              <span className="font-mono text-emerald-400 font-bold tabular-nums">{tenureMonths} Months</span>
            </div>
            <input
              type="range"
              min={3}
              max={60}
              step={1}
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>3 Months</span>
              <span>24 Months (2 Yrs)</span>
              <span>60 Months (5 Yrs)</span>
            </div>
          </div>

          {/* Processing Fee & GST */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Processing Fee (% of Loan)</span>
                <span className="font-mono text-slate-200 font-semibold tabular-nums">{feePercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={0.25}
                value={feePercent}
                onChange={(e) => setFeePercent(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={includeGst}
                onChange={(e) => setIncludeGst(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span>Include mandatory 18% GST on processing fee</span>
            </label>
          </div>
        </div>

        {/* Right Output & Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
            Calculated Repayment Schedule & True Cost of Credit
          </h3>

          {calculations && (
            <div className="space-y-5">
              {/* Main Highlight: Estimated Monthly EMI */}
              <div className="p-5 bg-slate-950 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold block">
                    Estimated Monthly EMI (Reducing Balance)
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-100 font-mono tabular-nums">
                      ₹{calculations.emi.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                    Effective APR
                  </span>
                  <span className="text-2xl font-bold text-indigo-400 font-mono tabular-nums">
                    {calculations.effectiveApr}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">incl. fees & GST</span>
                </div>
              </div>

              {/* Detailed Cost Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Principal Loan</span>
                  <span className="font-mono font-bold text-slate-200 tabular-nums">
                    ₹{principal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Estimated Interest</span>
                  <span className="font-mono font-bold text-amber-400 tabular-nums">
                    ₹{calculations.totalInterest.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Total Upfront Fee</span>
                  <span className="font-mono font-bold text-slate-200 tabular-nums">
                    ₹{calculations.totalUpfrontFees.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Total Repayment</span>
                  <span className="font-mono font-bold text-slate-100 tabular-nums">
                    ₹{calculations.totalRepayment.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Net In-Hand Disbursed Note */}
              <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <span>Net in-hand amount disbursed to borrower account:</span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  ₹{calculations.netDisbursed.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Special Section: Deceptive Daily Rate & Short-Tenure Trap Converter */}
          <div className="p-4 bg-slate-950 rounded-xl border border-amber-900/40 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Deceptive Daily Rate & 7-Day Loan Trap Analyzer</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rogue loan apps often advertise deceptively small daily numbers such as &quot;0.1% daily&quot; or &quot;only ₹10/day per thousand&quot; to disguise exorbitant annual rates.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Quoted Daily Rate (%)</label>
                <input
                  type="number"
                  step="0.05"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                />
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase block">Annualized Rate (APR)</span>
                <span className="text-base font-bold text-red-400 font-mono tabular-nums">
                  {dailyAnnualized}% p.a.
                </span>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase block">7-Day Total Cost</span>
                <span className="text-base font-bold text-amber-300 font-mono tabular-nums">
                  ₹{shortTenureRepayment.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
