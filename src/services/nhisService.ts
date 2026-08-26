import { TransactionRecord, NhisClaimBatchItem, PrivateInsurer } from '../types/pharmacy';

// Extract NHIS Claims from transactions and format to standardized NHIA G-Form batch format
export const generateNhisGFormBatch = (transactions: TransactionRecord[]): NhisClaimBatchItem[] => {
  const claims: NhisClaimBatchItem[] = [];

  transactions.forEach((tx) => {
    if (tx.patient?.nhisNumber && tx.splitBilling.nhisAmount > 0) {
      tx.items.forEach((item, idx) => {
        if (item.drug.nhisCovered) {
          const claimItem: NhisClaimBatchItem = {
            claimId: `CLM-${tx.id.slice(-6)}-${idx + 1}`,
            transactionId: tx.id,
            dispenseDate: tx.timestamp.split('T')[0],
            patientName: tx.patient?.fullName || 'Walk-in NHIS Patient',
            nhisNumber: tx.patient?.nhisNumber || 'N/A',
            nhisCategory: tx.patient?.nhisCategory || 'SSNIT',
            prescriberName: tx.prescription?.prescriberName || 'Dr. Medical Officer (MDC)',
            prescriberMdcNumber: tx.prescription?.prescriberMdcNumber || 'MDC/RN/89421',
            diagnosisCode: tx.prescription?.diagnosisIcd10 || 'B54 (Unspecified Malaria)',
            drugName: `${item.drug.genericName} (${item.drug.strength})`,
            nhisDrugCode: item.drug.nhisCode || 'NHIS-GEN-001',
            quantityDispensed: item.quantity,
            unitTariffGhs: item.drug.nhisTariffPrice,
            totalClaimGhs: item.drug.nhisTariffPrice * item.quantity,
            copayPaidGhs: (item.drug.retailPrice - item.drug.nhisTariffPrice) * item.quantity > 0 
              ? (item.drug.retailPrice - item.drug.nhisTariffPrice) * item.quantity 
              : 0,
            status: 'PENDING_EXPORT'
          };
          claims.push(claimItem);
        }
      });
    }
  });

  return claims;
};

// Export G-Form claims batch to standardized CSV format ready for NHIA portal upload
export const exportGFormCsv = (claims: NhisClaimBatchItem[], facilityCode: string): string => {
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

  const rows = claims.map((c) => [
    `"${c.claimId}"`,
    `"${facilityCode}"`,
    `"${c.dispenseDate}"`,
    `"${c.patientName}"`,
    `"${c.nhisNumber}"`,
    `"${c.nhisCategory}"`,
    `"${c.prescriberName}"`,
    `"${c.prescriberMdcNumber}"`,
    `"${c.diagnosisCode}"`,
    `"${c.nhisDrugCode}"`,
    `"${c.drugName}"`,
    c.quantityDispensed,
    c.unitTariffGhs.toFixed(2),
    c.totalClaimGhs.toFixed(2),
    c.copayPaidGhs.toFixed(2),
    `"${c.status}"`
  ]);

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
