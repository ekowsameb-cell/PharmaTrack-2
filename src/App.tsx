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
  SplitBillingAllocation,
  CounterBasketQueueItem,
  PurchaseOrder,
  StaffPayrollRecord,
  GraEvatResponse
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
  computeRecordHash,
  getStoredBasketQueue,
  saveStoredBasketQueue,
  getStoredPurchaseOrders,
  saveStoredPurchaseOrders,
  getStoredPayroll,
  saveStoredPayroll
} from './services/storageService';
import { INITIAL_PATIENT_PROFILES } from './data/mockPharmacyData';
import { createDdrEntry, isClassAControlledDrug } from './services/ddrService';
import { Navbar, AppTabType, UserRole } from './components/Navbar';
import { PosLane } from './components/PosLane';
import { SplitBillingModal } from './components/SplitBillingModal';
import { ReceiptModal } from './components/ReceiptModal';
import { InventoryFefo } from './components/InventoryFefo';
import { NhisDebtorLedger } from './components/NhisDebtorLedger';
import { DangerousDrugsRegister } from './components/DangerousDrugsRegister';
import { GraAuditLog } from './components/GraAuditLog';
import { SuperintendentPinModal } from './components/SuperintendentPinModal';
import { SettingsModal } from './components/SettingsModal';
import { PostgreSqlSchemaViewer } from './components/PostgreSqlSchemaViewer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { MusicPlayerBar } from './components/music/MusicPlayerBar';
import { LyriaMusicModal } from './components/music/LyriaMusicModal';
import { db, doc, setDoc, collection, addDoc } from './lib/firebase';

// Personas
import { CounterClerkDashboard } from './components/personas/CounterClerkDashboard';
import { PharmacistWorkspace } from './components/personas/PharmacistWorkspace';
import { PosCashierTerminal } from './components/personas/PosCashierTerminal';
import { OwnerExecutiveHub } from './components/personas/OwnerExecutiveHub';

