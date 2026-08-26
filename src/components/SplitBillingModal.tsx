import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  QrCode, 
  Banknote, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Send, 
  FileCheck,
  ReceiptText
} from 'lucide-react';
import { 
  CartItem, 
  PatientProfile, 
  PrescriptionDetails, 
  PrivateInsurer, 
  PharmacyConfig, 
  SplitBillingAllocation,
  MomoProvider,
  PosLaneType
} from '../types/pharmacy';
import { calculateGraEvat, transmitToGraEvat } from '../services/graEvatService';
import { initiateMomoStkPush, generateGhQrPayload } from '../services/momoService';
import { calculatePrivateInsuranceSplit } from '../services/nhisService';
import { isClassAControlledDrug } from '../services/ddrService';

interface SplitBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  patient: PatientProfile | null;
  prescription: PrescriptionDetails;
  currentLane: PosLaneType;
  privateInsurers: PrivateInsurer[];
  config: PharmacyConfig;
  isSuperintendentUnlocked: boolean;
  onRequireSuperintendentPin: (onSuccess: () => void) => void;
  onCompleteSale: (
    allocation: SplitBillingAllocation,
    graResponse: any,
    taxBreakdown: any
  ) => void;
  nextInvoiceSequence: number;
}

export const SplitBillingModal: React.FC<SplitBillingModalProps> = ({
  isOpen,
  onClose,
  cart,
  patient,
  prescription,
  currentLane,
  privateInsurers,
  config,
  isSuperintendentUnlocked,
  onRequireSuperintendentPin,
  onCompleteSale,
  nextInvoiceSequence
}) => {
  if (!isOpen) return null;

  const grossTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  // Separate Prescription items vs OTC items
  const rxItemsTotal = useMemo(() => {
    return cart.filter(i => i.drug.classification !== 'OTC').reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const otcItemsTotal = useMemo(() => {
    return cart.filter(i => i.drug.classification === 'OTC').reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const hasControlledDrugs = useMemo(() => {
    return cart.some(item => isClassAControlledDrug(item.drug.classification));
  }, [cart]);

  // Split States
  const [selectedInsurerId, setSelectedInsurerId] = useState<string>(
    patient?.privateInsuranceProvider ? privateInsurers.find(i => i.name.includes(patient.privateInsuranceProvider || ''))?.id || '' : ''
  );
  const [nhisCoverAmount, setNhisCoverAmount] = useState<number>(0);
  const [privateInsuranceAmount, setPrivateInsuranceAmount] = useState<number>(0);
  const [momoAmount, setMomoAmount] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [ghqrAmount, setGhqrAmount] = useState<number>(0);

  // MoMo STK Push States
  const [momoProvider, setMomoProvider] = useState<MomoProvider>('MTN');
  const [momoPhone, setMomoPhone] = useState(patient?.phone || '0244123456');
  const [isStkPushing, setIsStkPushing] = useState(false);
  const [stkStatusMessage, setStkStatusMessage] = useState('');
  const [momoTransactionRef, setMomoTransactionRef] = useState('');

  // GhQR State
  const [ghqrDataUrl, setGhqrDataUrl] = useState<string>('');
  const [ghqrReference, setGhqrReference] = useState(`GHQR-${Date.now().toString().slice(-6)}`);

  // Processing state
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Auto-calculate default split when modal opens
  useEffect(() => {
    if (patient?.nhisNumber && currentLane === 'clinical') {
      // If NHIS active in clinical lane, NHIS covers the Rx portion (or 80% of Rx), patient pays remaining copay + 100% OTC
      const nhisPortion = parseFloat((rxItemsTotal * 0.80).toFixed(2));
      const copayPortion = parseFloat((grossTotal - nhisPortion).toFixed(2));
      setNhisCoverAmount(nhisPortion);
      setPrivateInsuranceAmount(0);
      setCashAmount(copayPortion);
      setMomoAmount(0);
      setGhqrAmount(0);
    } else if (selectedInsurerId) {
      const ins = privateInsurers.find(i => i.id === selectedInsurerId);
      if (ins) {
        const { insurerPays, patientCopay } = calculatePrivateInsuranceSplit(rxItemsTotal, ins);
        const totalPatientDue = parseFloat((patientCopay + otcItemsTotal).toFixed(2));
        setPrivateInsuranceAmount(insurerPays);
        setNhisCoverAmount(0);
        setCashAmount(totalPatientDue);
        setMomoAmount(0);
        setGhqrAmount(0);
      }
    } else {
      // Standard Retail Cash / MoMo
      setNhisCoverAmount(0);
      setPrivateInsuranceAmount(0);
      setCashAmount(grossTotal);
      setMomoAmount(0);
      setGhqrAmount(0);
    }
  }, [grossTotal, rxItemsTotal, otcItemsTotal, patient, currentLane, selectedInsurerId, privateInsurers]);

  // Generate dynamic GhQR Code image
  useEffect(() => {
    const amountToQr = ghqrAmount > 0 ? ghqrAmount : grossTotal;
    const payload = generateGhQrPayload(
      config.ghqrTerminalId,
      config.pharmacyName,
      amountToQr,
      ghqrReference
    );
    QRCode.toDataURL(payload, { width: 160, margin: 1 })
      .then(url => setGhqrDataUrl(url))
      .catch(err => console.error('GhQR generation error', err));
  }, [ghqrAmount, grossTotal, config, ghqrReference]);

  // Total allocated vs Gross
  const totalAllocated = useMemo(() => {
    return parseFloat(
      (nhisCoverAmount + privateInsuranceAmount + momoAmount + cashAmount + ghqrAmount).toFixed(2)
    );
  }, [nhisCoverAmount, privateInsuranceAmount, momoAmount, cashAmount, ghqrAmount]);

  const balanceRemaining = useMemo(() => {
    return parseFloat((grossTotal - totalAllocated).toFixed(2));
  }, [grossTotal, totalAllocated]);

  // STK Push Trigger
  const handleInitiateStkPush = async () => {
    if (!momoPhone || momoAmount <= 0) {
      alert('Please enter a valid phone number and MoMo amount greater than 0.');
      return;
    }

    setIsStkPushing(true);
    setStkStatusMessage(`Connecting to ${momoProvider} MoMo Gateway...`);

    try {
      const res = await initiateMomoStkPush(
        {
          provider: momoProvider,
          phoneNumber: momoPhone,
          amount: momoAmount,
          referenceNote: `Pharmacy Rx Inv #${nextInvoiceSequence}`
        },
        (msg) => setStkStatusMessage(msg)
      );

      if (res.success) {
        setMomoTransactionRef(res.transactionId);
        setStkStatusMessage(`Payment Confirmed (${res.transactionId})`);
      }
    } catch (e) {
      setStkStatusMessage('MoMo Push failed. Please retry or take cash.');
    } finally {
      setIsStkPushing(false);
    }
  };

  // Complete and Submit Transaction
  const handleFinalizeCheckout = async () => {
    if (Math.abs(balanceRemaining) > 0.01) {
      alert(`Split balance must equal Gross Total. Remaining balance is GHS ${balanceRemaining.toFixed(2)}`);
      return;
    }

    // If Class A Controlled drug is present and Superintendent is not unlocked, require PIN
    if (hasControlledDrugs && !isSuperintendentUnlocked) {
      onRequireSuperintendentPin(() => {
        executeCheckout();
      });
      return;
    }

    executeCheckout();
  };

  const executeCheckout = async () => {
    setIsProcessingSale(true);

    try {
      const taxBreakdown = calculateGraEvat(cart, config);
      const graResponse = await transmitToGraEvat(
        nextInvoiceSequence,
        cart,
        taxBreakdown,
        config,
        config.isOnlineMode
      );

      const allocation: SplitBillingAllocation = {
        nhisAmount: nhisCoverAmount,
        privateInsuranceAmount: privateInsuranceAmount,
        privateInsurerName: selectedInsurerId ? privateInsurers.find(i => i.id === selectedInsurerId)?.name : undefined,
        momoAmount: momoAmount,
        momoProvider: momoAmount > 0 ? momoProvider : undefined,
        momoPhoneNumber: momoAmount > 0 ? momoPhone : undefined,
        momoTransactionId: momoTransactionRef || (momoAmount > 0 ? `MOMO-${Date.now().toString().slice(-6)}` : undefined),
        cashAmount: cashAmount,
        ghqrAmount: ghqrAmount,
        ghqrReference: ghqrAmount > 0 ? ghqrReference : undefined,
        patientCopayTotal: cashAmount + momoAmount + ghqrAmount,
        totalPaid: grossTotal
      };

      onCompleteSale(allocation, graResponse, taxBreakdown);
    } catch (e) {
      console.error('Checkout error', e);
      alert('An error occurred while communicating with GRA or saving transaction.');
    } finally {
      setIsProcessingSale(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 font-bold">
              ₵
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>Multi-Channel Split-Billing Checkout</span>
                <span className="text-xs font-normal text-slate-400">| GRA E-VAT Integrated</span>
              </h2>
              <p className="text-xs text-slate-400">
                Ghanaian Insurance, MoMo USSD Push & GhIPSS GhQR Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Bill Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block uppercase">Prescription (Rx) Total</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-200">
                GHS {rxItemsTotal.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block">Eligible for NHIS / Insurer Cover</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 font-semibold block uppercase">OTC / Front-Store Total</span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-200">
                GHS {otcItemsTotal.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block">100% Patient Out-of-Pocket</span>
            </div>

            <div className="sm:border-l sm:border-slate-800 sm:pl-4">
              <span className="text-[11px] text-emerald-400 font-bold block uppercase">Gross Bill Payable</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                GHS {grossTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* SPLIT ALLOCATION CHANNELS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* LEFT: Institutional Insurance Coverage (NHIS / Private) */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  1. Third-Party Insurer Coverage
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                  Direct Claims
                </span>
              </div>

              {/* NHIS Direct Tariff Cover */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">National Health Insurance (NHIS)</label>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    {patient?.nhisNumber || 'No NHIS Profile'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">GHS</span>
                  <input
                    type="number"
                    min="0"
                    max={grossTotal}
                    step="0.10"
                    value={nhisCoverAmount}
                    onChange={(e) => setNhisCoverAmount(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-bold font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => {
                      setNhisCoverAmount(parseFloat((rxItemsTotal * 0.8).toFixed(2)));
                      setPrivateInsuranceAmount(0);
                    }}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 rounded-lg"
                  >
                    80% Rx
                  </button>
                </div>
              </div>

              {/* Private Health Insurance Selector & Amount */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-200 block">Private Health Insurer (Tier-2)</label>
                <select
                  value={selectedInsurerId}
                  onChange={(e) => {
                    setSelectedInsurerId(e.target.value);
                    const ins = privateInsurers.find(i => i.id === e.target.value);
                    if (ins) {
                      const { insurerPays } = calculatePrivateInsuranceSplit(rxItemsTotal, ins);
                      setPrivateInsuranceAmount(insurerPays);
                      setNhisCoverAmount(0);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- None / Cash Patient --</option>
                  {privateInsurers.map(ins => (
                    <option key={ins.id} value={ins.id}>
                      {ins.name} ({100 - ins.defaultCopayPercentage}% cover)
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">GHS</span>
                  <input
                    type="number"
                    min="0"
                    max={grossTotal}
                    step="0.10"
                    value={privateInsuranceAmount}
                    onChange={(e) => setPrivateInsuranceAmount(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-bold font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => {
                      const ins = privateInsurers.find(i => i.id === selectedInsurerId);
                      if (ins) {
                        const { insurerPays } = calculatePrivateInsuranceSplit(rxItemsTotal, ins);
                        setPrivateInsuranceAmount(insurerPays);
                      }
                    }}
                    disabled={!selectedInsurerId}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 rounded-lg disabled:opacity-40"
                  >
                    Auto Copay
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Patient Copay & Digital Payment Channels */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  2. Patient Copay Channels
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Cash, MoMo STK, GhQR
                </span>
              </div>

              {/* Cash Copay Box */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">Patient Cash (Tendered)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-mono">GHS</span>
                  <input
                    type="number"
                    min="0"
                    step="0.10"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs font-bold font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* MoMo USSD / STK Push Box */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">Mobile Money (USSD Push)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-mono">GHS</span>
                    <input
                      type="number"
                      min="0"
                      step="0.10"
                      value={momoAmount}
                      onChange={(e) => setMomoAmount(parseFloat(e.target.value) || 0)}
                      className="w-28 bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs font-bold font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {momoAmount > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={momoProvider}
                        onChange={(e) => setMomoProvider(e.target.value as MomoProvider)}
                        className="bg-slate-950 border border-slate-700 text-xs rounded-lg p-1.5 text-slate-200"
                      >
                        <option value="MTN">MTN MoMo (Ericsson)</option>
                        <option value="Telecel">Telecel Cash</option>
                        <option value="AT">AT Money</option>
                      </select>

                      <input
                        type="text"
                        placeholder="024XXXXXXX"
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-xs rounded-lg p-1.5 font-mono text-slate-200"
                      />
                    </div>

                    <button
                      onClick={handleInitiateStkPush}
                      disabled={isStkPushing || !momoPhone}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow"
                    >
                      {isStkPushing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Awaiting Customer Approval...</span>
                        </>
                      ) : momoTransactionRef ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-950" />
                          <span>Approved: {momoTransactionRef}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Trigger USSD STK Prompt to Phone</span>
                        </>
                      )}
                    </button>

                    {stkStatusMessage && (
                      <p className="text-[10px] text-amber-300 font-mono text-center animate-pulse">
                        {stkStatusMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* GhIPSS GhQR & GhanaPay Box */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-slate-200">Unified GhQR / Ghana Pay</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-mono">GHS</span>
                  <input
                    type="number"
                    min="0"
                    step="0.10"
                    value={ghqrAmount}
                    onChange={(e) => setGhqrAmount(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs font-bold font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* GhQR Customer QR Code Render (if GhQR selected) */}
          {ghqrAmount > 0 && ghqrDataUrl && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-sky-800/60 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white p-2 rounded-xl shadow">
                  <img src={ghqrDataUrl} alt="GhIPSS GhQR Code" className="w-24 h-24" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-sky-400 uppercase">GhIPSS Dynamic QR Prompt</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Customer scans with Ghana Pay or any Bank app (GCB, Ecobank, Zenith, Stanbic, Fidelity).
                  </p>
                  <span className="text-[10px] font-mono text-slate-400">Terminal: {config.ghqrTerminalId}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">GhQR Payable</span>
                <span className="text-lg font-black font-mono text-sky-400">GHS {ghqrAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Allocation Reconcile Balance Bar */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-2 ${
            Math.abs(balanceRemaining) < 0.01
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : 'bg-red-950/40 border-red-800/80 text-red-300'
          }`}>
            <div className="flex items-center gap-2 text-xs">
              {Math.abs(balanceRemaining) < 0.01 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span>
                <strong>Total Allocated:</strong> GHS {totalAllocated.toFixed(2)} of GHS {grossTotal.toFixed(2)}
              </span>
            </div>

            <div className="text-right font-mono text-xs">
              {Math.abs(balanceRemaining) < 0.01 ? (
                <span className="text-emerald-400 font-bold">100% Balanced - Ready for GRA E-VAT</span>
              ) : (
                <span className="text-red-400 font-bold">
                  Difference: GHS {balanceRemaining > 0 ? `+${balanceRemaining.toFixed(2)} due` : `${balanceRemaining.toFixed(2)} excess`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer / Checkout Action */}
        <div className="p-5 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ReceiptText className="w-4 h-4 text-emerald-400" />
            <span>GRA Certified Invoice Number & QR Code will generate automatically on thermal print.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleFinalizeCheckout}
              disabled={isProcessingSale || Math.abs(balanceRemaining) > 0.01}
              className={`flex-1 sm:flex-initial px-6 py-3.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isProcessingSale || Math.abs(balanceRemaining) > 0.01
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/60'
              }`}
            >
              {isProcessingSale ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transmitting to GRA E-VAT...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Authorize & Issue Receipt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
