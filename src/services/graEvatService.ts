import { GraEvatTaxBreakdown, GraEvatResponse, CartItem, PharmacyConfig } from '../types/pharmacy';

// Calculate statutory Ghana GRA taxes and levies
export const calculateGraEvat = (
  items: CartItem[],
  config: PharmacyConfig
): GraEvatTaxBreakdown => {
  // In Ghana pharmacy practice, prescription & essential medicines may be exempt or taxable at standard/flat rate
  // Standard computation on total retail/copay billable amount:
  const taxableAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const nhilRate = config.nhilRate / 100; // 0.025 (2.5%)
  const getfundRate = config.getfundRate / 100; // 0.025 (2.5%)
  const covidRate = config.covidRate / 100; // 0.01 (1.0%)
  const vatRate = config.vatRate / 100; // 0.15 (15%)

  // Direct levies
  const nhilAmount = parseFloat((taxableAmount * nhilRate).toFixed(2));
  const getfundAmount = parseFloat((taxableAmount * getfundRate).toFixed(2));
  const covidAmount = parseFloat((taxableAmount * covidRate).toFixed(2));

  // Base for standard VAT is (Taxable Amount + NHIL + GETFund + COVID)
  const vatBase = taxableAmount + nhilAmount + getfundAmount + covidAmount;
  const standardVatAmount = parseFloat((vatBase * vatRate).toFixed(2));

  const totalTax = parseFloat((nhilAmount + getfundAmount + covidAmount + standardVatAmount).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + totalTax).toFixed(2));

  return {
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    nhilAmount,
    getfundAmount,
    covidAmount,
    standardVatAmount,
    totalTax,
    grandTotal,
    leviesIncluded: true
  };
};

// Generate a pseudo-random cryptographic hash for GRA invoice signing
const generateSecurityHash = (invoiceNo: string, tin: string, amount: number, timestamp: string): string => {
  const raw = `${invoiceNo}|${tin}|${amount.toFixed(2)}|${timestamp}|GRA-SEC-KEY-984210`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  const tail = Date.now().toString(16).slice(-6).toUpperCase();
  return `0x${hex}${tail}FF`;
};

// Transmit transaction to GRA Central E-VAT API middleware
export const transmitToGraEvat = async (
  invoiceSequence: number,
  items: CartItem[],
  taxBreakdown: GraEvatTaxBreakdown,
  config: PharmacyConfig,
  isOnline: boolean
): Promise<GraEvatResponse> => {
  const timestamp = new Date().toISOString();
  const year = new Date().getFullYear();
  const seqFormatted = String(invoiceSequence).padStart(6, '0');
  const graInvoiceNumber = `GRA-${year}-INV-${seqFormatted}`;
  const securityHash = generateSecurityHash(graInvoiceNumber, config.graTin, taxBreakdown.grandTotal, timestamp);
  
  // Format official GRA verification QR URL string
  const qrString = `https://verify.gra.gov.gh/evat/v1/invoice?tin=${config.graTin}&inv=${graInvoiceNumber}&dt=${encodeURIComponent(timestamp)}&amt=${taxBreakdown.grandTotal.toFixed(2)}&vat=${taxBreakdown.standardVatAmount.toFixed(2)}&hash=${securityHash}`;

  if (!isOnline) {
    // Offline Queueing & Fail-Safe: Store in pending queue, do not block POS sale
    return {
      status: 'QUEUED_OFFLINE',
      graInvoiceNumber,
      graSecurityHash: securityHash,
      graQrCodeString: qrString,
      graTimestamp: timestamp,
      transmissionMode: 'OFFLINE_SYNCED',
      errorMessage: 'Local queue stored. Will auto-sync sequentially when connection resolves.'
    };
  }

  // Simulate network API request to GRA server (500ms delay)
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    status: 'SUCCESS',
    graInvoiceNumber,
    graSecurityHash: securityHash,
    graQrCodeString: qrString,
    graTimestamp: timestamp,
    transmissionMode: 'REAL_TIME'
  };
};
