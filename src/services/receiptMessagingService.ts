import { TransactionRecord, PharmacyConfig } from '../types/pharmacy';

/**
 * Normalizes phone numbers for Ghana mobile network operators (MTN, Telecel, AT)
 * Formats supported: 0244123456, 233244123456, +233244123456, 0551234567, etc.
 */
export function formatGhanaPhoneNumber(phoneInput?: string): {
  raw: string;
  sanitized: string;
  international: string;
  display: string;
  isValid: boolean;
} {
  if (!phoneInput) {
    return {
      raw: '',
      sanitized: '233244000000',
      international: '+233244000000',
      display: '024 400 0000',
      isValid: false
    };
  }

  // Strip non-digits except leading +
  let cleaned = phoneInput.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If starts with 0 and has 10 digits (e.g. 0244123456)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '233' + cleaned.substring(1);
  }

  // If already 9 digits without leading 0 or 233 (e.g. 244123456)
  if (cleaned.length === 9 && !cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }

  const isValid = cleaned.startsWith('233') && cleaned.length === 12;
  const localDigits = cleaned.startsWith('233') ? '0' + cleaned.substring(3) : cleaned;
  const display = localDigits.length === 10
    ? `${localDigits.slice(0, 3)} ${localDigits.slice(3, 6)} ${localDigits.slice(6)}`
    : phoneInput;

  return {
    raw: phoneInput,
    sanitized: cleaned,
    international: `+${cleaned}`,
    display,
    isValid
  };
}

/**
 * Formats an official Ghana GRA E-VAT Receipt for WhatsApp with markdown formatting.
 */
export function formatWhatsAppReceipt(
  transaction: TransactionRecord,
  config: PharmacyConfig
): string {
  const dateStr = new Date(transaction.timestamp).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const lines: string[] = [
    `🧾 *OFFICIAL GRA E-VAT TAX INVOICE*`,
    `🏥 *${config.pharmacyName.toUpperCase()}*`,
    `📍 ${config.location} (${config.branchName})`,
    `📞 TEL: ${config.phone} | 🏢 GRA TIN: *${config.graTin}*`,
    `📋 GPhC License: *${config.gphcLicenseNumber}*`,
    `────────────────────────`,
    `📄 *Invoice No:* ${transaction.graEvat.graInvoiceNumber}`,
    `📅 *Date/Time:* ${dateStr}`,
    `👤 *Cashier:* ${transaction.cashierName} (${transaction.lane === 'clinical' ? 'Clinical Rx' : 'Retail OTC'})`,
    `🧑‍⚕️ *Patient:* ${transaction.patient?.fullName || 'Walk-in Retail Buyer'}${transaction.patient?.nationalId ? ` (${transaction.patient.nationalId})` : ''}`,
  ];

  if (transaction.patient?.nhisNumber) {
    lines.push(`💳 *NHIS No:* ${transaction.patient.nhisNumber}`);
  }

  lines.push(`────────────────────────`);
  lines.push(`💊 *MEDICATIONS DISPENSED:*`);

  transaction.items.forEach((item, idx) => {
    lines.push(
      `${idx + 1}. *${item.drug.brandName}* (${item.drug.strength || item.drug.dosageForm})`,
      `   Batch: \`${item.selectedBatch.batchNumber}\` | Qty: ${item.quantity} × GHS ${item.unitPrice.toFixed(2)} = *GHS ${item.totalPrice.toFixed(2)}*`
    );
    if (item.dosageInstructions) {
      lines.push(`   _Rx Instructions: ${item.dosageInstructions}_`);
    }
  });

  lines.push(`────────────────────────`);
  lines.push(`📊 *TAX & STATUTORY LEVIES:*`);
  lines.push(`• Taxable Base: GHS ${transaction.taxBreakdown.taxableAmount.toFixed(2)}`);
  lines.push(`• NHIL (2.5%): GHS ${transaction.taxBreakdown.nhilAmount.toFixed(2)}`);
  lines.push(`• GETFund (2.5%): GHS ${transaction.taxBreakdown.getfundAmount.toFixed(2)}`);
  lines.push(`• COVID-19 HRL (1.0%): GHS ${transaction.taxBreakdown.covidAmount.toFixed(2)}`);
  lines.push(`• Standard VAT (15.0%): GHS ${transaction.taxBreakdown.standardVatAmount.toFixed(2)}`);
  lines.push(`• Total Tax: GHS ${transaction.taxBreakdown.totalTax.toFixed(2)}`);
  lines.push(`💰 *GRAND TOTAL:* *GHS ${transaction.grossAmount.toFixed(2)}*`);

  lines.push(`────────────────────────`);
  lines.push(`💳 *PAYMENT SETTLEMENT:*`);

  if (transaction.splitBilling.nhisAmount > 0) {
    lines.push(`• NHIS Claims Cover: GHS ${transaction.splitBilling.nhisAmount.toFixed(2)}`);
  }
  if (transaction.splitBilling.privateInsuranceAmount > 0) {
    lines.push(`• ${transaction.splitBilling.privateInsurerName || 'Private Insurance'}: GHS ${transaction.splitBilling.privateInsuranceAmount.toFixed(2)}`);
  }
  if (transaction.splitBilling.momoAmount > 0) {
    lines.push(`• MoMo (${transaction.splitBilling.momoProvider || 'Mobile Money'}): GHS ${transaction.splitBilling.momoAmount.toFixed(2)} [Ref: ${transaction.splitBilling.momoTransactionId || 'TXN-OK'}]`);
  }
  if (transaction.splitBilling.ghqrAmount > 0) {
    lines.push(`• GhQR / GhanaPay: GHS ${transaction.splitBilling.ghqrAmount.toFixed(2)} [Ref: ${transaction.splitBilling.ghqrReference || 'GHQR-APPROVED'}]`);
  }
  if (transaction.splitBilling.cashAmount > 0) {
    lines.push(`• Cash Copay Tendered: GHS ${transaction.splitBilling.cashAmount.toFixed(2)}`);
  }

  if (transaction.hasControlledDrugs) {
    lines.push(`────────────────────────`);
    lines.push(`⚠️ *[GPhC Controlled Drug Register Entry # ${transaction.ddrEntryId || 'LOGGED'}]*`);
    lines.push(`Superintendent: ${config.superintendentPharmacist.fullName} (${config.superintendentPharmacist.gphcPin})`);
  }

  lines.push(`────────────────────────`);
  lines.push(`🔐 *GRA Fiscal Hash:*`);
  lines.push(`\`${transaction.graEvat.graSecurityHash}\``);
  lines.push(`🔗 *Online Verification:*`);
  lines.push(`https://evat.gra.gov.gh/verify?invoice=${transaction.graEvat.graInvoiceNumber}&hash=${transaction.graEvat.graSecurityHash.slice(0, 16)}`);
  lines.push(``);
  lines.push(`_Thank you for choosing ${config.pharmacyName}. We wish you a speedy recovery!_`);

  return lines.join('\n');
}

