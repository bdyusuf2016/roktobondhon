import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  type User as FirebaseUser,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';

// Store recaptcha verifier on window if necessary
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

/**
 * Initialize invisible or visible reCAPTCHA verifier for Phone Auth
 */
export function setupRecaptcha(containerId: string = 'recaptcha-container'): RecaptchaVerifier | null {
  if (!isFirebaseConfigured || !auth) return null;
  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired, please try again.');
      },
    });
    window.recaptchaVerifier = verifier;
    return verifier;
  } catch (err) {
    console.error('Failed to setup reCAPTCHA:', err);
    return null;
  }
}

/**
 * Send Phone OTP via Firebase Auth
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  verifier?: RecaptchaVerifier | null
): Promise<ConfirmationResult> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase Authentication কনফিগার করা নেই।');
  }

  // Format phone number to E.164 (+880...) if it starts with 01
  let formattedPhone = phoneNumber.trim();
  if (formattedPhone.startsWith('01')) {
    formattedPhone = `+88${formattedPhone}`;
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+${formattedPhone}`;
  }

  const appVerifier = verifier || window.recaptchaVerifier || setupRecaptcha('recaptcha-container');
  if (!appVerifier) {
    throw new Error('reCAPTCHA ভেরিফায়ার চালু করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করুন।');
  }

  const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
  window.confirmationResult = confirmation;
  return confirmation;
}

/**
 * Confirm Phone OTP Code
 */
export async function confirmFirebasePhoneOtp(
  confirmation: ConfirmationResult | undefined,
  otpCode: string
): Promise<FirebaseUser> {
  const activeConfirmation = confirmation || window.confirmationResult;
  if (!activeConfirmation) {
    throw new Error('ওটিপি সেশন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় ওটিপি পাঠান।');
  }
  const result = await activeConfirmation.confirm(otpCode);
  return result.user;
}

/**
 * Sign in with Email and Password
 */
export async function signInEmail(email: string, pass: string): Promise<FirebaseUser> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase Authentication কনফিগার করা নেই।');
  }
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

/**
 * Create user with Email and Password
 */
export async function registerEmail(email: string, pass: string): Promise<FirebaseUser> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase Authentication কনফিগার করা নেই।');
  }
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

/**
 * Sign in with Google Popup
 */
export async function signInGoogle(): Promise<FirebaseUser> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase Authentication কনফিগার করা নেই।');
  }
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await fbSignOut(auth);
  }
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
    window.recaptchaVerifier = undefined;
  }
  window.confirmationResult = undefined;
}

/**
 * Subscribe to Auth State Changes
 */
export function subscribeToAuth(callback: (user: FirebaseUser | null) => void): () => void {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, callback);
  }
  callback(null);
  return () => {};
}
