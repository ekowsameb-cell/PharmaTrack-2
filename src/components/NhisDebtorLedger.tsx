import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Building2, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { TransactionRecord, PrivateInsurer, PharmacyConfig } from '../types/pharmacy';
import { GFormReportGenerator } from './GFormReportGenerator';

interface NhisDebtorLedgerProps {
  transactions: TransactionRecord[];
  insurers: PrivateInsurer[];
  onUpdateInsurer: (insurer: PrivateInsurer) => void;
  config: PharmacyConfig;
  onAuditLogUpdate?: () => void;
}

export const NhisDebtorLedger: React.FC<NhisDebtorLedgerProps> = ({
  transactions,
  insurers,
  onUpdateInsurer,
  config,
  onAuditLogUpdate
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'nhis_gform' | 'private_debtors'>('nhis_gform');
  const [selectedInsurerForPayment, setSelectedInsurerForPayment] = useState<PrivateInsurer | null>(null);
  const [remittanceAmount, setRemittanceAmount] = useState<number>(0);
  const [remittanceRef, setRemittanceRef] = useState('');

  const privateDebtorTotals = useMemo(() => {
    const totalReceivable = insurers.reduce((sum, i) => sum + i.outstandingBalance, 0);
    const totalClaims = insurers.reduce((sum, i) => sum + i.claimsCount, 0);
    return { totalReceivable, totalClaims };
  }, [insurers]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
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
              <span>G-Form Claims Report Generator</span>
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

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>NHIA Facility ID: <strong className="text-emerald-400">{config.nhiaFacilityCode}</strong></span>
        </div>
      </div>

      {/* VIEW 1: NHIS G-FORM REPORT GENERATOR & PRE-SUBMISSION BATCH */}
      {activeSubTab === 'nhis_gform' && (
        <GFormReportGenerator
          transactions={transactions}
          config={config}
          onAuditLogUpdate={onAuditLogUpdate}
        />
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

