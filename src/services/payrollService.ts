import { StaffPayrollRecord, MomoProvider } from '../types/pharmacy';
import { logAuditEvent } from './storageService';

/**
 * Ghana Revenue Authority (GRA) Monthly PAYE (Pay-As-You-Earn) Progressive Tax Brackets (2024 - 2026)
 * 1. First GHS 490.00 @ 0%
 * 2. Next GHS 110.00 @ 5%
 * 3. Next GHS 130.00 @ 10%
 * 4. Next GHS 3,166.67 @ 17.5%
 * 5. Next GHS 16,000.00 @ 25%
 * 6. Exceeding GHS 19,896.67 @ 30%
 */
export function calculateGraPayeTax(taxableIncome: number): {
  taxPayable: number;
  effectiveRatePct: number;
  bracketBreakdown: Array<{ bracket: string; taxableAmount: number; rate: number; tax: number }>;
} {
  let remaining = Math.max(0, taxableIncome);
  let totalTax = 0;
  const breakdown: Array<{ bracket: string; taxableAmount: number; rate: number; tax: number }> = [];

  // Tier 1: First 490 @ 0%
  const t1 = Math.min(remaining, 490);
  breakdown.push({ bracket: 'First GHS 490 (Tax-Free)', taxableAmount: t1, rate: 0, tax: 0 });
  remaining -= t1;

  // Tier 2: Next 110 @ 5%
  if (remaining > 0) {
    const t2 = Math.min(remaining, 110);
    const tax2 = t2 * 0.05;
    totalTax += tax2;
    breakdown.push({ bracket: 'Next GHS 110 @ 5%', taxableAmount: t2, rate: 5, tax: tax2 });
    remaining -= t2;
  }

  // Tier 3: Next 130 @ 10%
  if (remaining > 0) {
    const t3 = Math.min(remaining, 130);
    const tax3 = t3 * 0.10;
    totalTax += tax3;
    breakdown.push({ bracket: 'Next GHS 130 @ 10%', taxableAmount: t3, rate: 10, tax: tax3 });
    remaining -= t3;
  }

  // Tier 4: Next 3,166.67 @ 17.5%
  if (remaining > 0) {
    const t4 = Math.min(remaining, 3166.67);
    const tax4 = t4 * 0.175;
    totalTax += tax4;
    breakdown.push({ bracket: 'Next GHS 3,166.67 @ 17.5%', taxableAmount: t4, rate: 17.5, tax: tax4 });
    remaining -= t4;
  }

  // Tier 5: Next 16,000 @ 25%
  if (remaining > 0) {
    const t5 = Math.min(remaining, 16000);
    const tax5 = t5 * 0.25;
    totalTax += tax5;
    breakdown.push({ bracket: 'Next GHS 16,000 @ 25%', taxableAmount: t5, rate: 25, tax: tax5 });
    remaining -= t5;
  }

  // Tier 6: Exceeding 19,896.67 @ 30%
  if (remaining > 0) {
    const tax6 = remaining * 0.30;
    totalTax += tax6;
    breakdown.push({ bracket: 'Above GHS 19,896.67 @ 30%', taxableAmount: remaining, rate: 30, tax: tax6 });
  }

  const roundedTax = Math.round(totalTax * 100) / 100;
  const effectiveRate = taxableIncome > 0 ? (roundedTax / taxableIncome) * 100 : 0;

  return {
    taxPayable: roundedTax,
    effectiveRatePct: Math.round(effectiveRate * 10) / 10,
    bracketBreakdown: breakdown
  };
}

/**
 * Computes full statutory payroll compensation for an employee
 * - SSNIT Employee Contribution: 5.5%
 * - SSNIT Employer Contribution: 13.0%
 * - Taxable Base: Base Salary - SSNIT Employee (5.5%)
 * - Net Take-Home Payout: Base Salary - SSNIT Employee - GRA PAYE Tax
 */
export function computeEmployeePayroll(
  employeeId: string,
  fullName: string,
  role: StaffPayrollRecord['role'],
  phone: string,
  momoNetwork: MomoProvider,
  momoWalletNumber: string,
  baseSalaryGhs: number
): StaffPayrollRecord {
  const ssnitEmployee = Math.round(baseSalaryGhs * 0.055 * 100) / 100;
  const ssnitEmployer = Math.round(baseSalaryGhs * 0.130 * 100) / 100;
  const taxableIncome = Math.max(0, baseSalaryGhs - ssnitEmployee);
  const { taxPayable } = calculateGraPayeTax(taxableIncome);
  const netSalary = Math.round((taxableIncome - taxPayable) * 100) / 100;

  return {
    employeeId,
    fullName,
    role,
    phone,
    momoNetwork,
    momoWalletNumber,
    baseSalaryGhs,
    ssnitEmployeeDeductionGhs: ssnitEmployee,
    ssnitEmployerContributionGhs: ssnitEmployer,
    taxableIncomeGhs: taxableIncome,
    graPayeTaxGhs: taxPayable,
    netSalaryPayoutGhs: netSalary,
    payoutStatus: 'PENDING'
  };
}

export const INITIAL_STAFF_PAYROLL: StaffPayrollRecord[] = [
  computeEmployeePayroll(
    'EMP-001',
    'Pharm. Dr. Araba Mensah',
    'Superintendent Pharmacist',
    '0244129840',
    'MTN',
    '0244129840',
    8500.00
  ),
  computeEmployeePayroll(
    'EMP-002',
    'Kwame Mensah',
    'Counter Sales Clerk',
    '0244983102',
    'MTN',
    '0244983102',
    2800.00
  ),
  computeEmployeePayroll(
    'EMP-003',
    'Emmanuel Tetteh',
    'POS Cashier',
    '0277391024',
    'Telecel',
    '0277391024',
    2500.00
  ),
  computeEmployeePayroll(
    'EMP-004',
    'Akosua Addo, MCPA',
    'Dispensing Technician',
    '0204918239',
    'Telecel',
    '0204918239',
    3400.00
  ),
  computeEmployeePayroll(
    'EMP-005',
    'Kofi Boateng Jr.',
    'Inventory Officer',
    '0558192039',
    'MTN',
    '0558192039',
    2900.00
  )
];

const PAYROLL_STORAGE_KEY = 'pharmatrack_gh_payroll_v1';

export function getStoredPayroll(): StaffPayrollRecord[] {
  try {
    const raw = localStorage.getItem(PAYROLL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load payroll records', e);
  }
  localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(INITIAL_STAFF_PAYROLL));
  return INITIAL_STAFF_PAYROLL;
}

export function saveStoredPayroll(records: StaffPayrollRecord[]): void {
  localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(records));
}
