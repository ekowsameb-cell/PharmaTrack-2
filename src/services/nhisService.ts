import { TransactionRecord, NhisClaimBatchItem, PrivateInsurer } from '../types/pharmacy';

export interface NhisClaimValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  complianceScore: number; // 0-100
}

export interface NhisBatchSummary {
  totalClaimsCount: number;
  uniquePatientsCount: number;
  uniquePrescriptionsCount: number;
  totalClaimAmountGhs: number;
  totalCopayAmountGhs: number;
  totalRetailEquivalentGhs: number;
  categoryBreakdown: Record<string, { count: number; amountGhs: number }>;
  topDrugs: { name: string; code: string; qty: number; amountGhs: number }[];
  topDiagnoses: { code: string; count: number; amountGhs: number }[];
  validationSummary: {
    cleanCount: number;
    warningCount: number;
    errorCount: number;
    overallPassRatePct: number;
  };
}

// Validate individual NHIS claim record against NHIA submission rules
export const validateNhisClaim = (claim: NhisClaimBatchItem): NhisClaimValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: NHIS Card Number syntax
  if (!claim.nhisNumber || claim.nhisNumber === 'N/A' || claim.nhisNumber.trim() === '') {
    errors.push('Missing NHIS Card Number');
  } else if (!/^NHIS-?[0-9A-Za-z]{6,12}$/i.test(claim.nhisNumber.trim())) {
    warnings.push('NHIS Card number format differs from standard 8-10 digit template');
  }

  // Rule 2: Prescriber MDC Number check
  if (!claim.prescriberMdcNumber || claim.prescriberMdcNumber.trim() === '' || claim.prescriberMdcNumber === 'N/A') {
    errors.push('Missing Prescriber MDC Registration Number');
  } else if (!claim.prescriberMdcNumber.toUpperCase().includes('MDC')) {
    warnings.push('MDC Registration Number should contain "MDC" prefix');
  }

  // Rule 3: ICD-10 Diagnosis code check
  if (!claim.diagnosisCode || claim.diagnosisCode.trim() === '' || claim.diagnosisCode === 'N/A') {
    errors.push('Missing ICD-10 Primary Diagnosis Code');
  }

  // Rule 4: NHIS Medicines List Code check
  if (!claim.nhisDrugCode || claim.nhisDrugCode.trim() === '' || claim.nhisDrugCode === 'N/A') {
    errors.push('Missing NHIA Tariff Medicine Code');
  }

  // Rule 5: Quantities and tariff prices
  if (claim.quantityDispensed <= 0) {
    errors.push('Quantity dispensed must be greater than zero');
  }
  if (claim.unitTariffGhs <= 0) {
    errors.push('NHIS unit tariff rate must be greater than zero');
  }

  let complianceScore = 100;
  if (errors.length > 0) complianceScore -= errors.length * 30;
  if (warnings.length > 0) complianceScore -= warnings.length * 10;
  complianceScore = Math.max(0, Math.min(100, complianceScore));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    complianceScore
  };
};

// Extract NHIS Claims from transactions and format to standardized NHIA G-Form batch format
export const generateNhisGFormBatch = (
  transactions: TransactionRecord[],
  startDate?: string,
  endDate?: string,
  categoryFilter?: string
): NhisClaimBatchItem[] => {
  const claims: NhisClaimBatchItem[] = [];

  // Filter transactions by date range if provided
  const filteredTx = transactions.filter((tx) => {
    const txDate = tx.timestamp.split('T')[0];
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    return true;
  });

  filteredTx.forEach((tx) => {
    // A transaction qualifies for G-Form if patient has NHIS number or NHIS split amount > 0
    if (tx.patient?.nhisNumber || tx.splitBilling.nhisAmount > 0) {
      if (categoryFilter && categoryFilter !== 'ALL' && tx.patient?.nhisCategory !== categoryFilter) {
        return;
      }

      tx.items.forEach((item, idx) => {
        if (item.drug.nhisCovered) {
          const tariffPrice = item.drug.nhisTariffPrice > 0 ? item.drug.nhisTariffPrice : item.unitPrice;
          const totalClaim = tariffPrice * item.quantity;
          const patientCopay = (item.drug.retailPrice - tariffPrice) * item.quantity;

          const claimItem: NhisClaimBatchItem = {
            claimId: `CLM-${tx.id.slice(-6)}-${idx + 1}`,
            transactionId: tx.id,
            dispenseDate: tx.timestamp.split('T')[0],
            patientName: tx.patient?.fullName || 'Walk-in NHIS Patient',
            nhisNumber: tx.patient?.nhisNumber || 'N/A',
            nhisCategory: tx.patient?.nhisCategory || 'SSNIT',
            prescriberName: tx.prescription?.prescriberName || 'Dr. Medical Officer (MDC)',
            prescriberMdcNumber: tx.prescription?.prescriberMdcNumber || 'MDC/RN/39482',
            diagnosisCode: tx.prescription?.diagnosisIcd10 || 'B54 (Unspecified Malaria)',
            drugName: `${item.drug.genericName} (${item.drug.strength})`,
            nhisDrugCode: item.drug.nhisCode || 'NHIS-MED-GEN01',
            quantityDispensed: item.quantity,
            unitTariffGhs: tariffPrice,
            totalClaimGhs: parseFloat(totalClaim.toFixed(2)),
            copayPaidGhs: patientCopay > 0 ? parseFloat(patientCopay.toFixed(2)) : 0,
            status: 'PENDING_EXPORT'
          };
          claims.push(claimItem);
        }
      });
    }
  });

  return claims;
};

