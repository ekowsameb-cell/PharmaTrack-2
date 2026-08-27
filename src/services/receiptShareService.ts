import { TransactionRecord, PharmacyConfig } from '../types/pharmacy';

export interface DigitalReceiptDispatchResult {
  success: boolean;
  channel: 'WHATSAPP' | 'SMS';
  recipientPhone: string;
  formattedPhone: string;
  messageId: string;
  timestamp: string;
  carrier: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED';
  deliveryNote: string;
}

/**
 * Standardize Ghana phone number to international 233 format without plus (for WhatsApp)
 */
export function formatGhanaPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('233') && cleaned.length >= 12) {
    return cleaned;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `233${cleaned.substring(1)}`;
  }
  if (cleaned.length === 9) {
    return `233${cleaned}`;
  }
  return cleaned.length > 0 ? cleaned : '233244000000';
}

/**
 * Standardize Ghana phone number to international E.164 (+233) format for SMS
 */
export function formatGhanaPhoneForSMS(phone: string): string {
  const waPhone = formatGhanaPhoneForWhatsApp(phone);
  return `+${waPhone}`;
}

/**
 * Detect Ghana Telecom Network Carrier from Phone Number
 */
export function detectGhanaCarrier(phone: string): { carrier: string; color: string; badge: string } {
  const cleaned = phone.replace(/[^0-9]/g, '');
  let prefix = '';
  
  if (cleaned.startsWith('233') && cleaned.length >= 5) {
    prefix = cleaned.substring(3, 5);
  } else if (cleaned.startsWith('0') && cleaned.length >= 3) {
    prefix = cleaned.substring(1, 3);
  } else if (cleaned.length >= 2) {
    prefix = cleaned.substring(0, 2);
  }

  // MTN Prefixes: 24, 54, 55, 59, 53
  if (['24', '54', '55', '59', '53'].includes(prefix)) {
    return { carrier: 'MTN Ghana', color: '#f59e0b', badge: 'MTN MoMo Ready' };
  }
  // Telecel (formerly Vodafone): 20, 50
  if (['20', '50'].includes(prefix)) {
    return { carrier: 'Telecel Ghana', color: '#ef4444', badge: 'Telecel Cash Ready' };
  }
  // AT (formerly AirtelTigo): 27, 57, 26
  if (['27', '57', '26'].includes(prefix)) {
    return { carrier: 'AT Ghana (AirtelTigo)', color: '#3b82f6', badge: 'AT Money Ready' };
  }

  return { carrier: 'Ghana Mobile Network', color: '#10b981', badge: 'SMS & WhatsApp Verified' };
}

/**
 * Generate Rich Emojified WhatsApp Receipt Text
 */
