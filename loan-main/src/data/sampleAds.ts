/**
 * Comprehensive Dataset of Seed Loan Advertisements
 * Covers legitimate bank ads, deceptive advance-fee fraud, illegal quick cash traps,
 * and interconnected syndicate campaigns sharing phone numbers & domains.
 */

export interface SampleAdSeed {
  id: string;
  title: string;
  category: 'legitimate' | 'suspicious' | 'ambiguous' | 'syndicate';
  inputType: 'text' | 'url' | 'screenshot';
  text: string;
  claimedLender?: string;
  claimedApp?: string;
  phone?: string;
  domain?: string;
  email?: string;
  notes: string;
}

export const SAMPLE_ADVERTISEMENTS: SampleAdSeed[] = [
  {
    id: 'AD-2026-001',
    title: 'Instant Rupee Advance Fee Scam (Syndicate Node A)',
    category: 'suspicious',
    inputType: 'text',
    phone: '9876543210',
    domain: 'speedyloanindia.in',
    email: 'approval@speedyloanindia.in',
    claimedLender: 'Bajaj Finance Limited',
    claimedApp: 'Speedy Rupee Fast Cash',
    text: `🚨 URGENT LOAN OFFER! 100% Guaranteed Loan Approval within 5 minutes!
Get personal loan from Rs 50,000 to Rs 5,00,000 directly in your bank account.
NO verification required, NO cibil score required, NO documents required! Zero paperwork!
Just pay refundable processing fee of Rs 1,499 before loan disbursement.
Approval guaranteed for all applicants. Call or WhatsApp now: 9876543210.
Visit website: https://speedyloanindia.in/apply
Email: approval@speedyloanindia.in
Official Partner: Bajaj Finance Limited. Apply immediately!`,
    notes: 'Classic Advance-Fee Fraud posing as Bajaj Finance on an unauthorized domain. Connected to Syndicate Node B & C via phone 9876543210.'
  },
  {
    id: 'AD-2026-002',
    title: 'Easy Cash 24x7 (Syndicate Node B - Shared Phone)',
    category: 'suspicious',
    inputType: 'text',
    phone: '9876543210',
    domain: 'easycashquick.click',
    email: 'support@easycashquick.click',
    claimedLender: 'Easy Cash Microcredits',
    claimedApp: 'Easy Cash 24x7',
    text: `Need urgent money today? Easy Cash 24x7 instant approval in 60 seconds!
Loan amount up to ₹2,00,000. Interest rate only 0.1% daily!
Zero documentation required, no credit score check, 100% guaranteed approval.
Pay ₹999 security verification deposit before transfer.
Contact official loan desk WhatsApp: 9876543210.
Apply at https://easycashquick.click/instant
Don't wait, limited festive approval quota remaining!`,
    notes: 'Shares phone 9876543210 with Speedy Rupee. Uses daily interest rate (36.5% flat / high APR) and advance security deposit demand.'
  },
  {
    id: 'AD-2026-003',
    title: 'Gold Star Rupee (Syndicate Node C - Shared Domain)',
    category: 'suspicious',
    inputType: 'url',
    phone: '9123456789',
    domain: 'speedyloanindia.in',
    email: 'disbursement@speedyloanindia.in',
    claimedLender: 'HDFC Personal Credits',
    claimedApp: 'Gold Star Fast Loan',
    text: `Gold Star Fast Loan - Partner of HDFC Personal Credits.
Pre-approved personal loan Rs 1,00,000 for 12 months.
Pay Rs 2,500 file charge in advance for priority release.
Send Aadhaar OTP and PAN front photo on WhatsApp to initiate disbursement.
Official website: https://speedyloanindia.in/goldstar
Contact: 9123456789 | Email: disbursement@speedyloanindia.in`,
    notes: 'Shares domain speedyloanindia.in with AD-001. Solicits Aadhaar OTP and advance file charge.'
  },
  {
    id: 'AD-2026-004',
    title: 'HDFC Bank Official Festive Personal Loan',
    category: 'legitimate',
    inputType: 'text',
    phone: '18002026161',
    domain: 'hdfcbank.com',
    email: 'support@hdfcbank.com',
    claimedLender: 'HDFC Bank Limited',
    claimedApp: 'HDFC Bank MobileBanking',
    text: `HDFC Bank Personal Loan: Get loans up to ₹40 Lakhs with attractive interest rates starting at 10.50% p.a.
Flexible tenure from 12 to 60 months. Processing fees up to 1.50% of the loan amount plus applicable GST (18%).
Example: On a loan of ₹1,00,000 at 10.50% interest for 24 months, estimated EMI is ₹4,638. Total repayment is ₹1,11,304.
Transparent APR disclosed in Key Fact Statement (KFS). Subject to credit verification, income appraisal, and KYC documentation as per RBI guidelines.
Visit official website: https://www.hdfcbank.com/personal-loan
Customer Helpline: 18002026161`,
    notes: 'Transparent, discloses annual interest rate, tenure, processing fee, GST, sample EMI, and requires KYC/credit verification.'
  },
  {
    id: 'AD-2026-005',
    title: 'KreditBee Personal Loan - Authentic NBFC Partner',
    category: 'legitimate',
    inputType: 'text',
    phone: '080-44292200',
    domain: 'kreditbee.in',
    email: 'help@kreditbee.in',
    claimedLender: 'Krazybee Services Private Limited',
    claimedApp: 'KreditBee',
    text: `KreditBee Quick Personal Loans up to ₹5,00,000 for salaried and self-employed professionals.
Annual Interest Rates (APR) ranging from 16% to 29.95% per annum based on risk assessment.
Repayment tenure: 3 to 24 months. Processing fee: 2% to 4% + 18% GST.
No hidden charges. Complete transparent Key Fact Statement provided before loan agreement signing.
Lending partner: Krazybee Services Private Limited (RBI Registered Systemically Important NBFC).
Download app from official Google Play Store or visit https://www.kreditbee.in.
Helpline: 080-44292200 | Email: help@kreditbee.in`,
    notes: 'Accurate disclosure of APR range, processing fee + GST, tenure, and registered NBFC entity name.'
  },
  {
    id: 'AD-2026-006',
    title: 'WhatsApp Viral Forward: Quick 7-Day Pocket Loan',
    category: 'suspicious',
    inputType: 'text',
    phone: '8765432109',
    domain: 'pocketrupee99.xyz',
    email: 'cash@pocketrupee99.xyz',
    claimedLender: 'Quick Pocket Financial Corp',
    claimedApp: 'Pocket Rupee',
    text: `⚡ Urgent Rs 10,000 approved in your account now!
Tenure: 7 days. Repayment: Rs 14,500.
No income proof! Share your contacts and gallery access for instant approval.
If not repaid in 7 days, penalty Rs 500 per day.
Apply APK download link: https://pocketrupee99.xyz/app.apk
WhatsApp Helpdesk: 8765432109`,
    notes: 'Predatory 7-day short-tenure loan with 45% weekly charge, demanding contacts/gallery permissions, distributing unsafe APK.'
  },
  {
    id: 'AD-2026-007',
    title: 'Ambiguous Social Media Flyer: Zero Interest Festive Loan',
    category: 'ambiguous',
    inputType: 'screenshot',
    phone: '9988776655',
    domain: 'festivecredits.co',
    email: 'info@festivecredits.co',
    claimedLender: 'Festive Finserv India',
    claimedApp: 'Festive Credits App',
    text: `🎉 Diwali Special Offer! Get Rs 50,000 Personal Loan at 0% Interest Rate!
Pay back in easy installments of Rs 5,000 for 10 months.
Hurry, offer valid for first 500 customers only!
Visit https://festivecredits.co or WhatsApp 9988776655 to claim your zero-interest voucher.
Terms and conditions apply. Processing charges applicable at time of booking.`,
    notes: 'Claims 0% interest without disclosing mandatory APR, processing charges, or underlying regulated lender entity.'
  }
];
