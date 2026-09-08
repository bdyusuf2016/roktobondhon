import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Droplets } from 'lucide-react';
import { updateUserPassword } from '../services/authService';
import { useOrgConfig } from '../contexts/OrgConfigContext';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useOrgConfig();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।');
      return;
    }

    setIsLoading(true);
    try {
      await updateUserPassword(newPassword);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center mx-auto border border-red-700/70 shadow-xs">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          নতুন পাসওয়ার্ড সেট করুন
        </h1>
        <p className="text-xs text-slate-500">
          {config.nameBn || config.name} অ্যাকাউন্টের সুরক্ষায় একটি শক্তিশালী পাসওয়ার্ড নির্ধারণ করুন
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {isSuccess ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!
            </h2>
            <p className="text-xs text-slate-500">
              আপনি এখন আপনার নতুন পাসওয়ার্ড দিয়ে সিস্টেমে লগইন করতে পারেন।
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
          >
            লগইন পাতায় যান
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                নতুন পাসওয়ার্ড (ন্যূনতম ৬ অক্ষর)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-3 py-2.5 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                পাসওয়ার্ড নিশ্চিত করুন
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xs border border-red-700/60 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {isLoading ? 'সংরক্ষণ হচ্ছে...' : 'পাসওয়ার্ড নিশ্চিত করুন'}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              লগইন পাতায় ফিরে যান
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
