import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Building2, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Search, 
  Filter, 
  Plus, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { TransactionRecord, PrivateInsurer, PharmacyConfig, NhisClaimBatchItem } from '../types/pharmacy';
import { generateNhisGFormBatch, exportGFormCsv } from '../services/nhisService';

interface NhisDebtorLedgerProps {
  transactions: TransactionRecord[];
  insurers: PrivateInsurer[];
  onUpdateInsurer: (insurer: PrivateInsurer) => void;
  config: PharmacyConfig;
}

export const NhisDebtorLedger: React.FC<NhisDebtorLedgerProps> = ({
  transactions,
  insurers,
  onUpdateInsurer,
  config
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'nhis_gform' | 'private_debtors'>('nhis_gform');
  const [claimSearch, setClaimSearch] = useState('');
  const [selectedInsurerForPayment, setSelectedInsurerForPayment] = useState<PrivateInsurer | null>(null);
  const [remittanceAmount, setRemittanceAmount] = useState<number>(0);
  const [remittanceRef, setRemittanceRef] = useState('');

  // Extract NHIS Claims
  const nhisClaims = useMemo(() => {
    return generateNhisGFormBatch(transactions);
  }, [transactions]);

  const filteredClaims = useMemo(() => {
    return nhisClaims.filter(c => 
      c.patientName.toLowerCase().includes(claimSearch.toLowerCase()) ||
      c.nhisNumber.includes(claimSearch) ||
      c.drugName.toLowerCase().includes(claimSearch.toLowerCase()) ||
      c.claimId.toLowerCase().includes(claimSearch.toLowerCase())
    );
  }, [nhisClaims, claimSearch]);

  const nhisTotals = useMemo(() => {
    const totalClaimsGhs = nhisClaims.reduce((sum, c) => sum + c.totalClaimGhs, 0);
    const totalCopayGhs = nhisClaims.reduce((sum, c) => sum + c.copayPaidGhs, 0);
    return { totalClaimsGhs, totalCopayGhs, count: nhisClaims.length };
  }, [nhisClaims]);

  const privateDebtorTotals = useMemo(() => {
    const totalReceivable = insurers.reduce((sum, i) => sum + i.outstandingBalance, 0);
    const totalClaims = insurers.reduce((sum, i) => sum + i.claimsCount, 0);
    return { totalReceivable, totalClaims };
  }, [insurers]);

  const handleExportCsv = () => {
    if (nhisClaims.length === 0) {
      alert('No NHIS claims available to export.');
      return;
    }
    const csvContent = exportGFormCsv(nhisClaims, config.nhiaFacilityCode);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NHIS_GForm_Batch_${config.nhiaFacilityCode}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleApplyRemittance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInsurerForPayment || remittanceAmount <= 0) return;

    const newBalance = Math.max(0, selectedInsurerForPayment.outstandingBalance - remittanceAmount);
    const updated: PrivateInsurer = {
      ...selectedInsurerForPayment,
      outstandingBalance: parseFloat(newBalance.toFixed(2))
    };

    onUpdateInsurer(updated);
    setSelectedInsurerForPayment(null);
    setRemittanceAmount(0);
    setRemittanceRef('');
    alert(`Payment of GHS ${remittanceAmount.toFixed(2)} credited to ${updated.name}. New outstanding balance: GHS ${newBalance.toFixed(2)}`);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Sub-Tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              onClick={() => setActiveSubTab('nhis_gform')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'nhis_gform'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>NHIS G-Form Claims Batch ({nhisClaims.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('private_debtors')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'private_debtors'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Private Insurer Debtor Ledgers ({insurers.length})</span>
            </button>
          </div>
        </div>

        {activeSubTab === 'nhis_gform' && (
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export NHIA G-Form CSV</span>
          </button>
        )}
      </div>

      {/* VIEW 1: NHIS G-FORM BATCH CLAIMS */}
      {activeSubTab === 'nhis_gform' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">Total G-Form Claims</span>
              <span className="text-xl font-bold font-mono text-slate-100">{nhisTotals.count} items</span>
              <span className="text-[10px] text-slate-500 block">Facility: {config.nhiaFacilityCode}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">Gross NHIA Claim Value</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                GHS {nhisTotals.totalClaimsGhs.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block">Tariff Subsidized</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">Collected Patient Copay</span>
              <span className="text-xl font-bold font-mono text-sky-400">
                GHS {nhisTotals.totalCopayGhs.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block">Non-covered &amp; Tariff diff</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-500 ml-2" />
            <input
              type="text"
              placeholder="Search claims by patient name, NHIS number, drug description, claim ID..."
              value={claimSearch}
              onChange={(e) => setClaimSearch(e.target.value)}
              className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-200 focus:outline-none placeholder:text-slate-500"
            />
          </div>

          {/* NHIS Claims Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
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
                    <th className="p-3.5 text-right">Claim Amount</th>
                    <th className="p-3.5 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No NHIS claim records generated yet. Perform a checkout using NHIS profile in POS to populate.
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((claim) => (
                      <tr key={claim.claimId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-slate-200">{claim.claimId}</div>
                          <div className="text-[10px] text-slate-500">{claim.dispenseDate}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-100">{claim.patientName}</div>
                          <div className="font-mono text-emerald-400 text-[11px]">{claim.nhisNumber}</div>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded">
                            {claim.nhisCategory}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="text-slate-300">{claim.prescriberName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{claim.prescriberMdcNumber}</div>
                          <div className="text-[10px] text-slate-400">{claim.diagnosisCode}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">{claim.drugName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{claim.nhisDrugCode}</div>
                        </td>

                        <td className="p-3.5 text-center font-mono font-bold text-slate-200">
                          {claim.quantityDispensed}
                        </td>

                        <td className="p-3.5 text-right font-mono text-slate-400">
                          GHS {claim.unitTariffGhs.toFixed(2)}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                          GHS {claim.totalClaimGhs.toFixed(2)}
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {claim.status.replace('_', ' ')}
                          </span>
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

      {/* VIEW 2: PRIVATE INSURERS DEBTOR LEDGERS */}
      {activeSubTab === 'private_debtors' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                Total Outstanding Corporate Receivables
              </span>
              <span className="text-2xl font-black font-mono text-amber-400">
                GHS {privateDebtorTotals.totalReceivable.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 block">Accrued across {insurers.length} private insurers</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                Cumulative Insurer Claims
              </span>
              <span className="text-2xl font-black font-mono text-slate-100">
                {privateDebtorTotals.totalClaims} Claims
              </span>
              <span className="text-[10px] text-slate-500 block">Monthly settlement cycle active</span>
            </div>
          </div>

          {/* Insurer Ledgers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insurers.map((insurer) => (
              <div
                key={insurer.id}
                className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">{insurer.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400">{insurer.code}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded-full">
                      {100 - insurer.defaultCopayPercentage}% Coverage
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Outstanding Balance:</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        GHS {insurer.outstandingBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Claims Logged:</span>
                      <span className="font-mono text-slate-200">{insurer.claimsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contact Desk:</span>
                      <span className="text-slate-300">{insurer.contactPerson} ({insurer.contactPhone})</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex gap-2">
                  <a
                    href={insurer.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Claims Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => setSelectedInsurerForPayment(insurer)}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow"
                  >
                    <span>Post Remittance</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remittance Payment Modal */}
      {selectedInsurerForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Post Insurer Remittance</h3>
                <p className="text-xs text-slate-400">{selectedInsurerForPayment.name}</p>
              </div>
              <button
                onClick={() => setSelectedInsurerForPayment(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Current Outstanding:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                GHS {selectedInsurerForPayment.outstandingBalance.toFixed(2)}
              </span>
            </div>

            <form onSubmit={handleApplyRemittance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Remitted Payment Amount (GHS)</label>
                <input
                  type="number"
                  step="0.10"
                  max={selectedInsurerForPayment.outstandingBalance}
                  value={remittanceAmount}
                  onChange={(e) => setRemittanceAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bank Cheque / Electronic Remittance Ref</label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-GCB-984210 or ACH-REM-0012"
                  value={remittanceRef}
                  onChange={(e) => setRemittanceRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInsurerForPayment(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow"
                >
                  Credit Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
