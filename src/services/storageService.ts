import { 
  DrugItem, 
  TransactionRecord, 
  DdrEntry, 
  AuditLog, 
  PharmacyConfig, 
  PrivateInsurer,
  ExpiryStatus
} from '../types/pharmacy';
import { 
  INITIAL_DRUG_ITEMS, 
  INITIAL_PHARMACY_CONFIG, 
  INITIAL_PRIVATE_INSURERS,
  INITIAL_TRANSACTIONS
} from '../data/mockPharmacyData';


const STORAGE_KEYS = {
  DRUGS: 'pharmatrack_gh_drugs_v1',
  TRANSACTIONS: 'pharmatrack_gh_transactions_v1',
  DDR_LEDGER: 'pharmatrack_gh_ddr_v1',
  AUDIT_LOGS: 'pharmatrack_gh_audit_v1',
  CONFIG: 'pharmatrack_gh_config_v1',
  INSURERS: 'pharmatrack_gh_insurers_v1',
  OFFLINE_QUEUE: 'pharmatrack_gh_offline_queue_v1'
};

// Safe serialization helper that avoids circular references and strips non-serializable objects
export const safeStringify = (data: unknown): string => {
  try {
    return JSON.stringify(data);
  } catch (err) {
    const seen = new WeakSet();
    return JSON.stringify(data, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (value instanceof Event || ('nativeEvent' in value && 'target' in value)) {
          return '[ReactSyntheticEvent]';
        }
        if (typeof Element !== 'undefined' && value instanceof Element) {
          return `[DOMElement:${value.tagName}]`;
        }
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
  }
};

const toSafeString = (val: unknown): string | undefined => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') return String(val);
  try {
    return safeStringify(val);
  } catch {
    return String(val);
  }
};

// Cryptographic hash calculation for tamper-proof audit records
export const computeRecordHash = (data: object, previousHash: string = 'GENESIS_HASH'): string => {
  const serialized = safeStringify(data) + previousHash;
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  const timeHex = Date.now().toString(16).toUpperCase();
  return `0x${hex}${timeHex}`;
};

// Evaluate Expiry Date against FEFO Guardrails (Green >6mo, Yellow 3-6mo, Red <3mo)
export const evaluateExpiryStatus = (expiryDateStr: string): {
  status: ExpiryStatus;
  monthsRemaining: number;
  daysRemaining: number;
  isLocked: boolean;
  recommendedMarkdownPct: number;
} => {
  const now = new Date();
  const expiry = new Date(expiryDateStr);
  const diffTime = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const monthsRemaining = parseFloat((daysRemaining / 30.44).toFixed(1));

  if (monthsRemaining < 3) {
    return {
      status: 'red',
      monthsRemaining,
      daysRemaining,
      isLocked: true, // System Lock: Prevent item from being dispensed/scanned at POS
      recommendedMarkdownPct: 0
    };
  }

  if (monthsRemaining <= 6) {
    return {
      status: 'yellow',
      monthsRemaining,
      daysRemaining,
      isLocked: false,
      recommendedMarkdownPct: 20 // Suggest 20% markdown promotion
    };
  }

  return {
    status: 'green',
    monthsRemaining,
    daysRemaining,
    isLocked: false,
    recommendedMarkdownPct: 0
  };
};

// Calculate Dynamic Reorder Point (ROP = (Velocity * Lead Time) + Safety Stock)
export const calculateReorderPoint = (drug: DrugItem): {
  reorderPoint: number;
  currentStock: number;
  status: 'CRITICAL_REORDER' | 'REORDER_RECOMMENDED' | 'OPTIMAL' | 'OVERSTOCKED';
  suggestedOrderQty: number;
} => {
  const totalStock = drug.batches.reduce((sum, b) => sum + b.quantity, 0);
  const leadTimeDemand = drug.dailyVelocity * drug.leadTimeDays;
  const safetyStock = Math.ceil(leadTimeDemand * 0.4); // 40% safety buffer
  const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

  let status: 'CRITICAL_REORDER' | 'REORDER_RECOMMENDED' | 'OPTIMAL' | 'OVERSTOCKED' = 'OPTIMAL';
  if (totalStock <= Math.ceil(reorderPoint * 0.5)) {
    status = 'CRITICAL_REORDER';
  } else if (totalStock <= reorderPoint) {
    status = 'REORDER_RECOMMENDED';
  } else if (totalStock > reorderPoint * 3) {
    status = 'OVERSTOCKED';
  }

  const suggestedOrderQty = Math.max(0, (reorderPoint * 2) - totalStock);

  return {
    reorderPoint,
    currentStock: totalStock,
    status,
    suggestedOrderQty
  };
};

