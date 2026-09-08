import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
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
    // Load cached user session from localStorage
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached user', e);
      }
    }
    return null;
  });

  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync current user to local storage for persistence across refreshes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  // Listen to Supabase Auth state
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const unsubscribe = subscribeToAuth(async (sbUser) => {
      setSupabaseUser(sbUser);
      if (sbUser) {
        try {
          const profile = await getUserProfile(sbUser.id, sbUser.email, sbUser.phone);
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
      // Real Supabase OTP Verification
      const sbUser = await confirmSupabasePhoneOtp(phone, otp);
      setSupabaseUser(sbUser);

      // Load or create user profile
      const profile = await getUserProfile(sbUser.id, sbUser.email, sbUser.phone || phone);
      if (profile) {
        setCurrentUser(profile);
      } else {
        const newProfile = await createUserProfile(sbUser.id, {
          fullName: sbUser.user_metadata?.full_name || 'রক্তদাতা সদস্য',
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

  const loginWithEmail = async (emailOrPhone: string, pass: string) => {
    setIsLoading(true);
    try {
      const isPhoneInput = /^[0-9+-\s()]+$/.test(emailOrPhone.trim());
      const cleanPhone = isPhoneInput ? emailOrPhone.replace(/[^0-9]/g, '') : '';
      let targetEmail = emailOrPhone.trim().toLowerCase();

      // If user typed a phone number, resolve their registered email first
      if (isPhoneInput && isSupabaseConfigured && supabase) {
        try {
          const { data: userRows } = await supabase
            .from('users')
            .select('email')
            .ilike('phone', `%${cleanPhone.slice(-10)}%`)
            .limit(1);
          if (userRows && userRows.length > 0 && userRows[0].email) {
            targetEmail = userRows[0].email.toLowerCase();
          }
        } catch (lookupErr) {
          console.warn('Phone-to-email lookup error:', lookupErr);
        }
      }

      // 1. Authenticate with Supabase Auth
      if (isSupabaseConfigured && supabase) {
        try {
          const sbUser = await signInEmail(targetEmail, pass);
          if (sbUser) {
            setSupabaseUser(sbUser);
            const profile = await getUserProfile(sbUser.id, sbUser.email, sbUser.phone);
            if (profile) {
              setCurrentUser(profile);
              return;
            }
          }
        } catch (authErr: any) {
          console.warn('Supabase auth attempt notice:', authErr);
          // In production mode, do not bypass real Supabase Auth to prevent ghost/unauthenticated sessions
          if (!isDemoMode) {
            const errDetail = authErr.message || '';
            if (errDetail.toLowerCase().includes('email not confirmed')) {
              throw new Error('আপনার ইমেইলটি Supabase Auth-এ এখনও কনফার্ম করা হয়নি। অনুগ্রহ করে Supabase Dashboard থেকে কনফার্ম করুন।');
            } else if (errDetail.toLowerCase().includes('invalid login credentials')) {
              throw new Error('ভুল ইমেইল বা পাসওয়ার্ড প্রদান করেছেন। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।');
            }
            throw new Error(errDetail || 'Supabase অথেন্টিকেশন ব্যর্থ হয়েছে।');
          }
        }
      }

      // 2. Direct database query in users table (only if demo mode or fallback)
      if (isSupabaseConfigured && supabase && isDemoMode) {
        try {
          let query = supabase.from('users').select('*');
          if (isPhoneInput) {
            query = query.ilike('phone', `%${cleanPhone.slice(-10)}%`);
          } else {
            query = query.eq('email', targetEmail);
          }
          const { data: userRows, error: userErr } = await query.limit(1);
          if (!userErr && userRows && userRows.length > 0) {
            const row = userRows[0];
            const matchedUser: User = {
              id: row.id,
              fullName: row.full_name,
              phone: row.phone,
              email: row.email,
              role: row.role as UserRole,
              organizationId: row.organization_id || 'org-roktobondon',
              branchId: row.branch_id,
              photoUrl: row.photo_url,
              status: row.status || 'active',
              phoneVerified: Boolean(row.phone_verified),
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              lastLoginAt: new Date().toISOString(),
            };
            setCurrentUser(matchedUser);
            return;
          }
        } catch (dbErr) {
          console.warn('Direct database lookup notice:', dbErr);
        }
      }

      // 3. Fallback error if not found
      throw new Error('ব্যবহারকারী পাওয়া যায়নি। অনুগ্রহ করে সঠিক ইমেইল বা ফোন নম্বর প্রদান করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await signInGoogle();
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
        const sbUser = await registerEmail(email, pass, { fullName, phone });
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

      if (!isDemoMode && isSupabaseConfigured) {
        throw new Error('নিবন্ধনের জন্য ইমেইল ও পাসওয়ার্ড প্রদান করা আবশ্যক।');
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
    if (currentUser) {
      setCurrentUser({ ...currentUser, role });
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
