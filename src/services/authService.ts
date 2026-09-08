import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../supabase/config';

/**
 * Send Phone OTP via Supabase Auth
 */
export async function sendSupabasePhoneOtp(phoneNumber: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Authentication কনফিগার করা নেই।');
  }

  let formattedPhone = phoneNumber.trim();
  if (formattedPhone.startsWith('01')) {
    formattedPhone = `+88${formattedPhone}`;
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+${formattedPhone}`;
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: formattedPhone,
  });

  if (error) {
    throw new Error(error.message || 'মোবাইলে ওটিপি পাঠাতে সমস্যা হয়েছে।');
  }

  return true;
}

/**
 * Verify Phone OTP Code
 */
export async function confirmSupabasePhoneOtp(
  phoneNumber: string,
  otpCode: string
): Promise<SupabaseUser> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Authentication কনফিগার করা নেই।');
  }

  let formattedPhone = phoneNumber.trim();
  if (formattedPhone.startsWith('01')) {
    formattedPhone = `+88${formattedPhone}`;
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+${formattedPhone}`;
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: formattedPhone,
    token: otpCode.trim(),
    type: 'sms',
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'ওটিপি যাচাই ব্যর্থ হয়েছে। সঠিক কোড দিন।');
  }

  return data.user;
}

/**
 * Sign in with Email and Password
 */
export async function signInEmail(email: string, pass: string): Promise<SupabaseUser> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Authentication কনফিগার করা নেই।');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'লগইন ব্যর্থ হয়েছে। সঠিক ইমেইল ও পাসওয়ার্ড দিন।');
  }

  return data.user;
}

/**
 * Register user with Email and Password
 */
export async function registerEmail(
  email: string,
  pass: string,
  metadata?: { fullName?: string; phone?: string }
): Promise<SupabaseUser> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Authentication কনফিগার করা নেই।');
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: pass,
    options: metadata
      ? {
          data: {
            full_name: metadata.fullName,
            phone: metadata.phone,
          },
        }
      : undefined,
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
  }

  return data.user;
}

/**
 * Sign in with Google OAuth
 */
export async function signInGoogle(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Authentication কনফিগার করা নেই।');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message || 'গুগল দিয়ে লগইন ব্যর্থ হয়েছে।');
  }
}

/**
 * Update user password (Self Account Security)
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return; // Local simulation / demo mode succeeds
  }
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) {
    throw new Error(error.message || 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।');
  }
}

/**
 * Request Password Reset Email
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Authentication কনফিগার করা নেই।');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) {
    throw new Error(error.message || 'পাসওয়ার্ড রিসেট ইমেইল পাঠাতে সমস্যা হয়েছে।');
  }
}

/**
 * Sign out user
 */
export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
}

/**
 * Subscribe to Auth State Changes
 */
export function subscribeToAuth(callback: (user: SupabaseUser | null) => void): () => void {
  if (isSupabaseConfigured && supabase) {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }
  callback(null);
  return () => {};
}

