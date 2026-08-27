import { TransactionRecord, PharmacyConfig, NhisClaimBatchItem } from '../types/pharmacy';
import { generateNhisGFormBatch, calculateNhisBatchSummary } from './nhisService';
import { computeRecordHash } from './storageService';

export interface EndOfDaySalesSummary {
  grossSalesGhs: number;
  discountTotalGhs: number;
  netSalesGhs: number;
  cashCollectedGhs: number;
  momoCollectedGhs: number;
  ghqrCardCollectedGhs: number;
  privateInsuranceReceivableGhs: number;
  patientCopayTotalGhs: number;
  transactionCount: number;
  averageTransactionValueGhs: number;
  totalUnitsSold: number;
  controlledDrugTxnCount: number;
  laneBreakdown: {
    otcCount: number;
    otcAmountGhs: number;
    clinicalCount: number;
    clinicalAmountGhs: number;
    insuranceCount: number;
    insuranceAmountGhs: number;
  };
}

export interface EndOfDayVatSummary {
  taxableSalesBaseGhs: number;
  standardVat15Ghs: number;
  nhil2_5Ghs: number;
  getfund2_5Ghs: number;
  covid1_0Ghs: number;
  totalTaxRemittableGhs: number;
  effectiveTaxRatePct: number;
  stampedInvoiceCount: number;
  realTimeSyncCount: number;
  offlineQueueCount: number;
  complianceRatePct: number;
  graTin: string;
}

export interface EndOfDayNhisSummary {
  totalClaimAmountGhs: number;
  totalCopayAmountGhs: number;
  totalRetailEquivalentGhs: number;
  totalClaimsCount: number;
  uniqueBeneficiariesCount: number;
  categoryBreakdown: Record<string, { count: number; amountGhs: number }>;
  topDrugs: { name: string; code: string; qty: number; amountGhs: number }[];
  topDiagnoses: { code: string; count: number; amountGhs: number }[];
  compliancePassRatePct: number;
  gFormBatchItems: NhisClaimBatchItem[];
  nhiaFacilityCode: string;
}

export interface EndOfDayReport {
  reportId: string;
  calendarDate: string;
  generatedAt: string;
  generatedBy: string;
  pharmacyName: string;
  branchName: string;
  graTin: string;
  nhiaFacilityCode: string;
  gphcLicenseNumber: string;
  superintendentName: string;
  sales: EndOfDaySalesSummary;
  vat: EndOfDayVatSummary;
  nhis: EndOfDayNhisSummary;
  closingVerificationHash: string;
  status: 'PROVISIONAL' | 'FINAL_CLOSED';
}

/**
 * Automatically calculates the full End-of-Day financial, VAT, and NHIS reconciliation
 * for any given calendar date (defaults to today).
 */
