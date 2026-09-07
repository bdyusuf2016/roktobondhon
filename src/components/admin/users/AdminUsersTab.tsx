import React, { useState } from 'react';
import { Users, Key, Plus, RotateCcw, Search, Edit2, Trash2, ShieldCheck, Lock, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { UserFormModal } from '../../modals';
import { PERMISSION_DEFINITIONS } from '../../../data/seedData';
import { validateRoleAssignment, canManageRole, ROLE_LABELS } from '../../../services/permissionService';
import type { User, UserRole } from '../../../types';

export const AdminUsersTab: React.FC = () => {
  const {
    users,
    updateUserRole,
    updateUser,
    addUser,
    deleteUser,
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
  const [userTabMode, setUserTabMode] = useState<'users' | 'matrix'>('users');
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<'all' | 'blood' | 'directory' | 'funds' | 'system'>('all');

  const isSuperAdmin = currentUser?.role === 'super_admin';

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
      {/* User Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট ইউজার</span>
          <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight">{users.length}</span>
          <span className="text-[10px] text-slate-500">নিবন্ধিত অ্যাকাউন্ট</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">সুপার এডমিন</span>
          <span className="text-2xl font-black text-purple-700 block mt-1 tracking-tight">
            {users.filter((u) => u.role === 'super_admin').length}
          </span>
          <span className="text-[10px] text-purple-600 font-semibold">পূর্ণ নিয়ন্ত্রণ ক্ষমতা</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">এডমিন ও মডারেটর</span>
          <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight">
            {users.filter((u) => u.role === 'admin' || u.role === 'moderator').length}
          </span>
          <span className="text-[10px] text-blue-600 font-semibold">ধামরাই ও সাভার চ্যাপ্টার</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">স্বেচ্ছাসেবক ও ডোনার</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight">
            {users.filter((u) => u.role === 'volunteer' || u.role === 'donor').length}
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
            <span>নিবন্ধিত সদস্য তালিকা ({users.length})</span>
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
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
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
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 shrink-0 transition-colors"
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
                সদস্যদের রোল পরিবর্তন, মডারেটর অনুমোদন এবং তাৎক্ষণিক পদবী নির্ধারণ
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
              <option value="all">সকল রোল ({users.length})</option>
              <option value="super_admin">সুপার এডমিন</option>
              <option value="admin">এডমিন</option>
              <option value="moderator">মডারেটর</option>
              <option value="volunteer">স্বেচ্ছাসেবক</option>
              <option value="donor">রক্তদাতা</option>
              <option value="recipient">রক্ত গ্রহীতা</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">সদস্যের নাম</th>
                  <th className="py-2.5 px-3 font-semibold">বর্তমান রোল (ডায়নামিক পরিবর্তন)</th>
                  <th className="py-2.5 px-3 font-semibold">মোবাইল</th>
                  <th className="py-2.5 px-3 font-semibold">ইমেইল</th>
                  <th className="py-2.5 px-3 font-semibold">শাখা</th>
                  <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users
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
                  .map((u) => (
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
                                : u.role === 'volunteer'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {/* Only show roles that the actor is allowed to assign */}
                            {isSuperAdmin && <option value="super_admin">সুপার এডমিন</option>}
                            {isSuperAdmin && <option value="admin">এডমিন</option>}
                            {(isSuperAdmin || currentUser?.role === 'admin') && (
                              <>
                                <option value="moderator">মডারেটর</option>
                                <option value="volunteer">স্বেচ্ছাসেবক</option>
                                <option value="donor">রক্তদাতা</option>
                                <option value="recipient">রক্ত গ্রহীতা</option>
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
                                  message: 'আপনার এই ইউজার সম্পাদনা করার অনুমতি নেই।',
                                  theme: 'error',
                                });
                                return;
                              }
                              setSelectedUserForEdit(u);
                              setShowUserModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={!canManageRole(currentUser?.role, u.role) ? 'অননুমোদিত' : 'ইউজার এডিট'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={!canManageRole(currentUser?.role, u.role)}
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={!canManageRole(currentUser?.role, u.role) ? 'অননুমোদিত' : 'ইউজার ডিলিট'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: DYNAMIC ROLE & PERMISSION MATRIX */}
      {userTabMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-600" />
                ডায়নামিক রোল ও পারমিশন ম্যাট্রিক্স (Role Permission Matrix)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                প্রতিটি ইউজার রোলের বিপরীতে ফিচার ব্যবহারের স্বাধীনতা ও অনুমোদন স্তর নিয়ন্ত্রণ করুন
              </p>
            </div>

            {/* Category filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'সকল পারমিশন' },
                { id: 'blood', label: '🩸 রক্তদান' },
                { id: 'directory', label: '🏥 ডিরেক্টরি' },
                { id: 'funds', label: '💳 তহবিল' },
                { id: 'system', label: '⚙️ সিস্টেম' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setMatrixCategoryFilter(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    matrixCategoryFilter === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-700">
                <tr>
                  <th className="py-3 px-3 font-bold min-w-[240px]">ফিচার ও পারমিশন বিবরণী</th>
                  <th className="py-3 px-2 font-bold text-center">
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-black">
                      সুপার এডমিন
                    </span>
                  </th>
                  <th className="py-3 px-2 font-bold text-center">
                    <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-900 font-bold">
                      এডমিন
                    </span>
                  </th>
                  <th className="py-3 px-2 font-bold text-center">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold">
                      মডারেটর
                    </span>
                  </th>
                  <th className="py-3 px-2 font-bold text-center">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold">
                      স্বেচ্ছাসেবক
                    </span>
                  </th>
                  <th className="py-3 px-2 font-bold text-center">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium">
                      রক্তদাতা
                    </span>
                  </th>
                  <th className="py-3 px-2 font-bold text-center">
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-medium">
                      রক্ত গ্রহীতা
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PERMISSION_DEFINITIONS
                  .filter((p) => matrixCategoryFilter === 'all' || p.category === matrixCategoryFilter)
                  .map((perm) => {
                    const otherRoles: UserRole[] = ['admin', 'moderator', 'volunteer', 'donor', 'recipient'];
                    return (
                      <tr key={perm.key} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              perm.category === 'blood'
                                ? 'bg-red-500'
                                : perm.category === 'directory'
                                ? 'bg-blue-500'
                                : perm.category === 'funds'
                                ? 'bg-emerald-500'
                                : 'bg-purple-500'
                            }`} />
                            {perm.labelBn}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {perm.descriptionBn}
                          </div>
                        </td>

                        {/* super_admin: locked full access */}
                        <td className="py-3 px-2 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                            <Lock className="w-3 h-3 text-purple-600" />
                            পূর্ণ কর্তৃত্ব
                          </span>
                        </td>

                        {/* other roles: interactive toggle */}
                        {otherRoles.map((r) => {
                          const allowed = Boolean(permissionMatrix[r]?.[perm.key]);
                          return (
                            <td key={r} className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!isSuperAdmin) {
                                    dialog.alert({
                                      title: 'অননুমোদিত পারমিশন এডিট',
                                      message: 'শুধুমাত্র সুপার এডমিন সেন্ট্রাল রোল ও পারমিশন ম্যাট্রিক্স পরিবর্তন করতে পারেন।',
                                      theme: 'error',
                                    });
                                    return;
                                  }

                                  await updateRolePermission(r, perm.key, !allowed);
                                  dialog.alert({
                                    title: 'পারমিশন আপডেট সম্পন্ন',
                                    message: `"${r}" রোলে "${perm.labelBn}" পারমিশন ${!allowed ? 'অনুমোদন (সক্রিয়)' : 'প্রত্যাহার (নিষ্ক্রিয়)'} করা হয়েছে।`,
                                    theme: !allowed ? 'success' : 'warning',
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                                  allowed
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                                }`}
                                title={`ক্লিক করে ${r} রোলের জন্য এই পারমিশন পরিবর্তন করুন`}
                              >
                                {allowed ? '✓ সক্রিয়' : '✕ নিষ্ক্রিয়'}
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

          {/* Role Scope Guideline Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
              <span className="font-bold text-purple-900 text-xs block">সুপার এডমিন (Root SuperAdmin):</span>
              <p className="text-[11px] text-purple-700 leading-relaxed">
                সিস্টেমের সকল ডেটা, রোল পারমিশন ম্যাট্রিক্স, আর্থিক তহবিল, ডাটাবেজ ব্যাকআপ ও প্ল্যাটফর্ম সেটিংস পরিবর্তনের সর্বোচ্চ একক ক্ষমতা।
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1">
              <span className="font-bold text-blue-900 text-xs block">এডমিন ও চ্যাপ্টার মডারেটর:</span>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                ধামরাই, সাভার ও মানিকগঞ্জ চ্যাপ্টারের রক্তদাতা ভেরিফিকেশন, আবেদন অনুমোদন, হাসপাতাল ডিরেক্টরি এবং অনুদান ট্র্যাকিং।
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
              <span className="font-bold text-emerald-900 text-xs block">স্বেচ্ছাসেবক ও সাধারণ সদস্য:</span>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                জরুরি রক্তের আবেদন প্রচার, ডোনারদের সাথে যোগাযোগ, রক্তদান রেকর্ড সম্পন্নকরণ এবং রোগীদের তাৎক্ষণিক সহযোগিতা প্রদান।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      <UserFormModal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUserForEdit(null);
        }}
        userToEdit={selectedUserForEdit}
        onSave={async (data) => {
          const currentRoleTarget = selectedUserForEdit ? selectedUserForEdit.role : 'volunteer';
          const validation = validateRoleAssignment(
            currentUser?.role,
            currentRoleTarget,
            data.role
          );

          if (!validation.allowed) {
            dialog.alert({
              title: 'অননুমোদিত রোল নির্ধারণ',
              message: validation.reason || 'আপনার এই ইউজার বা রোল অ্যাসাইন করার অনুমতি নেই।',
              theme: 'error',
            });
            return;
          }

          if (selectedUserForEdit) {
            await updateUser(selectedUserForEdit.id, data);
            dialog.alert({
              title: 'ব্যবহারকারী আপডেট',
              message: `"${data.fullName}" এর তথ্য সফলভাবে হালনাগাদ করা হয়েছে।`,
              theme: 'success',
            });
          } else {
            await addUser(data);
            dialog.alert({
              title: 'নতুন টিম মেম্বার যুক্ত',
              message: `"${data.fullName}" সফলভাবে প্ল্যাটফর্মে যুক্ত করা হয়েছে।`,
              theme: 'success',
            });
          }
        }}
      />
    </div>
  );
};
