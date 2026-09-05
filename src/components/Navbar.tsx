import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Droplets,
  Bell,
  Search,
  PlusCircle,
  ShieldCheck,
  User,
  Menu,
  X,
  ChevronDown,
  Building2,
  Heart,
} from 'lucide-react';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import type { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { config } = useOrgConfig();
  const { currentUser, switchDemoRole, logout, isDemoMode } = useAuth();
  const { notifications } = useData();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isActive = (path: string) => location.pathname === path;

  const roles: { role: UserRole; labelBn: string; color: string }[] = [
    { role: 'super_admin', labelBn: 'সুপার এডমিন', color: 'bg-purple-100 text-purple-800' },
    { role: 'moderator', labelBn: 'মডারেটর (ধামরাই)', color: 'bg-blue-100 text-blue-800' },
    { role: 'donor', labelBn: 'রক্তদাতা', color: 'bg-emerald-100 text-emerald-800' },
    { role: 'recipient', labelBn: 'রক্ত গ্রহীতা', color: 'bg-amber-100 text-amber-800' },
  ];

  const currentRoleInfo = roles.find((r) => r.role === currentUser?.role) || roles[0];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Dynamic Announcement Banner */}
      {config.showAnnouncement && config.announcementTextBn && (
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white text-[11px] sm:text-xs py-1.5 px-4 shadow-inner">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <span className="bg-white/20 text-white font-black px-1.5 py-0.5 rounded text-[10px] tracking-wider shrink-0">
                জরুরি বিজ্ঞপ্তি
              </span>
              <span className="truncate font-medium">{config.announcementTextBn}</span>
            </div>
            {config.announcementLink && (
              <Link
                to={config.announcementLink}
                className="font-bold underline text-white hover:text-red-100 shrink-0 ml-2 transition-colors"
              >
                বিস্তারিত →
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-600 border border-red-700 flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105">
              <Droplets className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
            </div>
            <div>
              <span className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight block leading-tight">
                {config.name}
              </span>
              <span className="text-[11px] font-semibold text-red-600 tracking-wide hidden sm:block">
                {config.headerSubtitleBn || 'ধামরাই • সাভার • মানিকগঞ্জ'}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg transition-colors ${isActive('/')
                  ? 'bg-red-50 text-red-700 border border-red-200/80 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              হোম
            </Link>
            <Link
              to="/find-blood"
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${isActive('/find-blood')
                  ? 'bg-red-50 text-red-700 border border-red-200/80 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Search className="w-4 h-4 text-red-600" />
              রক্তদাতা খুঁজুন
            </Link>
            <Link
              to="/request-blood"
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${isActive('/request-blood')
                  ? 'bg-red-50 text-red-700 border border-red-200/80 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <PlusCircle className="w-4 h-4 text-red-600" />
              রক্তের আবেদন
            </Link>
            <Link
              to="/become-donor"
              className={`px-3 py-1.5 rounded-lg transition-colors ${isActive('/become-donor')
                  ? 'bg-red-50 text-red-700 border border-red-200/80 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              ডোনার নিবন্ধন
            </Link>
            <Link
              to="/hospitals"
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${isActive('/hospitals')
                  ? 'bg-red-50 text-red-700 border border-red-200/80 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Building2 className="w-3.5 h-3.5 text-red-600" />
              <span>হাসপাতাল ডিরেক্টরি</span>
            </Link>
            <Link
              to="/donate"
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${isActive('/donate')
                  ? 'bg-red-600 text-white font-bold shadow-xs'
                  : 'text-red-700 hover:bg-red-50 font-semibold border border-red-200/80 bg-red-50/50'
                }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>ডোনেট ও সাপোর্ট</span>
            </Link>
            <Link
              to="/about"
              className={`px-3 py-1.5 rounded-lg transition-colors ${isActive('/about')
                  ? 'bg-red-50 text-red-700 border border-red-200/80 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              আমাদের কথা
            </Link>
            <Link
              to="/contact"
              className={`px-3 py-1.5 rounded-lg transition-colors ${isActive('/contact')
                  ? 'bg-red-50 text-red-700 border border-red-200/80 font-semibold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              যোগাযোগ
            </Link>

            {/* Admin Dashboard link if user is privileged */}
            {(currentUser?.role === 'super_admin' ||
              currentUser?.role === 'admin' ||
              currentUser?.role === 'moderator') && (
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${isActive('/admin')
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                  এডমিন প্যানেল
                </Link>
              )}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Demo Role Switcher Badge (Only visible in Demo Mode) */}
            {isDemoMode && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors ${currentRoleInfo.color}`}
                  title="রোল পরিবর্তন করে সিস্টেম পরীক্ষা করুন"
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  <span>{currentRoleInfo.labelBn}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {isRoleDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setIsRoleDropdownOpen(false)}
                  >
                    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-1">
                      রোল পরিবর্তন (সরাসরি টেস্ট)
                    </div>
                    {roles.map((r) => (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => {
                          switchDemoRole(r.role);
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${currentUser?.role === r.role
                            ? 'bg-slate-100 font-bold text-slate-900'
                            : 'hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        <span>{r.labelBn}</span>
                        {currentUser?.role === r.role && (
                          <span className="text-emerald-600 font-bold">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notifications */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              title="বিজ্ঞপ্তি"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold font-mono flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* Profile or Login */}
            {currentUser ? (
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-2 p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold text-xs border border-red-200">
                  {currentUser.fullName.slice(0, 1)}
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-slate-900 block truncate max-w-[100px]">
                    {currentUser.fullName}
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                লগইন
              </Link>
            )}

            {/* Mobile hamburger menu toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1.5 shadow-xl">
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium ${isActive('/') ? 'bg-red-50 text-red-700 border border-red-200/70' : 'text-slate-700 hover:bg-slate-50'
              }`}
          >
            হোমপেজ
          </Link>
          <Link
            to="/find-blood"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium ${isActive('/find-blood') ? 'bg-red-50 text-red-700 border border-red-200/70' : 'text-slate-700 hover:bg-slate-50'
              }`}
          >
            রক্তদাতা খুঁজুন
          </Link>
          <Link
            to="/request-blood"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium ${isActive('/request-blood') ? 'bg-red-50 text-red-700 border border-red-200/70' : 'text-slate-700 hover:bg-slate-50'
              }`}
          >
            রক্তের জরুরি আবেদন
          </Link>
          <Link
            to="/become-donor"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium ${isActive('/become-donor') ? 'bg-red-50 text-red-700 border border-red-200/70' : 'text-slate-700 hover:bg-slate-50'
              }`}
          >
            ডোনার হিসেবে যুক্ত হোন
          </Link>
          <Link
            to="/hospitals"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-medium ${isActive('/hospitals') ? 'bg-red-50 text-red-700 border border-red-200/70' : 'text-slate-700 hover:bg-slate-50'
              }`}
          >
            হাসপাতাল ও ব্লাড ব্যাংক ডিরেক্টরি
          </Link>
          <Link
            to="/donate"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-base font-bold ${isActive('/donate') ? 'bg-red-600 text-white' : 'text-red-700 bg-red-50 hover:bg-red-100'
              }`}
          >
            ❤️ ডোনেট এবং সাপোর্ট করুন
          </Link>
          <Link
            to="/admin"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-white bg-slate-900"
          >
            এডমিন ড্যাশবোর্ড ও ব্যবস্থাপনা
          </Link>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              প্রোফাইল ({currentUser?.fullName || 'লগইন করুন'})
            </Link>
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="text-xs text-red-600 font-semibold"
              >
                লগআউট
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
