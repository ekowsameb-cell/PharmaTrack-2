import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  QrCode, 
  Printer, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Layers, 
  Receipt, 
  AlertCircle, 
  User, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  LogOut,
  MessageSquare,
  Send
} from 'lucide-react';
import { 
  CounterBasketQueueItem, 
  PharmacyConfig, 
  MomoProvider, 
  TransactionRecord,
  GraEvatResponse,
  UserRole
} from '../../types/pharmacy';
import { generateGraFiscalStamp, calculateGraEvatTax } from '../../services/graEvatService';
import { logAuditEvent } from '../../services/storageService';
import { useRoleGuard } from '../../hooks/useRoleGuard';

interface PosCashierTerminalProps {
  queue: CounterBasketQueueItem[];
  onCompletePayment: (
    queueItem: CounterBasketQueueItem, 
    paymentRecord: {
      method: 'cash' | 'momo' | 'ghqr';
      tendered?: number;
      change?: number;
      momoProvider?: MomoProvider;
      momoPhone?: string;
      momoTxnId?: string;
      graResponse: GraEvatResponse;
    }
  ) => void;
  config: PharmacyConfig;
  onViewReceipt: (txn: TransactionRecord) => void;
  onAuditLogUpdate?: () => void;
  currentUserRole?: UserRole | string;
  onLogout?: () => void;
}

