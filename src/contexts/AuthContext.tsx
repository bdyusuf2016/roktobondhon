import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { INITIAL_DEMO_USERS } from '../data/seedData';
import { auth, isFirebaseConfigured, isDemoMode } from '../firebase/config';
import {
  type User as FirebaseUser,
  type ConfirmationResult,
} from 'firebase/auth';
import {
  signInEmail,
  registerEmail,
  signOutUser,
  subscribeToAuth,
  sendFirebasePhoneOtp,
  confirmFirebasePhoneOtp,
  signInGoogle,
} from '../services/authService';
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile as updateFirebaseUserProfile,
} from '../services/userService';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isDemoMode: boolean;
  sendPhoneOtp: (phoneNumber: string) => Promise<ConfirmationResult>;
  loginWithPhoneOtp: (phone: string, otp: string, confirmation?: ConfirmationResult) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (fullName: string, email: string, phone: string, role: UserRole, pass?: string) => Promise<User>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  updateCurrentUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'roktobondon_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // In production (!isDemoMode), do NOT load any user from localStorage
    if (!isDemoMode) {
      return null;
    }

    // In demo mode only, load cached user or default to super_admin for full exploratory preview
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached demo user', e);
      }
    }
    return INITIAL_DEMO_USERS[0];
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync current user to local storage in Demo Mode only
  useEffect(() => {
    if (isDemoMode) {
      if (currentUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, [currentUser, isDemoMode]);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;

    const unsubscribe = subscribeToAuth(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Fetch or create profile in Firestore
        try {
          const profile = await getUserProfile(fbUser.uid);
          if (profile) {
            setCurrentUser(profile);
          } else {
            // New user registration in Firestore
            const newProfile = await createUserProfile(fbUser.uid, {
              fullName: fbUser.displayName || 'সম্মানিত সদস্য',
              phone: fbUser.phoneNumber || '',
              email: fbUser.email || undefined,
              role: 'donor',
              photoUrl: fbUser.photoURL || undefined,
              phoneVerified: Boolean(fbUser.phoneNumber),
            });
            setCurrentUser(newProfile);
          }
        } catch (err) {
          console.error('Error synchronizing auth user profile:', err);
        }
      } else if (!isDemoMode) {
        // User logged out in production
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const sendPhoneOtp = async (phoneNumber: string): Promise<ConfirmationResult> => {
    if (isDemoMode) {
      // Mock confirmation result for demo mode
      return {
        verificationId: 'mock-verification-id',
        confirm: async () => ({
          user: {
            uid: `demo-user-${Date.now()}`,
            phoneNumber,
          } as FirebaseUser,
          providerId: 'phone',
          operationType: 'signIn',
        }),
      } as unknown as ConfirmationResult;
    }
    return await sendFirebasePhoneOtp(phoneNumber);
  };

  const loginWithPhoneOtp = async (phone: string, otp: string, confirmation?: ConfirmationResult) => {
    setIsLoading(true);
    try {
      if (isDemoMode) {
        if (otp.length < 4) {
          throw new Error('অনুগ্রহ করে সঠিক ৪-৬ ডিজিটের ওটিপি (OTP) প্রদান করুন');
        }
        const matched = INITIAL_DEMO_USERS.find((u) => u.phone === phone) || {
          id: `user-phone-${Date.now()}`,
          fullName: 'মোবাইল রক্তদাতা',
          phone,
          role: 'donor' as UserRole,
          organizationId: 'org-roktobondon',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCurrentUser(matched);
        return;
      }

      // Real Firebase OTP Confirmation
      const fbUser = await confirmFirebasePhoneOtp(confirmation, otp);
      setFirebaseUser(fbUser);

      // Load or create Firestore user profile
      const profile = await getUserProfile(fbUser.uid);
      if (profile) {
        setCurrentUser(profile);
      } else {
        const newProfile = await createUserProfile(fbUser.uid, {
          fullName: fbUser.displayName || 'মোবাইল ব্যবহারকারী',
          phone: fbUser.phoneNumber || phone,
          role: 'donor',
          phoneVerified: true,
        });
        setCurrentUser(newProfile);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const fbUser = await signInEmail(email, pass);
        setFirebaseUser(fbUser);
        const profile = await getUserProfile(fbUser.uid);
        if (profile) {
          setCurrentUser(profile);
          return;
        }
      }

      // Demo or local fallback
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

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const fbUser = await signInGoogle();
        setFirebaseUser(fbUser);
        const profile = await getUserProfile(fbUser.uid);
        if (profile) {
          setCurrentUser(profile);
        } else {
          const newProfile = await createUserProfile(fbUser.uid, {
            fullName: fbUser.displayName || 'গুগল ব্যবহারকারী',
            phone: fbUser.phoneNumber || '',
            email: fbUser.email || undefined,
            role: 'donor',
            photoUrl: fbUser.photoURL || undefined,
            phoneVerified: Boolean(fbUser.phoneNumber),
          });
          setCurrentUser(newProfile);
        }
      } else {
        // Fallback demo user
        setCurrentUser(INITIAL_DEMO_USERS[0]);
      }
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
        const fbUser = await registerEmail(email, pass);
        setFirebaseUser(fbUser);
        const profile = await createUserProfile(fbUser.uid, {
          fullName,
          phone,
          email,
          role,
        });
        setCurrentUser(profile);
        return profile;
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
    setIsLoading(true);
    try {
      await signOutUser();
    } finally {
      setFirebaseUser(null);
      setCurrentUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setIsLoading(false);
    }
  };

  const switchDemoRole = (role: UserRole) => {
    if (!isDemoMode) {
      console.warn('Demo role switching is disabled in production.');
      return;
    }
    const demo = INITIAL_DEMO_USERS.find((u) => u.role === role);
    if (demo) {
      setCurrentUser(demo);
    } else {
      setCurrentUser((prev) => (prev ? { ...prev, role } : INITIAL_DEMO_USERS[0]));
    }
  };

  const updateCurrentUser = async (data: Partial<User>) => {
    if (currentUser) {
      const updated = { ...currentUser, ...data, updatedAt: new Date().toISOString() };
      setCurrentUser(updated);

      if (isFirebaseConfigured && !isDemoMode) {
        try {
          await updateFirebaseUserProfile(currentUser.id, {
            fullName: data.fullName,
            photoUrl: data.photoUrl,
            email: data.email,
            phone: data.phone,
          });
        } catch (err) {
          console.error('Failed to sync profile update to Firestore:', err);
        }
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isLoading,
        isDemoMode,
        sendPhoneOtp,
        loginWithPhoneOtp,
        loginWithEmail,
        loginWithGoogle,
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