export function generateWhatsAppReceiptText(
  transaction: TransactionRecord,
  config: PharmacyConfig
): string {
  const patientName = transaction.patient?.fullName || 'Valued Walk-in Customer';
  const invoiceNum = transaction.graEvat?.graInvoiceNumber || transaction.id;
  const timeStr = new Date(transaction.timestamp).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let message = `🏥 *${config.pharmacyName.toUpperCase()}*\n`;
  message += `📍 ${config.branchName}, ${config.location}\n`;
  message += `📞 Tel: ${config.phone} | 🇬🇭 TIN: ${config.graTin}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🧾 *GRA OFFICIAL TAX INVOICE*\n`;
  message += `🔢 *Invoice #:* \`${invoiceNum}\`\n`;
  message += `📅 *Date:* ${timeStr}\n`;
  message += `👤 *Patient:* ${patientName}\n`;
  if (transaction.patient?.nhisNumber) {
    message += `💳 *NHIS No:* ${transaction.patient.nhisNumber}\n`;
  }
  message += `🧑‍⚕️ *Cashier:* ${transaction.cashierName || 'Counter Cashier'}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💊 *ITEMS DISPENSED:*\n`;

  transaction.items.forEach((item, index) => {
    message += `\n*${index + 1}. ${item.drug.brandName}* (${item.drug.strength})\n`;
    message += `   ▫️ Qty: ${item.quantity} x GHS ${item.unitPrice.toFixed(2)} = *GHS ${item.totalPrice.toFixed(2)}*\n`;
    message += `   ▫️ Batch: \`${item.selectedBatch.batchNumber}\``;
    if (item.dosageInstructions) {
      message += `\n   ▫️ 📋 *Dosage:* _${item.dosageInstructions}_`;
    }
    message += `\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📊 *STATUTORY TAXES & LEVIES:*\n`;
  message += `▫️ Taxable Base: GHS ${transaction.taxBreakdown.taxableAmount.toFixed(2)}\n`;
  message += `▫️ NHIL (2.5%): GHS ${transaction.taxBreakdown.nhilAmount.toFixed(2)}\n`;
  message += `▫️ GETFund (2.5%): GHS ${transaction.taxBreakdown.getfundAmount.toFixed(2)}\n`;
  message += `▫️ COVID-19 HRL (1.0%): GHS ${transaction.taxBreakdown.covidAmount.toFixed(2)}\n`;
  message += `▫️ VAT (15%): GHS ${transaction.taxBreakdown.standardVatAmount.toFixed(2)}\n`;
  message += `▫️ Total Levies: GHS ${transaction.taxBreakdown.totalTax.toFixed(2)}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *GRAND TOTAL:* *GHS ${transaction.grossAmount.toFixed(2)}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💳 *PAYMENT SETTLEMENT:*\n`;

  if (transaction.splitBilling.nhisAmount > 0) {
    message += `▫️ NHIS Claim: GHS ${transaction.splitBilling.nhisAmount.toFixed(2)}\n`;
  }
  if (transaction.splitBilling.privateInsuranceAmount > 0) {
    message += `▫️ ${transaction.splitBilling.privateInsurerName || 'Private Insurer'}: GHS ${transaction.splitBilling.privateInsuranceAmount.toFixed(2)}\n`;
  }
  if (transaction.splitBilling.momoAmount > 0) {
    message += `▫️ MoMo (${transaction.splitBilling.momoProvider || 'Mobile Money'}): GHS ${transaction.splitBilling.momoAmount.toFixed(2)} [Ref: ${transaction.splitBilling.momoTransactionId || 'OK'}]\n`;
  }
  if (transaction.splitBilling.ghqrAmount > 0) {
    message += `▫️ GhQR / GhanaPay: GHS ${transaction.splitBilling.ghqrAmount.toFixed(2)}\n`;
  }
  if (transaction.splitBilling.cashAmount > 0) {
    message += `▫️ Cash Paid: GHS ${transaction.splitBilling.cashAmount.toFixed(2)}\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔐 *GRA Security Hash:* \`${transaction.graEvat.graSecurityHash.slice(0, 16)}...\`\n`;
  message += `🌐 *Verify E-VAT:* https://evat.gra.gov.gh/verify?inv=${encodeURIComponent(invoiceNum)}\n\n`;
  message += `_Thank you for choosing ${config.pharmacyName}! Wishing you swift recovery & good health._ 🌿`;

  return message;
}

/**
 * Generate Compact SMS Receipt Text (Suitable for 1-2 SMS parts)
 */
export function generateSmsReceiptText(
  transaction: TransactionRecord,
  config: PharmacyConfig
): string {
  const invoiceNum = transaction.graEvat?.graInvoiceNumber || transaction.id;
  const itemsSummary = transaction.items
    .map(i => `${i.quantity}x ${i.drug.brandName.split(' ')[0]}`)
    .join(', ');
  
  let sms = `PHARMATRACK: ${config.pharmacyName}\n`;
  sms += `Receipt #${invoiceNum}\n`;
  sms += `Amt: GHS ${transaction.grossAmount.toFixed(2)} PAID.\n`;
  sms += `Items: ${itemsSummary}\n`;
  sms += `GRA Hash: ${transaction.graEvat.graSecurityHash.slice(0, 10)}\n`;
  sms += `Verify: evat.gra.gov.gh\n`;
  sms += `Tel: ${config.phone}`;

  return sms;
}

/**
 * Open WhatsApp directly with prefilled message
 */
export function openWhatsAppReceipt(phone: string, message: string): void {
  const formattedPhone = formatGhanaPhoneForWhatsApp(phone);
  const encoded = encodeURIComponent(message);
  const waUrl = `https://wa.me/${formattedPhone}?text=${encoded}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Open native SMS app with prefilled body
 */
export function openNativeSms(phone: string, message: string): void {
  const formattedPhone = formatGhanaPhoneForSMS(phone);
  const encoded = encodeURIComponent(message);
  // iOS and Android compatible URI
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const smsUrl = isIOS ? `sms:${formattedPhone}&body=${encoded}` : `sms:${formattedPhone}?body=${encoded}`;
  window.location.href = smsUrl;
}

/**
 * Simulate Direct Ghana SMS Gateway Dispatch (Hubtel / Arkesel / MNotify style)
 */
export async function simulateGhanaSmsGatewayDispatch(
  phone: string,
  message: string,
  senderId = 'PHARMATRACK'
): Promise<DigitalReceiptDispatchResult> {
  const formattedPhone = formatGhanaPhoneForSMS(phone);
  const carrierInfo = detectGhanaCarrier(phone);

  // Simulate network latency (400ms - 900ms)
  await new Promise((resolve) => setTimeout(resolve, 600));

  const messageId = `SMS-GH-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

  return {
    success: true,
    channel: 'SMS',
    recipientPhone: phone,
    formattedPhone,
    messageId,
    timestamp: new Date().toISOString(),
    carrier: carrierInfo.carrier,
    status: 'DELIVERED',
    deliveryNote: `SMS dispatched via Ghana Gateway [Sender ID: ${senderId}] to ${formattedPhone} (${carrierInfo.carrier}). Gateway Ack: 200 OK.`
  };
}