function PharmacyAppInner() {
  const { currentUser, userProfile, updateUserRole, signOut } = useAuth();

  // Active User Role & Navigation View Tabs
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(userProfile?.role || 'Clerk');
  const [activeTab, setActiveTab] = useState<AppTabType>('clerk');
  const [logoutNotification, setLogoutNotification] = useState<string | null>(null);

  // Sync role with auth profile if present
  useEffect(() => {
    if (userProfile?.role) {
      setCurrentUserRole(userProfile.role);
    }
  }, [userProfile?.role]);

  const handleRoleChange = (role: UserRole) => {
    setCurrentUserRole(role);
    updateUserRole(role);
  };

  const handleLogout = async () => {
    const previousRole = currentUserRole;
    const userName = currentUser?.displayName || userProfile?.displayName || 'Pharmacy User';

    try {
      if (currentUser) {
        await signOut();
      }
    } catch (err) {
      console.warn('Sign out warning', err);
    }

    // Reset back to initial default station
    setCurrentUserRole('Clerk');
    setActiveTab('clerk');
    setIsSuperintendentUnlocked(false);

    logAuditEvent(
      `${userName} signed out and exited active dashboard (previous role: ${previousRole})`,
      'SETTINGS',
      {
        userName,
        role: previousRole,
        newValue: 'Dashboard session ended - switched to default Clerk POS view'
      }
    );
    setAuditLogs(getStoredAuditLogs());
    setLogoutNotification('Logged out successfully. Active dashboard closed.');
    setTimeout(() => setLogoutNotification(null), 4000);
  };

  // Core Data States (Initialized from persistent LocalStorage)
  const [drugs, setDrugs] = useState<DrugItem[]>(() => getStoredDrugs());
  const [patients] = useState<PatientProfile[]>(INITIAL_PATIENT_PROFILES);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => getStoredTransactions());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getStoredAuditLogs());
  const [ddrEntries, setDdrEntries] = useState<DdrEntry[]>(() => getStoredDdr());
  const [insurers, setInsurers] = useState<PrivateInsurer[]>(() => getStoredInsurers());
  const [config, setConfig] = useState<PharmacyConfig>(() => getStoredConfig());

  // Workflow Queues, POs, and Payroll States
  const [queue, setQueue] = useState<CounterBasketQueueItem[]>(() => getStoredBasketQueue());
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => getStoredPurchaseOrders());
  const [payrollRecords, setPayrollRecords] = useState<StaffPayrollRecord[]>(() => getStoredPayroll());

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

  // Modals & Popups
  const [isSplitModalOpen, setIsSplitModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [activeReceiptTransaction, setActiveReceiptTransaction] = useState<TransactionRecord | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState<boolean>(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  // Save changes to storage
  useEffect(() => {
    saveStoredDrugs(drugs);
  }, [drugs]);

  useEffect(() => {
    saveStoredTransactions(transactions);
    // Sync latest transaction to Firestore if signed in
    if (currentUser && transactions.length > 0) {
      try {
        const latest = transactions[0];
        const docRef = doc(db, 'transactions', latest.id);
        setDoc(docRef, { ...latest, syncedByUid: currentUser.uid, updatedAt: new Date().toISOString() }, { merge: true })
          .catch((e) => console.warn('Firestore transaction sync note:', e));
      } catch (err) {
        // ignore
      }
    }
  }, [transactions, currentUser]);

  useEffect(() => {
    saveStoredDdr(ddrEntries);
  }, [ddrEntries]);

  useEffect(() => {
    saveStoredInsurers(insurers);
  }, [insurers]);

  useEffect(() => {
    saveStoredConfig(config);
  }, [config]);

  useEffect(() => {
    saveStoredBasketQueue(queue);
    // Sync queue items to Firestore
    if (currentUser && queue.length > 0) {
      try {
        const activeItem = queue[0];
        const docRef = doc(db, 'pharmacy_queues', activeItem.id);
        setDoc(docRef, { ...activeItem, syncedByUid: currentUser.uid, updatedAt: new Date().toISOString() }, { merge: true })
          .catch((e) => console.warn('Firestore queue sync note:', e));
      } catch (err) {
        // ignore
      }
    }
  }, [queue, currentUser]);

  useEffect(() => {
    saveStoredPurchaseOrders(purchaseOrders);
  }, [purchaseOrders]);

  useEffect(() => {
    saveStoredPayroll(payrollRecords);
  }, [payrollRecords]);

  // Offline queued count
  const pendingOfflineCount = transactions.filter(t => t.graEvat.status === 'QUEUED_OFFLINE').length;
  const pendingPharmacistCount = queue.filter(q => q.status === 'PENDING_CLINICAL_CLEARANCE' || q.status === 'PENDING_PHARMACIST' || q.status === 'DRAFT').length;
  const pendingCashierCount = queue.filter(q => q.status === 'PENDING_PAYMENT' || q.status === 'PENDING_CASHIER').length;
  const pendingPoCount = purchaseOrders.filter(p => p.status === 'PENDING_OWNER_APPROVAL').length;

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

  // Handle Complete Dispense & Checkout from standard POS Lane
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
      cashierName: 'Emmanuel Tetteh (POS Cashier)',
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

  // Handle POS Cashier Terminal Queue Payment Completion
  const handleCashierCompletePayment = (
    queueItem: CounterBasketQueueItem,
    paymentRecord: {
      method: 'cash' | 'momo' | 'ghqr';
      tendered?: number;
      change?: number;
      momoProvider?: any;
      momoPhone?: string;
      momoTxnId?: string;
      graResponse: GraEvatResponse;
    }
  ) => {
    const nextSeq = transactions.length + 1;
    const txId = `TXN-GH-${Date.now().toString().slice(-6)}-${nextSeq}`;

    const totalPatientLiability = queueItem.pharmacistReview?.totalPatientCopay ?? 
      queueItem.items.reduce((s, i) => s + i.totalPriceGhs, 0);
    const totalInsurerPays = queueItem.pharmacistReview?.totalInsurerPays ?? 0;
    const totalGross = queueItem.pharmacistReview?.totalBasePrice ?? totalPatientLiability;

    // 1. Decrement Inventory Batches
    const updatedDrugs = drugs.map(drug => {
      const itemsForDrug = queueItem.items.filter(qi => qi.drug.id === drug.id);
      if (itemsForDrug.length === 0) return drug;

      const updatedBatches = drug.batches.map(batch => {
        const itemForBatch = itemsForDrug.find(
          qi => qi.selectedBatch.batchNumber === batch.batchNumber
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

    // 2. DDR Logging if controlled substance
    let ddrId: string | undefined = undefined;
    const newDdrEntries: DdrEntry[] = [];

    queueItem.items.forEach(item => {
      if (isClassAControlledDrug(item.drug.classification)) {
        const drugRef = updatedDrugs.find(d => d.id === item.drug.id);
        const batchRef = drugRef?.batches.find(b => b.batchNumber === item.selectedBatch.batchNumber);
        const remainingInBatch = batchRef ? batchRef.quantity : 0;

        const ddrEntry = createDdrEntry(
          txId,
          {
            drug: item.drug,
            selectedBatch: item.selectedBatch,
            quantity: item.quantity,
            unitPrice: item.unitPriceGhs,
            totalPrice: item.totalPriceGhs,
            isNhisTariff: queueItem.schemeType === 'NHIS'
          },
          {
            id: `PAT-${queueItem.queueNumber}`,
            fullName: queueItem.patientName,
            phone: queueItem.patientPhone,
            nationalId: queueItem.patientGhanaCard || 'GHA-000000000-0',
            age: 35,
            gender: 'M'
          },
          {
            prescriberName: queueItem.prescriptionDetails?.prescriberName || 'Dr. K. E. Quaye',
            prescriberMdcNumber: queueItem.controlledDrugDoctorMdc || 'MDPC/P/2024/8492',
            prescriberHospital: 'Korle-Bu Teaching Hospital',
            prescriptionDate: new Date().toISOString().split('T')[0],
            diagnosisIcd10: 'M54.5 (Acute Pain) / Infection'
          },
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

    // 3. Update Private Insurer balance
    if (totalInsurerPays > 0 && queueItem.insuranceProviderName) {
      const updatedInsurers = insurers.map(ins => {
        if (ins.name.toLowerCase() === (queueItem.insuranceProviderName || '').toLowerCase()) {
          return {
            ...ins,
            outstandingBalance: parseFloat((ins.outstandingBalance + totalInsurerPays).toFixed(2)),
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
      lane: queueItem.targetLane || 'retail',
      items: queueItem.items.map(i => ({
        drug: i.drug,
        selectedBatch: i.selectedBatch,
        quantity: i.quantity,
        unitPrice: i.unitPriceGhs,
        totalPrice: i.totalPriceGhs,
        isNhisTariff: queueItem.schemeType === 'NHIS'
      })),
      patient: {
        id: `PAT-${queueItem.queueNumber}`,
        fullName: queueItem.patientName,
        phone: queueItem.patientPhone,
        nationalId: queueItem.patientGhanaCard || 'GHA-000000000-0',
        age: 32,
        gender: 'M'
      },
      grossAmount: totalGross,
      discountAmount: 0,
      netAmount: totalPatientLiability,
      splitBilling: {
        nhisAmount: queueItem.schemeType === 'NHIS' ? totalInsurerPays : 0,
        privateInsuranceAmount: queueItem.schemeType === 'PRIVATE_INSURANCE' ? totalInsurerPays : 0,
        privateInsurerName: queueItem.insuranceProviderName,
        momoAmount: paymentRecord.method === 'momo' ? totalPatientLiability : 0,
        momoProvider: paymentRecord.momoProvider,
        momoPhoneNumber: paymentRecord.momoPhone,
        momoTransactionId: paymentRecord.momoTxnId,
        cashAmount: paymentRecord.method === 'cash' ? totalPatientLiability : 0,
        ghqrAmount: paymentRecord.method === 'ghqr' ? totalPatientLiability : 0,
        patientCopayTotal: totalPatientLiability,
        totalPaid: totalPatientLiability + totalInsurerPays
      },
      graEvat: paymentRecord.graResponse,
      taxBreakdown: {
        taxableAmount: totalPatientLiability,
        nhilAmount: Math.round(totalPatientLiability * 0.025 * 100) / 100,
        getfundAmount: Math.round(totalPatientLiability * 0.025 * 100) / 100,
        covidAmount: Math.round(totalPatientLiability * 0.01 * 100) / 100,
        standardVatAmount: Math.round(totalPatientLiability * 0.15 * 100) / 100,
        totalTax: Math.round(totalPatientLiability * 0.21 * 100) / 100,
        grandTotal: totalPatientLiability,
        leviesIncluded: true
      },
      hasControlledDrugs: queueItem.containsClassA,
      ddrEntryId: ddrId,
      cashierName: 'Emmanuel Tetteh (POS Cashier)',
      isSyncedToCloud: paymentRecord.graResponse.status === 'SUCCESS',
      tamperProofHash: computeRecordHash({ txId, totalGross, totalPatientLiability })
    };

    setTransactions([newTx, ...transactions]);

    // 5. Update Queue Status to PAID
    const updatedQueue = queue.map(q => {
      if (q.id === queueItem.id) {
        return { ...q, status: 'PAID' as const };
      }
      return q;
    });
    setQueue(updatedQueue);

    logAuditEvent(
      `Queue #${queueItem.queueNumber} (${queueItem.patientName}) Settled via ${paymentRecord.method.toUpperCase()} - GRA: ${paymentRecord.graResponse.graInvoiceNumber}`,
      'GRA_EVAT',
      {
        userName: 'Emmanuel Tetteh',
        role: 'POS Cashier',
        entityId: queueItem.id,
        newValue: `GHS ${totalPatientLiability.toFixed(2)}`
      }
    );
    setAuditLogs(getStoredAuditLogs());
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
    setQueue(getStoredBasketQueue());
    setPurchaseOrders(getStoredPurchaseOrders());
    setPayrollRecords(getStoredPayroll());
    alert('System reset to clean Ghanaian pharmacy initial baseline state.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation & Status Badges */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUserRole={currentUserRole}
        onRoleChange={(newRole) => {
          setCurrentUserRole(newRole);
          if (newRole === 'Clerk') {
            if (activeTab === 'audit' || activeTab === 'owner' || activeTab === 'pharmacist') {
              setActiveTab('clerk');
            }
          } else if (newRole === 'Pharmacist') {
            setActiveTab('pharmacist');
          } else if (newRole === 'Cashier') {
            setActiveTab('cashier');
          } else if (newRole === 'Owner') {
            setActiveTab('owner');
          }
        }}
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
        onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenMusicModal={() => setIsMusicModalOpen(true)}
        pendingOfflineCount={pendingOfflineCount}
        pendingPharmacistCount={pendingPharmacistCount}
        pendingCashierCount={pendingCashierCount}
        pendingPoCount={pendingPoCount}
        onLogout={handleLogout}
      />

      {/* Logout Notification Toast Banner */}
      {logoutNotification && (
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 pt-3">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-300 shadow-xl animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{logoutNotification}</span>
            </div>
            <button
              onClick={() => setLogoutNotification(null)}
              className="text-emerald-400 hover:text-emerald-200 font-bold ml-2 underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6">
        {/* User 1: Counter Clerk Dashboard */}
        {activeTab === 'clerk' && (
          <CounterClerkDashboard
            drugs={drugs}
            patients={patients}
            queue={queue}
            currentUserRole={currentUserRole}
            onAddToQueue={(newBasket) => {
              const updated = [newBasket, ...queue];
              setQueue(updated);
              logAuditEvent(
                `Counter Clerk Queued Basket #${newBasket.queueNumber} (${newBasket.patientName}) -> ${newBasket.status}`,
                'DISPENSING',
                { userName: 'Kwame Mensah', role: 'Counter Clerk', entityId: newBasket.id }
              );
              setAuditLogs(getStoredAuditLogs());
            }}
            config={config}
            onLogout={handleLogout}
          />
        )}

        {/* User 2: Superintendent Pharmacist Clinical Workspace */}
        {activeTab === 'pharmacist' && (
          <PharmacistWorkspace
            queue={queue}
            currentUserRole={currentUserRole}
            onUpdateQueueItem={(updatedItem) => {
              const list = queue.map(q => (q.id === updatedItem.id ? updatedItem : q));
              setQueue(list);
              setAuditLogs(getStoredAuditLogs());
            }}
            config={config}
            insurers={insurers}
            isSuperintendentUnlocked={isSuperintendentUnlocked}
            onOpenSuperintendentPin={() => {
              handleRequireSuperintendentPin(() => {
                setIsSuperintendentUnlocked(true);
              });
            }}
            onAuditLogUpdate={() => setAuditLogs(getStoredAuditLogs())}
            onLogout={handleLogout}
          />
        )}

        {/* User 3: POS Cashier Terminal */}
        {activeTab === 'cashier' && (
          <PosCashierTerminal
            queue={queue}
            currentUserRole={currentUserRole}
            onCompletePayment={handleCashierCompletePayment}
            config={config}
            onViewReceipt={(txn) => {
              setActiveReceiptTransaction(txn);
              setIsReceiptModalOpen(true);
            }}
            onAuditLogUpdate={() => setAuditLogs(getStoredAuditLogs())}
            onLogout={handleLogout}
          />
        )}

        {/* User 4: Executive MD & Owner Hub */}
        {activeTab === 'owner' && (
          <OwnerExecutiveHub
            purchaseOrders={purchaseOrders}
            currentUserRole={currentUserRole}
            onUpdatePurchaseOrders={(updated) => {
              setPurchaseOrders(updated);
              setAuditLogs(getStoredAuditLogs());
            }}
            payrollRecords={payrollRecords}
            onUpdatePayrollRecords={(updated) => {
              setPayrollRecords(updated);
              setAuditLogs(getStoredAuditLogs());
            }}
            transactions={transactions}
            auditLogs={auditLogs}
            insurers={insurers}
            config={config}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onAuditLogUpdate={() => setAuditLogs(getStoredAuditLogs())}
            onLogout={handleLogout}
          />
        )}

        {/* Core Module 1: Dual-Zone POS */}
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

        {/* Core Module 2: FEFO Inventory & Reorder Engine */}
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

        {/* Core Module 3: NHIS & Private Insurance Debtor Ledger + G-Form */}
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
            onAuditLogUpdate={() => setAuditLogs(getStoredAuditLogs())}
          />
        )}

        {/* Core Module 4: Controlled Substances (DDR) */}
        {activeTab === 'ddr' && (
          <DangerousDrugsRegister
            ddrEntries={ddrEntries}
            config={config}
          />
        )}

        {/* Core Module 5: GRA E-VAT & Audit Trail */}
        {activeTab === 'audit' && (
          <GraAuditLog
            transactions={transactions}
            auditLogs={auditLogs}
            config={config}
            onSyncOfflineQueue={handleSyncOfflineQueue}
            isSyncing={isSyncingQueue}
            onTransactionsUpdate={setTransactions}
            onAuditLogUpdate={() => setAuditLogs(getStoredAuditLogs())}
            onViewReceipt={(txn) => {
              setActiveReceiptTransaction(txn);
              setIsReceiptModalOpen(true);
            }}
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

      {/* PostgreSQL Data Architecture & DDL Schema Inspector */}
      <PostgreSqlSchemaViewer
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />

      {/* Firebase Authentication & Identity Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSelectRole={handleRoleChange}
      />

      {/* Lyria AI Focus Music Generator Modal */}
      <LyriaMusicModal
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
      />

      {/* Persistent Floating Ambient Focus Music Player */}
      <MusicPlayerBar
        onOpenGenerator={() => setIsMusicModalOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PharmacyAppInner />
    </AuthProvider>
  );
}