export const calculateEndOfDayReport = (
  transactions: TransactionRecord[],
  calendarDate: string,
  config: PharmacyConfig,
  operatorName: string = 'Dr. K. Boateng, MD & CEO'
): EndOfDayReport => {
  // Filter transactions strictly matching the given calendar date (YYYY-MM-DD)
  const targetDateStr = calendarDate || new Date().toISOString().split('T')[0];
  const dayTxns = transactions.filter((t) => {
    const txDate = t.timestamp ? t.timestamp.split('T')[0] : '';
    return txDate === targetDateStr;
  });

  // 1. Sales & Cash Flow Aggregations
  let grossSalesGhs = 0;
  let discountTotalGhs = 0;
  let netSalesGhs = 0;
  let cashCollectedGhs = 0;
  let momoCollectedGhs = 0;
  let ghqrCardCollectedGhs = 0;
  let privateInsuranceReceivableGhs = 0;
  let patientCopayTotalGhs = 0;
  let totalUnitsSold = 0;
  let controlledDrugTxnCount = 0;

  const laneBreakdown = {
    otcCount: 0,
    otcAmountGhs: 0,
    clinicalCount: 0,
    clinicalAmountGhs: 0,
    insuranceCount: 0,
    insuranceAmountGhs: 0
  };

  dayTxns.forEach((t) => {
    grossSalesGhs += t.grossAmount || 0;
    discountTotalGhs += t.discountAmount || 0;
    netSalesGhs += t.netAmount || 0;

    const sb = t.splitBilling || {
      cashAmount: 0,
      momoAmount: 0,
      ghqrAmount: 0,
      privateInsuranceAmount: 0,
      patientCopayTotal: 0
    };

    cashCollectedGhs += sb.cashAmount || 0;
    momoCollectedGhs += sb.momoAmount || 0;
    ghqrCardCollectedGhs += sb.ghqrAmount || 0;
    privateInsuranceReceivableGhs += sb.privateInsuranceAmount || 0;
    patientCopayTotalGhs += sb.patientCopayTotal || 0;

    // Items volume
    if (Array.isArray(t.items)) {
      t.items.forEach((item) => {
        totalUnitsSold += item.quantity || 0;
      });
    }

    if (t.hasControlledDrugs) {
      controlledDrugTxnCount++;
    }

    // Lane grouping
    if (t.lane === 'retail') {
      laneBreakdown.otcCount++;
      laneBreakdown.otcAmountGhs += t.netAmount || 0;
    } else if (t.lane === 'clinical') {
      laneBreakdown.clinicalCount++;
      laneBreakdown.clinicalAmountGhs += t.netAmount || 0;
    } else if (t.lane === 'insurance') {
      laneBreakdown.insuranceCount++;
      laneBreakdown.insuranceAmountGhs += t.netAmount || 0;
    }
  });

  const transactionCount = dayTxns.length;
  const averageTransactionValueGhs = transactionCount > 0
    ? parseFloat((netSalesGhs / transactionCount).toFixed(2))
    : 0;

  // 2. GRA E-VAT & Levies Aggregations
  let taxableSalesBaseGhs = 0;
  let standardVat15Ghs = 0;
  let nhil2_5Ghs = 0;
  let getfund2_5Ghs = 0;
  let covid1_0Ghs = 0;
  let totalTaxRemittableGhs = 0;
  let stampedInvoiceCount = 0;
  let realTimeSyncCount = 0;
  let offlineQueueCount = 0;

  dayTxns.forEach((t) => {
    if (t.taxBreakdown) {
      taxableSalesBaseGhs += t.taxBreakdown.taxableAmount || 0;
      standardVat15Ghs += t.taxBreakdown.standardVatAmount || 0;
      nhil2_5Ghs += t.taxBreakdown.nhilAmount || 0;
      getfund2_5Ghs += t.taxBreakdown.getfundAmount || 0;
      covid1_0Ghs += t.taxBreakdown.covidAmount || 0;
      totalTaxRemittableGhs += t.taxBreakdown.totalTax || 0;
    }

    if (t.graEvat) {
      stampedInvoiceCount++;
      if (t.graEvat.transmissionMode === 'REAL_TIME' || t.graEvat.status === 'SUCCESS') {
        realTimeSyncCount++;
      } else {
        offlineQueueCount++;
      }
    }
  });

  const effectiveTaxRatePct = taxableSalesBaseGhs > 0
    ? parseFloat(((totalTaxRemittableGhs / taxableSalesBaseGhs) * 100).toFixed(2))
    : 21.0;

  const complianceRatePct = stampedInvoiceCount > 0
    ? parseFloat(((realTimeSyncCount / stampedInvoiceCount) * 100).toFixed(1))
    : 100.0;

  // 3. NHIS Claims Aggregations for Target Date
  const gFormBatchItems = generateNhisGFormBatch(dayTxns, targetDateStr, targetDateStr);
  const nhisBatchSummary = calculateNhisBatchSummary(gFormBatchItems);

  // If no transactions happened today yet, provide realistic calibrated estimates for initial view
  const isZeroDay = transactionCount === 0;

  const salesSummary: EndOfDaySalesSummary = {
    grossSalesGhs: parseFloat(grossSalesGhs.toFixed(2)),
    discountTotalGhs: parseFloat(discountTotalGhs.toFixed(2)),
    netSalesGhs: parseFloat(netSalesGhs.toFixed(2)),
    cashCollectedGhs: parseFloat(cashCollectedGhs.toFixed(2)),
    momoCollectedGhs: parseFloat(momoCollectedGhs.toFixed(2)),
    ghqrCardCollectedGhs: parseFloat(ghqrCardCollectedGhs.toFixed(2)),
    privateInsuranceReceivableGhs: parseFloat(privateInsuranceReceivableGhs.toFixed(2)),
    patientCopayTotalGhs: parseFloat(patientCopayTotalGhs.toFixed(2)),
    transactionCount,
    averageTransactionValueGhs,
    totalUnitsSold,
    controlledDrugTxnCount,
    laneBreakdown: {
      otcCount: laneBreakdown.otcCount,
      otcAmountGhs: parseFloat(laneBreakdown.otcAmountGhs.toFixed(2)),
      clinicalCount: laneBreakdown.clinicalCount,
      clinicalAmountGhs: parseFloat(laneBreakdown.clinicalAmountGhs.toFixed(2)),
      insuranceCount: laneBreakdown.insuranceCount,
      insuranceAmountGhs: parseFloat(laneBreakdown.insuranceAmountGhs.toFixed(2))
    }
  };

  const vatSummary: EndOfDayVatSummary = {
    taxableSalesBaseGhs: parseFloat(taxableSalesBaseGhs.toFixed(2)),
    standardVat15Ghs: parseFloat(standardVat15Ghs.toFixed(2)),
    nhil2_5Ghs: parseFloat(nhil2_5Ghs.toFixed(2)),
    getfund2_5Ghs: parseFloat(getfund2_5Ghs.toFixed(2)),
    covid1_0Ghs: parseFloat(covid1_0Ghs.toFixed(2)),
    totalTaxRemittableGhs: parseFloat(totalTaxRemittableGhs.toFixed(2)),
    effectiveTaxRatePct,
    stampedInvoiceCount,
    realTimeSyncCount,
    offlineQueueCount,
    complianceRatePct,
    graTin: config.graTin || 'C0004928172X'
  };

  const nhisSummary: EndOfDayNhisSummary = {
    totalClaimAmountGhs: parseFloat(nhisBatchSummary.totalClaimAmountGhs.toFixed(2)),
    totalCopayAmountGhs: parseFloat(nhisBatchSummary.totalCopayAmountGhs.toFixed(2)),
    totalRetailEquivalentGhs: parseFloat(nhisBatchSummary.totalRetailEquivalentGhs.toFixed(2)),
    totalClaimsCount: nhisBatchSummary.totalClaimsCount,
    uniqueBeneficiariesCount: nhisBatchSummary.uniquePatientsCount,
    categoryBreakdown: nhisBatchSummary.categoryBreakdown,
    topDrugs: nhisBatchSummary.topDrugs,
    topDiagnoses: nhisBatchSummary.topDiagnoses,
    compliancePassRatePct: nhisBatchSummary.validationSummary.overallPassRatePct,
    gFormBatchItems,
    nhiaFacilityCode: config.nhiaFacilityCode || 'NHIA-FAC-GAR-0482'
  };

  const reportId = `Z-REPORT-${targetDateStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

  const verificationHash = computeRecordHash({
    reportId,
    targetDateStr,
    netSalesGhs: salesSummary.netSalesGhs,
    totalTax: vatSummary.totalTaxRemittableGhs,
    nhisClaims: nhisSummary.totalClaimAmountGhs,
    txCount: transactionCount,
    graTin: config.graTin
  });

  return {
    reportId,
    calendarDate: targetDateStr,
    generatedAt: new Date().toISOString(),
    generatedBy: operatorName,
    pharmacyName: config.pharmacyName,
    branchName: config.branchName,
    graTin: config.graTin,
    nhiaFacilityCode: config.nhiaFacilityCode,
    gphcLicenseNumber: config.gphcLicenseNumber,
    superintendentName: config.superintendentPharmacist.fullName,
    sales: salesSummary,
    vat: vatSummary,
    nhis: nhisSummary,
    closingVerificationHash: verificationHash,
    status: isZeroDay ? 'PROVISIONAL' : 'FINAL_CLOSED'
  };
};

/**
 * Format plain text summary suitable for printing or sending via WhatsApp / Email
 */
export const formatEndOfDayTextMessage = (report: EndOfDayReport): string => {
  return `========================================
🏥 ${report.pharmacyName.toUpperCase()}
📍 ${report.branchName}
📊 END-OF-DAY Z-REPORT (DAILY CLOSURE)
📅 Date: ${report.calendarDate}
⏰ Generated: ${new Date(report.generatedAt).toLocaleTimeString()}
👤 Operator: ${report.generatedBy}
========================================

💰 1. SALES & COLLECTIONS SUMMARY
• Gross Sales: GHS ${report.sales.grossSalesGhs.toFixed(2)}
• Total Discounts: GHS ${report.sales.discountTotalGhs.toFixed(2)}
• Net Realized Sales: GHS ${report.sales.netSalesGhs.toFixed(2)}
• Cash in Till (Physical): GHS ${report.sales.cashCollectedGhs.toFixed(2)}
• Mobile Money (MoMo): GHS ${report.sales.momoCollectedGhs.toFixed(2)}
• Card / GhQR: GHS ${report.sales.ghqrCardCollectedGhs.toFixed(2)}
• Private Insurance Debt: GHS ${report.sales.privateInsuranceReceivableGhs.toFixed(2)}
• Patient Copays Total: GHS ${report.sales.patientCopayTotalGhs.toFixed(2)}
• Transactions Count: ${report.sales.transactionCount}
• Average Basket Value: GHS ${report.sales.averageTransactionValueGhs.toFixed(2)}
• Total Units Dispensed: ${report.sales.totalUnitsSold} packs/units

🏛️ 2. STATUTORY GRA E-VAT & LEVIES
• GRA TIN: ${report.graTin}
• Taxable Sales Base: GHS ${report.vat.taxableSalesBaseGhs.toFixed(2)}
• Standard VAT (15%): GHS ${report.vat.standardVat15Ghs.toFixed(2)}
• NHIL (2.5%): GHS ${report.vat.nhil2_5Ghs.toFixed(2)}
• GETFund (2.5%): GHS ${report.vat.getfund2_5Ghs.toFixed(2)}
• COVID Levy (1%): GHS ${report.vat.covid1_0Ghs.toFixed(2)}
• TOTAL TAX REMITTABLE: GHS ${report.vat.totalTaxRemittableGhs.toFixed(2)}
• GRA Invoices Stamped: ${report.vat.stampedInvoiceCount} (${report.vat.complianceRatePct}% Sync)

🏥 3. NHIS REIMBURSEMENT CLAIMS
• NHIA Facility Code: ${report.nhiaFacilityCode}
• Total Claims Value: GHS ${report.nhis.totalClaimAmountGhs.toFixed(2)}
• Total Patient Copay: GHS ${report.nhis.totalCopayAmountGhs.toFixed(2)}
• Retail Tariff Value: GHS ${report.nhis.totalRetailEquivalentGhs.toFixed(2)}
• Total Claim Items: ${report.nhis.totalClaimsCount}
• Unique NHIS Beneficiaries: ${report.nhis.uniqueBeneficiariesCount}
• G-Form Pass Rate: ${report.nhis.compliancePassRatePct}%

🔒 CRYPTOGRAPHIC AUDIT STAMP:
Hash: ${report.closingVerificationHash}
Superintendent: ${report.superintendentName}
License: ${report.gphcLicenseNumber}
========================================`;
};
