export type DrugClassification = 'OTC' | 'POM' | 'ClassA_Controlled' | 'ClassB_Controlled';

export type UserRole = 'Clerk' | 'Pharmacist' | 'Cashier' | 'Owner' | 'COUNTER_CLERK' | 'SUPERINTENDENT_PHARMACIST' | 'CASHIER' | 'OWNER';

export type AppTabType = 
  | 'clerk'
  | 'pharmacist'
  | 'cashier'
  | 'owner'
  | 'pos'
  | 'inventory'
  | 'nhis'
  | 'ddr'
  | 'audit';

export type NormalizedRole = 'CLERK' | 'PHARMACIST' | 'CASHIER' | 'OWNER';

export type ActionPermission =
  | 'STAGE_ORDER'
  | 'LOOKUP_INVENTORY'
  | 'READ_SHELF_LOCATION'
  | 'APPROVE_CLINICAL'
  | 'VERIFY_DOCTOR_MDC'
  | 'LOG_DDR'
  | 'HOLD_REJECT_ORDER'
  | 'OVERRIDE_DRUG_INTERACTION'
  | 'PROCESS_PAYMENT'
  | 'EXECUTE_MOMO_STK'
  | 'SPLIT_BILLING'
  | 'GENERATE_EVAT'
  | 'PRINT_FISCAL_RECEIPT'
  | 'APPROVE_PURCHASE_ORDER'
  | 'REJECT_PURCHASE_ORDER'
  | 'EXECUTE_PAYROLL'
  | 'BULK_MOMO_DISBURSAL'
  | 'VIEW_FINANCIAL_AUDIT'
  | 'VIEW_EXECUTIVE_HUB'
  | 'ACCESS_DDR_REGISTER'
  | 'MANAGE_SYSTEM_SETTINGS'
  | 'RESET_DEMO_DATA';

export type ExpiryStatus = 'green' | 'yellow' | 'red'; // green > 6mo, yellow 3-6mo, red < 3mo (locked)

export type PosLaneType = 'retail' | 'clinical';

export type PaymentMethod = 'cash' | 'momo' | 'nhis' | 'private_insurance' | 'ghqr' | 'split';

export type MomoProvider = 'MTN' | 'Telecel' | 'AT';

export interface DrugBatch {
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  costPrice: number;
  location: string;
  manufacturer: string;
  manufacturingDate?: string;
}

export interface DrugItem {
  id: string;
  brandName: string;
  genericName: string;
  dosageForm: string; // Tablet, Syrup, Injection, Capsule, Suspension, Ointment
  strength: string;
  barcode: string;
  category: string;
  classification: DrugClassification;
  retailPrice: number; // GHS
  nhisTariffPrice: number; // GHS (Fixed NHIS list)
  nhisCovered: boolean;
  nhisCode?: string;
  batches: DrugBatch[]; // Sorted FEFO
  reorderLevel: number; // Min threshold
  dailyVelocity: number; // Average units sold per day
  leadTimeDays: number; // Supplier delivery lead time
  packSize: number;
  unit: string;
  description?: string;
  activeIngredients?: string;
}

export interface CartItem {
  drug: DrugItem;
  selectedBatch: DrugBatch;
  quantity: number;
  unitPrice: number; // Retail or NHIS
  dosageInstructions?: string; // e.g. "1 tab TDS x 5 days"
  durationDays?: number;
  totalPrice: number;
  isNhisTariff: boolean;
  requiresSuperintendentAuth?: boolean;
}

