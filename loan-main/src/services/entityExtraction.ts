/**
 * LoanGuard Entity & Financial Token Extraction Engine
 * Uses normalized regular expressions and domain heuristics tailored for Indian digital lending ads.
 */

import { FinancialExtraction } from '../types';

export function extractPhoneNumbers(text: string): string[] {
  // Matches Indian mobile numbers: +91 optional, starting with 6-9, 10 digits total with optional separators
  // Also standard landlines with STD codes like 080-44292200, 020-71576403, 1800-tollfree
  const phoneRegexes = [
    /(?:(?:\+91|91|0)[-.\s]?)?[6-9]\d{9}/g,
    /\b1800[-.\s]?\d{3}[-.\s]?\d{3,4}\b/g,
    /\b0\d{2,4}[-.\s]?\d{6,8}\b/g,
  ];

  const found = new Set<string>();
  for (const regex of phoneRegexes) {
    const matches = text.match(regex) || [];
    for (const match of matches) {
      // Normalize: keep only digits
      const digits = match.replace(/\D/g, '');
      if (digits.length === 10 && /^[6-9]/.test(digits)) {
        found.add(digits);
      } else if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
        found.add(digits.slice(2));
      } else if (digits.startsWith('1800') || (digits.length >= 10 && digits.length <= 11)) {
        found.add(digits);
      }
    }
  }
  return Array.from(found);
}

export function extractEmails(text: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex) || [];
  return Array.from(new Set(matches.map(e => e.toLowerCase())));
}

export function extractDomains(text: string): string[] {
  const urlOrDomainRegex = /\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.(?:com|in|co\.in|org|net|xyz|click|site|top|club|loan|online|tech|info|co|biz|live|app|cash))(?:\/[^\s]*)?/gi;
  const found = new Set<string>();
  let match;
  while ((match = urlOrDomainRegex.exec(text)) !== null) {
    const rawDomain = match[1].toLowerCase();
    // Exclude general non-target domains
    if (!['google.com', 'whatsapp.com', 'facebook.com', 'instagram.com', 't.me'].includes(rawDomain)) {
      found.add(rawDomain);
    }
  }
  return Array.from(found);
}

export function extractClaimedLenderAndApp(text: string): { claimedLender: string; claimedApp: string } {
  // Known lender entities in India
  const lenderKeywords = [
    { name: 'Bajaj Finance Limited', pattern: /bajaj\s*(?:finance|finserv)/i },
    { name: 'HDFC Bank Limited', pattern: /hdfc\s*(?:bank|personal\s*loan)?/i },
    { name: 'Krazybee Services Private Limited', pattern: /krazybee|kreditbee/i },
    { name: 'State Bank of India', pattern: /state\s*bank\s*of\s*india|sbi/i },
    { name: 'Earlysalary Services Private Limited (Fibe)', pattern: /earlysalary|fibe/i },
    { name: 'PayU Finance India Private Limited', pattern: /payu|lazypay/i },
    { name: 'Whizdm Innovations Private Limited', pattern: /moneyview|whizdm/i },
    { name: 'Tata Capital Financial Services Limited', pattern: /tata\s*capital/i },
    { name: 'IDFC FIRST Bank Limited', pattern: /idfc\s*first/i },
    { name: 'Piramal Capital & Housing Finance Limited', pattern: /piramal\s*(?:finance|capital)/i },
  ];

  let claimedLender = '';
  for (const item of lenderKeywords) {
    if (item.pattern.test(text)) {
      claimedLender = item.name;
      break;
    }
  }

  // If no known lender matched, check for generic phrases: "Partner of XYZ", "Lender: XYZ", "XYZ NBFC"
  if (!claimedLender) {
    const lenderMatch = text.match(/(?:partner(?:\s+of)?|lender|nbfc|bank|operated by|finance):\s*([A-Za-z0-9\s&.,-]{3,35})/i);
    if (lenderMatch && lenderMatch[1]) {
      claimedLender = lenderMatch[1].trim();
    }
  }

  // App extraction
  const appMatch = text.match(/(?:download|app(?:\s+name)?|introducing|use)\s+([A-Za-z0-9\s-]{3,25}(?:Loan|Rupee|Cash|Credit|Pay|Finserv|Money))/i);
  let claimedApp = appMatch && appMatch[1] ? appMatch[1].trim() : '';

  if (!claimedApp) {
    if (/kreditbee/i.test(text)) claimedApp = 'KreditBee';
    else if (/bajaj\s*finserv/i.test(text)) claimedApp = 'Bajaj Finserv App';
    else if (/yono/i.test(text)) claimedApp = 'YONO SBI';
    else if (/lazypay/i.test(text)) claimedApp = 'LazyPay';
    else if (/moneyview/i.test(text)) claimedApp = 'moneyview';
    else if (/fibe/i.test(text)) claimedApp = 'Fibe';
  }

  return {
    claimedLender: claimedLender || 'Not specifically declared',
    claimedApp: claimedApp || 'Unspecified Mobile App'
  };
}

