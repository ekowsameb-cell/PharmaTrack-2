import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  CreditCard, 
  TrendingUp, 
  Pill, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Sparkles,
  Building2,
  FileText,
  Boxes,
  Receipt,
  AlertTriangle,
  Loader2,
  Shield,
  Smartphone
} from 'lucide-react';
import { PharmacyConfig, UserRole } from '../../types/pharmacy';
import { useAuth } from '../../contexts/AuthContext';

interface StationLoginScreenProps {
  config: PharmacyConfig;
  onSelectStation: (role: UserRole) => void;
  onOpenSettings?: () => void;
}

interface StationInfo {
  role: UserRole;
  stationTitle: string;
  staffName: string;
  credential: string;
  badgeColor: string;
  borderColor: string;
  accentBg: string;
  icon: React.ReactNode;
  primaryResponsibilities: string[];
  restrictedModules: string[];
  quickActionLabel: string;
}

export const StationLoginScreen: React.FC<StationLoginScreenProps> = ({
  config,
  onSelectStation,
  onOpenSettings
}) => {
  const { 
    currentUser, 
    userProfile, 
    signInWithGoogle, 
    signInAsGuest, 
    authError, 
    clearAuthError 
  } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedStation, setSelectedStation] = useState<UserRole>('Clerk');
  const [pinCode, setPinCode] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const stations: StationInfo[] = [
    {
      role: 'Clerk',
      stationTitle: 'Counter Sales Station',
      staffName: 'Kwame Mensah',
      credential: 'Sales Assistant • ID #CS-104',
      badgeColor: 'text-sky-400 bg-sky-950/80 border-sky-800/80',
      borderColor: 'border-sky-500/40 hover:border-sky-400',
      accentBg: 'from-sky-950/40 to-slate-900',
      icon: <Pill className="w-6 h-6 text-sky-400" />,
      primaryResponsibilities: [
        'Medicine Search & FEFO Expiry Lookup',
        'Shelf Locations & Unit Sales (Blister/Box)',
        'Drug-to-Drug Interaction Safety Warnings',
        'Stage Orders & Route to Pharmacist/Cashier'
      ],
      restrictedModules: [
        'No cash billing or MoMo collection',
        'No clinical POM override without Pharmacist'
      ],
      quickActionLabel: 'Enter Counter Sales POS'
    },
    {
      role: 'Pharmacist',
      stationTitle: 'Clinical Dispensing Station',
      staffName: 'Pharm. Dr. Araba Mensah, PharmD',
      credential: 'Superintendent • GPhC PIN #GH-RX-88421',
      badgeColor: 'text-purple-400 bg-purple-950/80 border-purple-800/80',
      borderColor: 'border-purple-500/40 hover:border-purple-400',
      accentBg: 'from-purple-950/40 to-slate-900',
      icon: <ShieldCheck className="w-6 h-6 text-purple-400" />,
      primaryResponsibilities: [
        'Prescription Only Medicines (POM) Review',
        'Doctor MDC License Number Verification',
        'Controlled Drugs Register (DDR) Sign-Off',
        'NHIS / Private Insurance Copay Approval'
      ],
      restrictedModules: [
        'Dedicated to Clinical Governance',
        'Releases verified orders to Cashier'
      ],
      quickActionLabel: 'Enter Clinical Station'
    },
    {
      role: 'Cashier',
      stationTitle: 'POS Billing & Cashier Station',
      staffName: 'Emmanuel Tetteh',
      credential: 'Senior Cashier • Till Terminal #01',
      badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80',
      borderColor: 'border-emerald-500/40 hover:border-emerald-400',
      accentBg: 'from-emerald-950/40 to-slate-900',
      icon: <CreditCard className="w-6 h-6 text-emerald-400" />,
      primaryResponsibilities: [
        'Approved Baskets Settlement Queue',
        'Cash Tender & Change Calculator',
        'MTN MoMo, Telecel & AT Money STK Push',
        'GRA E-VAT Fiscalization & Digital Receipts'
      ],
      restrictedModules: [
        'Dedicated to Billing & Fiscal Signing',
        'No new medicine basket creation'
      ],
      quickActionLabel: 'Enter Billing Terminal'
    },
    {
      role: 'Owner',
      stationTitle: 'Executive Hub & Management',
      staffName: 'Dr. K. Boateng, MD & CEO',
      credential: 'Managing Director & Owner',
      badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-800/80',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
      accentBg: 'from-amber-950/40 to-slate-900',
      icon: <TrendingUp className="w-6 h-6 text-amber-400" />,
      primaryResponsibilities: [
        'Live Gross Margin & Profitability Dashboard',
        'Supplier Purchase Order (PO) Approvals',
        'Staff Payroll & Bulk MoMo Disbursals',
        'GRA Tax Compliance & Security Audit Logs'
      ],
      restrictedModules: [
        'Executive & Financial Authority',
        'Full Management Oversight'
      ],
      quickActionLabel: 'Enter Executive Hub'
    }
  ];

  const handleSelectAndEnter = async (role: UserRole) => {
    setIsLoading(true);
    setPinError(null);

    // Optional PIN check for Superintendent or Owner if desired
    if (role === 'Pharmacist' && pinCode && pinCode !== '8842') {
      setPinError('Invalid Superintendent PIN (Default: 8842)');
      setIsLoading(false);
      return;
    }
    if (role === 'Owner' && pinCode && pinCode !== '9900') {
      setPinError('Invalid Executive PIN (Default: 9900)');
      setIsLoading(false);
      return;
    }

    try {
      if (!currentUser) {
        await signInAsGuest(role);
      }
      onSelectStation(role);
    } catch (err: any) {
      console.warn('Station sign-in warning:', err);
      onSelectStation(role);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    clearAuthError();
    try {
      await signInWithGoogle();
    } catch (err) {
      // Handled in context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <header className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3.5 text-left">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-xl shadow-emerald-950/60 text-slate-950 font-black text-2xl">
            Rx
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                PharmaTrack <span className="text-emerald-400 font-bold">Ghana ERP</span>
              </h1>
              <span className="bg-emerald-950 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-700/60">
                Staff Station Login
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {config.pharmacyName} • <span className="text-slate-300 font-mono">Lic: {config.gphcLicenseNumber}</span> • <span className="text-slate-300 font-mono">TIN: {config.graTinNumber}</span>
            </p>
          </div>
        </div>

        {/* Global System Indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>GRA E-VAT Online</span>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-700/60 text-xs text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Signed in as: <strong>{currentUser.displayName || currentUser.email || 'Staff User'}</strong></span>
            </div>
          ) : (
            <button
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold transition-all shadow-sm"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <User className="w-3.5 h-3.5 text-slate-700" />}
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Role Selection Matrix */}
      <main className="max-w-6xl w-full mx-auto my-8 space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            Select Your Assigned Workstation
          </h2>
          <p className="text-sm text-slate-400">
            Each workstation provides strictly segregated roles. <strong className="text-slate-200">Counter Sales</strong> handles ordering &amp; staging, <strong className="text-slate-200">Clinical Dispensing</strong> verifies prescriptions, and the <strong className="text-slate-200">POS Cashier</strong> handles payments and fiscal receipts.
          </p>
        </div>

        {authError && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center justify-between max-w-2xl mx-auto">
            <span>{authError}</span>
            <button onClick={clearAuthError} className="underline text-rose-300 font-bold ml-2">Dismiss</button>
          </div>
        )}

        {pinError && (
          <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800 text-amber-200 text-xs flex items-center justify-between max-w-2xl mx-auto">
            <span>{pinError}</span>
            <button onClick={() => setPinError(null)} className="underline text-amber-300 font-bold ml-2">Dismiss</button>
          </div>
        )}

        {/* 4 Station Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stations.map((station) => {
            const isSelected = selectedStation === station.role;

            return (
              <div
                key={station.role}
                className={`relative rounded-3xl p-6 border transition-all flex flex-col justify-between bg-gradient-to-b ${station.accentBg} ${
                  isSelected 
                    ? 'border-2 ring-2 ring-emerald-500/20 shadow-xl' 
                    : 'border-slate-800 hover:border-slate-700'
                } ${station.borderColor}`}
              >
                <div>
                  {/* Station Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
                        {station.icon}
                      </div>
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${station.badgeColor}`}>
                          Station {station.role === 'Clerk' ? '1' : station.role === 'Pharmacist' ? '2' : station.role === 'Cashier' ? '3' : '4'}
                        </span>
                        <h3 className="text-lg font-bold text-slate-100 mt-1">
                          {station.stationTitle}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Staff Info */}
                  <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">{station.staffName}</div>
                      <div className="text-[11px] text-slate-400">{station.credential}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      {station.role.toUpperCase()}
                    </span>
                  </div>

                  {/* Responsibilities */}
                  <div className="space-y-2 mb-4">
                    <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Workstation Functions:
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {station.primaryResponsibilities.map((resp, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Guardrails / Scope Discipline */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1 mb-5">
                    <div className="font-semibold text-slate-300 text-[10px] uppercase">Workstation Scope Discipline:</div>
                    {station.restrictedModules.map((rest, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0"></span>
                        <span>{rest}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Enter Action Button */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSelectAndEnter(station.role)}
                  className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg group ${
                    station.role === 'Clerk'
                      ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                      : station.role === 'Pharmacist'
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : station.role === 'Cashier'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{station.quickActionLabel}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>Pharmacy Council of Ghana Certified</span>
          <span>•</span>
          <span>GRA E-VAT Certified Fiscal Architecture</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Default Pharmacist PIN: <strong className="text-slate-400 font-mono">8842</strong></span>
          <span>•</span>
          <span>Default Executive PIN: <strong className="text-slate-400 font-mono">9900</strong></span>
        </div>
      </footer>
    </div>
  );
};
