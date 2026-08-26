import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  QrCode as QrIcon,
  Share2
} from 'lucide-react';
import { TransactionRecord, PharmacyConfig } from '../types/pharmacy';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionRecord | null;
  config: PharmacyConfig;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  config
}) => {
  if (!isOpen || !transaction) return null;

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (transaction.graEvat.graQrCodeString) {
      QRCode.toDataURL(transaction.graEvat.graQrCodeString, { width: 140, margin: 1 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('Error generating GRA QR code', err));
    }
  }, [transaction]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTextReceipt = () => {
    let content = `================================================\n`;
    content += `        ${config.pharmacyName.toUpperCase()}\n`;
    content += `        ${config.branchName}\n`;
    content += `        ${config.location}\n`;
    content += `        TEL: ${config.phone}\n`;
    content += `        GRA TIN: ${config.graTin}\n`;
    content += `        GPhC LIC: ${config.gphcLicenseNumber}\n`;
    content += `================================================\n`;
    content += `GRA INVOICE NO: ${transaction.graEvat.graInvoiceNumber}\n`;
    content += `DATE/TIME: ${new Date(transaction.timestamp).toLocaleString()}\n`;
    content += `CASHIER: ${transaction.cashierName}\n`;
    content += `LANE: ${transaction.lane === 'clinical' ? 'CLINICAL PRESCRIPTION (Rx)' : 'OTC RETAIL'}\n`;
    if (transaction.patient) {
      content += `PATIENT: ${transaction.patient.fullName} (${transaction.patient.nationalId})\n`;
      if (transaction.patient.nhisNumber) {
        content += `NHIS NO: ${transaction.patient.nhisNumber}\n`;
      }
    }
    content += `------------------------------------------------\n`;
    content += `ITEMS DISPENSED:\n`;
    transaction.items.forEach((item, idx) => {
      content += `${idx + 1}. ${item.drug.brandName} (${item.drug.strength})\n`;
      content += `   Batch: ${item.selectedBatch.batchNumber}  Qty: ${item.quantity} x ${item.unitPrice.toFixed(2)} = GHS ${item.totalPrice.toFixed(2)}\n`;
      if (item.dosageInstructions) {
        content += `   Dosage: ${item.dosageInstructions}\n`;
      }
    });
    content += `------------------------------------------------\n`;
    content += `TAXABLE BASE:          GHS ${transaction.taxBreakdown.taxableAmount.toFixed(2)}\n`;
    content += `NHIL (2.5%):           GHS ${transaction.taxBreakdown.nhilAmount.toFixed(2)}\n`;
    content += `GETFund (2.5%):        GHS ${transaction.taxBreakdown.getfundAmount.toFixed(2)}\n`;
    content += `COVID-19 HRL (1.0%):   GHS ${transaction.taxBreakdown.covidAmount.toFixed(2)}\n`;
    content += `STANDARD VAT (15%):    GHS ${transaction.taxBreakdown.standardVatAmount.toFixed(2)}\n`;
    content += `TOTAL TAX & LEVIES:    GHS ${transaction.taxBreakdown.totalTax.toFixed(2)}\n`;
    content += `GRAND TOTAL PAYABLE:   GHS ${transaction.grossAmount.toFixed(2)}\n`;
    content += `================================================\n`;
    content += `MULTI-CHANNEL SPLIT SETTLEMENT:\n`;
    if (transaction.splitBilling.nhisAmount > 0) {
      content += `* NHIS CLAIMS COVER:    GHS ${transaction.splitBilling.nhisAmount.toFixed(2)}\n`;
    }
    if (transaction.splitBilling.privateInsuranceAmount > 0) {
      content += `* ${transaction.splitBilling.privateInsurerName || 'PRIVATE INSURER'}: GHS ${transaction.splitBilling.privateInsuranceAmount.toFixed(2)}\n`;
    }
    if (transaction.splitBilling.momoAmount > 0) {
      content += `* MOMO (${transaction.splitBilling.momoProvider || 'TELECOM'}):  GHS ${transaction.splitBilling.momoAmount.toFixed(2)} [Ref: ${transaction.splitBilling.momoTransactionId || 'TXN-OK'}]\n`;
    }
    if (transaction.splitBilling.ghqrAmount > 0) {
      content += `* GhIPSS GhQR / GH-PAY: GHS ${transaction.splitBilling.ghqrAmount.toFixed(2)} [Ref: ${transaction.splitBilling.ghqrReference}]\n`;
    }
    if (transaction.splitBilling.cashAmount > 0) {
      content += `* PATIENT CASH TENDER:  GHS ${transaction.splitBilling.cashAmount.toFixed(2)}\n`;
    }
    content += `------------------------------------------------\n`;
    content += `GRA FISCAL HASH: ${transaction.graEvat.graSecurityHash}\n`;
    content += `GRA VERIFICATION: ${transaction.graEvat.graQrCodeString}\n`;
    if (transaction.hasControlledDrugs) {
      content += `[GPhC REGISTERED DANGEROUS DRUG DISPENSE - DDR ENTRY # ${transaction.ddrEntryId || 'LOGGED'}]\n`;
    }
    content += `================================================\n`;
    content += `      THANK YOU FOR VISITING PHARMATRACK\n`;
    content += `       POWERED BY GRA E-VAT REVENUE SYSTEM\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${transaction.graEvat.graInvoiceNumber}.txt`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Actions Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Transaction Certified & Recorded</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadTextReceipt}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Download Text Receipt"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-5 overflow-y-auto flex-1 flex justify-center bg-slate-950/60">
          <div 
            id="thermal-receipt" 
            className="w-full max-w-sm bg-white text-slate-950 p-6 rounded-2xl shadow-xl font-mono text-[11px] leading-relaxed border border-slate-200"
          >
            {/* Pharmacy Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
              <div className="font-extrabold text-sm tracking-tight text-slate-900">
                {config.pharmacyName.toUpperCase()}
              </div>
              <div className="text-[10px] text-slate-700">{config.branchName}</div>
              <div className="text-[9px] text-slate-600">{config.location}</div>
              <div className="text-[10px] font-bold text-slate-800">TEL: {config.phone}</div>
              <div className="text-[10px] font-bold text-emerald-800">GRA TIN: {config.graTin}</div>
              <div className="text-[9px] text-slate-600">GPhC LIC: {config.gphcLicenseNumber}</div>
            </div>

            {/* Official GRA E-VAT Banner */}
            <div className="my-2.5 p-2 bg-slate-100 rounded text-center border border-slate-300">
              <div className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                GRA OFFICIAL TAX INVOICE
              </div>
              <div className="text-xs font-black text-slate-900 mt-0.5">
                {transaction.graEvat.graInvoiceNumber}
              </div>
              <div className="text-[8px] text-slate-600 font-sans mt-0.5">
                Mode: {transaction.graEvat.transmissionMode === 'REAL_TIME' ? 'REAL-TIME TRANSMISSION' : 'OFFLINE CERTIFIED QUEUE'}
              </div>
            </div>

            {/* Transaction Metadata */}
            <div className="text-[10px] space-y-0.5 pb-2 border-b border-dashed border-slate-300 text-slate-700">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(transaction.timestamp).toLocaleDateString()} {new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{transaction.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Lane:</span>
                <span>{transaction.lane === 'clinical' ? 'Clinical (Rx)' : 'OTC Retail'}</span>
              </div>
              {transaction.patient && (
                <>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Patient:</span>
                    <span className="truncate max-w-[160px]">{transaction.patient.fullName}</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span>Ghana Card:</span>
                    <span>{transaction.patient.nationalId}</span>
                  </div>
                  {transaction.patient.nhisNumber && (
                    <div className="flex justify-between text-emerald-800 font-bold">
                      <span>NHIS No:</span>
                      <span>{transaction.patient.nhisNumber}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Line Items */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-2">
              <div className="text-[9px] font-bold text-slate-500 uppercase flex justify-between">
                <span>Item / Batch</span>
                <span>Qty x Price</span>
              </div>
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span className="truncate max-w-[190px]">{item.drug.brandName}</span>
                    <span>GHS {item.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600">
                    <span>{item.drug.strength} (B: {item.selectedBatch.batchNumber})</span>
                    <span>{item.quantity} @ {item.unitPrice.toFixed(2)}</span>
                  </div>
                  {item.dosageInstructions && (
                    <div className="text-[9px] text-slate-500 italic">
                      Rx: {item.dosageInstructions}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Ghana Statutory Taxes & Levies Breakdown */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5 text-slate-700">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span>GHS {transaction.taxBreakdown.taxableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>NHIL (2.5%):</span>
                <span>GHS {transaction.taxBreakdown.nhilAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GETFund (2.5%):</span>
                <span>GHS {transaction.taxBreakdown.getfundAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>COVID-19 HRL (1.0%):</span>
                <span>GHS {transaction.taxBreakdown.covidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Standard VAT (15%):</span>
                <span>GHS {transaction.taxBreakdown.standardVatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL TAX & LEVIES:</span>
                <span>GHS {transaction.taxBreakdown.totalTax.toFixed(2)}</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="py-2.5 flex justify-between items-center text-xs font-black border-b border-dashed border-slate-400 text-slate-950">
              <span>GRAND TOTAL:</span>
              <span className="text-sm">GHS {transaction.grossAmount.toFixed(2)}</span>
            </div>

            {/* Split-Billing Settlement Summary */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-1">
              <div className="font-bold text-slate-800 uppercase text-[9px]">Payment Settlement Breakdown:</div>
              {transaction.splitBilling.nhisAmount > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>• NHIS Cover:</span>
                  <span>GHS {transaction.splitBilling.nhisAmount.toFixed(2)}</span>
                </div>
              )}
              {transaction.splitBilling.privateInsuranceAmount > 0 && (
                <div className="flex justify-between text-sky-800 font-bold">
                  <span>• {transaction.splitBilling.privateInsurerName || 'Private Insurer'}:</span>
                  <span>GHS {transaction.splitBilling.privateInsuranceAmount.toFixed(2)}</span>
                </div>
              )}
              {transaction.splitBilling.momoAmount > 0 && (
                <div className="flex justify-between text-amber-900 font-bold">
                  <span>• MoMo ({transaction.splitBilling.momoProvider}):</span>
                  <span>GHS {transaction.splitBilling.momoAmount.toFixed(2)}</span>
                </div>
              )}
              {transaction.splitBilling.ghqrAmount > 0 && (
                <div className="flex justify-between text-sky-900 font-bold">
                  <span>• GhQR / Ghana Pay:</span>
                  <span>GHS {transaction.splitBilling.ghqrAmount.toFixed(2)}</span>
                </div>
              )}
              {transaction.splitBilling.cashAmount > 0 && (
                <div className="flex justify-between text-slate-900 font-bold">
                  <span>• Patient Cash Copay:</span>
                  <span>GHS {transaction.splitBilling.cashAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Controlled Drugs GPhC Register Stamp (if Class A) */}
            {transaction.hasControlledDrugs && (
              <div className="my-2 p-1.5 bg-purple-50 rounded border border-purple-300 text-[9px] text-purple-900">
                <div className="font-black uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> GPhC CONTROLLED DRUG REGISTERED
                </div>
                <div>Superintendent: {config.superintendentPharmacist.fullName}</div>
                <div>MDC Prescriber: {transaction.prescription?.prescriberName || 'MDC Registered'}</div>
              </div>
            )}

            {/* GRA QR Code & Verification Block */}
            <div className="pt-3 text-center space-y-1.5 flex flex-col items-center">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="GRA E-VAT QR Code" className="w-28 h-28 mx-auto" />
              ) : (
                <div className="w-28 h-28 bg-slate-100 flex items-center justify-center text-slate-400">
                  QR Loading...
                </div>
              )}
              <div className="text-[8px] text-slate-500 max-w-[240px] truncate">
                Hash: {transaction.graEvat.graSecurityHash}
              </div>
              <div className="text-[9px] font-bold text-slate-800">
                Scan QR with GRA Taxpayers App to verify invoice authenticity
              </div>
              <div className="text-[8px] text-slate-500 uppercase tracking-widest pt-1">
                PharmaTrack ERP • Ghana Market Localization
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
