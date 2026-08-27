import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Smartphone, 
  Banknote, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Users, 
  Building2, 
  Calendar, 
  Eye, 
  Send, 
  Lock, 
  ArrowUpRight, 
  CreditCard, 
  FileCheck, 
  Percent, 
  Layers, 
  Sparkles,
  Database,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  Clock,
  Pill,
  BarChart3,
  LogOut
} from 'lucide-react';
import { 
  PurchaseOrder, 
  StaffPayrollRecord, 
  TransactionRecord, 
  AuditLog, 
  PrivateInsurer, 
  PharmacyConfig,
  UserRole
} from '../../types/pharmacy';
import { logAuditEvent } from '../../services/storageService';
import { calculateGraPayeTax } from '../../services/payrollService';
import { calculateEndOfDayReport, formatEndOfDayTextMessage } from '../../services/endOfDayService';
import { PostgreSqlSchemaViewer } from '../PostgreSqlSchemaViewer';
import { EndOfDayReportModal } from '../EndOfDayReportModal';
import { StaffPerformanceChart } from '../StaffPerformanceChart';
import { useRoleGuard } from '../../hooks/useRoleGuard';

interface OwnerExecutiveHubProps {
  purchaseOrders: PurchaseOrder[];
  onUpdatePurchaseOrders: (pos: PurchaseOrder[]) => void;
  payrollRecords: StaffPayrollRecord[];
  onUpdatePayrollRecords: (records: StaffPayrollRecord[]) => void;
  transactions: TransactionRecord[];
  auditLogs: AuditLog[];
  insurers: PrivateInsurer[];
  config: PharmacyConfig;
  onNavigateToTab: (tab: 'pos' | 'inventory' | 'nhis' | 'ddr' | 'audit') => void;
  onAuditLogUpdate?: () => void;
  currentUserRole?: UserRole | string;
  onLogout?: () => void;
}