// Calculate comprehensive batch summary analytics
export const calculateNhisBatchSummary = (claims: NhisClaimBatchItem[]): NhisBatchSummary => {
  const categoryMap: Record<string, { count: number; amountGhs: number }> = {};
  const drugMap: Record<string, { name: string; code: string; qty: number; amountGhs: number }> = {};
  const diagMap: Record<string, { code: string; count: number; amountGhs: number }> = {};
  const uniquePatients = new Set<string>();
  const uniqueTxs = new Set<string>();

  let totalClaimAmountGhs = 0;
  let totalCopayAmountGhs = 0;
  let totalRetailEquivalentGhs = 0;
  let cleanCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  claims.forEach((claim) => {
    uniquePatients.add(claim.nhisNumber || claim.patientName);
    uniqueTxs.add(claim.transactionId);
    totalClaimAmountGhs += claim.totalClaimGhs;
    totalCopayAmountGhs += claim.copayPaidGhs;
    totalRetailEquivalentGhs += claim.totalClaimGhs + claim.copayPaidGhs;

    // Category breakdown
    const cat = claim.nhisCategory || 'Unknown';
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, amountGhs: 0 };
    categoryMap[cat].count += 1;
    categoryMap[cat].amountGhs += claim.totalClaimGhs;

    // Drug breakdown
    const dKey = claim.nhisDrugCode || claim.drugName;
    if (!drugMap[dKey]) {
      drugMap[dKey] = { name: claim.drugName, code: claim.nhisDrugCode, qty: 0, amountGhs: 0 };
    }
    drugMap[dKey].qty += claim.quantityDispensed;
    drugMap[dKey].amountGhs += claim.totalClaimGhs;

    // Diagnosis breakdown
    const diag = claim.diagnosisCode || 'Unspecified';
    if (!diagMap[diag]) diagMap[diag] = { code: diag, count: 0, amountGhs: 0 };
    diagMap[diag].count += 1;
    diagMap[diag].amountGhs += claim.totalClaimGhs;

    // Validation
    const validation = validateNhisClaim(claim);
    if (!validation.isValid) {
      errorCount++;
    } else if (validation.warnings.length > 0) {
      warningCount++;
    } else {
      cleanCount++;
    }
  });

  const topDrugs = Object.values(drugMap)
    .sort((a, b) => b.amountGhs - a.amountGhs)
    .slice(0, 5);

  const topDiagnoses = Object.values(diagMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const overallPassRatePct = claims.length > 0
    ? parseFloat(((cleanCount + warningCount) / claims.length * 100).toFixed(1))
    : 100;

  return {
    totalClaimsCount: claims.length,
    uniquePatientsCount: uniquePatients.size,
    uniquePrescriptionsCount: uniqueTxs.size,
    totalClaimAmountGhs: parseFloat(totalClaimAmountGhs.toFixed(2)),
    totalCopayAmountGhs: parseFloat(totalCopayAmountGhs.toFixed(2)),
    totalRetailEquivalentGhs: parseFloat(totalRetailEquivalentGhs.toFixed(2)),
    categoryBreakdown: categoryMap,
    topDrugs,
    topDiagnoses,
    validationSummary: {
      cleanCount,
      warningCount,
      errorCount,
      overallPassRatePct
    }
  };
};

// Export G-Form claims batch to standardized CSV format ready for NHIA portal upload
export const exportGFormCsv = (
  claims: NhisClaimBatchItem[], 
  facilityCode: string,
  options?: {
    startDate?: string;
    endDate?: string;
    superintendentName?: string;
  }
): string => {
  const headers = [
    'Claim_ID',
    'Facility_Code',
    'Dispense_Date',
    'Patient_Name',
    'NHIS_Card_Number',
    'NHIS_Category',
    'Prescriber_Name',
    'MDC_Reg_Number',
    'ICD10_Diagnosis',
    'NHIS_Drug_Code',
    'Drug_Description',
    'Quantity_Dispensed',
    'Tariff_Unit_Price_GHS',
    'Total_Claim_Amount_GHS',
    'Patient_Copay_GHS',
    'Audit_Status'
  ];

  const escapeCsv = (str: string | number) => {
    const val = String(str ?? '').replace(/"/g, '""');
    return `"${val}"`;
  };

  const rows = claims.map((c) => {
    const validation = validateNhisClaim(c);
    const auditStatus = !validation.isValid ? 'FLAGGED_ERROR' : validation.warnings.length > 0 ? 'FLAGGED_WARNING' : 'VALIDATED_OK';

    return [
      escapeCsv(c.claimId),
      escapeCsv(facilityCode),
      escapeCsv(c.dispenseDate),
      escapeCsv(c.patientName),
      escapeCsv(c.nhisNumber),
      escapeCsv(c.nhisCategory),
      escapeCsv(c.prescriberName),
      escapeCsv(c.prescriberMdcNumber),
      escapeCsv(c.diagnosisCode),
      escapeCsv(c.nhisDrugCode),
      escapeCsv(c.drugName),
      c.quantityDispensed,
      c.unitTariffGhs.toFixed(2),
      c.totalClaimGhs.toFixed(2),
      c.copayPaidGhs.toFixed(2),
      escapeCsv(auditStatus)
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
};

// Calculate Private Health Insurer Split
export const calculatePrivateInsuranceSplit = (
  itemsTotal: number,
  insurer: PrivateInsurer
): { insurerPays: number; patientCopay: number } => {
  const copayPct = insurer.defaultCopayPercentage / 100;
  const patientCopay = parseFloat((itemsTotal * copayPct).toFixed(2));
  const insurerPays = parseFloat((itemsTotal - patientCopay).toFixed(2));
  return { insurerPays, patientCopay };
};