export const PosCashierTerminal: React.FC<PosCashierTerminalProps> = ({
  queue,
  onCompletePayment,
  config,
  onViewReceipt,
  onAuditLogUpdate,
  currentUserRole = 'Cashier',
  onLogout
}) => {
  const roleGuard = useRoleGuard(currentUserRole);
  const cashierName = 'Emmanuel Tetteh (POS Cashier)';

  // Queues that are ready for cashier payment (Explicitly maps to PENDING_PAYMENT)
  const activeCashierQueues = queue.filter(
    (q) => q.status === 'PENDING_PAYMENT' || q.status === 'PENDING_CASHIER'
  );

  const [selectedQueueId, setSelectedQueueId] = useState<string>(
    activeCashierQueues[0]?.id || ''
  );

  const selectedQueue = queue.find((q) => q.id === selectedQueueId) || activeCashierQueues[0] || null;

  // Payment method selection: 'cash' | 'momo' | 'ghqr'
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'ghqr'>('momo');

  // Cash handling states
  const [amountTendered, setAmountTendered] = useState<number>(0);

  // MoMo handling states
  const [momoProvider, setMomoProvider] = useState<MomoProvider>('MTN');
  const [momoPhoneNumber, setMomoPhoneNumber] = useState<string>('0244123456');
  const [momoStatus, setMomoStatus] = useState<'IDLE' | 'TRIGGERING' | 'WAITING_WEBHOOK' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [momoCountdown, setMomoCountdown] = useState<number>(5);
  const [momoTxnId, setMomoTxnId] = useState<string>('');

  // Settlement completion state
  const [settledTransaction, setSettledTransaction] = useState<TransactionRecord | null>(null);

  // Sync phone number when queue changes
  useEffect(() => {
    if (selectedQueue) {
      setMomoPhoneNumber(selectedQueue.patientPhone || '0244123456');
      setMomoStatus('IDLE');
      setSettledTransaction(null);

      // Default amount tendered to patient liability
      const patientLiability = selectedQueue.pharmacistReview?.totalPatientCopay ?? 
        selectedQueue.items.reduce((sum, i) => sum + i.totalPriceGhs, 0);
      setAmountTendered(patientLiability);
    }
  }, [selectedQueue?.id]);

  // Compute bill figures
  const patientLiability = selectedQueue?.pharmacistReview?.totalPatientCopay ?? 
    selectedQueue?.items.reduce((sum, i) => sum + i.totalPriceGhs, 0) ?? 0;

  const insurerBalance = selectedQueue?.pharmacistReview?.totalInsurerPays ?? 0;
  const grossTotal = selectedQueue?.pharmacistReview?.totalBasePrice ?? patientLiability;

  const cashChange = Math.max(0, Math.round((amountTendered - patientLiability) * 100) / 100);
  const isCashSufficient = amountTendered >= patientLiability;

  // Handle Quick Cash Shortcut buttons (GHS 10, 20, 50, 100, 200)
  const handleAddCashDenomination = (denom: number) => {
    setAmountTendered((prev) => Math.round((prev + denom) * 100) / 100);
  };

  const handleSetExactCash = () => {
    setAmountTendered(patientLiability);
  };

  // MoMo STK Push Simulation loop
  const handleTriggerMomoStkPush = () => {
    if (!selectedQueue) return;

    roleGuard.verifyAction('EXECUTE_MOMO_STK', () => {
      setMomoStatus('TRIGGERING');

      setTimeout(() => {
        setMomoStatus('WAITING_WEBHOOK');
        setMomoCountdown(4);

        const interval = setInterval(() => {
          setMomoCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              const txnRef = `TXN-${momoProvider}-${Date.now().toString().slice(-6)}`;
              setMomoTxnId(txnRef);
              setMomoStatus('SUCCESS');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, 1200);
    });
  };

  // Handle Settlement & GRA Fiscal Stamp Trigger
  const handleFinalizeSettlement = () => {
    if (!selectedQueue) return;

    roleGuard.verifyAction('PROCESS_PAYMENT', () => {
      if (paymentMethod === 'cash' && !isCashSufficient) {
        alert('Tendered cash amount is less than the patient liability.');
        return;
      }

      if (paymentMethod === 'momo' && momoStatus !== 'SUCCESS') {
        alert('MoMo transaction is still pending network confirmation.');
        return;
      }

      const graResponse = generateGraFiscalStamp(patientLiability, config);
      const taxBreakdown = calculateGraEvatTax(patientLiability, config);

      // Create a mock completed transaction record for receipt preview
      const completedTxn: TransactionRecord = {
        id: `TXN-${Date.now()}`,
        sequenceNumber: Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        lane: selectedQueue.targetLane || 'retail',
        items: selectedQueue.items.map(i => ({
          drug: i.drug,
          selectedBatch: i.selectedBatch,
          quantity: i.quantity,
          unitPrice: i.unitPriceGhs,
          totalPrice: i.totalPriceGhs,
          isNhisTariff: selectedQueue.schemeType === 'NHIS'
        })),
        patient: {
          id: `PAT-${selectedQueue.queueNumber}`,
          fullName: selectedQueue.patientName,
          phone: selectedQueue.patientPhone,
          nationalId: selectedQueue.patientGhanaCard || 'GHA-000000000-0',
          age: 32,
          gender: 'M'
        },
        grossAmount: grossTotal,
        discountAmount: 0,
        netAmount: patientLiability,
        splitBilling: {
          nhisAmount: selectedQueue.schemeType === 'NHIS' ? insurerBalance : 0,
          privateInsuranceAmount: selectedQueue.schemeType === 'PRIVATE_INSURANCE' ? insurerBalance : 0,
          privateInsurerName: selectedQueue.insuranceProviderName,
          momoAmount: paymentMethod === 'momo' ? patientLiability : 0,
          momoProvider: paymentMethod === 'momo' ? momoProvider : undefined,
          momoPhoneNumber: paymentMethod === 'momo' ? momoPhoneNumber : undefined,
          momoTransactionId: paymentMethod === 'momo' ? momoTxnId : undefined,
          cashAmount: paymentMethod === 'cash' ? patientLiability : 0,
          ghqrAmount: paymentMethod === 'ghqr' ? patientLiability : 0,
          patientCopayTotal: patientLiability,
          totalPaid: patientLiability + insurerBalance
        },
        graEvat: graResponse,
        taxBreakdown,
        hasControlledDrugs: selectedQueue.containsClassA,
        cashierName,
        isSyncedToCloud: graResponse.status === 'SUCCESS',
        tamperProofHash: `0x${Date.now().toString(16).toUpperCase()}FF`
      };

      onCompletePayment(selectedQueue, {
        method: paymentMethod,
        tendered: paymentMethod === 'cash' ? amountTendered : patientLiability,
        change: paymentMethod === 'cash' ? cashChange : 0,
        momoProvider: paymentMethod === 'momo' ? momoProvider : undefined,
        momoPhone: paymentMethod === 'momo' ? momoPhoneNumber : undefined,
        momoTxnId: paymentMethod === 'momo' ? momoTxnId : undefined,
        graResponse
      });

      setSettledTransaction(completedTxn);

      logAuditEvent(
        `POS Payment Settled for Queue #${selectedQueue.queueNumber} (${selectedQueue.patientName}) via ${paymentMethod.toUpperCase()}`,
        'GRA_EVAT',
        {
          userName: cashierName,
          role: 'POS Cashier',
          entityId: selectedQueue.id,
          newValue: `Paid GHS ${patientLiability.toFixed(2)} | GRA: ${graResponse.graInvoiceNumber}`
        }
      );
      if (onAuditLogUpdate) onAuditLogUpdate();
    });
  };

  const isPrintReceiptDisabled = 
    (paymentMethod === 'momo' && momoStatus !== 'SUCCESS') ||
    (paymentMethod === 'cash' && !isCashSufficient);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">POS Payment Gate Terminal</h2>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Exit Cash Drawer
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cashier: <strong className="text-slate-200">{cashierName}</strong> • Fiscal Gate: GRA E-VAT Connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2 text-xs">
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Active Approved Queues:</span>
            <span className="font-mono font-bold text-emerald-400">{activeCashierQueues.length} Baskets</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-slate-800 hover:border-rose-700/80 rounded-xl text-xs font-bold transition-all shadow-sm group"
              title="Log out and exit POS cashier terminal"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              <span>Exit Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Select Processed Basket (Queue Selector Tabs) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Select Processed Basket for Payment Settlement
          </h3>
          <span className="text-[10px] text-slate-400">Validated baskets ready for payment gate</span>
        </div>

        {activeCashierQueues.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800">
            No baskets currently pending payment. Baskets approved by the Pharmacist or OTC Clerk will appear here automatically.
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {activeCashierQueues.map((q) => {
              const isSelected = q.id === selectedQueue?.id;
              const copay = q.pharmacistReview?.totalPatientCopay ?? q.items.reduce((s, i) => s + i.totalPriceGhs, 0);
              return (
                <button
                  key={q.id}
                  onClick={() => setSelectedQueueId(q.id)}
                  className={`px-4 py-3 rounded-2xl border text-xs font-semibold text-left shrink-0 transition-all ${
                    isSelected
                      ? 'bg-emerald-950 border-emerald-500 text-slate-100 shadow-md ring-2 ring-emerald-500/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono font-black text-slate-100 text-sm">
                      Queue #{q.queueNumber}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      GHS {copay.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 truncate max-w-[160px]">
                    {q.patientName}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {q.schemeType === 'PRIVATE_INSURANCE'
                      ? q.insuranceProviderName || 'Private Ins.'
                      : q.schemeType === 'NHIS'
                      ? 'NHIS Scheme'
                      : 'Cash Customer'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedQueue ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Bill Summary & Item Breakdown (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  Bill Summary for Queue #{selectedQueue.queueNumber}
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedQueue.queueToken}
                </span>
              </div>

              {/* Patient Info */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer Name:</span>
                  <span className="font-bold text-slate-100">{selectedQueue.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone Number:</span>
                  <span className="font-mono text-slate-200">{selectedQueue.patientPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Scheme / Policy:</span>
                  <span className="text-emerald-400 font-medium">
                    {selectedQueue.schemeType === 'PRIVATE_INSURANCE'
                      ? selectedQueue.insuranceProviderName
                      : selectedQueue.schemeType === 'NHIS'
                      ? 'National Health Insurance (NHIA)'
                      : 'Out-of-Pocket Cash'}
                  </span>
                </div>
              </div>

              {/* Items In Basket */}
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {selectedQueue.items.map((item, idx) => (
                  <div
                    key={item.id + idx}
                    className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="text-slate-200 font-medium">{item.drug.brandName}</span>
                      <span className="text-[10px] text-slate-400 block">
                        Qty: {item.quantity} ({item.saleUnit})
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-100">
                      GHS {item.totalPriceGhs.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Balances Card */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Gross Medicines Value:</span>
                  <span className="font-mono font-semibold text-slate-200">GHS {grossTotal.toFixed(2)}</span>
                </div>

                {insurerBalance > 0 && (
                  <div className="flex justify-between items-center text-sky-400 pb-1.5 border-b border-slate-800">
                    <span>Insurer Account Balance (Receivable):</span>
                    <span className="font-mono font-bold">GHS {insurerBalance.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold text-slate-100">Total Patient Liability:</span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    GHS {patientLiability.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Choose Patient Payment Method & GRA E-VAT Fiscal Stamp (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Choose Patient Payment Method
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Terminal Station #1</span>
              </div>

              {/* Payment Method Switcher Tabs */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>(1) CASH</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    paymentMethod === 'momo'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>(2) MOBILE MONEY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('ghqr')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    paymentMethod === 'ghqr'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>(3) GhQR / CARD</span>
                </button>
              </div>

              {/* (1) CASH PAYMENT PANEL */}
              {paymentMethod === 'cash' && (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Cash-Counting Denomination Shortcuts:</span>
                    <button
                      type="button"
                      onClick={handleSetExactCash}
                      className="text-[11px] font-bold text-emerald-400 hover:underline"
                    >
                      Set Exact (GHS {patientLiability.toFixed(2)})
                    </button>
                  </div>

                  {/* Denomination Buttons */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[10, 20, 50, 100, 200].map((denom) => (
                      <button
                        key={denom}
                        type="button"
                        onClick={() => handleAddCashDenomination(denom)}
                        className="py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-200 transition-colors"
                      >
                        +GHS {denom}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Amount Tendered (GHS)</label>
                      <input
                        type="number"
                        step="0.50"
                        value={amountTendered || ''}
                        onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono font-bold text-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Change Due to Patient</label>
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 font-mono font-black text-lg text-emerald-400 flex items-center justify-between">
                        <span>GHS {cashChange.toFixed(2)}</span>
                        {isCashSufficient ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* (2) MOBILE MONEY (MoMo) PAYMENT PANEL */}
              {paymentMethod === 'momo' && (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Wallet Network</label>
                      <select
                        value={momoProvider}
                        onChange={(e) => setMomoProvider(e.target.value as MomoProvider)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="MTN">MTN MoMo (024/054/055/059)</option>
                        <option value="Telecel">Telecel Cash (020/050)</option>
                        <option value="AT">AT Money (027/057/026)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Customer MoMo Phone</label>
                      <input
                        type="text"
                        value={momoPhoneNumber}
                        onChange={(e) => setMomoPhoneNumber(e.target.value)}
                        placeholder="0244123456"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* STK Push Trigger & Status */}
                  <div className="pt-2">
                    {momoStatus === 'IDLE' && (
                      <button
                        type="button"
                        onClick={handleTriggerMomoStkPush}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>TRIGGER STK PUSH PROMPT (GHS {patientLiability.toFixed(2)})</span>
                      </button>
                    )}

                    {momoStatus === 'TRIGGERING' && (
                      <div className="p-3 bg-amber-950/60 border border-amber-800 rounded-xl flex items-center justify-center gap-2 text-xs text-amber-300">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Initiating USSD prompt to customer handset ({momoPhoneNumber})...</span>
                      </div>
                    )}

                    {momoStatus === 'WAITING_WEBHOOK' && (
                      <div className="p-3.5 bg-slate-900 border border-amber-600 rounded-xl space-y-2 text-center text-xs">
                        <div className="flex items-center justify-center gap-2 text-amber-300 font-bold">
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>WAITING FOR WEBHOOK CONFIRMATION FROM TELECOM NETWORK...</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Customer prompted to enter MoMo PIN on their phone. Auto-verifying in {momoCountdown}s...
                        </p>
                      </div>
                    )}

                    {momoStatus === 'SUCCESS' && (
                      <div className="p-3 bg-emerald-950 border border-emerald-700 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <strong className="block text-emerald-200">WEBHOOK SUCCESS: Transaction Approved!</strong>
                            <span className="font-mono text-[10px] text-emerald-400">Ref: {momoTxnId}</span>
                          </div>
                        </div>
                        <span className="font-mono font-black text-emerald-300">PAID</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* (3) GhQR / DEBIT CARD PANEL */}
              {paymentMethod === 'ghqr' && (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-100">National GhQR / POS Terminal</h4>
                      <p className="text-[11px] text-slate-400">Supports GIP Universal QR, Stanbic, GCB, Ecobank, Visa/Mastercard</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm">GHS {patientLiability.toFixed(2)}</span>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                    <div className="w-14 h-14 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                      <QrCode className="w-12 h-12 text-slate-950" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-[11px] text-slate-300 block">Terminal ID: GHIPSS-ACC-042</span>
                      <span className="text-[10px] text-emerald-400 font-bold block">● READY FOR CUSTOMER SCAN</span>
                    </div>
                  </div>
                </div>
              )}

              {/* GRA E-VAT FISCAL GATEWAY STATUS */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-slate-300 font-bold">GRA E-VAT FISCAL GATEWAY: </span>
                    <span className="text-emerald-400 font-semibold">[ ONLINE - READY TO STAMP ]</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500">TIN: {config.graTin}</span>
              </div>

              {/* Final Settlement & Print Receipt Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isPrintReceiptDisabled}
                  onClick={handleFinalizeSettlement}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                    isPrintReceiptDisabled
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/40'
                  }`}
                  title={
                    isPrintReceiptDisabled 
                      ? 'Disabled: Awaiting payment confirmation / sufficient cash tendered' 
                      : 'Finalize payment, generate GRA E-VAT Stamp, and Print Receipt'
                  }
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isPrintReceiptDisabled
                      ? '[ DISABLED: PRINT RECEIPT (Activates automatically when payment confirmation returns) ]'
                      : 'COMPLETE TRANSACTION & PRINT GRA FISCAL RECEIPT'}
                  </span>
                </button>
              </div>

              {/* Completed Receipt Action if Settled */}
              {settledTransaction && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-fadeIn shadow-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Transaction completed! GRA Invoice: <strong>{settledTransaction.graEvat.graInvoiceNumber}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onViewReceipt(settledTransaction)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>View Receipt &amp; Share (WhatsApp/SMS)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
          Select a processed queue item above to complete payment settlement.
        </div>
      )}
    </div>
  );
};
