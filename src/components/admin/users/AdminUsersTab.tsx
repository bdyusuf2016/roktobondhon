import React, { useState } from 'react';
import {
  Users,
  Key,
  Plus,
  RotateCcw,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  Lock,
  UserX,
  UserCheck,
  AlertTriangle,
  Heart,
  ExternalLink,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { UserFormModal } from '../../modals';
import { PERMISSION_DEFINITIONS } from '../../../data/seedData';
import { validateRoleAssignment, canManageRole, ROLE_LABELS } from '../../../services/permissionService';
import type { User, UserRole, Donor } from '../../../types';

export const AdminUsersTab: React.FC = () => {
  const {
    users,
    donors,
    updateUserRole,
    updateUser,
    addUser,
    deleteUser,
    updateDonor,
    permissionMatrix,
    updateRolePermission,
    resetPermissionMatrix,
  } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [selectedDonorForPreview, setSelectedDonorForPreview] = useState<Donor | null>(null);
  const [userTabMode, setUserTabMode] = useState<'users' | 'matrix'>('users');
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<'all' | 'blood' | 'directory' | 'funds' | 'system'>('all');

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Strictly filter to portal/staff application users (excludes standalone donors/recipients)
  const staffUsers = users.filter((u) =>
    ['super_admin', 'admin', 'moderator', 'volunteer'].includes(u.role)
  );

  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    const validation = validateRoleAssignment(currentUser?.role, targetUser.role, newRole);
    if (!validation.allowed) {
      dialog.alert({
        title: 'অননুমোদিত রোল পরিবর্তন',
        message: validation.reason || 'আপনার এই ইউজারের রোল পরিবর্তন করার অনুমতি নেই।',
        theme: 'error',
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'রোল পরিবর্তন নিশ্চিতকরণ',
      message: `আপনি কি "${targetUser.fullName}"-এর রোল "${ROLE_LABELS[targetUser.role]?.bn || targetUser.role}" থেকে "${ROLE_LABELS[newRole]?.bn || newRole}"-এ পরিবর্তন করতে চান?`,
      confirmText: 'হ্যাঁ, পরিবর্তন করুন',
      confirmTheme: 'warning',
    });

    if (confirmed) {
      await updateUserRole(targetUser.id, newRole);
      dialog.alert({
        title: 'রোল পরিবর্তন সফল',
        message: `"${targetUser.fullName}"-এর রোল সফলভাবে "${newRole}" নির্ধারণ করা হয়েছে।`,
        theme: 'success',
      });
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (!canManageRole(currentUser?.role, targetUser.role)) {
      dialog.alert({
        title: 'অননুমোদিত অ্যাকশন',
        message: 'আপনার এই ইউজার মুছে ফেলার অনুমতি নেই। উচ্চতর রোলের ইউজার শুধুমাত্র সুপার এডমিন মুছতে পারেন।',
        theme: 'error',
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'ইউজার মুছে ফেলবেন?',
      message: `আপনি কি নিশ্চিত যে "${targetUser.fullName}" (${targetUser.role}) এর একাউন্টটি স্থায়ীভাবে মুছে ফেলতে চান?`,
      confirmText: 'মুছে ফেলুন',
      confirmTheme: 'danger',
    });

    if (confirmed) {
      await deleteUser(targetUser.id);
      dialog.alert({
        title: 'ইউজার অপসারিত',
        message: 'ইউজার অ্যাকাউন্টটি সফলভাবে মুছে ফেলা হয়েছে।',
        theme: 'info',
      });
    }
  };

  const handleToggleSuspension = async (targetUser: User) => {
    if (!canManageRole(currentUser?.role, targetUser.role)) {
      dialog.alert({
        title: 'অননুমোদিত অ্যাকশন',
        message: 'আপনার এই ইউজারের স্ট্যাটাস পরিবর্তন করার অনুমতি নেই।',
        theme: 'error',
      });
      return;
    }

    const isSuspended = targetUser.status === 'suspended';
    const actionText = isSuspended ? 'পুনরায় সক্রিয় (Activate)' : 'সাময়িক স্থগিত (Suspend)';

    const confirmed = await dialog.confirm({
      title: `একাউন্ট ${actionText} করবেন?`,
      message: `আপনি কি "${targetUser.fullName}" এর অ্যাকাউন্টটি ${actionText} করতে চান?`,
      confirmText: `হ্যাঁ, ${actionText} করুন`,
      confirmTheme: isSuspended ? 'success' : 'danger',
    });

    if (confirmed) {
      await updateUser(targetUser.id, {
        status: isSuspended ? 'active' : 'suspended',
      });
      dialog.alert({
        title: 'স্ট্যাটাস আপডেট সফল',
        message: `"${targetUser.fullName}" এর অ্যাকাউন্টটি সফলভাবে ${isSuspended ? 'সক্রিয়' : 'স্থগিত'} করা হয়েছে।`,
        theme: 'info',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* User Metrics (Administrative accounts only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট টিম মেম্বার</span>
          <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight font-mono">{staffUsers.length}</span>
          <span className="text-[10px] text-slate-500">অনুমোদিত পোর্টাল ইউজার</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">সুপার এডমিন</span>
          <span className="text-2xl font-black text-purple-700 block mt-1 tracking-tight font-mono">
            {staffUsers.filter((u) => u.role === 'super_admin').length}
          </span>
          <span className="text-[10px] text-purple-600 font-semibold">পূর্ণ নিয়ন্ত্রণ ক্ষমতা</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">এডমিন ও মডারেটর</span>
          <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight font-mono">
            {staffUsers.filter((u) => u.role === 'admin' || u.role === 'moderator').length}
          </span>
          <span className="text-[10px] text-blue-600 font-semibold">ধামরাই ও সাভার চ্যাপ্টার</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">স্বেচ্ছাসেবক টিম</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight font-mono">
            {staffUsers.filter((u) => u.role === 'volunteer').length}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">ফিল্ড সাপোর্ট সদস্য</span>
        </div>
      </div>

      {/* Sub Navigation: Users List vs Permission Matrix */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setUserTabMode('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              userTabMode === 'users'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>টিম ও ইউজার অ্যাকাউন্টস ({staffUsers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setUserTabMode('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              userTabMode === 'matrix'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>রোল ও পারমিশন ম্যাট্রিক্স (Permission Matrix)</span>
          </button>
        </div>

        {userTabMode === 'users' ? (
          <button
            type="button"
            onClick={() => {
              setSelectedUserForEdit(null);
              setShowUserModal(true);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন সদস্য যুক্ত করুন</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              const ok = await dialog.confirm({
                title: 'ডিফল্ট পারমিশন রিস্টোর করবেন?',
                message: 'সকল রোলের পারমিশন সিস্টেমের আদি ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান?',
                confirmText: 'হ্যাঁ, রিস্টোর করুন',
                confirmTheme: 'warning',
              });
              if (ok) {
                resetPermissionMatrix();
                dialog.alert({
                  title: 'রিস্টোর সম্পন্ন',
                  message: 'রোল ও পারমিশন ম্যাট্রিক্স সফলভাবে ডিফল্ট সেটিংসে ফিরিয়ে নেওয়া হয়েছে।',
                  theme: 'success',
                });
              }
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 shrink-0 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ডিফল্ট পারমিশন রিস্টোর</span>
          </button>
        )}
      </div>

      {/* VIEW 1: USERS LIST */}
      {userTabMode === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">ব্যবহারকারী ও ডায়নামিক রোল ব্যবস্থাপনা</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                এডমিন প্যানেলের অনুমোদিত কর্মী, স্বেচ্ছাসেবক ও কর্মকর্তাদের রোল এবং একাউন্ট নিয়ন্ত্রণ
              </p>
            </div>
          </div>

          {/* Filter toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="নাম, মোবাইল বা ইমেইল দিয়ে অনুসন্ধান..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
            >
              <option value="all">সকল এডমিন রোল ({staffUsers.length})</option>
              <option value="super_admin">সুপার এডমিন</option>
              <option value="admin">এডমিন</option>
              <option value="moderator">মডারেটর</option>
              <option value="volunteer">স্বেচ্ছাসেবক</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">সদস্যের নাম</th>
                  <th className="py-2.5 px-3 font-semibold">অ্যাডমিন রোল (ডায়নামিক পরিবর্তন)</th>
                  <th className="py-2.5 px-3 font-semibold">রক্তদাতা প্রোফাইল লিংক</th>
                  <th className="py-2.5 px-3 font-semibold">মোবাইল</th>
                  <th className="py-2.5 px-3 font-semibold">ইমেইল</th>
                  <th className="py-2.5 px-3 font-semibold">শাখা</th>
                  <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffUsers
                  .filter((u) => {
                    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
                    if (userSearch.trim()) {
                      const q = userSearch.toLowerCase();
                      return (
                        u.fullName.toLowerCase().includes(q) ||
                        u.phone.includes(q) ||
                        (u.email && u.email.toLowerCase().includes(q))
                      );
                    }
                    return true;
                  })
                  .map((u) => {
                    // Check if this staff member also has a linked donor profile
                    const matchingDonor = donors.find(
                      (d) => d.userId === u.id || (d.phone && d.phone === u.phone) || (d.email && u.email && d.email.toLowerCase() === u.email.toLowerCase())
                    );

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{u.fullName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{u.id}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              disabled={!canManageRole(currentUser?.role, u.role)}
                              onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                u.role === 'super_admin'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : u.role === 'admin'
                                  ? 'bg-red-50 text-red-800 border-red-200'
                                  : u.role === 'moderator'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {/* Only show roles that the actor is allowed to assign */}
                              {isSuperAdmin && <option value="super_admin">সুপার এডমিন</option>}
                              {isSuperAdmin && <option value="admin">এডমিন</option>}
                              {(isSuperAdmin || currentUser?.role === 'admin') && (
                                <>
                                  <option value="moderator">মডারেটর</option>
                                  <option value="volunteer">স্বেচ্ছাসেবক</option>
                                </>
                              )}
                              {!isSuperAdmin && currentUser?.role !== 'admin' && (
                                <option value={u.role}>{ROLE_LABELS[u.role]?.bn || u.role}</option>
                              )}
                            </select>

                            {u.status === 'suspended' ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                                স্থগিত
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                সক্রিয়
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {matchingDonor ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                                🌱 ডোনার প্রোফাইল বিদ্যমান
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ID: {matchingDonor.donorId} ({matchingDonor.bloodGroup})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">প্রোফাইল নেই</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">{u.phone}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono">{u.email || '—'}</td>
                        <td className="py-3 px-3 text-slate-600">
                          {u.branchId === 'br-dhm'
                            ? 'ধামরাই শাখা'
                            : u.branchId === 'br-svr'
                            ? 'সাভার শাখা'
                            : 'মানিকগঞ্জ শাখা'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Suspension toggle */}
                            <button
                              type="button"
                              disabled={!canManageRole(currentUser?.role, u.role)}
                              onClick={() => handleToggleSuspension(u)}
                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                u.status === 'suspended'
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-amber-600 hover:bg-amber-50'
                              }`}
                              title={
                                !canManageRole(currentUser?.role, u.role)
                                  ? 'অননুমোদিত'
                                  : u.status === 'suspended'
                                  ? 'পুনরায় সক্রিয় করুন'
                                  : 'সাময়িক স্থগিত করুন'
                              }
                            >
                              {u.status === 'suspended' ? (
                                <UserCheck className="w-3.5 h-3.5" />
                              ) : (
                                <UserX className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={!canManageRole(currentUser?.role, u.role)}
                              onClick={() => {
                                if (!canManageRole(currentUser?.role, u.role)) {
                                  dialog.alert({
                                    title: 'অননুমোদিত অ্যাকশন',
                                    message: 'আপনার এই ইউজারের তথ্য সম্পাদনা করার অনুমতি নেই।',
                                    theme: 'error',
                                  });
                                  return;
                                }
                                setSelectedUserForEdit(u);
                                setShowUserModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="তথ্য সম্পাদনা"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {isSuperAdmin && (
                              <button
                                type="button"
                                disabled={u.id === currentUser?.id}
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="ইউজার মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: PERMISSION MATRIX */}
      {userTabMode === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">ডায়নামিক রোল ও পারমিশন ম্যাট্রিক্স (RBAC Matrix)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                প্রতিটি রোলের জন্য বিভিন্ন মডিউলের অ্যাক্সেস পারমিশন নিয়ন্ত্রণ ও কনফিগারেশন
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setMatrixCategoryFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  matrixCategoryFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                সকল
              </button>
              <button
                type="button"
                onClick={() => setMatrixCategoryFilter('blood')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  matrixCategoryFilter === 'blood' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                রক্ত ও সেবা
              </button>
              <button
                type="button"
                onClick={() => setMatrixCategoryFilter('funds')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  matrixCategoryFilter === 'funds' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                অর্থায়ন
              </button>
              <button
                type="button"
                onClick={() => setMatrixCategoryFilter('system')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  matrixCategoryFilter === 'system' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                সিস্টেম
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-700">
                <tr>
                  <th className="py-2.5 px-3 font-semibold w-1/3">মডিউল পারমিশন</th>
                  <th className="py-2.5 px-3 font-semibold text-center text-purple-700">সুপার এডমিন</th>
                  <th className="py-2.5 px-3 font-semibold text-center text-red-700">এডমিন</th>
                  <th className="py-2.5 px-3 font-semibold text-center text-blue-700">মডারেটর</th>
                  <th className="py-2.5 px-3 font-semibold text-center text-emerald-700">স্বেচ্ছাসেবক</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PERMISSION_DEFINITIONS
                  .filter((p) => matrixCategoryFilter === 'all' || p.category === matrixCategoryFilter)
                  .map((p) => {
                    const roles: UserRole[] = ['super_admin', 'admin', 'moderator', 'volunteer'];
                    return (
                      <tr key={p.key} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.labelBn}</div>
                          <div className="text-[11px] text-slate-500">{p.descriptionBn}</div>
                        </td>
                        {roles.map((role) => {
                          const isAllowed = permissionMatrix[role]?.[p.key] ?? false;
                          const isSuperAdminLocked = role === 'super_admin';
                          return (
                            <td key={role} className="py-3 px-3 text-center">
                              <button
                                type="button"
                                disabled={!isSuperAdmin || isSuperAdminLocked}
                                onClick={() => updateRolePermission(role, p.key, !isAllowed)}
                                className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-all ${
                                  isAllowed
                                    ? 'bg-emerald-500 text-white shadow-2xs'
                                    : 'bg-slate-200 text-slate-400'
                                } ${isSuperAdmin && !isSuperAdminLocked ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-80'}`}
                                title={
                                  isSuperAdminLocked
                                    ? 'সুপার এডমিনের সকল পারমিশন অপরিবর্তনীয়'
                                    : !isSuperAdmin
                                    ? 'শুধুমাত্র সুপার এডমিন পরিবর্তন করতে পারেন'
                                    : isAllowed
                                    ? 'ক্লিক করে পারমিশন প্রত্যাহার করুন'
                                    : 'ক্লিক করে পারমিশন প্রদান করুন'
                                }
                              >
                                {isAllowed ? '✓' : '✕'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserModal && (
        <UserFormModal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          userToEdit={selectedUserForEdit}
          onSave={async (formData, password) => {
            if (selectedUserForEdit) {
              await updateUser(selectedUserForEdit.id, formData);
              if (formData.role !== selectedUserForEdit.role) {
                await updateUserRole(selectedUserForEdit.id, formData.role);
              }
              dialog.alert({
                title: 'তথ্য সংরক্ষিত',
                message: `"${formData.fullName}"-এর তথ্য সফলভাবে আপডেট হয়েছে।`,
                theme: 'success',
              });
            } else {
              const createdUser = await addUser(formData, password);
              // If an existing donor exists with the same phone or email, link their userId
              const cleanPhone = formData.phone?.trim();
              const cleanEmail = formData.email?.trim().toLowerCase();
              const matchedDonor = donors.find(
                (d) =>
                  (cleanPhone && d.phone === cleanPhone) ||
                  (cleanEmail && d.email && d.email.toLowerCase() === cleanEmail)
              );
              if (matchedDonor && createdUser?.id) {
                await updateDonor(matchedDonor.id, { userId: createdUser.id });
              }
              dialog.alert({
                title: 'সদস্য যুক্ত সম্পন্ন',
                message: `নতুন টিম মেম্বার "${formData.fullName}" (${formData.role}) সফলভাবে তৈরি করা হয়েছে${
                  matchedDonor ? ` এবং বিদ্যমান রক্তদাতা প্রোফাইলের (${matchedDonor.donorId}) সাথে লিংক করা হয়েছে।` : '।'
                }`,
                theme: 'success',
              });
            }
          }}
        />
      )}
    </div>
  );
};
