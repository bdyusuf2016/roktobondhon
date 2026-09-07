import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Phone, Mail, Droplets, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import type { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail, loginWithPhoneOtp, sendPhoneOtp, switchDemoRole, isDemoMode } = useAuth();
  const { config } = useOrgConfig();

  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otpSent) {
      if (!phone || phone.length < 11) {
        setError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।');
        return;
      }
      setIsLoading(true);
      try {
        await sendPhoneOtp(phone);
        setOtpSent(true);
        if (isDemoMode) {
          setOtp('123456'); // Pre-fill mock OTP in demo mode only
        }
      } catch (err: any) {
        setError(err.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে নম্বরটি সঠিক কিনা যাচাই করুন।');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!otp || otp.length < 4) {
      setError('মোবাইলে পাঠানো ওটিপি কোডটি লিখুন।');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithPhoneOtp(phone, otp);
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'ওটিপি যাচাই ব্যর্থ হয়েছে। সঠিক কোড দিন।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'লগইন ব্যর্থ হয়েছে। সঠিক ইমেইল ও পাসওয়ার্ড দিন।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickRole = (role: UserRole) => {
    switchDemoRole(role);
    if (role === 'super_admin' || role === 'moderator') {
      navigate('/admin');
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center mx-auto border border-red-700/70 shadow-xs">
          <Droplets className="w-6 h-6 fill-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {config.name}-এ লগইন
        </h1>
        <p className="text-xs text-slate-500">
          আপনার মোবাইল নম্বর বা ইমেইল দিয়ে সহজে প্রবেশ করুন
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Mode Switch Tabs */}
      <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setMode('phone');
            setError('');
          }}
          className={`flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            mode === 'phone' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          মোবাইল ওটিপি (Phone OTP)
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('email');
            setError('');
          }}
          className={`flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            mode === 'email' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          ইমেইল / পাসওয়ার্ড
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        {mode === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                মোবাইল নম্বর
              </label>
              <input
                type="tel"
                required
                disabled={otpSent && !isDemoMode}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden font-mono"
              />
            </div>

            {otpSent && (
              <div className="animate-in fade-in duration-200 space-y-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  ৬-ডিজিট ওটিপি কোড (OTP)
                </label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-center tracking-widest text-base font-bold"
                />
                {isDemoMode ? (
                  <p className="text-[11px] text-emerald-600 font-medium">
                    পরীক্ষামূলক ওটিপি স্বয়ংক্রিয়ভাবে পূরণ হয়েছে (123456)
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 font-medium">
                    আপনার মোবাইলে প্রেরিত ৬ ডিজিটের ওটিপি প্রবেশ করান
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xs border border-red-700/60 transition-colors cursor-pointer"
            >
              {isLoading ? 'যাচাই হচ্ছে...' : otpSent ? 'ওটিপি নিশ্চিত করুন' : 'ওটিপি পাঠান'}
            </button>

            {otpSent && (
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                }}
                className="w-full text-center text-[11px] text-slate-500 hover:text-red-600 font-semibold pt-1"
              >
                নম্বর পরিবর্তন করতে চান?
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ইমেইল ঠিকানা
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                পাসওয়ার্ড
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xs border border-red-700/60 transition-colors cursor-pointer"
            >
              {isLoading ? 'যাচাই হচ্ছে...' : 'লগইন / স্বয়ংক্রিয় সাইন-আপ'}
            </button>
          </form>
        )}
      </div>

      {/* One-Click Demo Role Switcher Section (Rendered only when isDemoMode is TRUE) */}
      {isDemoMode && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-800">
              সরাসরি ডেমো টেস্ট (One-Click Role Switch)
            </p>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">Demo Only</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickRole('super_admin')}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-purple-900 font-bold text-left transition-colors shadow-2xs"
            >
              <span className="block font-black text-[11px]">সুপার এডমিন</span>
              <span className="text-[10px] text-slate-500">পূর্ণ নিয়ন্ত্রণ ক্ষমতা</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRole('moderator')}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-900 font-bold text-left transition-colors shadow-2xs"
            >
              <span className="block font-black text-[11px]">মডারেটর (ধামরাই)</span>
              <span className="text-[10px] text-slate-500">উপজেলা ভেরিফিকেশন</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRole('donor')}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-900 font-bold text-left transition-colors shadow-2xs"
            >
              <span className="block font-black text-[11px]">রক্তদাতা (Donor)</span>
              <span className="text-[10px] text-slate-500">অনুরোধ গ্রহণ ও প্রোফাইল</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRole('recipient')}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-amber-900 font-bold text-left transition-colors shadow-2xs"
            >
              <span className="block font-black text-[11px]">গ্রহীতা (Recipient)</span>
              <span className="text-[10px] text-slate-500">রক্তের আবেদনকারী</span>
            </button>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-slate-500">
        অ্যাকাউন্ট নেই?{' '}
        <Link to="/become-donor" className="text-red-600 font-bold hover:underline">
          রক্তদাতা হিসেবে নিবন্ধন করুন
        </Link>
      </div>
    </div>
  );
};
