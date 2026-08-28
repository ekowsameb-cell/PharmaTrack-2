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
  Activity, 
  User, 
  CreditCard, 
  TrendingUp, 
  Layers, 
  Sparkles, 
  ShoppingBag, 
  Database,
  LogOut,
  Pill
} from 'lucide-react';
import { PharmacyConfig, UserRole, AppTabType } from '../types/pharmacy';
import { useRoleGuard } from '../hooks/useRoleGuard';
import { useAuth } from '../contexts/AuthContext';

export type { AppTabType, UserRole };

interface NavbarProps {
  activeTab: AppTabType;
  setActiveTab: (tab: AppTabType) => void;
  currentUserRole?: UserRole | string;
  onRoleChange?: (role: UserRole) => void;
  config: PharmacyConfig;
  onToggleOnlineMode: () => void;
  isSuperintendentUnlocked: boolean;
  onOpenSuperintendentPin: () => void;
  onLockSuperintendent: () => void;
  onOpenSettings: () => void;
  onOpenSchemaModal?: () => void;
  onOpenAuthModal?: () => void;
  onOpenMusicModal?: () => void;
  pendingOfflineCount: number;
  pendingPharmacistCount?: number;
  pendingCashierCount?: number;
  pendingPoCount?: number;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUserRole = 'Clerk',
  onRoleChange,
  config,
  onToggleOnlineMode,
  isSuperintendentUnlocked,
  onOpenSuperintendentPin,
  onLockSuperintendent,
  onOpenSettings,
  onOpenSchemaModal,
  onOpenAuthModal,
  onOpenMusicModal,
  pendingOfflineCount,
  pendingPharmacistCount = 0,
  pendingCashierCount = 0,
  pendingPoCount = 0,
  onLogout
}) => {
  const roleGuard = useRoleGuard(currentUserRole);
  const { currentUser } = useAuth();

  const getStationBadge = () => {
    switch (roleGuard.normalizedRole) {
      case 'CLERK':
        return {
          station: 'Counter Sales Station (POS)',
          staff: 'Kwame Mensah',
          color: 'bg-sky-950/90 text-sky-300 border-sky-600/70',
          icon: <Pill className="w-3.5 h-3.5 text-sky-400" />
        };
      case 'PHARMACIST':
        return {
          station: 'Clinical Dispensing Station',
          staff: 'Pharm. Dr. Araba Mensah, PharmD',
          color: 'bg-purple-950/90 text-purple-300 border-purple-600/70',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
        };
      case 'CASHIER':
        return {
          station: 'POS Billing & Cashier Terminal',
          staff: 'Emmanuel Tetteh',
          color: 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70',
          icon: <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'OWNER':
        return {
          station: 'Executive MD Hub & Owner',
          staff: 'Dr. K. Boateng, MD & CEO',
          color: 'bg-amber-950/90 text-amber-300 border-amber-600/70',
          icon: <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
        };
    }
  };

  const stationInfo = getStationBadge();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 lg:px-6 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Left: Brand & Clinic Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-slate-950 font-black text-lg">
            Rx
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight">
                PharmaTrack <span className="text-emerald-400 font-semibold">Ghana ERP</span>
              </h1>
              {/* Active Station Pill */}
              <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold shadow-sm ${stationInfo.color}`}>
                {stationInfo.icon}
                <span>{stationInfo.station}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="truncate max-w-[200px] sm:max-w-xs">{config.pharmacyName}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-medium">{stationInfo.staff}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500 font-mono text-[11px]">{config.gphcLicenseNumber}</span>
            </div>
          </div>
        </div>

        {/* Right: Workstation Utilities & Switch Station Action */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          
          {/* Work Focus Music Trigger */}
          {onOpenMusicModal && (
            <button
              onClick={onOpenMusicModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-purple-950/80 to-indigo-950/80 hover:from-purple-900 hover:to-indigo-900 border border-purple-600/50 text-purple-300 shadow-sm transition-all"
              title="Open Lyria AI Focus Music Generator"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Focus Music</span>
            </button>
          )}

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
                <span>Offline Queue ({pendingOfflineCount})</span>
              </>
            )}
          </button>

          {/* Superintendent Pharmacist Status (Only visible for Pharmacist & Owner) */}
          {(roleGuard.isPharmacist || roleGuard.isOwner) && (
            isSuperintendentUnlocked ? (
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
                title="Unlock Superintendent Clinical Override Mode"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Superintendent PIN</span>
              </button>
            )
          )}

          {/* PostgreSQL Relational Schema Trigger (Only for Owner) */}
          {roleGuard.isOwner && onOpenSchemaModal && (
            <button
              onClick={onOpenSchemaModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold border bg-blue-950/70 text-blue-300 border-blue-700/60 hover:bg-blue-900/50 transition-colors shadow-sm"
              title="Inspect PostgreSQL Relational Architecture & DDL Schema"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">PostgreSQL DDL</span>
            </button>
          )}

          {/* Settings (Only for Owner) */}
          {roleGuard.isOwner && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
              title="Pharmacy Configuration & GRA TIN"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Switch Station / Log Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700/80 transition-all shadow-sm group"
              title="Exit current workstation and return to Station Selection Login Screen"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              <span className="font-bold text-xs">Switch Station / Exit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
