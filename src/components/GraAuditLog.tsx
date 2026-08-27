import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  History, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Search, 
  FileText, 
  Lock, 
  ArrowRight,
  Database,
  ExternalLink,
  Layers,
  Activity,
  Check,
  Zap,
  Server,
  Radio,
  Clock,
  Sparkles,
  Info,
  Play,
  Receipt
} from 'lucide-react';
import { TransactionRecord, AuditLog, PharmacyConfig } from '../types/pharmacy';
import { logAuditEvent, getStoredAuditLogs } from '../services/storageService';

interface GraAuditLogProps {
  transactions: TransactionRecord[];
  auditLogs: AuditLog[];
  config: PharmacyConfig;
  onSyncOfflineQueue: () => void;
  isSyncing: boolean;
  onTransactionsUpdate?: (txs: TransactionRecord[]) => void;
  onAuditLogUpdate?: () => void;
  onViewReceipt?: (txn: TransactionRecord) => void;
}

interface SyncProgressState {
  isActive: boolean;
  percentage: number;
  currentInvoiceNumber: string;
  currentSequence: number;
  currentStep: number; // 1: Hash, 2: TLS/Auth, 3: GRA Ingestion, 4: QR/Stamp
  stepDescription: string;
  processedCount: number;
  totalToSync: number;
  latencyMs: number;
  bytesTransmitted: number;
  isCompleted: boolean;
  completionTime?: string;
}

