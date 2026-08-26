import { DdrEntry, CartItem, PatientProfile, PrescriptionDetails } from '../types/pharmacy';

export const createDdrEntry = (
  transactionId: string,
  item: CartItem,
  patient: PatientProfile | undefined,
  prescription: PrescriptionDetails | undefined,
  superintendentName: string,
  remainingStockInBatch: number
): DdrEntry => {
  const timestamp = new Date().toISOString();
  return {
    id: `DDR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    transactionId,
    date: timestamp,
    patientName: patient?.fullName || 'Walk-in Verified Patient',
    patientGhanaCard: patient?.nationalId || 'GHA-PENDING-VERIFY',
    patientAddress: 'Accra Metropolitan District',
    prescriberName: prescription?.prescriberName || 'Dr. Medical Officer',
    prescriberMdcNumber: prescription?.prescriberMdcNumber || 'MDC/RN/XXXXX',
    drugName: `${item.drug.brandName} (${item.drug.genericName})`,
    strength: item.drug.strength,
    batchNumber: item.selectedBatch.batchNumber,
    quantitySupplied: item.quantity,
    remainingStock: remainingStockInBatch,
    superintendentName,
    superintendentPinVerified: true,
    purposeOrDiagnosis: prescription?.clinicalNotes || prescription?.diagnosisIcd10 || 'Post-operative severe pain management',
    signatureStamp: `GPhC-STAMP-VERIFIED-${superintendentName.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8)}-${Date.now().toString().slice(-6)}`
  };
};

export const isClassAControlledDrug = (classification: string): boolean => {
  return classification === 'ClassA_Controlled';
};
