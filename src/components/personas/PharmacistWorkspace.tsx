import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  FileCheck, 
  Send, 
  User, 
  Phone, 
  Building2, 
  Lock, 
  FileText, 
  Clock, 
  Layers, 
  Pill, 
  DollarSign,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { 
  CounterBasketQueueItem, 
  PharmacyConfig, 
  PrivateInsurer,
  AuditLog,
  UserRole
} from '../../types/pharmacy';
import { isClassAControlledDrug, createDdrEntry } from '../../services/ddrService';
import { logAuditEvent } from '../../services/storageService';
import { useRoleGuard } from '../../hooks/useRoleGuard';

interface PharmacistWorkspaceProps {
  queue: CounterBasketQueueItem[];
  onUpdateQueueItem: (updated: CounterBasketQueueItem) => void;
  config: PharmacyConfig;
  insurers: PrivateInsurer[];
  isSuperintendentUnlocked: boolean;
  onOpenSuperintendentPin: () => void;
  onAuditLogUpdate?: () => void;
  currentUserRole?: UserRole | string;
  onLogout?: () => void;
}

export const PharmacistWorkspace: React.FC<PharmacistWorkspaceProps> = ({
  queue,
  onUpdateQueueItem,
  config,
  insurers,
  isSuperintendentUnlocked,
  onOpenSuperintendentPin,
  onAuditLogUpdate,
  currentUserRole = 'Pharmacist',
  onLogout
}) => {
  const roleGuard = useRoleGuard(currentUserRole);
  const superintendentName = config.superintendentPharmacist?.fullName || 'Pharm. Dr. Araba Mensah, PharmD';
  const gphcPin = config.superintendentPharmacist?.gphcPin || 'PC-GH-03912';

  // Filter queues that need clinical review or are currently on hold
  const pendingQueues = queue.filter(
    (q) => q.status === 'PENDING_CLINICAL_CLEARANCE' || q.status === 'PENDING_PHARMACIST' || q.status === 'DRAFT' || q.status === 'HOLD'
  );

  // Selected queue
  const [selectedQueueId, setSelectedQueueId] = useState<string>(
    pendingQueues[0]?.id || queue[0]?.id || ''
  );

  const activeQueueItem = queue.find((q) => q.id === selectedQueueId) || pendingQueues[0] || null;

  // Controlled Substance Verification Inputs
  const [doctorMdcNumber, setDoctorMdcNumber] = useState<string>(
    activeQueueItem?.prescriptionDetails?.prescriberMdcNumber || 'MDPC/P/2024/8492'
  );
  const [prescriberName, setPrescriberName] = useState<string>(
    activeQueueItem?.prescriptionDetails?.prescriberName || 'Dr. K. E. Quaye, FWACS'
  );
  const [patientGhanaCard, setPatientGhanaCard] = useState<string>(
    activeQueueItem?.patientGhanaCard || 'GHA-729104820-4'
  );

  // Item approval overrides inside billing matrix
  const [itemApprovals, setItemApprovals] = useState<Record<string, 'APPROVED' | 'OVERRIDE_APPROVED' | 'DENIED_CASH'>>({});
  const [rejectReasonModalOpen, setRejectReasonModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const containsClassA = activeQueueItem?.containsClassA || activeQueueItem?.items.some(i => i.drug.classification === 'ClassA_Controlled');

  // Hard Block Verification check
  const isDoctorMdcValid = doctorMdcNumber.trim().length >= 5;
  const isPatientIdValid = patientGhanaCard.trim().length >= 4;
  const isControlledDrugBlocked = containsClassA && (!isDoctorMdcValid || !isPatientIdValid);

  // Helper to calculate insurer vs patient copay for each item
  const calculateBillingMatrix = () => {
    if (!activeQueueItem) return { items: [], totalBase: 0, totalInsurer: 0, totalCopay: 0 };

    let totalBase = 0;
    let totalInsurer = 0;
    let totalCopay = 0;

    const items = activeQueueItem.items.map((item) => {
      const basePrice = item.totalPriceGhs;
      totalBase += basePrice;

      const overrideState = itemApprovals[item.id] || 'APPROVED';

      let insurerPays = 0;
      let patientCopay = basePrice;

      if (activeQueueItem.schemeType === 'PRIVATE_INSURANCE') {
        const matchedInsurer = insurers.find(
          (ins) => ins.name.toLowerCase() === (activeQueueItem.insuranceProviderName || '').toLowerCase()
        );
        const defaultCopayPct = matchedInsurer ? matchedInsurer.defaultCopayPercentage : 20;
        
        // If controlled drug or denial override, insurer may pay 0 or custom
        if (overrideState === 'DENIED_CASH') {
          insurerPays = 0;
          patientCopay = basePrice;
        } else {
          insurerPays = Math.round(basePrice * ((100 - defaultCopayPct) / 100) * 100) / 100;
          patientCopay = Math.round((basePrice - insurerPays) * 100) / 100;
        }
      } else if (activeQueueItem.schemeType === 'NHIS') {
        if (item.drug.nhisCovered) {
          const tariffTotal = item.drug.nhisTariffPrice * item.quantity;
          insurerPays = tariffTotal;
          patientCopay = Math.max(0, Math.round((basePrice - tariffTotal) * 100) / 100);
        } else {
          insurerPays = 0;
          patientCopay = basePrice;
        }
      } else {
        // Cash
        insurerPays = 0;
        patientCopay = basePrice;
      }

      totalInsurer += insurerPays;
      totalCopay += patientCopay;

      return {
        drugId: item.drug.id,
        drugName: item.drug.brandName,
        basePrice,
        insurerPays,
        patientCopay,
        status: overrideState
      };
    });

    return {
      items,
      totalBase: Math.round(totalBase * 100) / 100,
      totalInsurer: Math.round(totalInsurer * 100) / 100,
      totalCopay: Math.round(totalCopay * 100) / 100
    };
  };

  const matrix = calculateBillingMatrix();

  const handleApproveToCashier = () => {
    if (!activeQueueItem) return;

    roleGuard.verifyAction('APPROVE_CLINICAL', () => {
      // Hard block check
      if (containsClassA && (!isDoctorMdcValid || !isPatientIdValid)) {
        alert('Regulatory Block: Prescribing Doctor MDC Number and Patient ID are required before approving Class A Controlled Substances.');
        return;
      }

      const updatedItem: CounterBasketQueueItem = {
        ...activeQueueItem,
        status: 'PENDING_PAYMENT',
        patientGhanaCard,
        controlledDrugDoctorMdc: containsClassA ? doctorMdcNumber : undefined,
        controlledDrugPatientId: containsClassA ? patientGhanaCard : undefined,
        prescriptionDetails: containsClassA ? {
          prescriberName: prescriberName || 'Licensed Medical Officer',
          prescriberMdcNumber: doctorMdcNumber,
          prescriberHospital: 'Registered Health Facility',
          prescriptionDate: new Date().toISOString().split('T')[0]
        } : activeQueueItem.prescriptionDetails,
        pharmacistReview: {
          reviewedBy: superintendentName,
          reviewedAt: new Date().toISOString(),
          gphcPin,
          clinicalApproved: true,
          doctorMdcNumber: containsClassA ? doctorMdcNumber : undefined,
          itemBillingMatrix: matrix.items,
          totalBasePrice: matrix.totalBase,
          totalInsurerPays: matrix.totalInsurer,
          totalPatientCopay: matrix.totalCopay
        }
      };

      onUpdateQueueItem(updatedItem);

      // Audit log entry
      logAuditEvent(
        `Pharmacist Approved Queue #${activeQueueItem.queueNumber} (${activeQueueItem.patientName}) to Cashier Gate`,
        'DISPENSING',
        {
          userName: superintendentName,
          role: 'Superintendent Pharmacist',
          entityId: activeQueueItem.id,
          newValue: `Base GHS ${matrix.totalBase}, Copay GHS ${matrix.totalCopay}`
        }
      );
      if (onAuditLogUpdate) onAuditLogUpdate();
    });
  };

  const handleRejectOrHold = () => {
    if (!activeQueueItem) return;

    roleGuard.verifyAction('HOLD_REJECT_ORDER', () => {
      const updatedItem: CounterBasketQueueItem = {
        ...activeQueueItem,
        status: 'HOLD',
        rejectionReason: rejectionReason.trim() || 'Clinical Review Hold / Prescription Verification Required'
      };
      onUpdateQueueItem(updatedItem);
      setRejectReasonModalOpen(false);
      setRejectionReason('');

      logAuditEvent(
        `Pharmacist Held Queue #${activeQueueItem.queueNumber} (${activeQueueItem.patientName}): ${updatedItem.rejectionReason}`,
        'DISPENSING',
        {
          userName: superintendentName,
          role: 'Superintendent Pharmacist',
          entityId: activeQueueItem.id
        }
      );
      if (onAuditLogUpdate) onAuditLogUpdate();
    });
  };

  return (
    <div className="space-y-4">
      {/* Workspace Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Pharmacist Clinical Workspace</h2>
              <span className="bg-purple-950 text-purple-300 border border-purple-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Clinical Authority Tier
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Superintendent: <strong className="text-slate-200">{superintendentName}</strong> • GPhC PIN:{' '}
              <span className="font-mono text-purple-300">{gphcPin}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!roleGuard.hasPermission('APPROVE_CLINICAL') && (
            <span className="bg-red-950/80 text-red-300 border border-red-800/80 text-[11px] font-bold px-2.5 py-1 rounded-xl">
              ReadOnly ({roleGuard.currentUserRole})
            </span>
          )}
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Pending Review:</span>
            <span className="font-mono font-bold text-amber-400">{pendingQueues.length} Baskets</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-slate-800 hover:border-rose-700/80 rounded-xl text-xs font-bold transition-all shadow-sm group"
              title="Log out and exit clinical workspace"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              <span>Exit Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Incoming Dispensing Queue Bar (Real-Time Asynchronous Updates) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Incoming Dispensing Queue (From Counter Assistants)
          </h3>
          <span className="text-[10px] text-slate-400">Click a patient queue to load clinical dossier</span>
        </div>

        {queue.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800">
            No baskets currently queued from counter clerks.
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {queue.map((q) => {
              const isSelected = q.id === activeQueueItem?.id;
              const hasClassA = q.containsClassA || q.items.some(i => i.drug.classification === 'ClassA_Controlled');
              return (
                <button
                  key={q.id}
                  onClick={() => setSelectedQueueId(q.id)}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-left shrink-0 transition-all ${
                    isSelected
                      ? 'bg-purple-950 border-purple-500 text-slate-100 shadow-md ring-1 ring-purple-500/50'
                      : q.status === 'PENDING_PHARMACIST'
                      ? 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      : q.status === 'PENDING_CASHIER'
                      ? 'bg-slate-950/60 border-slate-800 text-emerald-400 opacity-75'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-100">Queue #{q.queueNumber}</span>
                    {hasClassA && (
                      <span className="bg-red-950 text-red-400 text-[9px] font-black px-1.5 py-0.2 rounded border border-red-800">
                        Class A
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                    {q.patientName}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    {q.status === 'PENDING_PHARMACIST' ? 'Needs Review' : q.status === 'PENDING_CASHIER' ? 'At Cashier' : q.status}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeQueueItem ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Patient Profile & Scheme Eligibility + Clinical Verification (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Patient Profile & Scheme Eligibility */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-400" />
                  Patient Profile & Scheme Eligibility
                </h3>
                <span className="text-[10px] font-mono font-bold text-sky-400">
                  Queue #{activeQueueItem.queueNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Patient Name</span>
                  <span className="font-bold text-slate-100 text-sm">{activeQueueItem.patientName}</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Phone Contact</span>
                  <span className="font-mono text-slate-200">{activeQueueItem.patientPhone}</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Scheme / Policy</span>
                  <span className="font-bold text-emerald-400">
                    {activeQueueItem.schemeType === 'PRIVATE_INSURANCE'
                      ? `${activeQueueItem.insuranceProviderName || 'Private Insurer'} (Tier-2)`
                      : activeQueueItem.schemeType === 'NHIS'
                      ? 'NHIS Standard Capitation'
                      : 'Out-of-Pocket Cash'}
                  </span>
                </div>
              </div>

              {activeQueueItem.clerkNotes && (
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <strong className="text-slate-400 block text-[10px] uppercase">Clerk Counter Notes:</strong>
                  <span>{activeQueueItem.clerkNotes}</span>
                </div>
              )}
            </div>

            {/* Clinical & Regulatory Verification Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-purple-400" />
                  Clinical & Regulatory Verification Panel
                </h3>
                <span className="text-[10px] text-purple-300 font-mono">GPhC Compliance</span>
              </div>

              {/* Hard Block on Controlled Substances Alert */}
              {containsClassA ? (
                <div className="bg-red-950/40 border border-red-700/80 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>[!] ALERT: Contains Class A Controlled Substance: TRAMADOL / NARCOTIC</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Required Action: Input Prescribing Doctor's MDPC / MDC Registration Number and Patient Identification before basket can be approved.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Doctor MDPC / MDC Reg No. <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={doctorMdcNumber}
                        onChange={(e) => setDoctorMdcNumber(e.target.value)}
                        placeholder="e.g. MDPC / P / 2024 / XXXX"
                        className="w-full bg-slate-950 border border-red-700/60 rounded-xl p-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Patient Ghana Card / ID <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={patientGhanaCard}
                        onChange={(e) => setPatientGhanaCard(e.target.value)}
                        placeholder="e.g. GHA-729104820-4"
                        className="w-full bg-slate-950 border border-red-700/60 rounded-xl p-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-800/50 p-2.5 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Standard POM / OTC Formulation. No Class A controlled drug restrictions triggered.</span>
                </div>
              )}

              {/* Prescriber & Diagnosis Details */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Prescribing Clinician:</span>
                  <span className="text-slate-200 font-semibold">{prescriberName}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Hospital / Facility:</span>
                  <span className="text-slate-300">
                    {activeQueueItem.prescriptionDetails?.prescriberHospital || '37 Military Hospital, Accra'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Diagnosis (ICD-10):</span>
                  <span className="text-amber-400 font-mono">
                    {activeQueueItem.prescriptionDetails?.diagnosisIcd10 || 'M54.5 (Acute Lumbar Pain) + RTI'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Billing Matrix & Sign & Approve Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Billing Matrix & Split Ledger
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Live Matrix</span>
              </div>

              {/* Itemized Matrix Table */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {matrix.items.map((item, idx) => (
                  <div
                    key={item.drugId + idx}
                    className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-100">{item.drugName}</span>
                      <span className="font-mono text-slate-300">GHS {item.basePrice.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>Insurer Pays:</span>
                      <span className="font-mono text-sky-400 font-semibold">
                        GHS {item.insurerPays.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>Patient Copay:</span>
                      <span className="font-mono text-amber-400 font-bold">
                        GHS {item.patientCopay.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] text-slate-500 uppercase">Coverage Status:</span>
                      <select
                        value={itemApprovals[item.drugId] || 'APPROVED'}
                        onChange={(e) =>
                          setItemApprovals({
                            ...itemApprovals,
                            [item.drugId]: e.target.value as 'APPROVED' | 'OVERRIDE_APPROVED' | 'DENIED_CASH'
                          })
                        }
                        className="bg-slate-900 border border-slate-700 rounded-lg text-[10px] p-1 text-slate-200"
                      >
                        <option value="APPROVED">[Approved Coverage]</option>
                        <option value="OVERRIDE_APPROVED">[Override Approved]</option>
                        <option value="DENIED_CASH">[Denial - Patient Cash]</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Billing Summary Totals */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Gross Basket Amount:</span>
                  <span className="font-mono font-bold text-slate-200">GHS {matrix.totalBase.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sky-400">
                  <span>Insurer Receivable:</span>
                  <span className="font-mono font-bold">GHS {matrix.totalInsurer.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-100 pt-1 border-t border-slate-800 text-sm">
                  <span className="font-bold">Patient Out-of-Pocket Liability:</span>
                  <span className="font-mono font-black text-amber-400">GHS {matrix.totalCopay.toFixed(2)}</span>
                </div>
              </div>

              {/* Hard Block Warning */}
              {isControlledDrugBlocked && (
                <div className="bg-red-950/60 border border-red-700/80 p-2.5 rounded-xl flex items-center gap-2 text-xs text-red-300">
                  <Lock className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Hard Block Active: Provide Doctor MDC Number & Patient ID to unlock approval gate.</span>
                </div>
              )}

              {/* Decision Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isControlledDrugBlocked}
                  onClick={handleApproveToCashier}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                    isControlledDrugBlocked
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                  title="Digital Sign and Forward basket to POS Cashier Gate"
                >
                  <Send className="w-4 h-4" />
                  <span>DIGITAL SIGN & APPROVE TO CASHIER</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRejectReasonModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-red-300 hover:text-red-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>REJECT / HOLD BASKET</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
          Select a queue item above to review prescriptions and verify insurance eligibility.
        </div>
      )}

      {/* Reject / Hold Reason Modal */}
      {rejectReasonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100">Hold / Reject Basket Reason</h3>
            <p className="text-xs text-slate-400">
              Provide clinical justification for holding Queue #{activeQueueItem?.queueNumber} (e.g. drug interaction, missing prescriber stamp, invalid insurance policy).
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Prescription expired / Contraindicated with patient allergy profile."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 text-xs focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRejectReasonModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectOrHold}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
