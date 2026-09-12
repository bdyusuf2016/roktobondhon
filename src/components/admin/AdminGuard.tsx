import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'admin' | 'moderator' | 'volunteer';
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children, requiredRole }) => {
  const { currentUser } = useAuth();

  const allowedRoles: Array<'super_admin' | 'admin' | 'moderator' | 'volunteer'> = [
    'super_admin',
    'admin',
    'moderator',
  ];

  if (requiredRole === 'volunteer') {
    allowedRoles.push('volunteer');
  }

  const isPrivilegedStaff = Boolean(currentUser && allowedRoles.includes(currentUser.role as 'super_admin' | 'admin' | 'moderator' | 'volunteer'));

  if (!isPrivilegedStaff) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">অননুমোদিত প্রবেশাধিকার</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          এই পৃষ্ঠাটি শুধুমাত্র অনুমোদিত এডমিন ও মডারেটরদের জন্য সংরক্ষিত। অনুগ্রহ করে আপনার অনুমোদিত অ্যাকাউন্টে লগইন করুন।
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
        >
          লগইন পৃষ্ঠায় যান
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
