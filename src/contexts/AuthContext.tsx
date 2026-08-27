import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut, 
  onAuthStateChanged,
  signInAnonymously,
  db,
  doc,
  setDoc,
  getDoc,
  FirebaseUser
} from '../lib/firebase';
import { UserRole } from '../types/pharmacy';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  isAnonymous?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: (preferredRole?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserRole: (newRole: UserRole) => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_ROLE_KEY = 'pharmatrack_user_role';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync profile to Firestore
  const syncProfileToFirestore = async (user: FirebaseUser, role: UserRole) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const profileData: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || (user.isAnonymous ? 'Guest Pharmacist' : 'Pharmacy Staff'),
        photoURL: user.photoURL,
        role: role,
        isAnonymous: user.isAnonymous,
        lastLoginAt: new Date().toISOString()
      };

      await setDoc(userRef, profileData, { merge: true });
      setUserProfile(profileData);
      localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, role);
    } catch (err: any) {
      console.warn('Firestore user profile sync note:', err?.message || err);
      // Fallback local state
      const fallbackProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Pharmacy Staff',
        photoURL: user.photoURL,
        role: role,
        isAnonymous: user.isAnonymous,
        lastLoginAt: new Date().toISOString()
      };
      setUserProfile(fallbackProfile);
      localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, role);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          const savedLocalRole = (localStorage.getItem(LOCAL_STORAGE_ROLE_KEY) as UserRole) || 'Clerk';

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUserProfile(data);
          } else {
            await syncProfileToFirestore(user, savedLocalRole);
          }
        } catch (e) {
          const savedLocalRole = (localStorage.getItem(LOCAL_STORAGE_ROLE_KEY) as UserRole) || 'Clerk';
          setUserProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Pharmacy Operator',
            photoURL: user.photoURL,
            role: savedLocalRole,
            isAnonymous: user.isAnonymous
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const savedRole = (localStorage.getItem(LOCAL_STORAGE_ROLE_KEY) as UserRole) || 'Pharmacist';
      await syncProfileToFirestore(result.user, savedRole);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setAuthError(err?.message || 'Failed to sign in with Google. Please try again.');
      throw err;
    }
  };

  const signInAsGuest = async (preferredRole: UserRole = 'Clerk') => {
    setAuthError(null);
    try {
      const result = await signInAnonymously(auth);
      await syncProfileToFirestore(result.user, preferredRole);
    } catch (err: any) {
      console.warn('Anonymous sign in note:', err);
      // Mock authenticated state if offline
      const mockProfile: UserProfile = {
        uid: `guest-${Date.now()}`,
        email: 'staff@pharmatrack.gh',
        displayName: 'Guest Operator (Offline)',
        photoURL: null,
        role: preferredRole,
        isAnonymous: true
      };
      setUserProfile(mockProfile);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      setCurrentUser(null);
    } catch (err: any) {
      console.error('Sign-Out error:', err);
      setAuthError(err?.message || 'Error signing out.');
    }
  };

  const updateUserRole = async (newRole: UserRole) => {
    localStorage.setItem(LOCAL_STORAGE_ROLE_KEY, newRole);
    if (currentUser) {
      await syncProfileToFirestore(currentUser, newRole);
    } else if (userProfile) {
      setUserProfile({ ...userProfile, role: newRole });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signInWithGoogle,
        signInAsGuest,
        signOut,
        updateUserRole,
        authError,
        clearAuthError: () => setAuthError(null)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
