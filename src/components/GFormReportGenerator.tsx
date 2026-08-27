import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Printer, 
  FileSpreadsheet, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Stethoscope, 
  Pill, 
  HelpCircle,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TransactionRecord, PharmacyConfig, NhisClaimBatchItem } from '../types/pharmacy';
import { 
  generateNhisGFormBatch, 
  exportGFormCsv, 
  calculateNhisBatchSummary,
  validateNhisClaim 
} from '../services/nhisService';
import { logAuditEvent } from '../services/storageService';

interface GFormReportGeneratorProps {
  transactions: TransactionRecord[];
  config: PharmacyConfig;
  onAuditLogUpdate?: () => void;
}

type DatePreset = 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'ytd' | 'all';

export const GFormReportGenerator: React.FC<GFormReportGeneratorProps> = ({
  transactions,
  config,
  onAuditLogUpdate
}) => {
  // Helper to get formatted dates
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // Date range state default: Start of current month to today
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [activePreset, setActivePreset] = useState<DatePreset>('this_month');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CLEAN' | 'WARNINGS' | 'ERRORS'>('ALL');
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [showSummaryDrawer, setShowSummaryDrawer] = useState<boolean>(true);

  // Apply Date Preset
  const handleApplyPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    const now = new Date();

    if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDayLastMonth.toISOString().split('T')[0]);
      setEndDate(lastDayLastMonth.toISOString().split('T')[0]);
    } else if (preset === 'last_30_days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'last_90_days') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      setStartDate(ninetyDaysAgo.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'ytd') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      setStartDate(firstDayYear.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Generate filtered claims batch
  const claimsBatch = useMemo(() => {
    return generateNhisGFormBatch(transactions, startDate, endDate, selectedCategory);
  }, [transactions, startDate, endDate, selectedCategory]);

  // Calculate Batch Summary & KPIs
  const batchSummary = useMemo(() => {
    return calculateNhisBatchSummary(claimsBatch);
  }, [claimsBatch]);

  // Filtered claims for table display
  const tableFilteredClaims = useMemo(() => {
    return claimsBatch.filter((claim) => {
      // Search matching
      const matchesSearch = 
        searchQuery === '' ||
        claim.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.nhisNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.claimId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.prescriberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.prescriberMdcNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.diagnosisCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        claim.nhisDrugCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== 'ALL') {
        const validation = validateNhisClaim(claim);
        if (statusFilter === 'CLEAN' && (!validation.isValid || validation.warnings.length > 0)) return false;
        if (statusFilter === 'WARNINGS' && (!validation.isValid || validation.warnings.length === 0)) return false;
        if (statusFilter === 'ERRORS' && validation.isValid) return false;
      }

      return true;
    });
  }, [claimsBatch, searchQuery, statusFilter]);

  // Export CSV Handler
  const handleExportCsv = () => {
    if (claimsBatch.length === 0) {
      alert('No NHIS claims match the selected date range and filter criteria.');
      return;
    }

    const csvData = exportGFormCsv(claimsBatch, config.nhiaFacilityCode, {
      startDate,
      endDate,
      superintendentName: config.superintendentPharmacist.fullName
    });

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NHIS_GFORM_${config.nhiaFacilityCode}_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    // Tamper-proof audit logging
    logAuditEvent(
      `Exported NHIS G-Form Batch CSV (${claimsBatch.length} claims, GHS ${batchSummary.totalClaimAmountGhs.toFixed(2)}) for period ${startDate} to ${endDate}`,
      'NHIS',
      {
        entityId: `GFORM-${startDate}-${endDate}`,
        newValue: `${claimsBatch.length} claims, GHS ${batchSummary.totalClaimAmountGhs.toFixed(2)}`
      }
    );
    if (onAuditLogUpdate) onAuditLogUpdate();
  };

  // Copy CSV to Clipboard Handler
  const handleCopyCsv = async () => {
    if (claimsBatch.length === 0) {
      alert('No NHIS claims available to copy.');
      return;
    }

    const csvData = exportGFormCsv(claimsBatch, config.nhiaFacilityCode, {
      startDate,
      endDate
    });

    try {
      await navigator.clipboard.writeText(csvData);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
      
      logAuditEvent(
        `Copied NHIS G-Form batch data to clipboard (${claimsBatch.length} claims)`,
        'NHIS'
      );
      if (onAuditLogUpdate) onAuditLogUpdate();
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
      alert('Failed to copy CSV data. Please use the Download button.');
    }
  };

  // Print Summary Dossier
  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Component Header & Facility Dossier Meta */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>NHIA Statutory G-Form Claim Engine</span>
              </span>
              <span className="bg-slate-800 text-slate-300 text-[11px] font-mono px-2.5 py-0.5 rounded-full">
                Facility Code: <strong className="text-emerald-400">{config.nhiaFacilityCode}</strong>
              </span>
              <span className="bg-slate-800 text-slate-400 text-[11px] px-2 py-0.5 rounded-full">
                E-Claims Standard v2.4
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              NHIS G-Form Monthly Claim Submission Generator
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
              Parse, audit, and compile itemized clinical dispensing records into NHIA-standard monthly G-Form batches ready for electronic portal submission and claims vetting.
            </p>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleCopyCsv}
              disabled={claimsBatch.length === 0}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                copiedNotification
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Copy CSV to clipboard"
            >
              {copiedNotification ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiedNotification ? 'CSV Copied!' : 'Copy CSV'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={claimsBatch.length === 0}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Export NHIA G-Form CSV ({claimsBatch.length})</span>
            </button>
          </div>
        </div>

        {/* Date Range Selector & Filter Controls Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Quick Preset Buttons */}
          <div className="lg:col-span-5 flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Period:</span>
            </span>
            {[
              { key: 'this_month', label: 'This Month' },
              { key: 'last_month', label: 'Last Month' },
              { key: 'last_30_days', label: 'Last 30 Days' },
              { key: 'last_90_days', label: 'Quarter (90d)' },
              { key: 'ytd', label: 'YTD 2026' },
              { key: 'all', label: 'All Records' }
            ].map((preset) => (
              <button
                key={preset.key}
                onClick={() => handleApplyPreset(preset.key as DatePreset)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activePreset === preset.key
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Explicit Start / End Date Pickers */}
          <div className="lg:col-span-4 flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-2xl">
            <div className="flex-1 px-2">
              <label className="block text-[9px] font-bold uppercase text-slate-500">Claim From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('all');
                }}
                className="w-full bg-transparent border-0 text-xs font-mono font-bold text-slate-100 focus:outline-none"
              />
            </div>
            <div className="text-slate-600 font-bold text-xs">→</div>
            <div className="flex-1 px-2">
              <label className="block text-[9px] font-bold uppercase text-slate-500">Claim To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('all');
                }}
                className="w-full bg-transparent border-0 text-xs font-mono font-bold text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* NHIS Category Filter Dropdown */}
          <div className="lg:col-span-3">
            <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Beneficiary Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories (SSNIT, Informal, Pregnant, etc.)</option>
              <option value="SSNIT">SSNIT Contributors &amp; Pensioners</option>
              <option value="Informal">Informal Sector</option>
              <option value="Pregnant">Free Maternal Care (Pregnant)</option>
              <option value="Under 18">Under 18 Dependents</option>
              <option value="Indigent">Indigents &amp; LEAP Beneficiaries</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Claims & Range */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Claims in Batch</span>
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black font-mono text-slate-100">
              {batchSummary.totalClaimsCount} <span className="text-sm font-normal text-slate-400">items</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{batchSummary.uniquePrescriptionsCount} Prescriptions</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{batchSummary.uniquePatientsCount} Beneficiaries</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Gross NHIA Claim Amount */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">NHIA Tariff Reimbursement</span>
            <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black font-mono text-emerald-400">
              GHS {batchSummary.totalClaimAmountGhs.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              100% NHIA approved medicines tariff value
            </div>
          </div>
        </div>

        {/* Metric 3: Patient Copay Collected */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Patient Out-of-Pocket Copay</span>
            <div className="p-2 rounded-xl bg-slate-800 text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black font-mono text-sky-400">
              GHS {batchSummary.totalCopayAmountGhs.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Retail price diff &amp; non-tariff margin
            </div>
          </div>
        </div>

        {/* Metric 4: Statutory Compliance Vetting Pass Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pre-Submission Vetting Score</span>
            <div className={`p-2 rounded-xl ${
              batchSummary.validationSummary.errorCount === 0 
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                : 'bg-rose-950 text-rose-400 border border-rose-800'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono ${
                batchSummary.validationSummary.overallPassRatePct >= 95 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {batchSummary.validationSummary.overallPassRatePct}%
              </span>
              <span className="text-xs text-slate-400 font-semibold">Pass Rate</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">{batchSummary.validationSummary.cleanCount} Clean</span>
              {batchSummary.validationSummary.warningCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold">{batchSummary.validationSummary.warningCount} Warnings</span>
                </>
              )}
              {batchSummary.validationSummary.errorCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-400 font-bold">{batchSummary.validationSummary.errorCount} Errors</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vetting & Submission Compliance Notice */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
        batchSummary.validationSummary.errorCount > 0
          ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
          : batchSummary.validationSummary.warningCount > 0
          ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
          : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
      }`}>
        {batchSummary.validationSummary.errorCount > 0 ? (
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1 flex-1">
          <div className="font-bold flex items-center justify-between">
            <span>
              {batchSummary.validationSummary.errorCount > 0
                ? `NHIA Submission Attention Required (${batchSummary.validationSummary.errorCount} records with validation issues)`
                : `Batch Validated: Ready for Monthly Claim Submission (${startDate} to ${endDate})`}
            </span>
            <span className="font-mono text-[10px] text-slate-400 uppercase">
              Facility: {config.nhiaFacilityCode}
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            All G-Form claims in this batch include standardized NHIS beneficiary cards, verified prescriber MDC numbers, ICD-10 diagnostic classifications, and GPhC/NHIA unit tariff pricing. Exported CSV files can be uploaded directly to the NHIA Electronic Claims Processing Centre (CPC).
          </p>
        </div>
      </div>

      {/* Batch Breakdown Visual Cards (Accordion / Toggleable) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
              Claims Dossier Breakdown &amp; Analysis
            </h3>
          </div>
          <button
            onClick={() => setShowSummaryDrawer(!showSummaryDrawer)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
          >
            <span>{showSummaryDrawer ? 'Hide Details' : 'Show Details'}</span>
            {showSummaryDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showSummaryDrawer && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80 text-xs">
            {/* 1. Category Distribution */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wider">
                NHIS Beneficiary Categories
              </span>
              <div className="space-y-2">
                {Object.entries(batchSummary.categoryBreakdown).length === 0 ? (
                  <span className="text-slate-500 italic">No records</span>
                ) : (
                  (Object.entries(batchSummary.categoryBreakdown) as [string, { count: number; amountGhs: number }][]).map(([cat, data]) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-300 font-medium">{cat}</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          GHS {data.amountGhs.toFixed(2)} ({data.count})
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${batchSummary.totalClaimAmountGhs > 0 ? (data.amountGhs / batchSummary.totalClaimAmountGhs) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Top Dispensed NHIS Medications */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wider">
                Top Claimed NHIS Medicines
              </span>
              <div className="space-y-2.5">
                {batchSummary.topDrugs.length === 0 ? (
                  <span className="text-slate-500 italic">No records</span>
                ) : (
                  batchSummary.topDrugs.map((d, i) => (
                    <div key={i} className="flex justify-between items-start text-[11px] pb-1.5 border-b border-slate-800/40 last:border-0">
                      <div>
                        <div className="font-semibold text-slate-200">{d.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{d.code} • {d.qty} units</div>
                      </div>
                      <div className="font-mono text-emerald-400 font-bold text-right whitespace-nowrap">
                        GHS {d.amountGhs.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Top Diagnoses (ICD-10) */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wider">
                Clinical Diagnosis Breakdown (ICD-10)
              </span>
              <div className="space-y-2.5">
                {batchSummary.topDiagnoses.length === 0 ? (
                  <span className="text-slate-500 italic">No records</span>
                ) : (
                  batchSummary.topDiagnoses.map((diag, i) => (
                    <div key={i} className="flex justify-between items-start text-[11px] pb-1.5 border-b border-slate-800/40 last:border-0">
                      <div>
                        <div className="font-semibold text-slate-200">{diag.code}</div>
                        <div className="text-[10px] text-slate-500">{diag.count} prescription claims</div>
                      </div>
                      <div className="font-mono text-emerald-400 font-bold text-right whitespace-nowrap">
                        GHS {diag.amountGhs.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Itemized Claims Preview Table Section */}
      <div className="space-y-3">
        {/* Table Search and Status Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search claims by patient, NHIS card #, prescriber MDC, drug code, ICD-10 diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Vetting Status Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase px-2">Vetting:</span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                statusFilter === 'ALL' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({claimsBatch.length})
            </button>
            <button
              onClick={() => setStatusFilter('CLEAN')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                statusFilter === 'CLEAN' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Clean ({batchSummary.validationSummary.cleanCount})
            </button>
            {batchSummary.validationSummary.warningCount > 0 && (
              <button
                onClick={() => setStatusFilter('WARNINGS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  statusFilter === 'WARNINGS' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Warnings ({batchSummary.validationSummary.warningCount})
              </button>
            )}
            {batchSummary.validationSummary.errorCount > 0 && (
              <button
                onClick={() => setStatusFilter('ERRORS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  statusFilter === 'ERRORS' ? 'bg-rose-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Errors ({batchSummary.validationSummary.errorCount})
              </button>
            )}
          </div>
        </div>

        {/* Claims Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Claim ID &amp; Date</th>
                  <th className="p-3.5">Patient / NHIS Card</th>
                  <th className="p-3.5">Prescriber &amp; Diagnosis</th>
                  <th className="p-3.5">Drug &amp; NHIS Code</th>
                  <th className="p-3.5 text-center">Qty</th>
                  <th className="p-3.5 text-right">Tariff Unit</th>
                  <th className="p-3.5 text-right">NHIA Claim</th>
                  <th className="p-3.5 text-right">Patient Copay</th>
                  <th className="p-3.5 text-center">Pre-Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {tableFilteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500 space-y-2">
                      <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                      <p className="font-semibold text-slate-400">No NHIS claims found for the selected date range and filter criteria.</p>
                      <p className="text-xs text-slate-500">Try choosing a wider date preset (e.g. "Last Month" or "All Records") or perform a dispense transaction with an NHIS patient at the POS.</p>
                    </td>
                  </tr>
                ) : (
                  tableFilteredClaims.map((claim) => {
                    const validation = validateNhisClaim(claim);
                    const isExpanded = expandedClaimId === claim.claimId;

                    return (
                      <React.Fragment key={claim.claimId}>
                        <tr 
                          onClick={() => setExpandedClaimId(isExpanded ? null : claim.claimId)}
                          className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-slate-800/40' : ''
                          }`}
                        >
                          {/* Claim ID & Date */}
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-200 flex items-center gap-1">
                              <span>{claim.claimId}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{claim.dispenseDate}</div>
                          </td>

                          {/* Patient / Card */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-100">{claim.patientName}</div>
                            <div className="font-mono text-emerald-400 text-[11px]">{claim.nhisNumber}</div>
                            <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-semibold">
                              {claim.nhisCategory}
                            </span>
                          </td>

                          {/* Prescriber & Diagnosis */}
                          <td className="p-3.5 max-w-xs">
                            <div className="text-slate-300 font-medium truncate">{claim.prescriberName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{claim.prescriberMdcNumber}</div>
                            <div className="text-[10px] text-sky-400 font-medium truncate">{claim.diagnosisCode}</div>
                          </td>

                          {/* Drug & NHIS Code */}
                          <td className="p-3.5 max-w-xs">
                            <div className="font-semibold text-slate-200 truncate">{claim.drugName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{claim.nhisDrugCode}</div>
                          </td>

                          {/* Qty */}
                          <td className="p-3.5 text-center font-mono font-bold text-slate-200">
                            {claim.quantityDispensed}
                          </td>

                          {/* Tariff Unit */}
                          <td className="p-3.5 text-right font-mono text-slate-400 whitespace-nowrap">
                            GHS {claim.unitTariffGhs.toFixed(2)}
                          </td>

                          {/* Claim Amount */}
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            GHS {claim.totalClaimGhs.toFixed(2)}
                          </td>

                          {/* Copay */}
                          <td className="p-3.5 text-right font-mono text-sky-400 whitespace-nowrap">
                            GHS {claim.copayPaidGhs.toFixed(2)}
                          </td>

                          {/* Pre-Audit Status */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {validation.isValid && validation.warnings.length === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>VALID</span>
                              </span>
                            ) : validation.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                <AlertTriangle className="w-3 h-3" />
                                <span>REVIEW</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                <XCircle className="w-3 h-3" />
                                <span>ERROR</span>
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Claim Row Detail */}
                        {isExpanded && (
                          <tr className="bg-slate-950/70 border-b border-slate-800/80">
                            <td colSpan={9} className="p-4 space-y-3">
                              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                                  <span className="font-bold text-emerald-400 font-mono">
                                    Full Claim Dossier: {claim.claimId} (TX: {claim.transactionId})
                                  </span>
                                  <span className="text-slate-400">
                                    Accredited Facility: <strong>{config.nhiaFacilityCode}</strong>
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                  <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Prescriber Details</span>
                                    <p className="text-slate-200 font-semibold">{claim.prescriberName}</p>
                                    <p className="text-slate-400 font-mono">{claim.prescriberMdcNumber}</p>
                                    <p className="text-sky-400 mt-1">Diagnosis: {claim.diagnosisCode}</p>
                                  </div>

                                  <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Medicines Tariff Computation</span>
                                    <p className="text-slate-200">{claim.drugName}</p>
                                    <p className="text-slate-400 font-mono text-[11px]">{claim.nhisDrugCode} • Qty: {claim.quantityDispensed}</p>
                                    <p className="text-slate-300 mt-1">
                                      Tariff Unit: GHS {claim.unitTariffGhs.toFixed(2)} | Subtotal: GHS {claim.totalClaimGhs.toFixed(2)}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold">NHIA Compliance Audit</span>
                                    {validation.isValid && validation.warnings.length === 0 ? (
                                      <p className="text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Passed all automated NHIA pre-submission checks</span>
                                      </p>
                                    ) : (
                                      <div className="space-y-1 mt-1">
                                        {validation.errors.map((err, idx) => (
                                          <p key={idx} className="text-rose-400 font-semibold flex items-center gap-1">
                                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>{err}</span>
                                          </p>
                                        ))}
                                        {validation.warnings.map((warn, idx) => (
                                          <p key={idx} className="text-amber-400 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            <span>{warn}</span>
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary Bar */}
          <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-400">
              Showing <strong className="text-slate-200">{tableFilteredClaims.length}</strong> of{' '}
              <strong className="text-slate-200">{claimsBatch.length}</strong> total period claims
            </div>

            <div className="flex items-center gap-4 font-mono font-bold">
              <span className="text-slate-400">
                Period Total Claim: <strong className="text-emerald-400 text-sm">GHS {batchSummary.totalClaimAmountGhs.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                Copay: <strong className="text-sky-400 text-sm">GHS {batchSummary.totalCopayAmountGhs.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
