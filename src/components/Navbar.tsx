import React, { useEffect } from 'react';
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
  LogOut
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
  const isClerkRole = roleGuard.isClerk;
  const { currentUser, userProfile, signOut } = useAuth();

  // Dynamic Tab Filter using useRoleGuard matrix:
  const isTabAllowed = (tab: AppTabType): boolean => {
    return roleGuard.canAccessTab(tab);
  };

  // Auto-redirect if active tab is restricted under current role
  useEffect(() => {
    if (!roleGuard.canAccessTab(activeTab)) {
      setActiveTab('clerk');
    }
  }, [roleGuard, activeTab, setActiveTab]);

  const handleLogout = async () => {
    try {
      await signOut();
      if (onRoleChange) {
        onRoleChange('Clerk');
      }
      setActiveTab('clerk');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 lg:px-6 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Brand & Clinic Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-slate-950 font-black text-lg">
            Rx
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight">
                PharmaTrack <span className="text-emerald-400 font-semibold">Ghana ERP</span>
              </h1>
              <span className="bg-emerald-950/80 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-800/60 uppercase">
                Behind-The-Counter Workflow
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
          {/* Work Focus Music Trigger */}
          {onOpenMusicModal && (
            <button
              onClick={onOpenMusicModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-purple-950/80 to-indigo-950/80 hover:from-purple-900 hover:to-indigo-900 border border-purple-600/50 text-purple-300 shadow-sm transition-all"
              title="Open Lyria AI Focus Music Generator"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Focus Music</span>
            </button>
          )}

          {/* Firebase User Auth Trigger */}
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold border transition-all ${
                currentUser
                  ? 'bg-slate-950/90 text-emerald-300 border-emerald-700/60 hover:bg-slate-800'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm shadow-emerald-600/25'
              }`}
              title="Firebase Identity & Staff Profile"
            >
              {currentUser ? (
                <>
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-4 h-4 rounded-full border border-emerald-400 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="truncate max-w-[120px] text-xs">
                    {currentUser.displayName || 'Staff Profile'}
                  </span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          )}

          {/* Quick Log Out / Exit Dashboard Button */}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold bg-rose-950/80 hover:bg-rose-900 border border-rose-700/70 text-rose-300 shadow-sm transition-all text-xs"
              title="Log Out & Exit User Dashboard"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Log Out</span>
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
                <span>Offline Queue Mode ({pendingOfflineCount})</span>
              </>
            )}
          </button>

          {/* Superintendent Pharmacist Status (Only visible if not Clerk) */}
          {!isClerkRole && (
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
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Superintendent PIN</span>
              </button>
            )
          )}

          {/* PostgreSQL Relational Schema Trigger */}
          {onOpenSchemaModal && (
            <button
              onClick={onOpenSchemaModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold border bg-blue-950/70 text-blue-300 border-blue-700/60 hover:bg-blue-900/50 transition-colors shadow-sm"
              title="Inspect PostgreSQL Relational Architecture & DDL Schema"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">PostgreSQL DDL</span>
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

          {/* Dedicated Log Out / Exit User Dashboard Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold bg-slate-800/90 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700/80 transition-all shadow-sm group"
              title="Log out and exit active user dashboard"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              <span className="font-semibold text-xs">
                {currentUser ? 'Log Out' : 'Exit Dashboard'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="mt-2.5 flex flex-col gap-1.5 border-t border-slate-800/80 pt-2">
        {/* Tier 1: Operational Persona Dashboards */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
            Counter Personas:
          </span>

          {/* 1. Counter Clerk */}
          {isTabAllowed('clerk') && (
            <button
              onClick={() => setActiveTab('clerk')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                activeTab === 'clerk'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>1. Counter Clerk</span>
              <span className="text-[10px] opacity-75 font-normal">(Kwame)</span>
            </button>
          )}

          {/* 2. Superintendent Pharmacist (Hidden if User is Clerk) */}
          {isTabAllowed('pharmacist') && (
            <button
              onClick={() => setActiveTab('pharmacist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                activeTab === 'pharmacist'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/20'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>2. Superintendent Pharmacist</span>
              <span className="text-[10px] opacity-75 font-normal">(Dr. Araba)</span>
              {pendingPharmacistCount > 0 && (
                <span className="bg-purple-900 text-purple-200 border border-purple-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {pendingPharmacistCount}
                </span>
              )}
            </button>
          )}

          {/* 3. POS Cashier */}
          {isTabAllowed('cashier') && (
            <button
              onClick={() => setActiveTab('cashier')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                activeTab === 'cashier'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. POS Cashier</span>
              <span className="text-[10px] opacity-75 font-normal">(Emmanuel)</span>
              {pendingCashierCount > 0 && (
                <span className="bg-emerald-900 text-emerald-200 border border-emerald-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {pendingCashierCount}
                </span>
              )}
            </button>
          )}

          {/* 4. Owner Hub (Hidden if User is Clerk) */}
          {isTabAllowed('owner') && (
            <button
              onClick={() => setActiveTab('owner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                activeTab === 'owner'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>4. Executive MD Hub</span>
              <span className="text-[10px] opacity-75 font-normal">(Dr. Boateng)</span>
              {pendingPoCount > 0 && (
                <span className="bg-amber-900 text-amber-200 border border-amber-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {pendingPoCount} PO
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tier 2: Core System Modules & Registers */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
            Core Modules:
          </span>

          {isTabAllowed('pos') && (
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'pos'
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Dual-Zone POS</span>
            </button>
          )}

          {isTabAllowed('inventory') && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>FEFO Inventory & Reorder</span>
            </button>
          )}

          {isTabAllowed('nhis') && (
            <button
              onClick={() => setActiveTab('nhis')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'nhis'
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>NHIS & Private Insurers</span>
            </button>
          )}

          {isTabAllowed('ddr') && (
            <button
              onClick={() => setActiveTab('ddr')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'ddr'
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Controlled Drugs (DDR)</span>
            </button>
          )}

          {/* Audit tab (Hidden if User is Clerk) */}
          {isTabAllowed('audit') && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>GRA E-VAT & Audit Trail</span>
              {pendingOfflineCount > 0 && (
                <span className="ml-1 bg-amber-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {pendingOfflineCount}
                </span>
              )}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
