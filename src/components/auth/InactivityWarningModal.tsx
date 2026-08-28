import React from 'react';
import { ShieldAlert, Clock, LogOut, RefreshCw, Lock } from 'lucide-react';

interface InactivityWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
  stationName?: string;
}

export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  isOpen,
  remainingSeconds,
  onExtend,
  onLogout,
  stationName = 'Active Workstation'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-amber-950/50 flex flex-col animate-scaleUp">
        
        {/* Header Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Workstation Security Lock</h3>
              <p className="text-[11px] text-amber-400 font-medium">15-Minute Inactivity Protection</p>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-amber-950 border border-amber-600 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{remainingSeconds}s</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-100">
              Are you still at the {stationName}?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              To secure patient medical records, prevent unauthorized dispensing, and protect the POS terminal in high-traffic pharmacy environments, this workstation will automatically log out and return to the station login screen.
            </p>
          </div>

          {/* Countdown Progress Visual */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Time remaining until auto-lock:</span>
              <span className="text-amber-400 font-mono font-bold">{remainingSeconds} seconds</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, (remainingSeconds / 60) * 100))}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onExtend}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all group"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              <span>Extend Session &amp; Stay Logged In</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 hover:border-rose-700/60 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out &amp; Lock Workstation Now</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 text-center">
          Ghana Pharmacy Council • Information Security Standard Rule 15-INACT
        </div>
      </div>
    </div>
  );
};