export interface PatientProfile {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string; // Ghana Card e.g. GHA-123456789-0
  age: number;
  gender: 'M' | 'F' | 'Other';
  nhisNumber?: string;
  nhisStatus?: 'Active' | 'Expired' | 'Indigent' | 'Pending';
  nhisExpiry?: string;
  nhisCategory?: 'SSNIT' | 'Informal' | 'Under 18' | 'Pregnant' | 'Indigent';
  privateInsuranceProvider?: string;
  privatePolicyNumber?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

export interface PrescriptionDetails {
  prescriberName: string;
  prescriberMdcNumber: string; // Medical & Dental Council Reg No.
  prescriberHospital: string;
  prescriptionDate: string;
  diagnosisIcd10?: string;
  clinicalNotes?: string;
}

export interface SplitBillingAllocation {
  nhisAmount: number; // Covered by NHIS
  privateInsuranceAmount: number; // Covered by Private Insurer
  privateInsurerName?: string;
  momoAmount: number;
  momoProvider?: MomoProvider;
  momoPhoneNumber?: string;
  momoTransactionId?: string;
  cashAmount: number;
  ghqrAmount: number;
  ghqrReference?: string;
  patientCopayTotal: number; // Patient total out of pocket
  totalPaid: number;
}

export interface GraEvatTaxBreakdown {
  taxableAmount: number;
  nhilAmount: number; // 2.5%
  getfundAmount: number; // 2.5%
  covidAmount: number; // 1.0%
  standardVatAmount: number; // 15% on (taxable + levies)
  totalTax: number;
  grandTotal: number;
  leviesIncluded: boolean;
}

export interface GraEvatResponse {
  status: 'SUCCESS' | 'QUEUED_OFFLINE' | 'FAILED';
  graInvoiceNumber: string; // e.g. GRA-2026-INV-948201
  graSecurityHash: string;
  graQrCodeString: string;
  graTimestamp: string;
  transmissionMode: 'REAL_TIME' | 'OFFLINE_SYNCED';
  errorMessage?: string;
}

export interface DdrEntry {
  id: string;
  transactionId: string;
  date: string;
  patientName: string;
  patientGhanaCard: string;
  patientAddress?: string;
  prescriberName: string;
  prescriberMdcNumber: string;
  drugName: string;
  strength: string;
  batchNumber: string;
  quantitySupplied: number;
  remainingStock: number;
  superintendentName: string;
  superintendentPinVerified: boolean;
  purposeOrDiagnosis: string;
  signatureStamp: string;
}

export interface TransactionRecord {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  lane: PosLaneType;
  items: CartItem[];
  patient?: PatientProfile;
  prescription?: PrescriptionDetails;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  splitBilling: SplitBillingAllocation;
  graEvat: GraEvatResponse;
  taxBreakdown: GraEvatTaxBreakdown;
  hasControlledDrugs: boolean;
  ddrEntryId?: string;
  cashierName: string;
  superintendentAuth?: {
    authorizedBy: string;
    timestamp: string;
    reason: string;
  };
  isSyncedToCloud: boolean;
  tamperProofHash: string;
}

export interface PrivateInsurer {
  id: string;
  name: string;
  code: string;
  defaultCopayPercentage: number; // e.g. 20 (patient pays 20%, insurer pays 80%)
  coversOtc: boolean;
  monthlyLimitGhs: number;
  contactPerson: string;
  contactPhone: string;
  portalUrl: string;
  outstandingBalance: number; // GHS
  claimsCount: number;
}

export interface NhisClaimBatchItem {
  claimId: string;
  transactionId: string;
  dispenseDate: string;
  patientName: string;
  nhisNumber: string;
  nhisCategory: string;
  prescriberName: string;
  prescriberMdcNumber: string;
  diagnosisCode: string;
  drugName: string;
  nhisDrugCode: string;
  quantityDispensed: number;
  unitTariffGhs: number;
  totalClaimGhs: number;
  copayPaidGhs: number;
  status: 'PENDING_EXPORT' | 'SUBMITTED' | 'VETTED_APPROVED' | 'REJECTED';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  module: 'INVENTORY' | 'PRICING' | 'DISPENSING' | 'GRA_EVAT' | 'NHIS' | 'CONTROLLED_DRUGS' | 'SETTINGS' | 'PAYROLL' | 'PURCHASE_ORDERS';
  entityId?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  ipDeviceId: string;
  hash: string;
}

export type UnitSaleType = 'box' | 'strip' | 'tablet';

export interface BasketItemWithUnit {
  id: string;
  drug: DrugItem;
  selectedBatch: DrugBatch;
  quantity: number;
  saleUnit: UnitSaleType;
  unitsPerPack: number;
  unitPriceGhs: number;
  totalPriceGhs: number;
  expirySafe: boolean;
  expiryDate: string;
  requiresDoctorMdc?: boolean;
}

export type QueueBasketStatus = 
  | 'DRAFT'
  | 'PENDING_CLINICAL_CLEARANCE'
  | 'PENDING_PHARMACIST' 
  | 'PENDING_PAYMENT'
  | 'PENDING_CASHIER' 
  | 'FISCALIZED_COMPLETED'
  | 'PAID_COMPLETED' 
  | 'REJECTED' 
  | 'HOLD';

export interface CounterBasketQueueItem {
  id: string;
  queueNumber: number; // e.g. 102, 104, 105
  queueToken: string; // e.g. "Q-104"
  clerkName: string;
  createdAt: string; // ISO
  patientName: string;
  patientPhone: string;
  patientGhanaCard?: string;
  schemeType: 'CASH' | 'NHIS' | 'PRIVATE_INSURANCE';
  insuranceProviderName?: string;
  insurancePolicyNumber?: string;
  items: BasketItemWithUnit[];
  clerkNotes?: string;
  status: QueueBasketStatus;
  rejectionReason?: string;
  targetLane: PosLaneType;
  containsClassA: boolean;
  controlledDrugName?: string;
  controlledDrugDoctorMdc?: string;
  controlledDrugPatientId?: string;
  prescriptionDetails?: PrescriptionDetails;
  pharmacistReview?: {
    reviewedBy: string;
    reviewedAt: string;
    gphcPin: string;
    clinicalApproved: boolean;
    doctorMdcNumber?: string;
    overrideReason?: string;
    itemBillingMatrix: Array<{
      drugId: string;
      drugName: string;
      basePrice: number;
      insurerPays: number;
      patientCopay: number;
      status: 'APPROVED' | 'OVERRIDE_APPROVED' | 'DENIED_CASH';
    }>;
    totalBasePrice: number;
    totalInsurerPays: number;
    totalPatientCopay: number;
  };
  cashierPayment?: {
    cashierName: string;
    paymentMethod: 'cash' | 'momo' | 'ghqr';
    momoDetails?: {
      provider: MomoProvider;
      phone: string;
      stkStatus: 'IDLE' | 'PENDING_STK' | 'APPROVED' | 'FAILED';
      momoTransactionId?: string;
    };
    cashDetails?: {
      tendered: number;
      change: number;
    };
    graInvoiceNumber?: string;
    graQrCodeString?: string;
    completedAt?: string;
  };
}

export interface PurchaseOrderItem {
  drugId: string;
  drugName: string;
  brandName: string;
  requestedQuantityPacks: number;
  packSize: number;
  unitCostGhs: number;
  totalCostGhs: number;
}

export type PurchaseOrderStatus = 
  | 'PENDING_OWNER_APPROVAL' 
  | 'APPROVED_SENT_TO_SUPPLIER' 
  | 'DELIVERED' 
  | 'REJECTED';

export interface PurchaseOrder {
  id: string; // e.g. "PO-8902"
  supplierName: string; // e.g. "Ernest Chemists Ltd"
  supplierCode: string;
  requestedBy: string;
  createdAt: string;
  items: PurchaseOrderItem[];
  totalCostGhs: number;
  requiresOwnerApproval: boolean;
  thresholdGhs: number;
  status: PurchaseOrderStatus;
  ownerApprovalNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface StaffPayrollRecord {
  employeeId: string;
  fullName: string;
  role: 'Superintendent Pharmacist' | 'Counter Sales Clerk' | 'POS Cashier' | 'Dispensing Technician' | 'Inventory Officer';
  phone: string;
  momoNetwork: MomoProvider;
  momoWalletNumber: string;
  baseSalaryGhs: number;
  ssnitEmployeeDeductionGhs: number; // 5.5%
  ssnitEmployerContributionGhs: number; // 13.0%
  taxableIncomeGhs: number; // Base - SSNIT Employee
  graPayeTaxGhs: number; // Sliding scale GRA tax
  netSalaryPayoutGhs: number; // Base - SSNIT 5.5% - PAYE
  payoutStatus: 'PENDING' | 'QUEUED_MOMO' | 'PAID_MOMO';
  payoutReference?: string;
  payoutTimestamp?: string;
}

export interface PharmacyConfig {
  pharmacyName: string;
  branchName: string;
  location: string;
  phone: string;
  email: string;
  graTin: string; // Tax Identification Number e.g. C0004928172
  gphcLicenseNumber: string; // Pharmacy Council e.g. GPhC/RET/2026/0492
  nhiaFacilityCode: string; // e.g. NHIA-FAC-GAR-0482
  superintendentPharmacist: {
    fullName: string;
    gphcPin: string; // e.g. PC-GH-03912
    authPin: string; // e.g. "9999"
  };
  momoMerchantAccounts: {
    mtnMerchantId: string;
    telecelMerchantId: string;
    atMoneyMerchantId: string;
  };
  ghqrTerminalId: string;
  vatRate: number; // 15
  nhilRate: number; // 2.5
  getfundRate: number; // 2.5
  covidRate: number; // 1.0
  isOnlineMode: boolean; // toggle simulation
}
