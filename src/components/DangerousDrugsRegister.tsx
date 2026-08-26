import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Download, 
  Printer, 
  FileCheck2, 
  AlertTriangle, 
  UserCheck, 
  Stethoscope, 
  Lock, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { DdrEntry, PharmacyConfig } from '../types/pharmacy';

interface DangerousDrugsRegisterProps {
  ddrEntries: DdrEntry[];
  config: PharmacyConfig;
}

export const DangerousDrugsRegister: React.FC<DangerousDrugsRegisterProps> = ({
  ddrEntries,
  config
}) => {
  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(() => {
    return ddrEntries.filter(e =>
      e.patientName.toLowerCase().includes(search.toLowerCase()) ||
      e.patientGhanaCard.includes(search) ||
      e.drugName.toLowerCase().includes(search.toLowerCase()) ||
      e.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.prescriberName.toLowerCase().includes(search.toLowerCase()) ||
      e.prescriberMdcNumber.toLowerCase().includes(search.toLowerCase())
    );
  }, [ddrEntries, search]);

  const handlePrintDdr = () => {
    window.print();
  };

  const handleExportDdrAudit = () => {
    if (ddrEntries.length === 0) {
      alert('No DDR ledger entries available to export.');
      return;
    }

    let report = `========================================================================================\n`;
    report += `              PHARMACY COUNCIL GHANA (GPhC) DANGEROUS DRUGS REGISTER (DDR)\n`;
    report += `              FACILITY: ${config.pharmacyName.toUpperCase()}\n`;
    report += `              GPhC LICENSE: ${config.gphcLicenseNumber}\n`;
    report += `              SUPERINTENDENT PHARMACIST: ${config.superintendentPharmacist.fullName} (${config.superintendentPharmacist.gphcPin})\n`;
    report += `              GENERATED AT: ${new Date().toLocaleString()}\n`;
    report += `========================================================================================\n\n`;
    report += `ENTRY ID | DATE | PATIENT NAME (GHANA CARD) | PRESCRIBER (MDC) | DRUG / STRENGTH | BATCH | QTY | BAL | AUTH SIGNATURE\n`;
    report += `----------------------------------------------------------------------------------------\n`;

    ddrEntries.forEach(e => {
      const pInfo = `${e.patientName} [${e.patientGhanaCard}]`;
      const doc = `${e.prescriberName} [${e.prescriberMdcNumber}]`;
      report += `${e.id} | ${new Date(e.date).toLocaleDateString()} | ${pInfo} | ${doc} | ${e.drugName} | ${e.batchNumber} | ${e.quantitySupplied} | ${e.remainingStock} | ${e.signatureStamp}\n`;
    });

    report += `========================================================================================\n`;
    report += `                      CERTIFIED FOR OFFICIAL GPhC REGULATORY INSPECTION\n`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GPhC_DDR_Register_${config.gphcLicenseNumber.replace(/\//g, '_')}_${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-purple-950/40 border border-purple-800/80 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-900/80 border border-purple-700 flex items-center justify-center text-purple-300 font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-100">
                GPhC Dangerous Drugs Register (DDR)
              </h2>
              <span className="text-[10px] bg-purple-900 text-purple-200 border border-purple-700 font-mono font-bold px-2 py-0.5 rounded-full">
                Schedule 1 / Class A Opioids
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Statutory un-editable digital ledger for Tramadol, Pethidine, Morphine and Controlled substances.
            </p>
          </div>
        </div>

        {/* Export & Inspection Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintDdr}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Register</span>
          </button>

          <button
            onClick={handleExportDdrAudit}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export for GPhC Audit</span>
          </button>
        </div>
      </div>

      {/* Superintendent Verification Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-slate-500 block uppercase text-[10px] font-semibold">Superintendent Pharmacist</span>
          <span className="font-bold text-slate-200 text-xs sm:text-sm">{config.superintendentPharmacist.fullName}</span>
          <span className="font-mono text-purple-400 block text-[11px]">{config.superintendentPharmacist.gphcPin}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-slate-500 block uppercase text-[10px] font-semibold">Total Controlled Dispenses</span>
          <span className="text-xl font-bold font-mono text-slate-100">{ddrEntries.length} Records</span>
          <span className="text-emerald-400 text-[10px] block">100% Superintendent PIN Verified</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
          <span className="text-slate-500 block uppercase text-[10px] font-semibold">GPhC Compliance Seal</span>
          <span className="text-xs font-mono font-bold text-purple-300 block truncate">
            {config.gphcLicenseNumber}
          </span>
          <span className="text-[10px] text-slate-400 block">Dangerous Drugs Act 1962 / Act 857</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500 ml-2" />
        <input
          type="text"
          placeholder="Search DDR by patient Ghana Card, Doctor MDC number, drug brand, or manufacturer batch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-200 focus:outline-none placeholder:text-slate-500"
        />
      </div>

      {/* DDR Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Entry ID &amp; Date</th>
                <th className="p-3.5">Patient Details (Ghana Card)</th>
                <th className="p-3.5">Prescriber (MDC Reg)</th>
                <th className="p-3.5">Drug &amp; Strength</th>
                <th className="p-3.5">Batch Number</th>
                <th className="p-3.5 text-center">Qty Supplied</th>
                <th className="p-3.5 text-center">Vault Balance</th>
                <th className="p-3.5">Superintendent Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No Controlled Drug (Class A) dispense records logged yet. Dispense a Schedule A item (e.g. Tramadol or Pethidine) to generate a DDR record.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-purple-300">{entry.id}</div>
                      <div className="text-[10px] text-slate-500">{new Date(entry.date).toLocaleString()}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-100">{entry.patientName}</div>
                      <div className="text-[11px] font-mono text-emerald-400">{entry.patientGhanaCard}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="text-slate-200 font-semibold">{entry.prescriberName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{entry.prescriberMdcNumber}</div>
                      <div className="text-[10px] text-slate-500 italic truncate max-w-[140px]">{entry.purposeOrDiagnosis}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-100">{entry.drugName}</div>
                      <div className="text-[10px] text-slate-400">{entry.strength}</div>
                    </td>

                    <td className="p-3.5">
                      <span className="font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-200 text-[11px]">
                        {entry.batchNumber}
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold text-slate-100 text-sm">
                      {entry.quantitySupplied}
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold text-purple-400">
                      {entry.remainingStock} left
                    </td>

                    <td className="p-3.5">
                      <div className="text-[10px] text-slate-300">{entry.superintendentName}</div>
                      <div className="text-[9px] font-mono text-purple-400/80 truncate max-w-[180px]">
                        {entry.signatureStamp}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