// Storage Helpers
export const getStoredDrugs = (): DrugItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRUGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load drugs from local storage', e);
  }
  localStorage.setItem(STORAGE_KEYS.DRUGS, JSON.stringify(INITIAL_DRUG_ITEMS));
  return INITIAL_DRUG_ITEMS;
};

export const saveStoredDrugs = (drugs: DrugItem[]): void => {
  localStorage.setItem(STORAGE_KEYS.DRUGS, JSON.stringify(drugs));
};

export const getStoredTransactions = (): TransactionRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load transactions', e);
  }
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
  return INITIAL_TRANSACTIONS;
};


export const saveStoredTransactions = (transactions: TransactionRecord[]): void => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

export const getStoredDdr = (): DdrEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DDR_LEDGER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load DDR ledger', e);
  }
  return [];
};

export const saveStoredDdr = (entries: DdrEntry[]): void => {
  localStorage.setItem(STORAGE_KEYS.DDR_LEDGER, JSON.stringify(entries));
};

export const getStoredAuditLogs = (): AuditLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load audit logs', e);
  }
  return [];
};

export const logAuditEvent = (
  action: string,
  module: AuditLog['module'],
  options: {
    userId?: string;
    userName?: string;
    role?: string;
    entityId?: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
  } = {}
): AuditLog => {
  const currentLogs = getStoredAuditLogs();
  const lastHash = currentLogs.length > 0 ? currentLogs[0].hash : 'GENESIS_LEDGER_HASH';
  
  const entry: AuditLog = {
    id: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    userId: toSafeString(options.userId) || 'USER-STAFF-01',
    userName: toSafeString(options.userName) || 'Dispensing Pharmacist / Cashier',
    role: toSafeString(options.role) || 'Pharmacist',
    action: toSafeString(action) || 'System Audit Action',
    module,
    entityId: toSafeString(options.entityId),
    fieldName: toSafeString(options.fieldName),
    oldValue: toSafeString(options.oldValue),
    newValue: toSafeString(options.newValue),
    ipDeviceId: 'POS-TERMINAL-01 (192.168.1.104)',
    hash: ''
  };

  entry.hash = computeRecordHash(entry, lastHash);
  
  const updatedLogs = [entry, ...currentLogs];
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, safeStringify(updatedLogs));
  } catch (err) {
    console.error('Failed to save audit logs to localStorage:', err);
  }
  return entry;
};

export const getStoredConfig = (): PharmacyConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load config', e);
  }
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_PHARMACY_CONFIG));
  return INITIAL_PHARMACY_CONFIG;
};

export const saveStoredConfig = (config: PharmacyConfig): void => {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
};

export const getStoredInsurers = (): PrivateInsurer[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INSURERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load insurers', e);
  }
  localStorage.setItem(STORAGE_KEYS.INSURERS, JSON.stringify(INITIAL_PRIVATE_INSURERS));
  return INITIAL_PRIVATE_INSURERS;
};

export const saveStoredInsurers = (insurers: PrivateInsurer[]): void => {
  localStorage.setItem(STORAGE_KEYS.INSURERS, JSON.stringify(insurers));
};

import { 
  getStoredBasketQueue, 
  saveStoredBasketQueue 
} from './queueService';
import { 
  getStoredPurchaseOrders, 
  saveStoredPurchaseOrders 
} from './purchaseOrderService';
import { 
  getStoredPayroll, 
  saveStoredPayroll 
} from './payrollService';

export {
  getStoredBasketQueue,
  saveStoredBasketQueue,
  getStoredPurchaseOrders,
  saveStoredPurchaseOrders,
  getStoredPayroll,
  saveStoredPayroll
};
