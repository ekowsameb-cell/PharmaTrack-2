import React, { useState } from 'react';
import { ShieldCheck, Lock, X, AlertOctagon } from 'lucide-react';
import { PharmacyConfig } from '../types/pharmacy';

interface SuperintendentPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PharmacyConfig;
  onSuccess: () => void;
  reason?: string;
}

export const SuperintendentPinModal: React.FC<SuperintendentPinModalProps> = ({
  isOpen,
  onClose,
  config,
  onSuccess,
  reason = 'Authorizing Class A Controlled Drug / Bulk Inventory Action'
}) => {
  if (!isOpen) return null;

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === config.superintendentPharmacist.authPin) {
      onSuccess();
      onClose();
      setEnteredPin('');
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid Superintendent PIN. Authorized personnel only.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-purple-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <span>Superintendent Authorization</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950 border border-purple-700 flex items-center justify-center text-purple-300">
            <Lock className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-slate-100 text-sm">
            {config.superintendentPharmacist.fullName}
          </h4>
          <p className="text-xs text-purple-300 font-mono">
            GPhC Reg: {config.superintendentPharmacist.gphcPin}
          </p>
          <div className="p-2.5 bg-purple-950/60 border border-purple-900 rounded-xl text-[11px] text-purple-200">
            <strong>Mandate:</strong> {reason}
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 text-center">
              Enter 4-Digit Security PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={enteredPin}
              onChange={(e) => {
                setEnteredPin(e.target.value);
                setErrorMsg('');
              }}
              placeholder="••••"
              autoFocus
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-center text-2xl font-bold font-mono tracking-widest text-purple-300 focus:outline-none focus:border-purple-500"
            />
            {errorMsg && (
              <p className="text-xs text-red-400 text-center mt-2 flex items-center justify-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </p>
            )}
            <p className="text-[10px] text-slate-500 text-center mt-1">
              Default Demonstration PIN: <span className="font-mono text-slate-400 font-bold">{config.superintendentPharmacist.authPin}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow transition-colors"
            >
              Authorize Action
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
