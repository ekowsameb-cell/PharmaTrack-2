import React, { useState } from 'react';
import { Settings, X, Save, RotateCcw, Building, ShieldCheck, Smartphone, DollarSign } from 'lucide-react';
import { PharmacyConfig } from '../types/pharmacy';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PharmacyConfig;
  onSaveConfig: (newConfig: PharmacyConfig) => void;
  onResetToDemoData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetToDemoData
}) => {
  if (!isOpen) return null;

  const [form, setForm] = useState<PharmacyConfig>({ ...config });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(form);
    onClose();
    alert('Pharmacy ERP configurations saved successfully.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-base">Ghana Regulatory &amp; ERP Settings</h3>
              <p className="text-xs text-slate-400">Manage GRA TIN, GPhC License, NHIS Codes &amp; MoMo Merchants</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto flex-1 space-y-4 pr-1 text-xs">
          {/* Pharmacy Profile */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-200 uppercase text-[10px] flex items-center gap-1.5 text-emerald-400">
              <Building className="w-3.5 h-3.5" />
              1. Pharmacy Facility Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Pharmacy Name</label>
                <input
                  type="text"
                  value={form.pharmacyName}
                  onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Physical Location / Address</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Ghana Regulatory IDs */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-200 uppercase text-[10px] flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              2. Ghana Regulatory Identifiers
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">GRA E-VAT TIN</label>
                <input
                  type="text"
                  value={form.graTin}
                  onChange={(e) => setForm({ ...form, graTin: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">GPhC License No.</label>
                <input
                  type="text"
                  value={form.gphcLicenseNumber}
                  onChange={(e) => setForm({ ...form, gphcLicenseNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">NHIA Facility Code</label>
                <input
                  type="text"
                  value={form.nhiaFacilityCode}
                  onChange={(e) => setForm({ ...form, nhiaFacilityCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Superintendent Pharmacist Setup */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-200 uppercase text-[10px] flex items-center gap-1.5 text-purple-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              3. Superintendent Pharmacist Credentials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">Full Name &amp; Title</label>
                <input
                  type="text"
                  value={form.superintendentPharmacist.fullName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      superintendentPharmacist: {
                        ...form.superintendentPharmacist,
                        fullName: e.target.value
                      }
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">GPhC PIN</label>
                <input
                  type="text"
                  value={form.superintendentPharmacist.gphcPin}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      superintendentPharmacist: {
                        ...form.superintendentPharmacist,
                        gphcPin: e.target.value
                      }
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* MoMo & GhQR Integration Config */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-200 uppercase text-[10px] flex items-center gap-1.5 text-amber-400">
              <Smartphone className="w-3.5 h-3.5" />
              4. Mobile Money &amp; GhQR Terminal IDs
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">MTN MoMo Merchant ID</label>
                <input
                  type="text"
                  value={form.momoMerchantAccounts.mtnMerchantId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      momoMerchantAccounts: {
                        ...form.momoMerchantAccounts,
                        mtnMerchantId: e.target.value
                      }
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">GhIPSS GhQR Terminal ID</label>
                <input
                  type="text"
                  value={form.ghqrTerminalId}
                  onChange={(e) => setForm({ ...form, ghqrTerminalId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset entire system to initial Ghanaian pharmacy demo data?')) {
                  onResetToDemoData();
                  onClose();
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Catalog &amp; Batches</span>
            </button>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
