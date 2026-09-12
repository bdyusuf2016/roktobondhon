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
  getDonorProfileByUserId,
  resolveAuthenticatedUserSession,
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Role-bearing profiles must always be resolved from an active Supabase session.
  // A browser-persisted copy can be stale or locally modified.
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Remove the legacy role cache. Supabase owns session persistence.
  useEffect(() => {
    localStorage.removeItem('roktobondon_current_user');
  }, []);

  // Listen to Supabase Auth state with two-tier resolution
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const unsubscribe = subscribeToAuth(async (sbUser) => {
      setSupabaseUser(sbUser);
      if (sbUser) {
        try {
          const { user: resolvedUser } = await resolveAuthenticatedUserSession(
            sbUser.id,
            sbUser.email,
            sbUser.phone
          );

          if (resolvedUser) {
            setCurrentUser(resolvedUser);
          }
          // Do NOT create public.users for ordinary donors or unattached sessions
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

      // Two-tier resolution
      const { user: resolvedUser } = await resolveAuthenticatedUserSession(
        sbUser.id,
        sbUser.email,
        sbUser.phone || phone
      );

      if (resolvedUser) {
        if (resolvedUser.status === 'suspended') {
          await signOutUser();
          setSupabaseUser(null);
          setCurrentUser(null);
          throw new Error('আপনার অ্যাকাউন্টটি স্থগিত (Suspended) রয়েছে। অনুগ্রহ করে এডমিনের সাথে যোগাযোগ করুন।');
        }
        setCurrentUser(resolvedUser);
      } else {
        if (!isDemoMode) {
          await signOutUser();
          setSupabaseUser(null);
          setCurrentUser(null);
          throw new Error('অ্যাকাউন্টের সাথে কোনো অনুমোদিত প্রোফাইল পাওয়া যায়নি। অনুগ্রহ করে লগইন করুন বা প্রশাসনের সাথে যোগাযোগ করুন।');
        }

        // Fallback for new donor registration via phone OTP in local demo mode
        const fallbackDonorUser: User = {
          id: sbUser.id,
          fullName: sbUser.user_metadata?.full_name || 'রক্তদাতা সদস্য',
          phone: sbUser.phone || phone,
          role: 'donor',
          organizationId: 'org-roktobondon',
          phoneVerified: true,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCurrentUser(fallbackDonorUser);
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

      // If user typed a phone number, resolve their registered email first (check users then donors)
      if (isPhoneInput && isSupabaseConfigured && supabase) {
        try {
          const { data: userRows } = await supabase
            .from('users')
            .select('email')
            .ilike('phone', `%${cleanPhone.slice(-10)}%`)
            .limit(1);
          if (userRows && userRows.length > 0 && userRows[0].email) {
            targetEmail = userRows[0].email.toLowerCase();
          } else {
            const { data: donorRows } = await supabase
              .from('donors')
              .select('email')
              .ilike('phone', `%${cleanPhone.slice(-10)}%`)
              .limit(1);
            if (donorRows && donorRows.length > 0 && donorRows[0].email) {
              targetEmail = donorRows[0].email.toLowerCase();
            }
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

            // Two-tier session resolution
            const { user: resolvedUser, tier } = await resolveAuthenticatedUserSession(
              sbUser.id,
              sbUser.email,
              sbUser.phone
            );

            if (resolvedUser) {
              if (resolvedUser.status === 'suspended') {
                await signOutUser();
                setSupabaseUser(null);
                setCurrentUser(null);
                throw new Error('আপনার অ্যাকাউন্টটি স্থগিত (Suspended) রয়েছে। অনুগ্রহ করে এডমিনের সাথে যোগাযোগ করুন।');
              }
              setCurrentUser(resolvedUser);
              return;
            }

            // Neither public.users nor public.donors exists
            if (!isDemoMode) {
              await signOutUser();
              setSupabaseUser(null);
              setCurrentUser(null);
              throw new Error('অ্যাকাউন্ট কনফিগারেশন ত্রুটি: আপনার অ্যাকাউন্টের সাথে কোনো অনুমোদিত স্টাফ বা রক্তদাতা প্রোফাইল পাওয়া যায়নি।');
            }
          }
        } catch (authErr: any) {
          console.warn('Supabase auth attempt notice:', authErr);
          if (!isDemoMode) {
            const errDetail = authErr.message || '';
            if (errDetail.toLowerCase().includes('email not confirmed')) {
              throw new Error('আপনার ইমেইলটি Supabase Auth-এ এখনও কনফার্ম করা হয়নি। অনুগ্রহ করে আপনার ইমেইল ইনবক্স চেক করুন অথবা এডমিনের সাথে যোগাযোগ করুন।');
            } else if (errDetail.toLowerCase().includes('invalid login credentials')) {
              throw new Error('ভুল ইমেইল বা পাসওয়ার্ড প্রদান করেছেন। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।');
            }
            throw new Error(errDetail || 'Supabase অথেন্টিকেশন ব্যর্থ হয়েছে।');
          }
        }
      }

      // 2. Direct database query (only if demo mode)
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
        // Register in Supabase Auth
        const sbUser = await registerEmail(email, pass, { fullName, phone });
        setSupabaseUser(sbUser);

        // For ordinary donors: return Auth-linked user object without inserting public.users row
        const donorUser: User = {
          id: sbUser.id,
          fullName,
          phone,
          email,
          role: role === 'donor' || !role ? 'donor' : role,
          organizationId: 'org-roktobondon',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Only insert public.users if explicitly a staff role (super_admin, admin, moderator, volunteer)
        if (role !== 'donor' && role !== 'recipient') {
          const staffProfile = await createUserProfile(sbUser.id, {
            fullName,
            phone,
            email,
            role,
          });
          setCurrentUser(staffProfile);
          return staffProfile;
        }

        setCurrentUser(donorUser);
        return donorUser;
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
      localStorage.removeItem('roktobondon_current_user');
      setIsLoading(false);
    }
  };

  const switchDemoRole = (role: UserRole) => {
    if (!isDemoMode) {
      console.warn('Demo role switching is disabled outside demo mode.');
      return;
    }

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

      if (isSupabaseConfigured && !isDemoMode && supabase) {
        try {
          if (currentUser.role !== 'donor' && currentUser.role !== 'recipient') {
            // Staff profile: update public.users
            await updateSupabaseUserProfile(currentUser.id, {
              fullName: data.fullName,
              photoUrl: data.photoUrl,
              email: data.email,
              phone: data.phone,
            });
          } else {
            // Ordinary donor: update public.donors allowlisted fields
            const donorUpdates: Record<string, any> = {
              updated_at: new Date().toISOString(),
            };
            if (data.fullName !== undefined) donorUpdates.full_name = data.fullName;
            if (data.photoUrl !== undefined) donorUpdates.photo_url = data.photoUrl;
            if (data.email !== undefined) donorUpdates.email = data.email;
            if (data.phone !== undefined) donorUpdates.phone = data.phone;

            await supabase
              .from('donors')
              .update(donorUpdates)
              .eq('user_id', currentUser.id);
          }
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
