import React, { useState, useEffect, useCallback } from 'react';
import { 
  PosLaneType, 
  DrugItem, 
  CartItem, 
  PatientProfile, 
  PrescriptionDetails, 
  TransactionRecord, 
  AuditLog, 
  DdrEntry, 
  PrivateInsurer, 
  PharmacyConfig,
  SplitBillingAllocation
} from './types/pharmacy';
import { 
  getStoredDrugs, 
  saveStoredDrugs, 
  getStoredTransactions, 
  saveStoredTransactions,
  getStoredAuditLogs, 
  logAuditEvent, 
  getStoredDdr, 
  saveStoredDdr, 
  getStoredInsurers, 
  saveStoredInsurers, 
  getStoredConfig, 
  saveStoredConfig,
  computeRecordHash
} from './services/storageService';
import { INITIAL_PATIENT_PROFILES } from './data/mockPharmacyData';
import { createDdrEntry, isClassAControlledDrug } from './services/ddrService';
import { Navbar } from './components/Navbar';
import { PosLane } from './components/PosLane';
import { SplitBillingModal } from './components/SplitBillingModal';
import { ReceiptModal } from './components/ReceiptModal';
import { InventoryFefo } from './components/InventoryFefo';
import { NhisDebtorLedger } from './components/NhisDebtorLedger';
import { DangerousDrugsRegister } from './components/DangerousDrugsRegister';
import { GraAuditLog } from './components/GraAuditLog';
import { SuperintendentPinModal } from './components/SuperintendentPinModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'nhis' | 'ddr' | 'audit'>('pos');

  // Core Data States (Initialized from persistent LocalStorage)
  const [drugs, setDrugs] = useState<DrugItem[]>(() => getStoredDrugs());
  const [patients] = useState<PatientProfile[]>(INITIAL_PATIENT_PROFILES);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => getStoredTransactions());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getStoredAuditLogs());
  const [ddrEntries, setDdrEntries] = useState<DdrEntry[]>(() => getStoredDdr());
  const [insurers, setInsurers] = useState<PrivateInsurer[]>(() => getStoredInsurers());
  const [config, setConfig] = useState<PharmacyConfig>(() => getStoredConfig());

  // POS State
  const [currentLane, setCurrentLane] = useState<PosLaneType>('clinical');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(patients[0] || null);
  const [useNhisTariff, setUseNhisTariff] = useState<boolean>(true);
  const [prescription, setPrescription] = useState<PrescriptionDetails>({
    prescriberName: 'Dr. Michael K. Mensah (MDC/RN/39482)',
    prescriberMdcNumber: 'MDC/RN/39482',
    prescriberHospital: 'Korle-Bu Teaching Hospital / Osu Polyclinic',
    prescriptionDate: new Date().toISOString().split('T')[0],
    diagnosisIcd10: 'B54 (Plasmodium Falciparum Malaria) + Severe RTI',
    clinicalNotes: 'First line artemether-lumefantrine + Amoxicillin 625mg'
  });

  // Security & Superintendent PIN State
  const [isSuperintendentUnlocked, setIsSuperintendentUnlocked] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinSuccessCallback, setPinSuccessCallback] = useState<(() => void) | null>(null);

  // Modals
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [activeReceiptTransaction, setActiveReceiptTransaction] = useState<TransactionRecord | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  // Save changes to storage
  useEffect(() => {
    saveStoredDrugs(drugs);
  }, [drugs]);

  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveStoredDdr(ddrEntries);
  }, [ddrEntries]);

  useEffect(() => {
    saveStoredInsurers(insurers);
  }, [insurers]);

  useEffect(() => {
    saveStoredConfig(config);
  }, [config]);

  // Offline queued count
  const pendingOfflineCount = transactions.filter(t => t.graEvat.status === 'QUEUED_OFFLINE').length;

  // Toggle Network Online / Offline Simulation
  const handleToggleOnlineMode = () => {
    const nextState = !config.isOnlineMode;
    const updated = { ...config, isOnlineMode: nextState };
    setConfig(updated);
    logAuditEvent(
      `Network state toggled to ${nextState ? 'ONLINE (GRA Real-Time Gateway)' : 'OFFLINE (Encrypted Local Queue)'}`,
      'GRA_EVAT',
      { newValue: nextState ? 'ONLINE' : 'OFFLINE' }
    );
    setAuditLogs(getStoredAuditLogs());
  };

  // Require Superintendent PIN helper
  const handleRequireSuperintendentPin = (onSuccess: () => void) => {
    setPinSuccessCallback(() => onSuccess);
    setIsPinModalOpen(true);
  };

  // Handle Complete Dispense & Checkout
  const handleCompleteSale = (
    splitAllocation: SplitBillingAllocation,
    graResponse: any,
    taxBreakdown: any
  ) => {
    const nextSeq = transactions.length + 1;
    const hasControlled = cart.some(item => isClassAControlledDrug(item.drug.classification));
    const txId = `TXN-GH-${Date.now().toString().slice(-6)}-${nextSeq}`;

    // 1. Decrement inventory from exact FEFO batches
    const updatedDrugs = drugs.map(drug => {
      const cartItemsForDrug = cart.filter(ci => ci.drug.id === drug.id);
      if (cartItemsForDrug.length === 0) return drug;

      const updatedBatches = drug.batches.map(batch => {
        const itemForBatch = cartItemsForDrug.find(
          ci => ci.selectedBatch.batchNumber === batch.batchNumber
        );
        if (itemForBatch) {
          const remaining = Math.max(0, batch.quantity - itemForBatch.quantity);
          return { ...batch, quantity: remaining };
        }
        return batch;
      });

      return { ...drug, batches: updatedBatches };
    });

    setDrugs(updatedDrugs);

    // 2. Handle DDR Entries for Class A Controlled Drugs
    let ddrId: string | undefined = undefined;
    const newDdrEntries: DdrEntry[] = [];

    cart.forEach(item => {
      if (isClassAControlledDrug(item.drug.classification)) {
        const drugRef = updatedDrugs.find(d => d.id === item.drug.id);
        const batchRef = drugRef?.batches.find(b => b.batchNumber === item.selectedBatch.batchNumber);
        const remainingInBatch = batchRef ? batchRef.quantity : 0;

        const ddrEntry = createDdrEntry(
          txId,
          item,
          currentLane === 'clinical' ? selectedPatient || undefined : undefined,
          currentLane === 'clinical' ? prescription : undefined,
          config.superintendentPharmacist.fullName,
          remainingInBatch
        );
        newDdrEntries.push(ddrEntry);
        ddrId = ddrEntry.id;
      }
    });

    if (newDdrEntries.length > 0) {
      setDdrEntries([...newDdrEntries, ...ddrEntries]);
    }

    // 3. Update Private Insurer balance if applicable
    if (splitAllocation.privateInsuranceAmount > 0 && splitAllocation.privateInsurerName) {
      const updatedInsurers = insurers.map(ins => {
        if (ins.name === splitAllocation.privateInsurerName) {
          return {
            ...ins,
            outstandingBalance: parseFloat((ins.outstandingBalance + splitAllocation.privateInsuranceAmount).toFixed(2)),
            claimsCount: ins.claimsCount + 1
          };
        }
        return ins;
      });
      setInsurers(updatedInsurers);
    }

    // 4. Create Transaction Record
    const newTx: TransactionRecord = {
      id: txId,
      sequenceNumber: nextSeq,
      timestamp: new Date().toISOString(),
      lane: currentLane,
      items: [...cart],
      patient: currentLane === 'clinical' ? selectedPatient || undefined : undefined,
      prescription: currentLane === 'clinical' ? prescription : undefined,
      grossAmount: splitAllocation.totalPaid,
      discountAmount: 0,
      netAmount: splitAllocation.totalPaid,
      splitBilling: splitAllocation,
      graEvat: graResponse,
      taxBreakdown,
      hasControlledDrugs: hasControlled,
      ddrEntryId: ddrId,
      cashierName: 'Pharm. Akosua Mensah (Duty Cashier)',
      isSyncedToCloud: graResponse.status === 'SUCCESS',
      tamperProofHash: computeRecordHash({ txId, splitAllocation, taxBreakdown })
    };

    setTransactions([newTx, ...transactions]);

    // 5. Append-only Audit Log
    logAuditEvent(
      `Dispense Transaction ${newTx.graEvat.graInvoiceNumber} (${currentLane.toUpperCase()} Lane) - GHS ${newTx.grossAmount.toFixed(2)}`,
      'DISPENSING',
      {
        entityId: newTx.id,
        newValue: `GHS ${newTx.grossAmount.toFixed(2)} [GRA Hash: ${newTx.graEvat.graSecurityHash.slice(0, 10)}]`
      }
    );
    setAuditLogs(getStoredAuditLogs());

    // 6. Reset Cart & Show Receipt
    setCart([]);
    setIsSplitModalOpen(false);
    setActiveReceiptTransaction(newTx);
    setIsReceiptModalOpen(true);
  };

  // Sync Offline Queue
  const handleSyncOfflineQueue = async () => {
    setIsSyncingQueue(true);
    await new Promise(r => setTimeout(r, 1200));

    const updated = transactions.map(tx => {
      if (tx.graEvat.status === 'QUEUED_OFFLINE') {
        return {
          ...tx,
          graEvat: {
            ...tx.graEvat,
            status: 'SUCCESS' as const,
            transmissionMode: 'OFFLINE_SYNCED' as const,
            errorMessage: undefined
          },
          isSyncedToCloud: true
        };
      }
      return tx;
    });

    setTransactions(updated);
    logAuditEvent(
      `Synchronized ${pendingOfflineCount} offline queued transactions to GRA Central E-VAT Gateway`,
      'GRA_EVAT',
      { oldValue: `${pendingOfflineCount} Queued`, newValue: 'All Synchronized' }
    );
    setAuditLogs(getStoredAuditLogs());
    setIsSyncingQueue(false);
    alert(`Successfully synced ${pendingOfflineCount} transactions chronologically with GRA Central E-VAT.`);
  };

  // Reset to initial demo catalog
  const handleResetToDemoData = () => {
    localStorage.clear();
    setDrugs(getStoredDrugs());
    setTransactions([]);
    setDdrEntries([]);
    setInsurers(getStoredInsurers());
    setConfig(getStoredConfig());
    setAuditLogs([]);
    setCart([]);
    alert('System reset to clean Ghanaian pharmacy initial baseline state.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation & Status Badges */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        onToggleOnlineMode={handleToggleOnlineMode}
        isSuperintendentUnlocked={isSuperintendentUnlocked}
        onOpenSuperintendentPin={() => {
          handleRequireSuperintendentPin(() => {
            setIsSuperintendentUnlocked(true);
            alert('Superintendent Pharmacist Mode Unlocked.');
          });
        }}
        onLockSuperintendent={() => {
          setIsSuperintendentUnlocked(false);
          alert('Superintendent Mode Locked.');
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        pendingOfflineCount={pendingOfflineCount}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'pos' && (
          <PosLane
            drugs={drugs}
            patients={patients}
            cart={cart}
            setCart={setCart}
            currentLane={currentLane}
            setCurrentLane={setCurrentLane}
            selectedPatient={selectedPatient}
            setSelectedPatient={setSelectedPatient}
            prescription={prescription}
            setPrescription={setPrescription}
            useNhisTariff={useNhisTariff}
            setUseNhisTariff={setUseNhisTariff}
            onProceedToSplitCheckout={() => setIsSplitModalOpen(true)}
            config={config}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryFefo
            drugs={drugs}
            onUpdateDrug={(updated) => {
              const list = drugs.map(d => (d.id === updated.id ? updated : d));
              setDrugs(list);
              logAuditEvent(
                `Updated Batches/Stock for ${updated.brandName}`,
                'INVENTORY',
                { entityId: updated.id, newValue: `${updated.batches.reduce((s,b)=>s+b.quantity,0)} units total` }
              );
              setAuditLogs(getStoredAuditLogs());
            }}
            onAddNewDrug={(newDrug) => {
              setDrugs([newDrug, ...drugs]);
              logAuditEvent(`Added New Drug ${newDrug.brandName}`, 'INVENTORY', { entityId: newDrug.id });
              setAuditLogs(getStoredAuditLogs());
            }}
            config={config}
            onRequireSuperintendentPin={handleRequireSuperintendentPin}
            isSuperintendentUnlocked={isSuperintendentUnlocked}
          />
        )}

        {activeTab === 'nhis' && (
          <NhisDebtorLedger
            transactions={transactions}
            insurers={insurers}
            onUpdateInsurer={(updated) => {
              const list = insurers.map(i => (i.id === updated.id ? updated : i));
              setInsurers(list);
              logAuditEvent(
                `Updated Debtor Ledger for ${updated.name}`,
                'PRICING',
                { entityId: updated.id, newValue: `Balance GHS ${updated.outstandingBalance.toFixed(2)}` }
              );
              setAuditLogs(getStoredAuditLogs());
            }}
            config={config}
          />
        )}

        {activeTab === 'ddr' && (
          <DangerousDrugsRegister
            ddrEntries={ddrEntries}
            config={config}
          />
        )}

        {activeTab === 'audit' && (
          <GraAuditLog
            transactions={transactions}
            auditLogs={auditLogs}
            config={config}
            onSyncOfflineQueue={handleSyncOfflineQueue}
            isSyncing={isSyncingQueue}
          />
        )}
      </main>

      {/* Split-Billing & Checkout Modal */}
      <SplitBillingModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        cart={cart}
        patient={selectedPatient}
        prescription={prescription}
        currentLane={currentLane}
        privateInsurers={insurers}
        config={config}
        isSuperintendentUnlocked={isSuperintendentUnlocked}
        onRequireSuperintendentPin={handleRequireSuperintendentPin}
        onCompleteSale={handleCompleteSale}
        nextInvoiceSequence={transactions.length + 1}
      />

      {/* GRA Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        transaction={activeReceiptTransaction}
        config={config}
      />

      {/* Superintendent PIN Verification Modal */}
      <SuperintendentPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPinSuccessCallback(null);
        }}
        config={config}
        onSuccess={() => {
          if (pinSuccessCallback) {
            pinSuccessCallback();
          }
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onSaveConfig={(newConfig) => {
          setConfig(newConfig);
          logAuditEvent('Updated Pharmacy Settings & GRA Config', 'SETTINGS');
          setAuditLogs(getStoredAuditLogs());
        }}
        onResetToDemoData={handleResetToDemoData}
      />
    </div>
  );
}
