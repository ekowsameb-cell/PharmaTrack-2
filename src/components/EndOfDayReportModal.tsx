import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Banknote, 
  Smartphone, 
  CreditCard, 
  FileCheck, 
  ShieldCheck, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  Building2, 
  Users, 
  CheckCircle2, 
  Sparkles,
  Lock,
  ChevronRight,
  Pill,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { TransactionRecord, PharmacyConfig } from '../types/pharmacy';
import { 
  calculateEndOfDayReport, 
  formatEndOfDayTextMessage, 
  EndOfDayReport 
} from '../services/endOfDayService';
import { logAuditEvent } from '../services/storageService';

interface EndOfDayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionRecord[];
  config: PharmacyConfig;
  onAuditLogUpdate?: () => void;
  currentRole?: string;
}

export const EndOfDayReportModal: React.FC<EndOfDayReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  config,
  onAuditLogUpdate,
  currentRole = 'Pharmacy Owner / MD'
}) => {
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [activePillarTab, setActivePillarTab] = useState<'all' | 'sales' | 'vat' | 'nhis'>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [isClosureSaved, setIsClosureSaved] = useState<boolean>(false);

  // Compute the full End-of-Day Report for the selected calendar date
  const report: EndOfDayReport = useMemo(() => {
    return calculateEndOfDayReport(transactions, selectedDate, config);
  }, [transactions, selectedDate, config]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    const text = formatEndOfDayTextMessage(report);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `PharmaTrack-Z-Report-${report.calendarDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExecuteDailyClosure = () => {
    logAuditEvent(
      `Owner Executed End-of-Day Z-Report Financial & Statutory Closure for ${report.calendarDate}`,
      'GRA_EVAT',
      {
        userName: 'Dr. K. Boateng, MD & CEO',
        role: currentRole,
        entityId: report.reportId,
        newValue: `Net Sales: GHS ${report.sales.netSalesGhs.toFixed(2)} | GRA Tax: GHS ${report.vat.totalTaxRemittableGhs.toFixed(2)} | NHIS: GHS ${report.nhis.totalClaimAmountGhs.toFixed(2)}`
      }
    );
    if (onAuditLogUpdate) onAuditLogUpdate();
    setIsClosureSaved(true);
    setTimeout(() => setIsClosureSaved(false), 4000);
  };

  const isToday = selectedDate === todayDateStr;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
                  End-of-Day Financial & Statutory Z-Report
                </h2>
                <span className="bg-amber-950 text-amber-300 border border-amber-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Daily Closure Ledger
                </span>
                {isToday && (
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Current Calendar Date
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {config.pharmacyName} • {config.branchName} • GPhC: {config.gphcLicenseNumber}
              </p>
            </div>
          </div>

          {/* Date Selector & Close button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 gap-1.5 shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-100 font-mono font-bold text-xs focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => setSelectedDate(todayDateStr)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isToday 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Reset to today's date"
            >
              Today
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Success Alert if closure signed */}
        {isClosureSaved && (
          <div className="bg-emerald-950 border-y border-emerald-700 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Z-Report Closure Verified & Logged!</strong> Cryptographic hash stamped to immutable audit ledger.
              </span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded">
              {report.closingVerificationHash.slice(0, 16)}...
            </span>
          </div>
        )}

        {/* Pillar Sub-navigation Tabs */}
        <div className="bg-slate-950/60 px-4 sm:px-6 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActivePillarTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activePillarTab === 'all'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Executive Overview</span>
            </button>
            <button
              onClick={() => setActivePillarTab('sales')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activePillarTab === 'sales'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>1. Total Sales & Collections</span>
            </button>
            <button
              onClick={() => setActivePillarTab('vat')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activePillarTab === 'vat'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>2. GRA E-VAT & Levies</span>
            </button>
            <button
              onClick={() => setActivePillarTab('nhis')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activePillarTab === 'nhis'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>3. NHIS Claims Summary</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono hidden md:block">
            Report ID: <strong className="text-slate-300">{report.reportId}</strong>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          {/* Top 3 High-Impact KPI Banners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Total Net Sales */}
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-1 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Total Net Sales (Calendar Day)
                </span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-100">
                GHS {report.sales.netSalesGhs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Gross: GHS {report.sales.grossSalesGhs.toFixed(2)}</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  {report.sales.transactionCount} Transactions
                </span>
              </div>
            </div>

            {/* 2. Statutory GRA E-VAT Taxes */}
            <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 p-4 rounded-2xl border border-purple-500/30 space-y-1 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                  GRA Statutory Tax Remittance
                </span>
                <FileCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-purple-200">
                GHS {report.vat.totalTaxRemittableGhs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Standard VAT (15%): GHS {report.vat.standardVat15Ghs.toFixed(2)}</span>
                <span className="font-semibold text-purple-300 font-mono">
                  TIN: {report.graTin}
                </span>
              </div>
            </div>

            {/* 3. NHIS Claims Summary */}
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-1 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  NHIS Reimbursement Claims
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-300">
                GHS {report.nhis.totalClaimAmountGhs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Copays: GHS {report.nhis.totalCopayAmountGhs.toFixed(2)}</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  {report.nhis.totalClaimsCount} Claim Items
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: TOTAL SALES & TENDER RECONCILIATION */}
          {(activePillarTab === 'all' || activePillarTab === 'sales') && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
                    Total Sales & Cash Drawer Reconciliation
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Avg Basket: <strong className="text-amber-400">GHS {report.sales.averageTransactionValueGhs.toFixed(2)}</strong>
                </span>
              </div>

              {/* Tender Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Physical Cash */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Physical Cash</span>
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-300">
                    GHS {report.sales.cashCollectedGhs.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Immediate till cash</span>
                </div>

                {/* Mobile Money */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile Money</span>
                  </div>
                  <div className="text-lg font-black font-mono text-amber-300">
                    GHS {report.sales.momoCollectedGhs.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">MTN & Telecel wallets</span>
                </div>

                {/* Card / GhQR */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card / GhQR</span>
                  </div>
                  <div className="text-lg font-black font-mono text-sky-300">
                    GHS {report.sales.ghqrCardCollectedGhs.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">POS terminal settlements</span>
                </div>

                {/* Private Insurance Debt */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Private Insurers</span>
                  </div>
                  <div className="text-lg font-black font-mono text-purple-300">
                    GHS {report.sales.privateInsuranceReceivableGhs.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Direct billed receivables</span>
                </div>
              </div>

              {/* Lane Volume & Operational Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="text-slate-400 font-semibold block">Counter OTC Lane</span>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-200">{report.sales.laneBreakdown.otcCount} orders</span>
                    <span className="text-amber-400 font-bold">GHS {report.sales.laneBreakdown.otcAmountGhs.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="text-slate-400 font-semibold block">Clinical POM Lane</span>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-200">{report.sales.laneBreakdown.clinicalCount} orders</span>
                    <span className="text-emerald-400 font-bold">GHS {report.sales.laneBreakdown.clinicalAmountGhs.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="text-slate-400 font-semibold block">Insurance & Corporate Lane</span>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-200">{report.sales.laneBreakdown.insuranceCount} orders</span>
                    <span className="text-sky-400 font-bold">GHS {report.sales.laneBreakdown.insuranceAmountGhs.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-4">
                  <span>Total Packs / Units Dispensed: <strong className="text-slate-200 font-mono">{report.sales.totalUnitsSold}</strong></span>
                  <span>Controlled Drugs (Class A) Dispensed: <strong className="text-amber-400 font-mono">{report.sales.controlledDrugTxnCount}</strong></span>
                </div>
                <span>Discounts Deducted: <strong className="text-red-400 font-mono">GHS {report.sales.discountTotalGhs.toFixed(2)}</strong></span>
              </div>
            </div>
          )}

          {/* SECTION 2: STATUTORY GRA E-VAT & LEVIES BREAKDOWN */}
          {(activePillarTab === 'all' || activePillarTab === 'vat') && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
                    Statutory GRA E-VAT & Direct Levies Collections
                  </h3>
                </div>
                <span className="text-xs text-purple-300 font-mono">
                  GRA TIN: <strong>{report.graTin}</strong>
                </span>
              </div>

              {/* Statutory Tax Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Tax / Statutory Levy Component</th>
                      <th className="py-2.5 px-3 text-center">Statutory Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable Sales Base (GHS)</th>
                      <th className="py-2.5 px-3 text-right">Total Tax Collected (GHS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono">
                    <tr className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 font-sans font-semibold text-slate-200">
                        National Health Insurance Levy (NHIL)
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400">2.5%</td>
                      <td className="py-2 px-3 text-right text-slate-300">{report.vat.taxableSalesBaseGhs.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-purple-300">{report.vat.nhil2_5Ghs.toFixed(2)}</td>
                    </tr>
                    <tr className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 font-sans font-semibold text-slate-200">
                        Ghana Education Trust Fund Levy (GETFund)
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400">2.5%</td>
                      <td className="py-2 px-3 text-right text-slate-300">{report.vat.taxableSalesBaseGhs.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-purple-300">{report.vat.getfund2_5Ghs.toFixed(2)}</td>
                    </tr>
                    <tr className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 font-sans font-semibold text-slate-200">
                        COVID-19 Health Recovery Levy
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400">1.0%</td>
                      <td className="py-2 px-3 text-right text-slate-300">{report.vat.taxableSalesBaseGhs.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-purple-300">{report.vat.covid1_0Ghs.toFixed(2)}</td>
                    </tr>
                    <tr className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 font-sans font-semibold text-slate-200">
                        Standard Value Added Tax (VAT)
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400">15.0%</td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        {(report.vat.taxableSalesBaseGhs + report.vat.nhil2_5Ghs + report.vat.getfund2_5Ghs + report.vat.covid1_0Ghs).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-purple-300">{report.vat.standardVat15Ghs.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-slate-900 font-bold">
                      <td className="py-2.5 px-3 font-sans text-slate-100">
                        TOTAL STATUTORY TAX REMITTANCE PAYABLE TO GRA
                      </td>
                      <td className="py-2.5 px-3 text-center text-purple-300">~21.9% Effective</td>
                      <td className="py-2.5 px-3 text-right text-slate-100">{report.vat.taxableSalesBaseGhs.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-sm text-purple-300 font-black">
                        GHS {report.vat.totalTaxRemittableGhs.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Fiscalization compliance banner */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300">
                    GRA Central Invoicing Protocol: <strong>{report.vat.stampedInvoiceCount} Invoices Stamped Today</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                  <span>Live Sync: <strong className="text-emerald-400">{report.vat.realTimeSyncCount}</strong></span>
                  <span>Offline Queue: <strong className="text-amber-400">{report.vat.offlineQueueCount}</strong></span>
                  <span>Compliance: <strong className="text-emerald-400">{report.vat.complianceRatePct}%</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: NHIS CLAIMS & G-FORM DAILY RECONCILIATION */}
          {(activePillarTab === 'all' || activePillarTab === 'nhis') && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
                    NHIS Claims & NHIA G-Form Daily Summary
                  </h3>
                </div>
                <span className="text-xs text-emerald-400 font-mono">
                  NHIA Facility: <strong>{report.nhiaFacilityCode}</strong>
                </span>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total NHIS Claim Tariff</span>
                  <div className="text-lg font-black font-mono text-emerald-400">
                    GHS {report.nhis.totalClaimAmountGhs.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">NHIA payable liability</span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Patient Copays Collected</span>
                  <div className="text-lg font-black font-mono text-amber-400">
                    GHS {report.nhis.totalCopayAmountGhs.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Out of pocket difference</span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Claim Items</span>
                  <div className="text-lg font-black font-mono text-slate-100">
                    {report.nhis.totalClaimsCount} Items
                  </div>
                  <span className="text-[10px] text-slate-500 block">NHIA medicine lines</span>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Unique Beneficiaries</span>
                  <div className="text-lg font-black font-mono text-sky-400">
                    {report.nhis.uniqueBeneficiariesCount} Patients
                  </div>
                  <span className="text-[10px] text-slate-500 block">Cardholders attended to</span>
                </div>
              </div>

              {/* Beneficiary Category Breakdown & Top Drugs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Categories */}
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200 block border-b border-slate-800 pb-1">
                    NHIS Member Category Breakdown
                  </span>
                  {Object.keys(report.nhis.categoryBreakdown).length > 0 ? (
                    <div className="space-y-1.5">
                      {Object.entries(report.nhis.categoryBreakdown).map(([cat, data]) => (
                        <div key={cat} className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-300 font-semibold">{cat}</span>
                          <span className="font-mono text-slate-400">
                            {data.count} claims • <strong className="text-emerald-400">GHS {data.amountGhs.toFixed(2)}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[11px] italic">No NHIS claims recorded on this calendar date.</p>
                  )}
                </div>

                {/* Top Dispensed NHIS Drugs */}
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200 block border-b border-slate-800 pb-1">
                    Top Dispensed NHIS Medicines (Today)
                  </span>
                  {report.nhis.topDrugs.length > 0 ? (
                    <div className="space-y-1.5">
                      {report.nhis.topDrugs.map((d, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-300 truncate max-w-[180px]">{d.name}</span>
                          <span className="font-mono text-slate-400">
                            {d.qty} packs • <strong className="text-amber-400">GHS {d.amountGhs.toFixed(2)}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[11px] italic">No NHIS drug lines recorded on this date.</p>
                  )}
                </div>
              </div>

              {/* G-Form Batch Health & Pass-Rate */}
              <div className="bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300">
                    NHIA G-Form Claim Validation Pass Rate: <strong>{report.nhis.compliancePassRatePct}%</strong>
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">
                  All items vetted against NHIA 2026 Essential Medicines List
                </span>
              </div>
            </div>
          )}

          {/* Cryptographic Tamper-Proof Audit Sign-off Box */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-400">
              <span>Superintendent Pharmacist: <strong className="text-slate-200">{report.superintendentName}</strong></span>
              <span className="font-mono">Closure Hash: <strong className="text-amber-400">{report.closingVerificationHash}</strong></span>
            </div>
            <p className="text-[10px] text-slate-500">
              This End-of-Day Z-Report reconciles all Point-of-Sale cash flow, GRA E-VAT central tax receipts, and National Health Insurance claims under GPhC Regulation L.I. 2223 and GRA Electronic Invoicing Mandates.
            </p>
          </div>
        </div>

        {/* Modal Footer Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopySummary}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Summary Copied!' : 'Copy WhatsApp Summary'}</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              title="Download Full Report JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              title="Print Official Z-Report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Z-Report</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 font-semibold rounded-xl text-xs transition-colors"
            >
              Close Window
            </button>

            <button
              onClick={handleExecuteDailyClosure}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Execute End-of-Day Audit Stamp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
