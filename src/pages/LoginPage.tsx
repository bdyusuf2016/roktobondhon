import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Droplets, User, Lock, Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import { resetPasswordForEmail } from '../services/authService';
import type { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail, switchDemoRole, isDemoMode } = useAuth();
  const { config } = useOrgConfig();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('অনুগ্রহ করে আপনার নিবন্ধিত ইমেইল অথবা মোবাইল নম্বর প্রদান করুন।');
      return;
    }
    if (!password || password.length < 6) {
      setError('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmail(identifier.trim(), password);

      // Read current user session for role-based navigation
      const saved = localStorage.getItem('roktobondon_current_user');
      const parsed = saved ? JSON.parse(saved) : null;

      if (parsed?.role === 'super_admin' || parsed?.role === 'admin' || parsed?.role === 'moderator' || parsed?.role === 'volunteer') {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } catch (err: any) {
      setError(err.message || 'লগইন ব্যর্থ হয়েছে। সঠিক ইমেইল/নম্বর ও পাসওয়ার্ড দিন।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus(null);

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setForgotStatus({ type: 'error', text: 'অনুগ্রহ করে একটি বৈধ ইমেইল এড্রেস দিন।' });
      return;
    }

    setIsForgotLoading(true);
    try {
      await resetPasswordForEmail(forgotEmail.trim().toLowerCase());
      setForgotStatus({
        type: 'success',
        text: 'আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করুন।',
      });
    } catch (err: any) {
      setForgotStatus({
        type: 'error',
        text: err?.message || 'পাসওয়ার্ড রিসেট ইমেইল পাঠাতে সমস্যা হয়েছে।',
      });
    } finally {
      setIsForgotLoading(false);
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
          {config.nameBn || config.name}-এ লগইন
        </h1>
        <p className="text-xs text-slate-500">
          আপনার ইমেইল অথবা মোবাইল নম্বর এবং পাসওয়ার্ড দিয়ে প্রবেশ করুন
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ইমেইল অথবা মোবাইল নম্বর
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@roktodanporibar.com অথবা 017XXXXXXXX"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden text-slate-900"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                পাসওয়ার্ড
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotStatus(null);
                  setShowForgotModal(true);
                }}
                className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xs border border-red-700/60 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {isLoading ? 'যাচাই হচ্ছে...' : 'লগইন করুন'}
          </button>
        </form>
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
              className="p-2 rounded-lg bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-purple-900 font-bold text-left transition-colors shadow-2xs cursor-pointer"
            >
              <span className="block font-black text-[11px]">সুপার এডমিন</span>
              <span className="text-[10px] text-slate-500">পূর্ণ নিয়ন্ত্রণ ক্ষমতা</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRole('moderator')}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-900 font-bold text-left transition-colors shadow-2xs cursor-pointer"
            >
              <span className="block font-black text-[11px]">মডারেটর (ধামরাই)</span>
              <span className="text-[10px] text-slate-500">উপজেলা ভেরিফিকেশন</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRole('donor')}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-900 font-bold text-left transition-colors shadow-2xs cursor-pointer"
            >
              <span className="block font-black text-[11px]">রক্তদাতা (Donor)</span>
              <span className="text-[10px] text-slate-500">অনুরোধ গ্রহণ ও প্রোফাইল</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRole('recipient')}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-amber-900 font-bold text-left transition-colors shadow-2xs cursor-pointer"
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

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  পাসওয়ার্ড পুনরুদ্ধার
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              আপনার নিবন্ধিত ইমেইল এড্রেসটি লিখুন। আমরা পাসওয়ার্ড পরিবর্তনের একটি নিরাপদ লিংক পাঠাব।
            </p>

            {forgotStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  forgotStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {forgotStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{forgotStatus.text}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ইমেইল এড্রেস
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="donor@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isForgotLoading ? 'পাঠানো হচ্ছে...' : 'রিসেট লিংক পাঠান'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
