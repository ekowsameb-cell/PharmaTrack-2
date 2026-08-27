import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  User, 
  LogOut, 
  Sparkles, 
  CheckCircle2, 
  KeyRound, 
  Cloud, 
  AlertCircle,
  Loader2,
  Database
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/pharmacy';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSelectRole }) => {
  const { 
    currentUser, 
    userProfile, 
    signInWithGoogle, 
    signInAsGuest, 
    signOut, 
    updateUserRole, 
    authError, 
    clearAuthError 
  } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(userProfile?.role || 'Pharmacist');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    clearAuthError();
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      // Handled in context
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    clearAuthError();
    try {
      await signInAsGuest(selectedRole);
      onSelectRole(selectedRole);
      onClose();
    } catch (err) {
      // Handled in context
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (role: UserRole) => {
    setSelectedRole(role);
    await updateUserRole(role);
    onSelectRole(role);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      onSelectRole('Clerk');
      onClose();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-slate-950/60 flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Firebase Authentication</h3>
              <p className="text-[11px] text-slate-400">Secure staff identity & Firestore sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {authError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{authError}</div>
            </div>
          )}

          {currentUser ? (
            /* Signed In User State */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/70 flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-12 h-12 rounded-full border-2 border-emerald-500 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-bold text-base shrink-0">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="truncate flex-1">
                  <div className="text-sm font-bold text-slate-100 truncate">
                    {currentUser.displayName || 'Pharmacy Operator'}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {currentUser.email || 'Anonymous Session'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                      Role: {userProfile?.role || selectedRole}
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Cloud className="w-3 h-3" /> Firestore Linked
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Selection Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Assigned Workspace Role:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Clerk', 'Pharmacist', 'Cashier', 'Owner'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                        userProfile?.role === role
                          ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-sm'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 text-left'
                      }`}
                    >
                      <span>{role}</span>
                      {userProfile?.role === role && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign Out Action */}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Firebase</span>
              </button>
            </div>
          ) : (
            /* Signed Out State */
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <Database className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-100">Sign in to PharmaTrack</h4>
                <p className="text-xs text-slate-400">
                  Authenticate with Google or quick staff access to persist prescriptions, audit logs, and music playlists to Firestore.
                </p>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-lg transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Sign In with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  or quick access
                </span>
              </div>

              {/* Guest / Demo Access */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Select Staff Persona Role:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Clerk', 'Pharmacist', 'Cashier', 'Owner'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                        selectedRole === role
                          ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGuestSignIn}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold transition-all mt-2"
                >
                  Continue as {selectedRole} (Guest Auth)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" /> Project: scholar-hub-198c5
          </span>
          <button onClick={onClose} className="hover:text-slate-200">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
