import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { INITIAL_DEMO_USERS } from '../data/seedData';
import { supabase, isSupabaseConfigured, isDemoMode } from '../supabase/config';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  signInEmail,
  registerEmail,
  signOutUser,
  subscribeToAuth,
  sendSupabasePhoneOtp,
  confirmSupabasePhoneOtp,
  signInGoogle,
  updateUserPassword,
} from '../services/authService';
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile as updateSupabaseUserProfile,
} from '../services/userService';

interface AuthContextType {
  currentUser: User | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
  isDemoMode: boolean;
  sendPhoneOtp: (phoneNumber: string) => Promise<boolean>;
  loginWithPhoneOtp: (phone: string, otp: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
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

  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
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

  // Listen to Supabase Auth state
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const unsubscribe = subscribeToAuth(async (sbUser) => {
      setSupabaseUser(sbUser);
      if (sbUser) {
        try {
          const profile = await getUserProfile(sbUser.id);
          if (profile) {
            setCurrentUser(profile);
          } else {
            // New user registration in Supabase
            const newProfile = await createUserProfile(sbUser.id, {
              fullName: sbUser.user_metadata?.full_name || 'সম্মানিত সদস্য',
              phone: sbUser.phone || '',
              email: sbUser.email || undefined,
              role: 'donor',
              photoUrl: sbUser.user_metadata?.avatar_url || undefined,
              phoneVerified: Boolean(sbUser.phone),
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

  const sendPhoneOtp = async (phoneNumber: string): Promise<boolean> => {
    if (isDemoMode) {
      return true;
    }
    return await sendSupabasePhoneOtp(phoneNumber);
  };

  const loginWithPhoneOtp = async (phone: string, otp: string) => {
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

      // Real Supabase OTP Verification
      const sbUser = await confirmSupabasePhoneOtp(phone, otp);
      setSupabaseUser(sbUser);

      // Load or create user profile
      const profile = await getUserProfile(sbUser.id);
      if (profile) {
        setCurrentUser(profile);
      } else {
        const newProfile = await createUserProfile(sbUser.id, {
          fullName: sbUser.user_metadata?.full_name || 'মোবাইল ব্যবহারকারী',
          phone: sbUser.phone || phone,
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
      if (isSupabaseConfigured && supabase) {
        try {
          const sbUser = await signInEmail(email, pass);
          setSupabaseUser(sbUser);
          const profile = await getUserProfile(sbUser.id);
          if (profile) {
            setCurrentUser(profile);
            return;
          }
        } catch (signInErr: any) {
          // If login fails because user doesn't exist yet, attempt automatic signup
          const msg = signInErr?.message || '';
          if (msg.includes('Invalid login credentials') || msg.includes('Email not confirmed') || msg.includes('not found')) {
            try {
              const registeredUser = await registerEmail(email, pass);
              setSupabaseUser(registeredUser);
              const newProfile = await createUserProfile(registeredUser.id, {
                fullName: email.split('@')[0],
                email,
                phone: '+8801700000000',
                role: email.includes('admin') ? 'super_admin' : 'donor',
              });
              setCurrentUser(newProfile);
              return;
            } catch {
              throw signInErr;
            }
          } else {
            throw signInErr;
          }
        }
      }

      // Demo or local fallback
      const cleanInput = email.toLowerCase().replace(/@roktobondon\.org$/, '');
      const matched = INITIAL_DEMO_USERS.find(
        (u) =>
          u.email?.toLowerCase() === email.toLowerCase() ||
          u.phone?.replace(/[^0-9]/g, '').includes(cleanInput)
      ) || {
        id: `user-${Date.now()}`,
        fullName: email.split('@')[0],
        email,
        phone: '+8801711000000',
        role: email.includes('admin') ? ('super_admin' as UserRole) : ('donor' as UserRole),
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
      if (isSupabaseConfigured && supabase) {
        await signInGoogle();
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
      if (isSupabaseConfigured && supabase && email && pass) {
        const sbUser = await registerEmail(email, pass);
        setSupabaseUser(sbUser);
        const profile = await createUserProfile(sbUser.id, {
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
      setSupabaseUser(null);
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

  const changePassword = async (newPassword: string) => {
    setIsLoading(true);
    try {
      await updateUserPassword(newPassword);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentUser = async (data: Partial<User>) => {
    if (currentUser) {
      const updated = { ...currentUser, ...data, updatedAt: new Date().toISOString() };
      setCurrentUser(updated);

      if (isSupabaseConfigured && !isDemoMode) {
        try {
          await updateSupabaseUserProfile(currentUser.id, {
            fullName: data.fullName,
            photoUrl: data.photoUrl,
            email: data.email,
            phone: data.phone,
          });
        } catch (err) {
          console.error('Failed to sync profile update to Supabase:', err);
        }
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        supabaseUser,
        isLoading,
        isDemoMode,
        sendPhoneOtp,
        loginWithPhoneOtp,
        loginWithEmail,
        loginWithGoogle,
        changePassword,
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