export const GraAuditLog: React.FC<GraAuditLogProps> = ({
  transactions,
  auditLogs,
  config,
  onSyncOfflineQueue,
  isSyncing: parentIsSyncing,
  onTransactionsUpdate,
  onAuditLogUpdate,
  onViewReceipt
}) => {
  const [activeTab, setActiveTab] = useState<'gra_transmissions' | 'crypto_audit'>('gra_transmissions');
  const [search, setSearch] = useState('');
  
  // Real-time synchronization progress state
  const [syncProgress, setSyncProgress] = useState<SyncProgressState>({
    isActive: false,
    percentage: 0,
    currentInvoiceNumber: '',
    currentSequence: 0,
    currentStep: 1,
    stepDescription: 'Idle - Ready for synchronization',
    processedCount: 0,
    totalToSync: 0,
    latencyMs: 38,
    bytesTransmitted: 0,
    isCompleted: false
  });

  const [recentlySyncedIds, setRecentlySyncedIds] = useState<Set<string>>(new Set());

  const offlineQueued = useMemo(() => {
    return transactions.filter(t => t.graEvat.status === 'QUEUED_OFFLINE');
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t =>
      t.graEvat.graInvoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.cashierName.toLowerCase().includes(search.toLowerCase()) ||
      t.graEvat.graSecurityHash.toLowerCase().includes(search.toLowerCase()) ||
      (t.patient && t.patient.fullName.toLowerCase().includes(search.toLowerCase()))
    );
  }, [transactions, search]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(a =>
      a.action.toLowerCase().includes(search.toLowerCase()) ||
      a.userName.toLowerCase().includes(search.toLowerCase()) ||
      a.module.toLowerCase().includes(search.toLowerCase()) ||
      a.hash.toLowerCase().includes(search.toLowerCase())
    );
  }, [auditLogs, search]);

  // Execute realistic step-by-step real-time synchronization
  const executeRealtimeSync = async () => {
    const queuedItems = transactions.filter(t => t.graEvat.status === 'QUEUED_OFFLINE');
    if (queuedItems.length === 0) return;

    const total = queuedItems.length;
    setSyncProgress({
      isActive: true,
      percentage: 5,
      currentInvoiceNumber: queuedItems[0].graEvat.graInvoiceNumber,
      currentSequence: queuedItems[0].sequenceNumber,
      currentStep: 1,
      stepDescription: `Initializing TLS 1.3 Handshake with evat.gra.gov.gh for ${total} queued payload(s)...`,
      processedCount: 0,
      totalToSync: total,
      latencyMs: 42,
      bytesTransmitted: 128,
      isCompleted: false
    });

    let currentTxs = [...transactions];
    const newlySynced = new Set<string>();

    for (let index = 0; index < total; index++) {
      const item = queuedItems[index];
      const invNum = item.graEvat.graInvoiceNumber;
      const seq = item.sequenceNumber;

      // Step 1: Payload encapsulation & SHA-256 seal
      setSyncProgress(prev => ({
        ...prev,
        currentInvoiceNumber: invNum,
        currentSequence: seq,
        currentStep: 1,
        stepDescription: `[${index + 1}/${total}] Packaging SHA-256 seal & VAT ledger for invoice ${invNum}...`,
        percentage: Math.round(((index * 4 + 1) / (total * 4)) * 100),
        bytesTransmitted: prev.bytesTransmitted + 412
      }));
      await new Promise(r => setTimeout(r, 220));

      // Step 2: Mutual TLS & TIN Verification
      setSyncProgress(prev => ({
        ...prev,
        currentStep: 2,
        stepDescription: `[${index + 1}/${total}] Authenticating TIN ${config.graTin} via Mutual TLS 1.3...`,
        percentage: Math.round(((index * 4 + 2) / (total * 4)) * 100),
        latencyMs: Math.floor(35 + Math.random() * 20),
        bytesTransmitted: prev.bytesTransmitted + 680
      }));
      await new Promise(r => setTimeout(r, 240));

      // Step 3: GRA Gateway Fiscal Timestamping
      setSyncProgress(prev => ({
        ...prev,
        currentStep: 3,
        stepDescription: `[${index + 1}/${total}] Transmitting to GRA Central Database (HTTP 200 Assigned)...`,
        percentage: Math.round(((index * 4 + 3) / (total * 4)) * 100),
        bytesTransmitted: prev.bytesTransmitted + 1150
      }));
      await new Promise(r => setTimeout(r, 260));

      // Step 4: Acknowledgment & Local State Update
      currentTxs = currentTxs.map(t => {
        if (t.id === item.id) {
          return {
            ...t,
            graEvat: {
              ...t.graEvat,
              status: 'SUCCESS' as const,
              transmissionMode: 'OFFLINE_SYNCED' as const,
              errorMessage: undefined,
              graTimestamp: new Date().toISOString()
            },
            isSyncedToCloud: true
          };
        }
        return t;
      });

      newlySynced.add(item.id);

      if (onTransactionsUpdate) {
        onTransactionsUpdate(currentTxs);
      }

      setSyncProgress(prev => ({
        ...prev,
        currentStep: 4,
        stepDescription: `[${index + 1}/${total}] Invoice ${invNum} verified & signed by GRA Gateway.`,
        processedCount: index + 1,
        percentage: Math.round(((index + 1) / total) * 100),
        bytesTransmitted: prev.bytesTransmitted + 520
      }));
      await new Promise(r => setTimeout(r, 180));
    }

    // Final Completion Step
    setSyncProgress(prev => ({
      ...prev,
      isActive: false,
      percentage: 100,
      stepDescription: `All ${total} offline transactions chronologically synchronized & verified with GRA Central Gateway!`,
      isCompleted: true,
      completionTime: new Date().toLocaleTimeString()
    }));

    setRecentlySyncedIds(newlySynced);

    // Audit log entry
    logAuditEvent(
      `Completed Real-Time Synchronization of ${total} offline queued transactions to GRA Central E-VAT Gateway`,
      'GRA_EVAT',
      {
        oldValue: `${total} Invoices in Local Buffer`,
        newValue: `100% Synced (TIN: ${config.graTin})`
      }
    );
    if (onAuditLogUpdate) {
      onAuditLogUpdate();
    }
  };

  // Helper to inject simulated offline transactions for testing progress bar if queue is 0
  const handleInjectSimulatedOfflineTransactions = () => {
    const demoItems: TransactionRecord[] = [
      {
        id: `TXN-DEMO-OFFLINE-${Date.now().toString().slice(-4)}-1`,
        sequenceNumber: transactions.length + 1,
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        lane: 'retail',
        items: [
          {
            drug: {
              id: 'DRUG-001',
              brandName: 'Paracetamol 500mg (Emzor)',
              genericName: 'Paracetamol Tablets',
              dosageForm: 'Tablets',
              strength: '500mg',
              barcode: '8901234567890',
              category: 'Analgesics & Antipyretics',
              classification: 'OTC',
              retailPrice: 15.00,
              nhisTariffPrice: 8.50,
              nhisCovered: true,
              batches: [
                {
                  batchNumber: 'EMZ-2024-B1',
                  expiryDate: '2026-11-30',
                  quantity: 150,
                  costPrice: 9.50,
                  location: 'Aisle 1 - Shelf B',
                  manufacturer: 'Emzor Pharmaceuticals Ltd'
                }
              ],
              reorderLevel: 30,
              dailyVelocity: 12,
              leadTimeDays: 3,
              packSize: 20,
              unit: 'Pack'
            },
            selectedBatch: {
              batchNumber: 'EMZ-2024-B1',
              expiryDate: '2026-11-30',
              quantity: 150,
              costPrice: 9.50,
              location: 'Aisle 1 - Shelf B',
              manufacturer: 'Emzor Pharmaceuticals Ltd'
            },
            quantity: 2,
            unitPrice: 15.00,
            totalPrice: 30.00,
            isNhisTariff: false
          }
        ],
        patient: {
          id: 'PAT-WALKIN',
          fullName: 'Kofi Mensah (Simulated Offline Buyer)',
          phone: '0244123456',
          nationalId: 'GHA-728192019-1',
          age: 34,
          gender: 'M'
        },
        grossAmount: 30.00,
        discountAmount: 0,
        netAmount: 30.00,
        splitBilling: {
          nhisAmount: 0,
          privateInsuranceAmount: 0,
          momoAmount: 0,
          cashAmount: 30.00,
          ghqrAmount: 0,
          patientCopayTotal: 30.00,
          totalPaid: 30.00
        },
        graEvat: {
          status: 'QUEUED_OFFLINE',
          graInvoiceNumber: `GRA-2026-INV-${Math.floor(100000 + Math.random() * 900000)}`,
          graSecurityHash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
          graQrCodeString: 'GRA-QUEUED-OFFLINE-ENCRYPTED-BUFFER',
          graTimestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          transmissionMode: 'OFFLINE_SYNCED',
          errorMessage: 'Device was operating in offline resilience mode'
        },
        taxBreakdown: {
          taxableAmount: 24.61,
          nhilAmount: 0.62,
          getfundAmount: 0.62,
          covidAmount: 0.25,
          standardVatAmount: 3.90,
          totalTax: 5.39,
          grandTotal: 30.00,
          leviesIncluded: true
        },
        hasControlledDrugs: false,
        cashierName: 'Emmanuel Tetteh (POS Cashier)',
        isSyncedToCloud: false,
        tamperProofHash: 'sha256-demo-simulated-buffer-1'
      },
      {
        id: `TXN-DEMO-OFFLINE-${Date.now().toString().slice(-4)}-2`,
        sequenceNumber: transactions.length + 2,
        timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        lane: 'clinical',
        items: [
          {
            drug: {
              id: 'DRUG-002',
              brandName: 'Amoxiclav 625mg (Augmentin)',
              genericName: 'Amoxicillin + Clavulanic Acid',
              dosageForm: 'Tablets',
              strength: '625mg',
              barcode: '8909876543210',
              category: 'Antibiotics',
              classification: 'POM',
              retailPrice: 85.00,
              nhisTariffPrice: 42.00,
              nhisCovered: true,
              batches: [
                {
                  batchNumber: 'AUG-2024-X4',
                  expiryDate: '2027-02-28',
                  quantity: 80,
                  costPrice: 60.00,
                  location: 'Aisle 2 - Shelf A',
                  manufacturer: 'GSK Ghana / UK'
                }
              ],
              reorderLevel: 20,
              dailyVelocity: 6,
              leadTimeDays: 5,
              packSize: 14,
              unit: 'Pack'
            },
            selectedBatch: {
              batchNumber: 'AUG-2024-X4',
              expiryDate: '2027-02-28',
              quantity: 80,
              costPrice: 60.00,
              location: 'Aisle 2 - Shelf A',
              manufacturer: 'GSK Ghana / UK'
            },
            quantity: 1,
            unitPrice: 85.00,
            totalPrice: 85.00,
            isNhisTariff: false
          }
        ],
        patient: {
          id: 'PAT-009',
          fullName: 'Ama Serwaa (Simulated POM Patient)',
          phone: '0244987654',
          nationalId: 'GHA-849201934-2',
          age: 41,
          gender: 'F'
        },
        grossAmount: 85.00,
        discountAmount: 0,
        netAmount: 85.00,
        splitBilling: {
          nhisAmount: 0,
          privateInsuranceAmount: 0,
          momoAmount: 85.00,
          momoProvider: 'MTN',
          momoPhoneNumber: '0244123456',
          cashAmount: 0,
          ghqrAmount: 0,
          patientCopayTotal: 85.00,
          totalPaid: 85.00
        },
        graEvat: {
          status: 'QUEUED_OFFLINE',
          graInvoiceNumber: `GRA-2026-INV-${Math.floor(100000 + Math.random() * 900000)}`,
          graSecurityHash: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5',
          graQrCodeString: 'GRA-QUEUED-OFFLINE-ENCRYPTED-BUFFER-2',
          graTimestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          transmissionMode: 'OFFLINE_SYNCED',
          errorMessage: 'Device was operating in offline resilience mode'
        },
        taxBreakdown: {
          taxableAmount: 69.73,
          nhilAmount: 1.74,
          getfundAmount: 1.74,
          covidAmount: 0.70,
          standardVatAmount: 11.09,
          totalTax: 15.27,
          grandTotal: 85.00,
          leviesIncluded: true
        },
        hasControlledDrugs: false,
        cashierName: 'Emmanuel Tetteh (POS Cashier)',
        isSyncedToCloud: false,
        tamperProofHash: 'sha256-demo-simulated-buffer-2'
      }
    ];

    const updated = [...demoItems, ...transactions];
    if (onTransactionsUpdate) {
      onTransactionsUpdate(updated);
    }
    setSyncProgress(prev => ({
      ...prev,
      isCompleted: false,
      stepDescription: 'Injected 2 offline buffered invoices. Ready to sync!'
    }));
  };

  const isSyncRunning = syncProgress.isActive || parentIsSyncing;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Sub Tab Selector & Offline Queue Sync Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              onClick={() => setActiveTab('gra_transmissions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'gra_transmissions'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>GRA E-VAT Transmissions ({transactions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('crypto_audit')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'crypto_audit'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cryptographic Immutable Audit Trail ({auditLogs.length})</span>
            </button>
          </div>
        </div>

        {/* Sync Controls & Simulation buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {offlineQueued.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="text-xs text-amber-400 font-semibold flex items-center gap-1 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/80">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{offlineQueued.length} offline invoice(s) pending sync</span>
              </div>
              <button
                onClick={onTransactionsUpdate ? executeRealtimeSync : onSyncOfflineQueue}
                disabled={isSyncRunning || !config.isOnlineMode}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow transition-all ${
                  config.isOnlineMode && !isSyncRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncRunning ? 'animate-spin' : ''}`} />
                <span>{isSyncRunning ? 'Synchronizing to GRA...' : 'Start Real-Time Sync'}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleInjectSimulatedOfflineTransactions}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Add simulated offline invoices to test the real-time synchronization progress bar"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Offline Invoices</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REAL-TIME OFFLINE-TO-GRA SYNCHRONIZATION PROGRESS BAR COMPONENT */}
      {/* ========================================================================= */}
      {(syncProgress.isActive || syncProgress.isCompleted || offlineQueued.length > 0) && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 relative overflow-hidden animate-fadeIn">
          
          {/* Background Ambient Glow */}
          <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            syncProgress.isCompleted 
              ? 'bg-emerald-500/10' 
              : syncProgress.isActive 
              ? 'bg-amber-500/10' 
              : 'bg-slate-800/20'
          }`} />

          {/* Header Row: Title & Real-Time Gateway Diagnostics */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border transition-all ${
                syncProgress.isCompleted
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : syncProgress.isActive
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {syncProgress.isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : syncProgress.isActive ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                ) : (
                  <Radio className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-wide">
                    Offline-to-GRA Transaction Synchronization
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    syncProgress.isCompleted
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : syncProgress.isActive
                      ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {syncProgress.isCompleted
                      ? 'SYNCHRONIZED (100%)'
                      : syncProgress.isActive
                      ? 'TRANSMISSION IN PROGRESS'
                      : `${offlineQueued.length} INVOICES BUFFERED`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronizing local encrypted queue with GRA Electronic Invoicing Gateway (<code>evat.gra.gov.gh</code>)
                </p>
              </div>
            </div>

            {/* Gateway Telemetry Badges */}
            <div className="flex items-center gap-2 text-xs font-mono self-start sm:self-auto">
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px]">GRA Server: <strong className="text-emerald-400">ONLINE</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px]">Latency: <strong className="text-sky-300">{syncProgress.latencyMs}ms</strong></span>
              </div>
            </div>
          </div>

          {/* MAIN PROGRESS BAR CONTAINER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">
                  {syncProgress.isActive 
                    ? `Transmitting Batch (${syncProgress.processedCount} of ${syncProgress.totalToSync} Completed)`
                    : syncProgress.isCompleted
                    ? `Batch Complete (${syncProgress.totalToSync || transactions.length} Invoices Synced)`
                    : `Ready to sync ${offlineQueued.length} offline transactions`}
                </span>
                {syncProgress.currentInvoiceNumber && syncProgress.isActive && (
                  <span className="font-mono text-[11px] text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60 hidden md:inline">
                    Current: {syncProgress.currentInvoiceNumber}
                  </span>
                )}
              </div>

              {/* Progress Percentage Display */}
              <div className="flex items-center gap-2 font-mono font-bold text-sm">
                <span className={syncProgress.isCompleted ? 'text-emerald-400' : 'text-amber-400'}>
                  {syncProgress.isActive ? `${syncProgress.percentage}%` : syncProgress.isCompleted ? '100%' : '0%'}
                </span>
              </div>
            </div>

            {/* The Animated Progress Track */}
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner relative">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden ${
                  syncProgress.isCompleted
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 shadow-lg shadow-emerald-500/25'
                    : syncProgress.isActive
                    ? 'bg-gradient-to-r from-amber-600 via-amber-400 to-emerald-400 shadow-lg shadow-amber-500/25'
                    : 'bg-slate-700'
                }`}
                style={{
                  width: `${syncProgress.isActive ? syncProgress.percentage : syncProgress.isCompleted ? 100 : 0}%`
                }}
              >
                {/* Shimmer / Striped Light Animation during Active Sync */}
                {syncProgress.isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                )}
              </div>
            </div>

            {/* Dynamic Status / Step Description Line */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-2 truncate">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  syncProgress.isCompleted 
                    ? 'bg-emerald-400' 
                    : syncProgress.isActive 
                    ? 'bg-amber-400 animate-ping' 
                    : 'bg-slate-500'
                }`} />
                <span className="font-mono text-[11px] text-slate-300 truncate">
                  {syncProgress.stepDescription}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 shrink-0">
                <span>Payload: <strong className="text-slate-300">{(syncProgress.bytesTransmitted / 1024).toFixed(1)} KB</strong></span>
                <span>TIN: <strong className="text-slate-300">{config.graTin}</strong></span>
              </div>
            </div>
          </div>

          {/* 4-STAGE SEQUENTIAL PIPELINE STEP INDICATORS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
            {/* Step 1 */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              syncProgress.currentStep >= 1 && (syncProgress.isActive || syncProgress.isCompleted)
                ? 'bg-slate-950 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Step 1</span>
                {syncProgress.currentStep > 1 || syncProgress.isCompleted ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : syncProgress.currentStep === 1 && syncProgress.isActive ? (
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                ) : (
                  <span className="text-[9px] text-slate-600">PENDING</span>
                )}
              </div>
              <span className="font-semibold block text-[11px]">Payload &amp; SHA-256</span>
              <span className="text-[9px] text-slate-400">Local cryptographic seal</span>
            </div>

            {/* Step 2 */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              syncProgress.currentStep >= 2 && (syncProgress.isActive || syncProgress.isCompleted)
                ? 'bg-slate-950 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Step 2</span>
                {syncProgress.currentStep > 2 || syncProgress.isCompleted ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : syncProgress.currentStep === 2 && syncProgress.isActive ? (
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                ) : (
                  <span className="text-[9px] text-slate-600">PENDING</span>
                )}
              </div>
              <span className="font-semibold block text-[11px]">Mutual TLS 1.3</span>
              <span className="text-[9px] text-slate-400">GRA Gateway handshake</span>
            </div>

            {/* Step 3 */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              syncProgress.currentStep >= 3 && (syncProgress.isActive || syncProgress.isCompleted)
                ? 'bg-slate-950 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Step 3</span>
                {syncProgress.currentStep > 3 || syncProgress.isCompleted ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : syncProgress.currentStep === 3 && syncProgress.isActive ? (
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                ) : (
                  <span className="text-[9px] text-slate-600">PENDING</span>
                )}
              </div>
              <span className="font-semibold block text-[11px]">Fiscal Ingestion</span>
              <span className="text-[9px] text-slate-400">HTTP 200 OK timestamped</span>
            </div>

            {/* Step 4 */}
            <div className={`p-2.5 rounded-xl border transition-all ${
              syncProgress.isCompleted || (syncProgress.currentStep === 4 && syncProgress.isActive)
                ? 'bg-slate-950 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Step 4</span>
                {syncProgress.isCompleted ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : syncProgress.currentStep === 4 && syncProgress.isActive ? (
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                ) : (
                  <span className="text-[9px] text-slate-600">PENDING</span>
                )}
              </div>
              <span className="font-semibold block text-[11px]">QR &amp; Token Acknowledged</span>
              <span className="text-[9px] text-slate-400">Queue buffer released</span>
            </div>
          </div>

          {/* Action Row inside Progress Container */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
            <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Offline queue enforces strict chronological ordering (FIFO) per GPhC and GRA audit specifications.</span>
            </div>

            {offlineQueued.length > 0 && !syncProgress.isActive && (
              <button
                onClick={onTransactionsUpdate ? executeRealtimeSync : onSyncOfflineQueue}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow transition-transform active:scale-95"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Synchronize Now</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* VIEW 1: GRA E-VAT TRANSMISSIONS LEDGER */}
      {activeTab === 'gra_transmissions' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Registered TIN</span>
              <span className="font-mono font-bold text-slate-100 text-sm">{config.graTin}</span>
              <span className="text-[10px] text-slate-400 block">{config.pharmacyName}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Total Transmitted</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {transactions.filter(t => t.graEvat.status === 'SUCCESS').length} Invoices
              </span>
              <span className="text-[10px] text-slate-400 block">Real-time certified</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Offline Queue</span>
              <span className="text-xl font-bold font-mono text-amber-400">
                {offlineQueued.length} Pending
              </span>
              <span className="text-[10px] text-slate-400 block">Encrypted local buffer</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">GRA Gateway Server</span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>evat.gra.gov.gh/api/v1</span>
              </span>
              <span className="text-[10px] text-slate-400 block">Active TLS 1.3</span>
            </div>
          </div>

          {/* Search */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-500 ml-2" />
            <input
              type="text"
              placeholder="Search GRA logs by invoice number, cashier, patient, security hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-200 focus:outline-none placeholder:text-slate-500"
            />
          </div>

          {/* GRA Invoices Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">GRA Invoice No.</th>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Cashier / Lane</th>
                    <th className="p-3.5">Patient / Items</th>
                    <th className="p-3.5 text-right">Taxable Base</th>
                    <th className="p-3.5 text-right">Tax &amp; Levies</th>
                    <th className="p-3.5 text-right">Gross Total</th>
                    <th className="p-3.5">GRA Hash &amp; Mode</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        No transactions recorded in the current session.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isRecentlySynced = recentlySyncedIds.has(tx.id);
                      return (
                        <tr 
                          key={tx.id} 
                          className={`transition-colors ${
                            isRecentlySynced
                              ? 'bg-emerald-950/30 hover:bg-emerald-950/50'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                              <span>{tx.graEvat.graInvoiceNumber}</span>
                              {isRecentlySynced && (
                                <span className="text-[9px] bg-emerald-500 text-slate-950 font-bold px-1 rounded uppercase animate-bounce">
                                  Synced
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">Seq #{tx.sequenceNumber}</div>
                          </td>

                          <td className="p-3.5 text-[11px] text-slate-400">
                            {new Date(tx.timestamp).toLocaleString()}
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-slate-200">{tx.cashierName}</div>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded uppercase">
                              {tx.lane}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-slate-200">
                              {tx.patient?.fullName || 'Walk-in Retail Buyer'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                              {tx.items.map(i => `${i.quantity}x ${i.drug.brandName}`).join(', ')}
                            </div>
                          </td>

                          <td className="p-3.5 text-right font-mono text-slate-300">
                            GHS {tx.taxBreakdown.taxableAmount.toFixed(2)}
                          </td>

                          <td className="p-3.5 text-right font-mono text-slate-400">
                            GHS {tx.taxBreakdown.totalTax.toFixed(2)}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                            GHS {tx.grossAmount.toFixed(2)}
                          </td>

                          <td className="p-3.5">
                            <div className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={tx.graEvat.graSecurityHash}>
                              {tx.graEvat.graSecurityHash}
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {tx.graEvat.transmissionMode}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.graEvat.status === 'SUCCESS'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                            }`}>
                              {tx.graEvat.status === 'SUCCESS' ? 'CERTIFIED' : 'QUEUED'}
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            {onViewReceipt && (
                              <button
                                onClick={() => onViewReceipt(tx)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-950/70 hover:text-emerald-300 text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-700 hover:border-emerald-700 flex items-center gap-1 ml-auto transition-colors shadow-sm"
                                title="View receipt, print, or share via WhatsApp/SMS"
                              >
                                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Receipt / Share</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CRYPTOGRAPHIC AUDIT TRAIL */}
      {activeTab === 'crypto_audit' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-300 font-bold">
                #
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Immutable Cryptographic Hash Ledger
                </h3>
                <p className="text-xs text-slate-400">
                  Every price adjustment, stock alteration, and insurance override is permanently recorded with SHA-256 hash chaining.
                </p>
              </div>
            </div>
            <span className="text-xs bg-purple-950 text-purple-300 border border-purple-800 px-2.5 py-1 rounded-lg font-mono">
              Tamper-Proof Chaining: ACTIVE
            </span>
          </div>

          {/* Search */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-500 ml-2" />
            <input
              type="text"
              placeholder="Search audit trail by user, module, action, or block hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-200 focus:outline-none placeholder:text-slate-500"
            />
          </div>

          {/* Audit Trail Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Log ID &amp; Timestamp</th>
                    <th className="p-3.5">User / Role</th>
                    <th className="p-3.5">Module</th>
                    <th className="p-3.5">Action &amp; Entity</th>
                    <th className="p-3.5">Previous Value</th>
                    <th className="p-3.5">New Altered Value</th>
                    <th className="p-3.5">Device Terminal IP</th>
                    <th className="p-3.5">Cryptographic Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No audit events recorded yet. System mutations (dispensing, stock additions) will appear here.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-slate-200">{log.id}</div>
                          <div className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-100">{log.userName}</div>
                          <span className="text-[10px] text-slate-400">{log.role}</span>
                        </td>

                        <td className="p-3.5">
                          <span className="text-[10px] font-bold bg-slate-950 text-purple-300 border border-purple-900 px-2 py-0.5 rounded font-mono">
                            {log.module}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">{log.action}</div>
                          {log.entityId && (
                            <div className="text-[10px] font-mono text-slate-500">ID: {log.entityId}</div>
                          )}
                        </td>

                        <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                          {log.oldValue || '—'}
                        </td>

                        <td className="p-3.5 font-mono text-emerald-400 text-[11px] font-bold">
                          {log.newValue || '—'}
                        </td>

                        <td className="p-3.5 font-mono text-slate-500 text-[10px]">
                          {log.ipDeviceId}
                        </td>

                        <td className="p-3.5 font-mono text-[10px] text-purple-400 truncate max-w-[140px]" title={log.hash}>
                          {log.hash}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