/**
 * Formats a concise standard SMS receipt for Ghana mobile networks.
 */
export function formatSmsReceipt(
  transaction: TransactionRecord,
  config: PharmacyConfig,
  compact: boolean = false
): string {
  const dateStr = new Date(transaction.timestamp).toLocaleDateString('en-GB');

  if (compact) {
    const itemsSummary = transaction.items.map(i => `${i.quantity}x ${i.drug.brandName}`).join(', ');
    return `${config.pharmacyName}: GRA Invc #${transaction.graEvat.graInvoiceNumber}. Total: GHS ${transaction.grossAmount.toFixed(2)} (${itemsSummary}). GRA Hash: ${transaction.graEvat.graSecurityHash.slice(0, 10)}. Verify: https://evat.gra.gov.gh/v/${transaction.graEvat.graInvoiceNumber}. Tel: ${config.phone}`;
  }

  const itemsList = transaction.items
    .map(i => `${i.quantity}x ${i.drug.brandName} (GHS ${i.totalPrice.toFixed(2)})`)
    .join('\n');

  return `*** ${config.pharmacyName.toUpperCase()} ***
GRA INVOICE: ${transaction.graEvat.graInvoiceNumber}
DATE: ${dateStr}
PATIENT: ${transaction.patient?.fullName || 'Walk-in'}
---
ITEMS:
${itemsList}
---
TOTAL: GHS ${transaction.grossAmount.toFixed(2)}
TAX & LEVIES: GHS ${transaction.taxBreakdown.totalTax.toFixed(2)}
PAID VIA: ${transaction.splitBilling.momoAmount > 0 ? 'MoMo ' : ''}${transaction.splitBilling.cashAmount > 0 ? 'Cash ' : ''}${transaction.splitBilling.nhisAmount > 0 ? 'NHIS ' : ''}${transaction.splitBilling.ghqrAmount > 0 ? 'GhQR' : ''}
GRA HASH: ${transaction.graEvat.graSecurityHash.slice(0, 16)}
Verify at https://evat.gra.gov.gh/verify?inv=${transaction.graEvat.graInvoiceNumber}
Tel: ${config.phone}`;
}

/**
 * Builds a direct web/mobile WhatsApp dispatch link.
 */
export function getWhatsAppShareUrl(phone: string, message: string): string {
  const formatted = formatGhanaPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${formatted.sanitized}?text=${encodedText}`;
}

/**
 * Builds a standard mobile SMS URL.
 */
export function getSmsShareUrl(phone: string, message: string): string {
  const formatted = formatGhanaPhoneNumber(phone);
  const encodedBody = encodeURIComponent(message);
  return `sms:${formatted.international}?&body=${encodedBody}`;
}

export interface SmsDispatchResult {
  success: boolean;
  messageId: string;
  recipientPhone: string;
  senderId: string;
  timestamp: string;
  networkCarrier: 'MTN Ghana' | 'Telecel Ghana' | 'AT (AirtelTigo)' | 'Other';
  costGhs: number;
}

/**
 * Simulates real-time Ghana SMS Telecom Gateway Dispatch (Hubtel / Twilio Ghana API)
 */
export async function simulateSendSms(
  phone: string,
  message: string,
  senderId: string = 'PHARMATRACK'
): Promise<SmsDispatchResult> {
  const formatted = formatGhanaPhoneNumber(phone);
  
  // Simulate network latency (200-500ms)
  await new Promise((resolve) => setTimeout(resolve, 450));

  let carrier: 'MTN Ghana' | 'Telecel Ghana' | 'AT (AirtelTigo)' | 'Other' = 'MTN Ghana';
  const prefix = formatted.sanitized.substring(3, 5);
  if (['24', '54', '55', '59'].includes(prefix)) {
    carrier = 'MTN Ghana';
  } else if (['20', '50'].includes(prefix)) {
    carrier = 'Telecel Ghana';
  } else if (['27', '57', '26'].includes(prefix)) {
    carrier = 'AT (AirtelTigo)';
  }

  const messageId = `GH-SMS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  return {
    success: true,
    messageId,
    recipientPhone: formatted.display,
    senderId,
    timestamp: new Date().toISOString(),
    networkCarrier: carrier,
    costGhs: 0.05
  };
}
