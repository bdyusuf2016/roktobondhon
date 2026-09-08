import React, { useState, useRef, useEffect } from 'react';
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
  Award,
  Sparkles,
  UserPlus,
  Info,
  PhoneCall,
  Calendar,
} from 'lucide-react';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import type { UserRole } from '../types';
import { scrollToTop } from './ScrollToTop';

export const Navbar: React.FC = () => {
  const { config } = useOrgConfig();
  const { currentUser, switchDemoRole, logout, isDemoMode } = useAuth();
  const { notifications } = useData();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isActive = (path: string) => location.pathname === path;

  const handleMobileNavClick = () => {
    setIsMobileMenuOpen(false);
    scrollToTop(true);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [location.pathname]);

  const roles: { role: UserRole; labelBn: string; color: string }[] = [
    { role: 'super_admin', labelBn: 'সুপার এডমিন', color: 'bg-purple-100 text-purple-800' },
    { role: 'admin', labelBn: 'এডমিন', color: 'bg-red-100 text-red-800' },
    { role: 'moderator', labelBn: 'মডারেটর', color: 'bg-blue-100 text-blue-800' },
    { role: 'volunteer', labelBn: 'স্বেচ্ছাসেবক', color: 'bg-emerald-100 text-emerald-800' },
    { role: 'donor', labelBn: 'রক্তদাতা', color: 'bg-rose-100 text-rose-800' },
    { role: 'recipient', labelBn: 'রক্ত গ্রহীতা', color: 'bg-amber-100 text-amber-800' },
  ];

  const currentRoleInfo = roles.find((r) => r.role === currentUser?.role) || roles[0];

  const isMoreActive =
    isActive('/become-donor') ||
    isActive('/certificate') ||
    isActive('/health-checker') ||
    isActive('/about') ||
    isActive('/contact');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all">
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
                className="font-bold underline text-white hover:text-red-100 shrink-0 ml-2 transition-colors text-[11px]"
              >
                বিস্তারিত →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-17 gap-2 sm:gap-4">
          {/* Logo & Brand Identity */}
          <Link to="/" onClick={() => scrollToTop(true)} className="flex items-center gap-2 sm:gap-2.5 shrink-0 group">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.name}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 shadow-xs ring-1 ring-red-100 transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105 shrink-0">
                <Droplets className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-white" />
              </div>
            )}
            <div className="min-w-0">
              <span className="font-black text-base sm:text-lg text-slate-900 tracking-tight block leading-tight truncate">
                {config.name}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-red-600 tracking-wide block truncate">
                {config.headerSubtitleBn || 'ধামরাই • সাভার • মানিকগঞ্জ'}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs xl:text-sm font-medium">
            <Link
              to="/"
              className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition-all ${
                isActive('/')
                  ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              হোম
            </Link>

            <Link
              to="/find-blood"
              className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                isActive('/find-blood')
                  ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>রক্তদাতা খুঁজুন</span>
            </Link>

            <Link
              to="/request-blood"
              className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                isActive('/request-blood')
                  ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>রক্তের আবেদন</span>
            </Link>

            <Link
              to="/camps"
              className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                isActive('/camps')
                  ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>ব্লাড ক্যাম্প</span>
            </Link>

            <Link
              to="/hospitals"
              className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                isActive('/hospitals')
                  ? 'bg-red-50 text-red-700 font-bold border border-red-200/80 shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>হাসপাতাল</span>
            </Link>

            <Link
              to="/donate"
              className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                isActive('/donate')
                  ? 'bg-red-600 text-white font-bold shadow-xs'
                  : 'text-red-700 hover:bg-red-50 font-bold border border-red-200/80 bg-red-50/50'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>তহবিল অনুদান</span>
            </Link>

            {/* "More Services" Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                  isMoreActive || isMoreMenuOpen
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <span>আরও সেবা</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isMoreMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                  <Link
                    to="/become-donor"
                    className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                      isActive('/become-donor')
                        ? 'bg-red-50 text-red-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>ডোনার হিসেবে নিবন্ধন</span>
                  </Link>

                  <Link
                    to="/certificate"
                    className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                      isActive('/certificate')
                        ? 'bg-red-50 text-red-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>রক্তদাতা সনদপত্র ও ব্যাজ</span>
                  </Link>

                  <Link
                    to="/health-checker"
                    className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                      isActive('/health-checker')
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>AI রক্তদান স্বাস্থ্য সহকারী</span>
                  </Link>

                  <div className="border-t border-slate-100 my-1" />

                  <Link
                    to="/about"
                    className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                      isActive('/about')
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Info className="w-4 h-4 text-slate-500" />
                    <span>আমাদের কথা ও পরিচিতি</span>
                  </Link>

                  <Link
                    to="/contact"
                    className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                      isActive('/contact')
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <PhoneCall className="w-4 h-4 text-slate-500" />
                    <span>জরুরি যোগাযোগ ও শাখা</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Admin Portal Link (Privileged Only) */}
            {(currentUser?.role === 'super_admin' ||
              currentUser?.role === 'admin' ||
              currentUser?.role === 'moderator' ||
              currentUser?.role === 'volunteer') && (
              <Link
                to="/admin"
                className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  isActive('/admin')
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-900 hover:bg-slate-100 font-semibold'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>অ্যাডমিন প্যানেল</span>
              </Link>
            )}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Quick Demo Role Switcher Badge (Only in Sandbox / Demo Mode) */}
            {isDemoMode && (
              <div className="relative shrink-0" ref={roleMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${currentRoleInfo.color}`}
                  title="রোল পরিবর্তন করে সিস্টেম পরীক্ষা করুন"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                  <span className="whitespace-nowrap font-bold tracking-tight inline-block">{currentRoleInfo.labelBn}</span>
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </button>

                {isRoleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                      ডেমো রোল পরিবর্তন
                    </div>
                    {roles.map((r) => (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => {
                          switchDemoRole(r.role);
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          currentUser?.role === r.role
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

            {/* Notifications Icon */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="বিজ্ঞপ্তি"
            >
              <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-bold font-mono flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* Profile or Login Button */}
            {currentUser ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold text-xs border border-red-200 shrink-0">
                  {currentUser.fullName.slice(0, 1)}
                </div>
                <span className="text-xs font-semibold text-slate-900 hidden md:block truncate max-w-[90px]">
                  {currentUser.fullName}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>লগইন</span>
              </Link>
            )}

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/90 transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/90 bg-white/98 px-4 pt-3 pb-6 space-y-3 shadow-2xl max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Quick Action Grid */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/find-blood"
              onClick={handleMobileNavClick}
              className="p-3 rounded-xl bg-red-50/80 border border-red-100 text-red-700 font-bold text-xs flex items-center gap-2 active:scale-98"
            >
              <Search className="w-4 h-4" />
              <span>রক্তদাতা খুঁজুন</span>
            </Link>
            <Link
              to="/request-blood"
              onClick={handleMobileNavClick}
              className="p-3 rounded-xl bg-rose-50/80 border border-rose-100 text-rose-700 font-bold text-xs flex items-center gap-2 active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              <span>রক্তের আবেদন</span>
            </Link>
          </div>

          <div className="space-y-1">
            <Link
              to="/"
              onClick={handleMobileNavClick}
              className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                isActive('/') ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              হোমপেজ
            </Link>
            <Link
              to="/camps"
              onClick={handleMobileNavClick}
              className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                isActive('/camps') ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              🎪 রক্তদান ক্যাম্প ও ইভেন্ট
            </Link>
            <Link
              to="/hospitals"
              onClick={handleMobileNavClick}
              className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                isActive('/hospitals') ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              🏥 হাসপাতাল ও ব্লাড ব্যাংক ডিরেক্টরি
            </Link>
            <Link
              to="/become-donor"
              onClick={handleMobileNavClick}
              className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                isActive('/become-donor') ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              🩸 রক্তদাতা হিসেবে নিবন্ধন
            </Link>
            <Link
              to="/certificate"
              onClick={handleMobileNavClick}
              className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                isActive('/certificate') ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              🏆 রক্তদাতা সনদপত্র ও লিডারবোর্ড
            </Link>
            <Link
              to="/health-checker"
              onClick={handleMobileNavClick}
              className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                isActive('/health-checker') ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              ✨ AI রক্তদান স্বাস্থ্য সহকারী
            </Link>
            <Link
              to="/donate"
              onClick={handleMobileNavClick}
              className={`block px-3 py-2 rounded-xl text-sm font-bold ${
                isActive('/donate') ? 'bg-red-600 text-white' : 'text-red-700 bg-red-50 hover:bg-red-100'
              }`}
            >
              ❤️ অনুদান প্রদান (Donate)
            </Link>
            <Link
              to="/about"
              onClick={handleMobileNavClick}
              className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                isActive('/about') ? 'bg-slate-100 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              আমাদের কথা ও পরিচিতি
            </Link>
            <Link
              to="/contact"
              onClick={handleMobileNavClick}
              className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                isActive('/contact') ? 'bg-slate-100 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              যোগাযোগ ও সহায়তা
            </Link>
            <Link
              to="/admin"
              onClick={handleMobileNavClick}
              className="block px-3 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 shadow-md flex items-center gap-2 mt-2"
            >
              <ShieldCheck className="w-4 h-4 text-red-500" />
              <span>অ্যাডমিন ড্যাশবোর্ড ও ব্যবস্থাপনা</span>
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/profile"
              onClick={handleMobileNavClick}
              className="text-sm font-semibold text-slate-800 hover:text-red-600"
            >
              {currentUser ? `প্রোফাইল: ${currentUser.fullName}` : 'আমার প্রোফাইল'}
            </Link>
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="text-xs text-red-600 font-bold px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
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
