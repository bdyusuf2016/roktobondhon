import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { scrollToTop } from './ScrollToTop';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { notifications } = useData();
  const { currentUser } = useAuth();

  const unreadCount = notifications.filter(
    (n) => !n.isRead && (n.userId === currentUser?.id || n.userId === 'all')
  ).length;
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const handleNavClick = () => {
    scrollToTop(true);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] pb-safe">
      <div className="flex items-center justify-around">
        {/* 1. Home */}
        <Link
          to="/"
          onClick={handleNavClick}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors min-w-[56px] active:scale-95 ${
            isActive('/') && currentPath === '/'
              ? 'text-red-600 font-semibold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">হোম</span>
        </Link>

        {/* 2. Find Blood */}
        <Link
          to="/find-blood"
          onClick={handleNavClick}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors min-w-[56px] active:scale-95 ${
            isActive('/find-blood')
              ? 'text-red-600 font-semibold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">ডোনার খুঁজুন</span>
        </Link>

        {/* 3. Center Blood Request Button */}
        <Link
          to="/request-blood"
          onClick={handleNavClick}
          className="flex flex-col items-center justify-center -mt-4 group min-w-[64px] active:scale-95"
        >
          <div className="w-12 h-12 rounded-full bg-red-600 border border-red-700 text-white flex items-center justify-center shadow-md shadow-red-600/20 group-hover:scale-105 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-red-700 mt-1">আবেদন</span>
        </Link>

        {/* 4. Notifications */}
        <Link
          to="/notifications"
          onClick={handleNavClick}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors min-w-[56px] active:scale-95 ${
            isActive('/notifications')
              ? 'text-red-600 font-semibold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bell className="w-5 h-5 mb-0.5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-3 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-bold font-mono flex items-center justify-center">
              {unreadCount}
            </span>
          )}
          <span className="text-[10px] tracking-tight">বিজ্ঞপ্তি</span>
        </Link>

        {/* 5. Profile / Account */}
        <Link
          to={currentUser ? '/profile' : '/login'}
          onClick={handleNavClick}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors min-w-[56px] active:scale-95 ${
            isActive('/profile') || isActive('/login')
              ? 'text-red-600 font-semibold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">
            {currentUser ? 'প্রোফাইল' : 'লগইন'}
          </span>
        </Link>
      </div>
    </nav>
  );
};
