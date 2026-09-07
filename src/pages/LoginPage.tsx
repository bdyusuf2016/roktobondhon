import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Droplets, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import type { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail, switchDemoRole, isDemoMode } = useAuth();
  const { config } = useOrgConfig();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('অনুগ্রহ করে আপনার ইমেইল অথবা মোবাইল নম্বর প্রদান করুন।');
      return;
    }
    if (!password || password.length < 6) {
      setError('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।');
      return;
    }

    setIsLoading(true);
    try {
      // Normalize identifier: if user enters phone number (no @), map to internal email format
      let loginEmail = identifier.trim();
      if (!loginEmail.includes('@')) {
        const cleanedPhone = loginEmail.replace(/[^0-9]/g, '');
        loginEmail = `${cleanedPhone}@roktobondon.org`;
      }

      await loginWithEmail(loginEmail, password);
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'লগইন ব্যর্থ হয়েছে। সঠিক ইমেইল/নম্বর ও পাসওয়ার্ড দিন।');
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
          আপনার ইমেইল অথবা মোবাইল নম্বর এবং পাসওয়ার্ড দিয়ে প্রবেশ করুন
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
          {error}
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
                placeholder="admin@roktobondon.org অথবা 017XXXXXXXX"
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
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
            />
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