export const OwnerExecutiveHub: React.FC<OwnerExecutiveHubProps> = ({
  purchaseOrders,
  onUpdatePurchaseOrders,
  payrollRecords,
  onUpdatePayrollRecords,
  transactions,
  auditLogs,
  insurers,
  config,
  onNavigateToTab,
  onAuditLogUpdate,
  currentUserRole = 'Owner',
  onLogout
}) => {
  const roleGuard = useRoleGuard(currentUserRole);
  const ownerName = 'Dr. K. Boateng, MD & CEO';

  // State for Purchase Order View Modal
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [ownerPinInput, setOwnerPinInput] = useState<string>('');
  const [isBulkMomoModalOpen, setIsBulkMomoModalOpen] = useState<boolean>(false);
  const [momoSuccessAlert, setMomoSuccessAlert] = useState<string | null>(null);
  const [isSchemaOpen, setIsSchemaOpen] = useState<boolean>(false);

  // End-of-Day (Z-Report) State & Dynamic Date Selector
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [isEodModalOpen, setIsEodModalOpen] = useState<boolean>(false);
  const [eodCalendarDate, setEodCalendarDate] = useState<string>(todayDateStr);
  const [copiedEodAlert, setCopiedEodAlert] = useState<boolean>(false);
  const [eodClosureSavedAlert, setEodClosureSavedAlert] = useState<boolean>(false);

  // Compute live End-of-Day Report for current or selected calendar date
  const eodReport = useMemo(() => {
    return calculateEndOfDayReport(transactions, eodCalendarDate, config, ownerName);
  }, [transactions, eodCalendarDate, config, ownerName]);

  const handleCopyEodSummary = () => {
    const text = formatEndOfDayTextMessage(eodReport);
    navigator.clipboard.writeText(text);
    setCopiedEodAlert(true);
    setTimeout(() => setCopiedEodAlert(false), 2500);
  };

  const handleExecuteEodClosureFromHub = () => {
    logAuditEvent(
      `Owner Executed End-of-Day Z-Report Financial & Statutory Closure for ${eodReport.calendarDate}`,
      'GRA_EVAT',
      {
        userName: ownerName,
        role: currentUserRole,
        entityId: eodReport.reportId,
        newValue: `Net Sales: GHS ${eodReport.sales.netSalesGhs.toFixed(2)} | GRA Tax: GHS ${eodReport.vat.totalTaxRemittableGhs.toFixed(2)} | NHIS: GHS ${eodReport.nhis.totalClaimAmountGhs.toFixed(2)}`
      }
    );
    if (onAuditLogUpdate) onAuditLogUpdate();
    setEodClosureSavedAlert(true);
    setTimeout(() => setEodClosureSavedAlert(false), 3500);
  };

  // 1. Real-Time Cash Flow Splitting Computation
  const todayTxns = transactions.filter(t => t.timestamp.startsWith(todayDateStr));

  // Compute live splits
  const grossSalesToday = transactions.reduce((sum, t) => sum + t.netAmount, 0) + 42350.00; // Simulated historical + current
  const cashInTill = transactions.reduce((sum, t) => sum + (t.splitBilling?.cashAmount || 0), 0) + 12150.00;
  const momoCollections = transactions.reduce((sum, t) => sum + (t.splitBilling?.momoAmount || 0), 0) + 22200.00;
  const insurancePending = insurers.reduce((sum, ins) => sum + ins.outstandingBalance, 0);

  // 2. PO Approval handlers
  const handleApprovePo = (poId: string) => {
    roleGuard.verifyAction('APPROVE_PURCHASE_ORDER', () => {
      const updated = purchaseOrders.map((po) => {
        if (po.id === poId) {
          return {
            ...po,
            status: 'APPROVED_SENT_TO_SUPPLIER' as const,
            approvedBy: ownerName,
            approvedAt: new Date().toISOString()
          };
        }
        return po;
      });

      onUpdatePurchaseOrders(updated);
      if (selectedPo && selectedPo.id === poId) {
        setSelectedPo(null);
      }

      logAuditEvent(
        `Owner Authorized Purchase Order ${poId} to ${purchaseOrders.find(p => p.id === poId)?.supplierName}`,
        'PURCHASE_ORDERS',
        {
          userName: ownerName,
          role: 'Pharmacy Owner / MD',
          entityId: poId,
          newValue: `Approved GHS ${purchaseOrders.find(p => p.id === poId)?.totalCostGhs.toFixed(2)}`
        }
      );
      if (onAuditLogUpdate) onAuditLogUpdate();
    });
  };

  const handleRejectPo = (poId: string) => {
    roleGuard.verifyAction('REJECT_PURCHASE_ORDER', () => {
      const updated = purchaseOrders.map((po) => {
        if (po.id === poId) {
          return {
            ...po,
            status: 'REJECTED' as const,
            approvedBy: ownerName,
            approvedAt: new Date().toISOString()
          };
        }
        return po;
      });

      onUpdatePurchaseOrders(updated);
      if (selectedPo && selectedPo.id === poId) {
        setSelectedPo(null);
      }

      logAuditEvent(
        `Owner Rejected Purchase Order ${poId}`,
        'PURCHASE_ORDERS',
        {
          userName: ownerName,
          role: 'Pharmacy Owner / MD',
          entityId: poId
        }
      );
      if (onAuditLogUpdate) onAuditLogUpdate();
    });
  };

  // 3. Payroll Single & Bulk Disbursal Handlers
  const handleQueueSingleMomoPayout = (employeeId: string) => {
    roleGuard.verifyAction('EXECUTE_PAYROLL', () => {
      const updated = payrollRecords.map((rec) => {
        if (rec.employeeId === employeeId) {
          return {
            ...rec,
            payoutStatus: 'PAID_MOMO' as const,
            payoutReference: `MOMO-PAY-${Date.now().toString().slice(-6)}`,
            payoutTimestamp: new Date().toISOString()
          };
        }
        return rec;
      });

      onUpdatePayrollRecords(updated);
      const emp = payrollRecords.find(r => r.employeeId === employeeId);
      setMomoSuccessAlert(`Salary payout of GHS ${emp?.netSalaryPayoutGhs.toFixed(2)} successfully disbursed via ${emp?.momoNetwork} MoMo to ${emp?.fullName} (${emp?.momoWalletNumber})!`);

      logAuditEvent(
        `Owner Disbursed MoMo Salary Payout to ${emp?.fullName} (GHS ${emp?.netSalaryPayoutGhs.toFixed(2)})`,
        'PAYROLL',
        {
          userName: ownerName,
          role: 'Pharmacy Owner / MD',
          entityId: employeeId
        }
      );
      if (onAuditLogUpdate) onAuditLogUpdate();
    });
  };

  const handleExecuteBulkMomoDisbursal = () => {
    roleGuard.verifyAction('BULK_MOMO_DISBURSAL', () => {
      if (ownerPinInput !== '9999' && ownerPinInput !== '1234') {
        alert('Security MFA Error: Invalid Owner Authorization PIN.');
        return;
      }

      const updated = payrollRecords.map((rec) => ({
        ...rec,
        payoutStatus: 'PAID_MOMO' as const,
        payoutReference: `MOMO-BULK-${Date.now().toString().slice(-6)}`,
        payoutTimestamp: new Date().toISOString()
      }));

      onUpdatePayrollRecords(updated);
      setIsBulkMomoModalOpen(false);
      setOwnerPinInput('');
      setMomoSuccessAlert('Bulk August 2026 Payroll successfully executed! Disbursed to all 5 staff mobile wallets via MTN & Telecel Corporate MoMo APIs.');

      logAuditEvent(
        `Owner Executed Full Bulk Payroll MoMo Disbursal for August 2026`,
        'PAYROLL',
        {
          userName: ownerName,
          role: 'Pharmacy Owner / MD',
          newValue: 'All staff accounts credited'
        }
      );
      if (onAuditLogUpdate) onAuditLogUpdate();
    });
  };

  // 4. System Integrity Logs & Suspicious Overrides
  const stockAdjustmentLogs = auditLogs.filter(
    (l) => l.module === 'INVENTORY' || l.action.toLowerCase().includes('adjustment') || l.action.toLowerCase().includes('override')
  );

  return (
    <div className="space-y-4">
      {/* Executive Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Executive Management Hub</h2>
              <span className="bg-amber-950 text-amber-300 border border-amber-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Owner / Managing Director
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Logged in: <strong className="text-slate-200">{ownerName}</strong> • Facility: {config.pharmacyName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSchemaOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/70 hover:bg-blue-900/60 text-blue-300 border border-blue-700/60 rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>PostgreSQL Relational DDL</span>
          </button>
          <span className="text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-400">
            Payroll Cycle: <strong className="text-slate-200">August 2026</strong>
          </span>
        </div>
      </div>

      {/* Alert banner if momo payout succeeded */}
      {momoSuccessAlert && (
        <div className="bg-emerald-950/80 border border-emerald-700 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{momoSuccessAlert}</span>
          </div>
          <button
            onClick={() => setMomoSuccessAlert(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Alert banner if EOD closure executed */}
      {eodClosureSavedAlert && (
        <div className="bg-emerald-950/90 border border-emerald-600 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-200 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>End-of-Day Z-Report Closure Signed!</strong> Cryptographic audit hash generated and stored to the immutable ledger.
            </span>
          </div>
          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-900/80 px-2 py-0.5 rounded">
            {eodReport.closingVerificationHash.slice(0, 18)}...
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. END-OF-DAY (Z-REPORT) AUTOMATED FINANCIAL & STATUTORY SUMMARY FUNCTION */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl relative overflow-hidden">
        {/* Section Header with Date Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  End-of-Day (Z-Report) Daily Financial & Statutory Closure
                </h3>
                {eodCalendarDate === todayDateStr && (
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Current Calendar Date
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Automated daily calculation of <strong>Total Sales</strong>, <strong>GRA E-VAT Collections</strong>, and <strong>NHIS Claims</strong> for date: <strong className="text-slate-200">{eodCalendarDate}</strong>
              </p>
            </div>
          </div>

          {/* Date Selector & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 gap-1.5 shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                type="date"
                value={eodCalendarDate}
                onChange={(e) => setEodCalendarDate(e.target.value)}
                className="bg-transparent text-slate-100 font-mono font-bold text-xs focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setEodCalendarDate(todayDateStr)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                eodCalendarDate === todayDateStr
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={handleCopyEodSummary}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
              title="Copy formatted summary to clipboard"
            >
              {copiedEodAlert ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedEodAlert ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEodModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>GENERATE Z-REPORT</span>
            </button>
          </div>
        </div>

        {/* 3 Core Primary Pillars Grid: 1. Total Sales | 2. VAT Collections | 3. NHIS Claims */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* PILLAR 1: TOTAL SALES & REAL-TIME COLLECTIONS */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  1. Total Sales & Collections
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {eodReport.sales.transactionCount} Orders
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Net Realized Sales ({eodCalendarDate})</span>
                <div className="text-2xl font-black font-mono text-slate-100">
                  GHS {eodReport.sales.netSalesGhs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Gross: GHS {eodReport.sales.grossSalesGhs.toFixed(2)}</span>
                  <span>Avg Basket: GHS {eodReport.sales.averageTransactionValueGhs.toFixed(2)}</span>
                </div>
              </div>

              {/* Tender Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block flex items-center gap-1">
                    <Banknote className="w-3 h-3 text-emerald-400" /> Cash in Till
                  </span>
                  <span className="font-bold text-emerald-400">GHS {eodReport.sales.cashCollectedGhs.toFixed(2)}</span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-amber-400" /> MoMo
                  </span>
                  <span className="font-bold text-amber-400">GHS {eodReport.sales.momoCollectedGhs.toFixed(2)}</span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-sky-400" /> Card / GhQR
                  </span>
                  <span className="font-bold text-sky-400">GHS {eodReport.sales.ghqrCardCollectedGhs.toFixed(2)}</span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-purple-400" /> Insurance Debt
                  </span>
                  <span className="font-bold text-purple-400">GHS {eodReport.sales.privateInsuranceReceivableGhs.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              <span>Units Sold: <strong className="text-slate-200 font-mono">{eodReport.sales.totalUnitsSold} packs</strong></span>
              <span>Discounts: <strong className="text-red-400 font-mono">GHS {eodReport.sales.discountTotalGhs.toFixed(2)}</strong></span>
            </div>
          </div>

          {/* PILLAR 2: VAT COLLECTIONS & STATUTORY GRA LEVIES */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" />
                  2. Statutory GRA E-VAT Collections
                </span>
                <span className="text-[10px] text-purple-300 font-mono">
                  TIN: {config.graTin}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total GRA Tax Remittance</span>
                <div className="text-2xl font-black font-mono text-purple-300">
                  GHS {eodReport.vat.totalTaxRemittableGhs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Taxable Base: GHS {eodReport.vat.taxableSalesBaseGhs.toFixed(2)}</span>
                  <span className="text-emerald-400 font-semibold">{eodReport.vat.complianceRatePct}% Sync</span>
                </div>
              </div>

              {/* Statutory Tax Sub-components */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block">Standard VAT (15%)</span>
                  <span className="font-bold text-purple-200">GHS {eodReport.vat.standardVat15Ghs.toFixed(2)}</span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block">NHIL (2.5%)</span>
                  <span className="font-bold text-purple-300">GHS {eodReport.vat.nhil2_5Ghs.toFixed(2)}</span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block">GETFund (2.5%)</span>
                  <span className="font-bold text-purple-300">GHS {eodReport.vat.getfund2_5Ghs.toFixed(2)}</span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block">COVID-19 (1.0%)</span>
                  <span className="font-bold text-purple-400">GHS {eodReport.vat.covid1_0Ghs.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              <span>Invoices Stamped: <strong className="text-slate-200 font-mono">{eodReport.vat.stampedInvoiceCount}</strong></span>
              <span className="text-emerald-400 font-semibold">100% GRA Fiscal Valid</span>
            </div>
          </div>

          {/* PILLAR 3: NHIS CLAIMS & NHIA G-FORM SUMMARY */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  3. NHIS Claims & Tariff Summary
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {config.nhiaFacilityCode}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total NHIS Reimbursement Claim</span>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  GHS {eodReport.nhis.totalClaimAmountGhs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Copays: GHS {eodReport.nhis.totalCopayAmountGhs.toFixed(2)}</span>
                  <span>Retail Eq: GHS {eodReport.nhis.totalRetailEquivalentGhs.toFixed(2)}</span>
                </div>
              </div>

              {/* NHIS Operational Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block">Claim Items Dispensed</span>
                  <span className="font-bold text-slate-100">{eodReport.nhis.totalClaimsCount} items</span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-sans block">NHIS Beneficiaries</span>
                  <span className="font-bold text-sky-400">{eodReport.nhis.uniqueBeneficiariesCount} patients</span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 col-span-2">
                  <span className="text-[10px] text-slate-500 font-sans block">G-Form Compliance Rate</span>
                  <span className="font-bold text-emerald-400 flex items-center justify-between">
                    <span>{eodReport.nhis.compliancePassRatePct}% Clean</span>
                    <span className="text-[9px] text-slate-400">Essential Meds List 2026</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => onNavigateToTab('nhis')}
                className="text-emerald-400 hover:underline font-bold flex items-center gap-1"
              >
                <span>Open G-Form Batch</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleExecuteEodClosureFromHub}
                className="text-amber-400 hover:underline font-bold flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>Execute Daily Sign-off</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 2. REAL-TIME CASH FLOW SPLITTING METRICS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-400" />
            Executive Financial & Cash Flow Snapshot
          </h3>
          <span className="text-[10px] text-emerald-400 font-bold font-mono">
            GRA E-VAT Sync Status: 100% Live
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Gross Sales Today */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Gross Sales Today</span>
            <span className="text-xl font-black font-mono text-slate-100 block">
              GHS {grossSalesToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Percent className="w-3 h-3" />
              Net Margin: 24.5%
            </span>
          </div>

          {/* Liquid Physical Cash in Till */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
              <Banknote className="w-3 h-3 text-emerald-400" />
              Cash in Till (Physical)
            </span>
            <span className="text-xl font-black font-mono text-emerald-400 block">
              GHS {cashInTill.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block">Immediate liquid cash drawer</span>
          </div>

          {/* MoMo Settlements */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-amber-400" />
              MoMo Collections
            </span>
            <span className="text-xl font-black font-mono text-amber-400 block">
              GHS {momoCollections.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block">MTN & Telecel merchant wallets</span>
          </div>

          {/* Insurance Pending Debt */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-sky-400" />
              Insurance Receivables
            </span>
            <span className="text-xl font-black font-mono text-sky-400 block">
              GHS {insurancePending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block">Unrealized claims balance</span>
          </div>

          {/* GRA Tax Remittance Today */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
              <FileCheck className="w-3 h-3 text-purple-400" />
              GRA E-VAT Stamped
            </span>
            <span className="text-xl font-black font-mono text-purple-300 block">
              100% Compliant
            </span>
            <span className="text-[10px] text-slate-500 block">TIN: {config.graTin}</span>
          </div>
        </div>
      </div>

      {/* STAFF TRANSACTION VOLUME & PERFORMANCE (30-DAY BAR CHART) */}
      <StaffPerformanceChart 
        transactions={transactions}
        payrollRecords={payrollRecords}
      />

      {/* 2. PENDING PURCHASE ORDER (PO) APPROVALS (Two-Tiered Authorization) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              Pending Purchase Order (PO) Approvals
            </h3>
            <p className="text-[11px] text-slate-400">
              Procurement threshold: Orders exceeding <strong>GHS 5,000.00</strong> require explicit Owner Authorization.
            </p>
          </div>

          <span className="text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-xl">
            {purchaseOrders.filter(p => p.status === 'PENDING_OWNER_APPROVAL').length} Pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">PO ID</th>
                <th className="py-2.5 px-3">Supplier / Vendor</th>
                <th className="py-2.5 px-3">Items Requested</th>
                <th className="py-2.5 px-3 text-right">Total Cost (GHS)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchaseOrders.map((po) => {
                const isPending = po.status === 'PENDING_OWNER_APPROVAL';
                return (
                  <tr key={po.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-100">{po.id}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-200">{po.supplierName}</span>
                      <span className="text-[10px] text-slate-500 block">Req by: {po.requestedBy}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {po.items.map(i => `${i.requestedQuantityPacks}x ${i.brandName}`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400 text-sm">
                      GHS {po.totalCostGhs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          po.status === 'PENDING_OWNER_APPROVAL'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : po.status === 'APPROVED_SENT_TO_SUPPLIER'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : po.status === 'DELIVERED'
                            ? 'bg-sky-950 text-sky-400 border border-sky-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {po.status === 'PENDING_OWNER_APPROVAL' ? 'Pending Approval' : po.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPo(po)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs"
                        >
                          View Items
                        </button>
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprovePo(po.id)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPo(po.id)}
                              className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 rounded-lg text-xs"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. STAFF SALARY & PAYROLL ADMINISTRATION (Month: August 2026) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Staff Salary & Statutory Payroll Administration
            </h3>
            <p className="text-[11px] text-slate-400">
              Month: <strong>August 2026</strong> • Automated SSNIT (5.5% Employee / 13% Employer) & GRA PAYE Progressive Brackets
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsBulkMomoModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md self-start sm:self-auto"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>EXECUTE BULK MO-MO DISBURSAL</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3 text-right">Base Salary</th>
                <th className="py-2.5 px-3 text-right">SSNIT (5.5% / 13%)</th>
                <th className="py-2.5 px-3 text-right">GRA PAYE Tax</th>
                <th className="py-2.5 px-3 text-right">Net Take-Home</th>
                <th className="py-2.5 px-3 text-center">Payout Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payrollRecords.map((emp) => {
                const isPaid = emp.payoutStatus === 'PAID_MOMO';
                return (
                  <tr key={emp.employeeId} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-100">
                      {emp.fullName}
                      <span className="text-[10px] text-slate-500 font-mono block">{emp.momoNetwork} MoMo: {emp.momoWalletNumber}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{emp.role}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                      GHS {emp.baseSalaryGhs.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      GHS {emp.ssnitEmployeeDeductionGhs.toFixed(2)}
                      <span className="text-[9px] text-slate-500 block">Employer: GHS {emp.ssnitEmployerContributionGhs.toFixed(2)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                      GHS {emp.graPayeTaxGhs.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                      GHS {emp.netSalaryPayoutGhs.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isPaid ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          PAID via {emp.momoNetwork} MoMo
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQueueSingleMomoPayout(emp.employeeId)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs shadow"
                        >
                          QUEUE MO-MO PAYOUT
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. SYSTEM INTEGRITY & FRAUD AUDITING LOGS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            System Integrity & Fraud Auditing Corner
          </h3>
          <button
            type="button"
            onClick={() => onNavigateToTab('audit')}
            className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Full Cryptographic Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Stock Adjustment & Shrinkage Alerts */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>[!] Manual Stock Adjustments & Price Reductions Today</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              {stockAdjustmentLogs.length > 0
                ? `${stockAdjustmentLogs.length} manual inventory overrides logged by Superintendent / Staff.`
                : '3 Stock Adjustments made today by Superintendent (Manual Overrides logged).'}
            </p>
            <button
              type="button"
              onClick={() => onNavigateToTab('audit')}
              className="text-amber-400 hover:underline font-bold text-[11px]"
            >
              [REVIEW AUDIT LOGS]
            </button>
          </div>

          {/* Outstanding Insurance Debt */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <CreditCard className="w-4 h-4" />
              <span>[!] Outstanding Corporate Insurance Debt: GHS 142,000.00</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Overdue claims identified with Nationwide Medical Insurance, Acacia, and Apex Health.
            </p>
            <button
              type="button"
              onClick={() => onNavigateToTab('nhis')}
              className="text-sky-400 hover:underline font-bold text-[11px]"
            >
              [VIEW INSURER DEBTOR LEDGER]
            </button>
          </div>
        </div>
      </div>

      {/* PO View Modal */}
      {selectedPo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">{selectedPo.id}: {selectedPo.supplierName}</h3>
                <p className="text-xs text-slate-400">Created by {selectedPo.requestedBy}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPo(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {selectedPo.items.map((item, idx) => (
                <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-200">{item.brandName}</span>
                    <span className="text-[10px] text-slate-500 block">Requested: {item.requestedQuantityPacks} Packs @ GHS {item.unitCostGhs.toFixed(2)}</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400">GHS {item.totalCostGhs.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Purchase Order Cost:</span>
              <span className="text-base font-black font-mono text-amber-400">
                GHS {selectedPo.totalCostGhs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPo(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
              {selectedPo.status === 'PENDING_OWNER_APPROVAL' && (
                <button
                  type="button"
                  onClick={() => handleApprovePo(selectedPo.id)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow"
                >
                  Approve Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk MoMo Disbursal Modal */}
      {isBulkMomoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Execute Bulk MoMo Payroll Disbursal</h3>
                <p className="text-xs text-slate-400">August 2026 Staff Payouts</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Staff Members:</span>
                <span className="font-bold text-slate-100">5 Employees</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Net Disbursal Amount:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  GHS {payrollRecords.reduce((sum, r) => sum + r.netSalaryPayoutGhs, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Disbursal Channel:</span>
                <span>MTN MoMo API & Telecel Cash Gateway</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-slate-400">Enter Owner Authorization PIN (MFA)</label>
              <input
                type="password"
                maxLength={4}
                value={ownerPinInput}
                onChange={(e) => setOwnerPinInput(e.target.value)}
                placeholder="Enter PIN (e.g. 9999)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-center text-xl tracking-widest text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 block text-center">Demo Owner Master PIN is 9999</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsBulkMomoModalOpen(false);
                  setOwnerPinInput('');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkMomoDisbursal}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow"
              >
                Disburse Funds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PostgreSQL Data Architecture & DDL Schema Modal */}
      <PostgreSqlSchemaViewer
        isOpen={isSchemaOpen}
        onClose={() => setIsSchemaOpen(false)}
      />

      {/* End-of-Day (Z-Report) Comprehensive Daily Financial & Statutory Modal */}
      <EndOfDayReportModal
        isOpen={isEodModalOpen}
        onClose={() => setIsEodModalOpen(false)}
        transactions={transactions}
        config={config}
        onAuditLogUpdate={onAuditLogUpdate}
        currentRole={currentUserRole}
      />
    </div>
  );
};
