import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Send,
  Smartphone,
  MessageSquare,
  Copy,
  Check,
  Phone,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Radio
} from 'lucide-react';
import { TransactionRecord, PharmacyConfig } from '../types/pharmacy';
import { 
  formatGhanaPhoneNumber, 
  formatWhatsAppReceipt, 
  formatSmsReceipt, 
  getWhatsAppShareUrl, 
  getSmsShareUrl, 
  simulateSendSms,
  SmsDispatchResult
} from '../services/receiptMessagingService';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionRecord | null;
  config: PharmacyConfig;
}

type ShareChannel = 'whatsapp' | 'sms' | null;

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  config
}) => {
  if (!isOpen || !transaction) return null;

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>(() => {
    return transaction.patient?.phone || '0244123456';
  });
  const [activeChannel, setActiveChannel] = useState<ShareChannel>('whatsapp');
  const [smsFormatType, setSmsFormatType] = useState<'full' | 'compact'>('full');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSendingSms, setIsSendingSms] = useState<boolean>(false);
  const [smsDispatchSuccess, setSmsDispatchSuccess] = useState<SmsDispatchResult | null>(null);
  const [showTextPreview, setShowTextPreview] = useState<boolean>(false);

  useEffect(() => {
    if (transaction.graEvat.graQrCodeString) {
      QRCode.toDataURL(transaction.graEvat.graQrCodeString, { width: 140, margin: 1 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('Error generating GRA QR code', err));
    }
  }, [transaction]);

  useEffect(() => {
    if (transaction.patient?.phone) {
      setRecipientPhone(transaction.patient.phone);
    }
  }, [transaction]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTextReceipt = () => {
    const content = formatWhatsAppReceipt(transaction, config);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${transaction.graEvat.graInvoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // WhatsApp Handler
  const handleOpenWhatsApp = () => {
    const msg = formatWhatsAppReceipt(transaction, config);
    const url = getWhatsAppShareUrl(recipientPhone, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // SMS Handlers
  const handleOpenNativeSms = () => {
    const msg = formatSmsReceipt(transaction, config, smsFormatType === 'compact');
    const url = getSmsShareUrl(recipientPhone, msg);
    window.open(url, '_blank');
  };

  const handleDispatchCloudSms = async () => {
    setIsSendingSms(true);
    setSmsDispatchSuccess(null);
    try {
      const msg = formatSmsReceipt(transaction, config, smsFormatType === 'compact');
      const res = await simulateSendSms(recipientPhone, msg);
      setSmsDispatchSuccess(res);
    } catch (e) {
      console.error('Failed to dispatch cloud SMS', e);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleCopyMessage = async () => {
    const msg = activeChannel === 'whatsapp' 
      ? formatWhatsAppReceipt(transaction, config)
      : formatSmsReceipt(transaction, config, smsFormatType === 'compact');

    try {
      await navigator.clipboard.writeText(msg);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write error', err);
    }
  };

  const phoneInfo = formatGhanaPhoneNumber(recipientPhone);
  const currentPreviewMessage = activeChannel === 'whatsapp' 
    ? formatWhatsAppReceipt(transaction, config)
    : formatSmsReceipt(transaction, config, smsFormatType === 'compact');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span>Official GRA Fiscal Tax Invoice</span>
              <span className="font-mono text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                {transaction.graEvat.graInvoiceNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Receipt</span>
            </button>

            <button
              onClick={handleDownloadTextReceipt}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Download Text Receipt"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content: Split View (Thermal Receipt + WhatsApp/SMS Dispatch Panel) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1 bg-slate-950/60 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* Left Column: WhatsApp / SMS Digital Dispatch Station */}
          <div className="lg:col-span-6 p-4 sm:p-5 space-y-4 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              
              {/* Channel Tabs: WhatsApp vs SMS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    Digital Receipt Dispatch
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    WhatsApp &amp; SMS Ready
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChannel('whatsapp');
                      setSmsDispatchSuccess(null);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      activeChannel === 'whatsapp'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Receipt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveChannel('sms');
                      setSmsDispatchSuccess(null);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      activeChannel === 'sms'
                        ? 'bg-sky-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Ghana SMS</span>
                  </button>
                </div>
              </div>

              {/* Recipient Phone Input */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Recipient Mobile Number (MTN / Telecel / AT):
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm focus-within:border-emerald-500 transition-colors">
                  <Phone className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => {
                      setRecipientPhone(e.target.value);
                      setSmsDispatchSuccess(null);
                    }}
                    placeholder="e.g. 0244 123 456"
                    className="w-full bg-transparent text-slate-100 font-mono focus:outline-none placeholder:text-slate-600 text-xs sm:text-sm"
                  />
                  {recipientPhone && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                      {phoneInfo.international}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>Patient: <strong className="text-slate-200">{transaction.patient?.fullName || 'Walk-in Customer'}</strong></span>
                  <span className="text-slate-500">Auto-formatted with +233 prefix</span>
                </div>
              </div>

              {/* Channel Specific Dispatch Controls */}
              {activeChannel === 'whatsapp' ? (
                <div className="space-y-3 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Direct Instant Dispatch</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sends an official itemized e-receipt containing medication names, dosages, tax levies, payment split, and a live GRA verification link directly to the patient's WhatsApp.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Send on WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied to Clipboard!' : 'Copy WhatsApp Text'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-sky-950/20 border border-sky-800/40 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                      <Smartphone className="w-4 h-4" />
                      <span>Ghana Telecom SMS Gateway</span>
                    </div>

                    {/* Format Toggle */}
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSmsFormatType('full')}
                        className={`px-2 py-0.5 rounded font-bold ${
                          smsFormatType === 'full' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
                        }`}
                      >
                        Itemized
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmsFormatType('compact')}
                        className={`px-2 py-0.5 rounded font-bold ${
                          smsFormatType === 'compact' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
                        }`}
                      >
                        Compact
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Dispatches a cellular SMS text message via local Ghana SMS gateway (MTN, Telecel, AT) with invoice reference and GRA fiscal validation.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSendingSms}
                      onClick={handleDispatchCloudSms}
                      className="w-full py-2.5 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950/40 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingSms ? 'Transmitting SMS...' : 'Dispatch Cloud SMS'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenNativeSms}
                      className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Open Device SMS App</span>
                    </button>
                  </div>

                  {/* Cloud SMS Dispatch Success Banner */}
                  {smsDispatchSuccess && (
                    <div className="p-3 bg-emerald-950/90 border border-emerald-700 rounded-xl text-xs text-emerald-200 space-y-1 animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>SMS Dispatched Successfully to {smsDispatchSuccess.recipientPhone}</span>
                      </div>
                      <div className="text-[10px] text-emerald-400/90 flex items-center justify-between font-mono pt-1">
                        <span>Carrier: {smsDispatchSuccess.networkCarrier}</span>
                        <span>Msg ID: {smsDispatchSuccess.messageId}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Expandable Live Text Message Preview */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTextPreview(!showTextPreview)}
                  className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Preview Patient Message ({activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'})
                  </span>
                  {showTextPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showTextPreview && (
                  <div className="p-3 bg-slate-950 border-t border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {currentPreviewMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Helper */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> GRA Certified Electronic Invoice
              </span>
              <span>Total: <strong>GHS {transaction.grossAmount.toFixed(2)}</strong></span>
            </div>
          </div>

          {/* Right Column: Thermal Printable Receipt Container */}
          <div className="lg:col-span-6 p-4 sm:p-5 overflow-y-auto flex justify-center bg-slate-950/40 max-h-[75vh]">
            <div 
              id="thermal-receipt" 
              className="w-full max-w-sm bg-white text-slate-950 p-5 rounded-2xl shadow-xl font-mono text-[11px] leading-relaxed border border-slate-200 select-text my-auto"
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
              <div className="my-2 p-2 bg-slate-100 rounded text-center border border-slate-300">
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
                      <span className="truncate max-w-[180px]">{item.drug.brandName}</span>
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
              <div className="py-2 flex justify-between items-center text-xs font-black border-b border-dashed border-slate-400 text-slate-950">
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
              <div className="pt-2 text-center space-y-1 flex flex-col items-center">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="GRA E-VAT QR Code" className="w-24 h-24 mx-auto" />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-slate-400">
                    QR Loading...
                  </div>
                )}
                <div className="text-[8px] text-slate-500 max-w-[220px] truncate">
                  Hash: {transaction.graEvat.graSecurityHash}
                </div>
                <div className="text-[9px] font-bold text-slate-800">
                  Scan QR with GRA Taxpayers App to verify invoice authenticity
                </div>
                <div className="text-[8px] text-slate-500 uppercase tracking-widest pt-0.5">
                  PharmaTrack ERP • Ghana Market Localization
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
