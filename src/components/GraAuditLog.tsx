import React, { useState, useMemo } from 'react';
import { 
  History, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Search, 
  FileText, 
  Lock, 
  ArrowRight,
  Database,
  ExternalLink,
  Layers
} from 'lucide-react';
import { TransactionRecord, AuditLog, PharmacyConfig } from '../types/pharmacy';

interface GraAuditLogProps {
  transactions: TransactionRecord[];
  auditLogs: AuditLog[];
  config: PharmacyConfig;
  onSyncOfflineQueue: () => void;
  isSyncing: boolean;
}

export const GraAuditLog: React.FC<GraAuditLogProps> = ({
  transactions,
  auditLogs,
  config,
  onSyncOfflineQueue,
  isSyncing
}) => {
  const [activeTab, setActiveTab] = useState<'gra_transmissions' | 'crypto_audit'>('gra_transmissions');
  const [search, setSearch] = useState('');

  const offlineQueued = useMemo(() => {
    return transactions.filter(t => t.graEvat.status === 'QUEUED_OFFLINE');
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t =>
      t.graEvat.graInvoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.cashierName.toLowerCase().includes(search.toLowerCase()) ||
      t.graEvat.graSecurityHash.toLowerCase().includes(search.toLowerCase()) ||
      (t.patient && t.patient.fullName.toLowerCase().includes(search.toLowerCase()))
    );
  }, [transactions, search]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(a =>
      a.action.toLowerCase().includes(search.toLowerCase()) ||
      a.userName.toLowerCase().includes(search.toLowerCase()) ||
      a.module.toLowerCase().includes(search.toLowerCase()) ||
      a.hash.toLowerCase().includes(search.toLowerCase())
    );
  }, [auditLogs, search]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Sub Tab Selector & Offline Queue Sync Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              onClick={() => setActiveTab('gra_transmissions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'gra_transmissions'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>GRA E-VAT Transmissions ({transactions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('crypto_audit')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'crypto_audit'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cryptographic Immutable Audit Trail ({auditLogs.length})</span>
            </button>
          </div>
        </div>

        {/* Sync Offline Queue Button */}
        {offlineQueued.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="text-xs text-amber-400 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{offlineQueued.length} invoices queued offline</span>
            </div>
            <button
              onClick={onSyncOfflineQueue}
              disabled={isSyncing || !config.isOnlineMode}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all ${
                config.isOnlineMode
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Reconciling with GRA Server...' : 'Flush / Sync Queue'}</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: GRA E-VAT TRANSMISSIONS LEDGER */}
      {activeTab === 'gra_transmissions' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Registered TIN</span>
              <span className="font-mono font-bold text-slate-100 text-sm">{config.graTin}</span>
              <span className="text-[10px] text-slate-400 block">{config.pharmacyName}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Total Transmitted</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {transactions.filter(t => t.graEvat.status === 'SUCCESS').length} Invoices
              </span>
              <span className="text-[10px] text-slate-400 block">Real-time certified</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Offline Queue</span>
              <span className="text-xl font-bold font-mono text-amber-400">
                {offlineQueued.length} Pending
              </span>
              <span className="text-[10px] text-slate-400 block">Encrypted local buffer</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-slate-500 uppercase text-[10px] font-semibold block">GRA Gateway Server</span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>evat.gra.gov.gh/api/v1</span>
              </span>
              <span className="text-[10px] text-slate-400 block">Active TLS 1.3</span>
            </div>
          </div>

          {/* Search */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-500 ml-2" />
            <input
              type="text"
              placeholder="Search GRA logs by invoice number, cashier, patient, security hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-200 focus:outline-none placeholder:text-slate-500"
            />
          </div>

          {/* GRA Invoices Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">GRA Invoice No.</th>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Cashier / Lane</th>
                    <th className="p-3.5">Patient / Items</th>
                    <th className="p-3.5 text-right">Taxable Base</th>
                    <th className="p-3.5 text-right">Tax &amp; Levies</th>
                    <th className="p-3.5 text-right">Gross Total</th>
                    <th className="p-3.5">GRA Hash &amp; Mode</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        No transactions recorded in the current session.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-emerald-400">{tx.graEvat.graInvoiceNumber}</div>
                          <div className="text-[10px] text-slate-500">Seq #{tx.sequenceNumber}</div>
                        </td>

                        <td className="p-3.5 text-[11px] text-slate-400">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">{tx.cashierName}</div>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded uppercase">
                            {tx.lane}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-200">
                            {tx.patient?.fullName || 'Walk-in Retail Buyer'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                            {tx.items.map(i => `${i.quantity}x ${i.drug.brandName}`).join(', ')}
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-mono text-slate-300">
                          GHS {tx.taxBreakdown.taxableAmount.toFixed(2)}
                        </td>

                        <td className="p-3.5 text-right font-mono text-slate-400">
                          GHS {tx.taxBreakdown.totalTax.toFixed(2)}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                          GHS {tx.grossAmount.toFixed(2)}
                        </td>

                        <td className="p-3.5">
                          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={tx.graEvat.graSecurityHash}>
                            {tx.graEvat.graSecurityHash}
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {tx.graEvat.transmissionMode}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.graEvat.status === 'SUCCESS'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                          }`}>
                            {tx.graEvat.status === 'SUCCESS' ? 'CERTIFIED' : 'QUEUED'}
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

      {/* VIEW 2: CRYPTOGRAPHIC AUDIT TRAIL */}
      {activeTab === 'crypto_audit' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-300 font-bold">
                #
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Immutable Cryptographic Hash Ledger
                </h3>
                <p className="text-xs text-slate-400">
                  Every price adjustment, stock alteration, and insurance override is permanently recorded with SHA-256 hash chaining.
                </p>
              </div>
            </div>
            <span className="text-xs bg-purple-950 text-purple-300 border border-purple-800 px-2.5 py-1 rounded-lg font-mono">
              Tamper-Proof Chaining: ACTIVE
            </span>
          </div>

          {/* Search */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-500 ml-2" />
            <input
              type="text"
              placeholder="Search audit trail by user, module, action, or block hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-200 focus:outline-none placeholder:text-slate-500"
            />
          </div>

          {/* Audit Trail Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Log ID &amp; Timestamp</th>
                    <th className="p-3.5">User / Role</th>
                    <th className="p-3.5">Module</th>
                    <th className="p-3.5">Action &amp; Entity</th>
                    <th className="p-3.5">Previous Value</th>
                    <th className="p-3.5">New Altered Value</th>
                    <th className="p-3.5">Device Terminal IP</th>
                    <th className="p-3.5">Cryptographic Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No audit events recorded yet. System mutations (dispensing, stock additions) will appear here.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-slate-200">{log.id}</div>
                          <div className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-100">{log.userName}</div>
                          <span className="text-[10px] text-slate-400">{log.role}</span>
                        </td>

                        <td className="p-3.5">
                          <span className="text-[10px] font-bold bg-slate-950 text-purple-300 border border-purple-900 px-2 py-0.5 rounded font-mono">
                            {log.module}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">{log.action}</div>
                          {log.entityId && (
                            <div className="text-[10px] font-mono text-slate-500">ID: {log.entityId}</div>
                          )}
                        </td>

                        <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                          {log.oldValue || '—'}
                        </td>

                        <td className="p-3.5 font-mono text-emerald-400 text-[11px] font-bold">
                          {log.newValue || '—'}
                        </td>

                        <td className="p-3.5 font-mono text-slate-500 text-[10px]">
                          {log.ipDeviceId}
                        </td>

                        <td className="p-3.5 font-mono text-[10px] text-purple-400 truncate max-w-[140px]" title={log.hash}>
                          {log.hash}
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
    </div>
  );
};