export function extractFinancialDetails(text: string): FinancialExtraction {
  const rawDisclosures: string[] = [];

  // 1. Extract Loan Amount
  // Matches: Rs 50,000, ₹ 5,00,000, 40 Lakhs, up to 2,00,000
  let loanAmount: number | null = null;
  const amountMatch = text.match(/(?:rs\.?|₹|inr|loan(?:\s+of|\s+up\s+to)?)\s*([\d,]+(?:\.\d+)?)\s*(lakhs?|cr|crores?)?/i) ||
                      text.match(/up\s+to\s*(?:rs\.?|₹)?\s*([\d,]+(?:\.\d+)?)\s*(lakhs?|cr)?/i);

  if (amountMatch) {
    let rawNum = parseFloat(amountMatch[1].replace(/,/g, ''));
    const unit = amountMatch[2]?.toLowerCase();
    if (unit && unit.startsWith('lakh')) {
      rawNum = rawNum * 100000;
    } else if (unit && (unit === 'cr' || unit.startsWith('crore'))) {
      rawNum = rawNum * 10000000;
    }
    if (!isNaN(rawNum) && rawNum > 0) {
      loanAmount = rawNum;
      rawDisclosures.push(`Identified Loan Amount: ₹${loanAmount.toLocaleString('en-IN')}`);
    }
  }

  // 2. Extract Interest Rate & Period
  let interestRate: number | null = null;
  let interestRatePeriod: 'annual' | 'monthly' | 'daily' | 'unknown' = 'unknown';

  const dailyRateMatch = text.match(/([\d.]+)%\s*(?:per\s*day|daily)/i);
  const monthlyRateMatch = text.match(/([\d.]+)%\s*(?:per\s*month|monthly|p\.m\.)/i);
  const annualRateMatch = text.match(/([\d.]+)%\s*(?:p\.a\.|per\s*annum|annual|yearly)/i) ||
                          text.match(/interest(?:\s*rate)?(?:\s*starting)?(?:\s*at)?\s*([\d.]+)%/i);

  if (dailyRateMatch) {
    const daily = parseFloat(dailyRateMatch[1]);
    interestRate = daily * 365; // annualize
    interestRatePeriod = 'daily';
    rawDisclosures.push(`Disclosed Daily Rate: ${daily}% / day (Equivalent to ${interestRate.toFixed(1)}% p.a.)`);
  } else if (monthlyRateMatch) {
    const monthly = parseFloat(monthlyRateMatch[1]);
    interestRate = monthly * 12; // annualize
    interestRatePeriod = 'monthly';
    rawDisclosures.push(`Disclosed Monthly Rate: ${monthly}% / month (Equivalent to ${interestRate.toFixed(1)}% p.a.)`);
  } else if (annualRateMatch) {
    interestRate = parseFloat(annualRateMatch[1]);
    interestRatePeriod = 'annual';
    rawDisclosures.push(`Disclosed Annual Interest Rate: ${interestRate}% p.a.`);
  }

  // 3. Extract APR
  let aprDisclosed: number | null = null;
  const aprMatch = text.match(/apr(?:\s*(?:is|ranging\s*from|of)?)?\s*([\d.]+)(?:%|\s*to\s*([\d.]+)%)/i);
  if (aprMatch) {
    aprDisclosed = parseFloat(aprMatch[1]);
    rawDisclosures.push(`Disclosed APR: ${aprDisclosed}%`);
  }

  // 4. Processing Fee
  let processingFee: number | null = null;
  let processingFeeIsPercent = false;
  const feePercentMatch = text.match(/(?:processing\s*fees?|file\s*charge)(?:\s*(?:of|up\s*to|starting\s*at)?)?\s*([\d.]+)%/i);
  const feeFlatMatch = text.match(/(?:processing\s*fees?|refundable\s*processing\s*fee|file\s*charges?|security\s*(?:verification\s*)?deposit|advance\s*fee)[^\d]*(?:rs\.?|₹|inr)\s*([\d,]+)/i);
  const feeFlatBeforeMatch = text.match(/(?:rs\.?|₹|inr)\s*([\d,]+)\s*(?:advance\s*processing\s*fee|advance\s*fee|processing\s*fee|file\s*charge|security\s*deposit)/i);

  if (feePercentMatch) {
    processingFee = parseFloat(feePercentMatch[1]);
    processingFeeIsPercent = true;
    rawDisclosures.push(`Disclosed Processing Fee: ${processingFee}%`);
  } else if (feeFlatMatch) {
    processingFee = parseFloat(feeFlatMatch[1].replace(/,/g, ''));
    processingFeeIsPercent = false;
    rawDisclosures.push(`Disclosed Flat Fee / Deposit: ₹${processingFee}`);
  } else if (feeFlatBeforeMatch) {
    processingFee = parseFloat(feeFlatBeforeMatch[1].replace(/,/g, ''));
    processingFeeIsPercent = false;
    rawDisclosures.push(`Disclosed Flat Fee / Deposit: ₹${processingFee}`);
  }

  // 5. GST Mention
  let gstOnFee: number | null = null;
  if (/18%\s*gst|applicable\s*gst/i.test(text)) {
    gstOnFee = 18;
    rawDisclosures.push('GST explicitly disclosed: 18% on fees');
  }

  // 6. Repayment Tenure
  let tenureMonths: number | null = null;
  let tenureDays: number | null = null;

  const daysMatch = text.match(/(\d+)\s*days?(?:\s*tenure|\s*repayment)?/i);
  const monthsMatch = text.match(/(\d+)\s*(?:months?|mths?)/i) ||
                      text.match(/tenure(?:\s*(?:of|is|from)?)?\s*(\d+)/i);

  if (daysMatch && parseInt(daysMatch[1], 10) <= 90) {
    tenureDays = parseInt(daysMatch[1], 10);
    tenureMonths = Math.max(1, Math.round(tenureDays / 30));
    rawDisclosures.push(`Disclosed Tenure: ${tenureDays} days`);
  } else if (monthsMatch) {
    tenureMonths = parseInt(monthsMatch[1], 10);
    rawDisclosures.push(`Disclosed Tenure: ${tenureMonths} months`);
  }

  // 7. Disclosed EMI
  let disclosedEmi: number | null = null;
  const emiMatch = text.match(/emi\s*(?:is|of|starting\s*at)?\s*(?:rs\.?|₹)?\s*([\d,]+)/i);
  if (emiMatch) {
    disclosedEmi = parseFloat(emiMatch[1].replace(/,/g, ''));
    rawDisclosures.push(`Disclosed EMI: ₹${disclosedEmi.toLocaleString('en-IN')}`);
  }

  // 8. Late Payment / Penalties
  let latePaymentPenalty: string | null = null;
  const penaltyMatch = text.match(/(?:penalty|late\s*payment|overdue\s*charge)[^.\n]{5,50}/i);
  if (penaltyMatch) {
    latePaymentPenalty = penaltyMatch[0].trim();
    rawDisclosures.push(`Penalty Disclosure: "${latePaymentPenalty}"`);
  }

  // 9. Foreclosure
  let foreclosureCharges: string | null = null;
  const foreMatch = text.match(/(?:prepayment|foreclosure)[^.\n]{5,50}/i);
  if (foreMatch) {
    foreclosureCharges = foreMatch[0].trim();
  }

  return {
    loanAmount,
    interestRate,
    interestRatePeriod,
    aprDisclosed,
    processingFee,
    processingFeeIsPercent,
    gstOnFee,
    tenureMonths,
    tenureDays,
    disclosedEmi,
    latePaymentPenalty,
    foreclosureCharges,
    rawDisclosures
  };
}
