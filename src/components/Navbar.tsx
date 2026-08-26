import React from 'react';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Receipt, 
  Boxes, 
  FileText, 
  AlertTriangle, 
  History, 
  Settings, 
  CheckCircle2,
  Activity
} from 'lucide-react';
import { PharmacyConfig } from '../types/pharmacy';

interface NavbarProps {
  activeTab: 'pos' | 'inventory' | 'nhis' | 'ddr' | 'audit';
  setActiveTab: (tab: 'pos' | 'inventory' | 'nhis' | 'ddr' | 'audit') => void;
  config: PharmacyConfig;
  onToggleOnlineMode: () => void;
  isSuperintendentUnlocked: boolean;
  onOpenSuperintendentPin: () => void;
  onLockSuperintendent: () => void;
  onOpenSettings: () => void;
  pendingOfflineCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  config,
  onToggleOnlineMode,
  isSuperintendentUnlocked,
  onOpenSuperintendentPin,
  onLockSuperintendent,
  onOpenSettings,
  pendingOfflineCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 lg:px-6 py-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Clinic Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-slate-950 font-black text-xl">
            Rx
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-bold text-slate-100 tracking-tight">
                PharmaTrack <span className="text-emerald-400 font-semibold">Ghana ERP</span>
              </h1>
              <span className="bg-emerald-950/80 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-800/60 uppercase">
                v2.4 GPhC Certified
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="truncate max-w-[200px] sm:max-w-xs">{config.pharmacyName}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500 font-mono">{config.gphcLicenseNumber}</span>
            </div>
          </div>
        </div>

        {/* Live System Badges & Actions */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Network Simulator Toggle */}
          <button
            onClick={onToggleOnlineMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold border transition-all ${
              config.isOnlineMode
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/40'
                : 'bg-amber-950/60 text-amber-300 border-amber-700/60 hover:bg-amber-900/40 animate-pulse'
            }`}
            title="Click to simulate offline / online internet network state"
          >
            {config.isOnlineMode ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>GRA Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline Queue Mode ({pendingOfflineCount})</span>
              </>
            )}
          </button>

          {/* Superintendent Pharmacist Status */}
          {isSuperintendentUnlocked ? (
            <div className="flex items-center gap-1.5 bg-purple-950/70 border border-purple-700/60 text-purple-300 px-2.5 py-1.5 rounded-lg font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Superintendent Active</span>
              <button
                onClick={onLockSuperintendent}
                className="ml-1 text-purple-400 hover:text-purple-200 underline text-[11px]"
              >
                Lock
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenSuperintendentPin}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Superintendent PIN</span>
            </button>
          )}

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Pharmacy Configuration & GRA TIN"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <nav className="flex items-center gap-1 mt-3 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'pos'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Dual-Zone POS</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>FEFO Inventory & Reorder</span>
        </button>

        <button
          onClick={() => setActiveTab('nhis')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'nhis'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>NHIS & Private Insurance</span>
        </button>

        <button
          onClick={() => setActiveTab('ddr')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'ddr'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Controlled Drugs (DDR)</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>GRA E-VAT & Audit Trail</span>
          {pendingOfflineCount > 0 && (
            <span className="ml-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              {pendingOfflineCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
};
