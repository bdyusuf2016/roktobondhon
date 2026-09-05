import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { INITIAL_DEMO_USERS } from '../data/seedData';
import { auth, isFirebaseConfigured } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithPhoneOtp: (phone: string, otp: string) => Promise<void>;
  register: (fullName: string, email: string, phone: string, role: UserRole, pass?: string) => Promise<User>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  updateCurrentUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'roktobondon_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached user', e);
      }
    }
    // Default to a verified donor/super_admin or initial demo user for instant accessibility
    return INITIAL_DEMO_USERS[0]; // super_admin by default for full preview access, user can switch freely
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  // Hook Firebase Auth if configured
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        setFirebaseUser(fbUser);
        if (fbUser && !currentUser) {
          const matched = INITIAL_DEMO_USERS.find((u) => u.email === fbUser.email);
          if (matched) {
            setCurrentUser(matched);
          } else {
            setCurrentUser({
              id: fbUser.uid,
              fullName: fbUser.displayName || 'সম্মানিত সদস্য',
              email: fbUser.email || undefined,
              phone: fbUser.phoneNumber || '+8801700000000',
              role: 'donor',
              organizationId: 'org-roktobondon',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        setFirebaseUser(cred.user);
      }

      // Match demo or existing user
      const matched = INITIAL_DEMO_USERS.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || {
        id: `user-${Date.now()}`,
        fullName: email.split('@')[0],
        email,
        phone: '+8801711000000',
        role: email.includes('admin') ? ('admin' as UserRole) : ('donor' as UserRole),
        organizationId: 'org-roktobondon',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentUser(matched);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPhoneOtp = async (phone: string, otp: string) => {
    setIsLoading(true);
    try {
      // Simulate/Validate OTP (any 6 digit OTP like 123456)
      if (otp.length < 4) {
        throw new Error('অনুগ্রহ করে সঠিক ৪-৬ ডিজিটের ওটিপি (OTP) প্রদান করুন');
      }

      const matched = INITIAL_DEMO_USERS.find((u) => u.phone === phone) || {
        id: `user-phone-${Date.now()}`,
        fullName: 'মোবাইল ব্যবহারকারী',
        phone,
        role: 'donor' as UserRole,
        organizationId: 'org-roktobondon',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentUser(matched);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    fullName: string,
    email: string,
    phone: string,
    role: UserRole,
    pass?: string
  ): Promise<User> => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && auth && email && pass) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        setFirebaseUser(cred.user);
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        fullName,
        email: email || undefined,
        phone,
        role,
        organizationId: 'org-roktobondon',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCurrentUser(newUser);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('Firebase signOut error', err);
      }
    }
    setFirebaseUser(null);
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const switchDemoRole = (role: UserRole) => {
    const demo = INITIAL_DEMO_USERS.find((u) => u.role === role);
    if (demo) {
      setCurrentUser(demo);
    } else {
      setCurrentUser((prev) => (prev ? { ...prev, role } : INITIAL_DEMO_USERS[0]));
    }
  };

  const updateCurrentUser = (data: Partial<User>) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...data, updatedAt: new Date().toISOString() } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isLoading,
        loginWithEmail,
        loginWithPhoneOtp,
        register,
        logout,
        switchDemoRole,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
