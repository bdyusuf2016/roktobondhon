import React, { useState } from 'react';
import {
  FileText,
  Search,
  ShieldCheck,
  AlertTriangle,
  Download,
  Filter,
  Eye,
  Calendar,
  Lock,
  CheckCircle2,
  Users,
  Activity,
  FileSpreadsheet
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { BaseModal } from '../../modals/BaseModal';
import { filterAuditLogs, isSecurityCriticalEvent } from '../../../services/auditService';
import type { AuditLog, UserRole } from '../../../types';

export const AdminAuditTab: React.FC = () => {
  const { auditLogs, hasPermission } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const canViewAudit = hasPermission(currentUser?.role || 'admin', 'view_audit_logs');

  const [searchTerm, setSearchTerm] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [timeRangeDays, setTimeRangeDays] = useState<number>(0);
  const [onlyCritical, setOnlyCritical] = useState(false);

  // Inspector Modal
  const [inspectingLog, setInspectingLog] = useState<AuditLog | null>(null);

  // Metrics
  const totalEvents = auditLogs.length;
  const criticalEvents = auditLogs.filter(isSecurityCriticalEvent).length;
  const uniqueActors = new Set(auditLogs.map((l) => l.userId)).size;

  // Filtered logs
  let filtered = filterAuditLogs(auditLogs, {
    searchTerm,
    targetType: targetTypeFilter,
    userRole: roleFilter,
    timeRangeDays: timeRangeDays > 0 ? timeRangeDays : undefined,
  });

  if (onlyCritical) {
    filtered = filtered.filter(isSecurityCriticalEvent);
  }

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(filtered, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roktobondon_audit_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    dialog.alert({
      title: 'অডিট লগ এক্সপোর্ট সফল',
      message: `${filtered.length}টি অডিট রেকর্ড JSON ফাইলে ডাউনলোড করা হয়েছে।`,
      theme: 'success',
    });
  };

  const handleExportCSV = () => {
    let csv = 'Timestamp,Actor Name,Actor Role,Action,Target Type,Target ID,Metadata\n';
    filtered.forEach((log) => {
      const meta = log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : '';
      csv += `"${log.timestamp}","${log.userName}","${log.userRole}","${log.action}","${log.targetType}","${log.targetId}","${meta}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roktobondon_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    dialog.alert({
      title: 'CSV এক্সপোর্ট সফল',
      message: `${filtered.length}টি অডিট রেকর্ড CSV ফাইলে ডাউনলোড করা হয়েছে।`,
      theme: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট অডিট ইভেন্ট</span>
          <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight font-mono">
            {totalEvents}
          </span>
          <span className="text-[10px] text-slate-500">নিরাপত্তা ও অপারেশনাল লগ</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">উচ্চ-ঝুঁকিপূর্ণ / ক্রিটিক্যাল</span>
          <span className="text-2xl font-black text-amber-600 block mt-1 tracking-tight font-mono">
            {criticalEvents}
          </span>
          <span className="text-[10px] text-amber-700 font-medium">রোল ও সেটিংস পরিবর্তন</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">সক্রিয় ইউজার ও এডমিন</span>
          <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight font-mono">
            {uniqueActors}
          </span>
          <span className="text-[10px] text-slate-500">অনন্য অ্যাক্টর একাউন্ট</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">অডিট লেজার ইন্টিগ্রিটি</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight flex items-center gap-1">
            <Lock className="w-5 h-5 text-emerald-600" />
            100%
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold">Write-Only অপরিবর্তনযোগ্য</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              নিরাপত্তা ও অডিট ট্রেইল (Security & Audit Governance)
            </h2>
            <p className="text-xs text-slate-500">
              সিস্টেমের প্রতিটি এডমিন ও মডারেটর অ্যাকশনের অপরিবর্তনযোগ্য ক্রনোলজিক্যাল রেকর্ড
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              CSV
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs border border-red-700/60 flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              লগ এক্সপোর্ট (JSON)
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="অ্যাকশন, ইউজার বা টার্গেট দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          >
            <option value="all">সকল টার্গেট ধরন</option>
            <option value="USER">ব্যবহারকারী (USER)</option>
            <option value="DONOR">রক্তদাতা (DONOR)</option>
            <option value="REQUEST">রক্তের অনুরোধ (REQUEST)</option>
            <option value="HOSPITAL">হাসপাতাল (HOSPITAL)</option>
            <option value="BRANCH">শাখা (BRANCH)</option>
            <option value="NOTIFICATION">নোটিফিকেশন (NOTIFICATION)</option>
            <option value="FUND_DONATION">আর্থিক অনুদান (FUND_DONATION)</option>
            <option value="BACKUP">ব্যাকআপ ও রিস্টোর (BACKUP)</option>
            <option value="CONFIG">কনফিগারেশন (CONFIG)</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
          >
            <option value="all">সকল ইউজার রোল</option>
            <option value="super_admin">সুপার এডমিন (Super Admin)</option>
            <option value="admin">এডমিন (Admin)</option>
            <option value="moderator">মডারেটর (Moderator)</option>
            <option value="volunteer">স্বেচ্ছাসেবক (Volunteer)</option>
          </select>

          <div className="flex items-center gap-2">
            <select
              value={timeRangeDays}
              onChange={(e) => setTimeRangeDays(Number(e.target.value))}
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
            >
              <option value={0}>সকল সময়</option>
              <option value={1}>গত ২৪ ঘণ্টা</option>
              <option value={7}>গত ৭ দিন</option>
              <option value={30}>গত ৩০ দিন</option>
            </select>

            <button
              type="button"
              onClick={() => setOnlyCritical(!onlyCritical)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                onlyCritical
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title="শুধুমাত্র ক্রিটিক্যাল ইভেন্ট ফিল্টার করুন"
            >
              ⚠️ ক্রিটিক্যাল
            </button>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-sans">
              <tr>
                <th className="py-2.5 px-3 font-semibold">টাইমস্ট্যাম্প</th>
                <th className="py-2.5 px-3 font-semibold">ব্যবহারকারী / রোল</th>
                <th className="py-2.5 px-3 font-semibold">অ্যাকশন</th>
                <th className="py-2.5 px-3 font-semibold">টার্গেট</th>
                <th className="py-2.5 px-3 font-semibold text-right">ডিটেইলস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-sans text-xs">
                    কোনো অডিট রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const isCritical = isSecurityCriticalEvent(log);
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCritical ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleString('bn-BD', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-bold text-slate-900">{log.userName}</div>
                        <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">
                          {log.userRole}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex items-center gap-1.5">
                          {isCritical && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                          <span className={`font-semibold ${isCritical ? 'text-amber-900' : 'text-slate-800'}`}>
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-semibold mr-1">
                          {log.targetType}
                        </span>
                        <span className="text-slate-500">[{log.targetId}]</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <button
                          type="button"
                          onClick={() => setInspectingLog(log)}
                          className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                          title="মেটাডাটা ও ডিটেইলস দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata Inspector Modal */}
      {inspectingLog && (
        <BaseModal
          isOpen={Boolean(inspectingLog)}
          onClose={() => setInspectingLog(null)}
          theme="modern"
          size="lg"
          icon={<ShieldCheck className="w-5 h-5 text-red-600" />}
          title="অডিট ইভেন্ট মেটাডাটা ও অডিট ট্রেইল"
          subtitle={`ইভেন্ট আইডি: ${inspectingLog.id}`}
          footer={
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          }
        >
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-sans">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">অ্যাকশন নাম</span>
                <span className="font-bold text-slate-900">{inspectingLog.action}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">টাইমস্ট্যাম্প</span>
                <span className="font-mono text-slate-800">{new Date(inspectingLog.timestamp).toISOString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">অ্যাক্টর / পারফর্মার</span>
                <span className="font-semibold text-slate-800">
                  {inspectingLog.userName} ({inspectingLog.userRole})
                </span>
                <span className="font-mono text-[10px] text-slate-400 block">{inspectingLog.userId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">টার্গেট রেকর্ড</span>
                <span className="font-semibold text-slate-800">{inspectingLog.targetType}</span>
                <span className="font-mono text-[10px] text-slate-500 block">{inspectingLog.targetId}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 font-sans">
                ইভেন্ট মেটাডাটা ও পেলোড (JSON Payload):
              </label>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60">
                {JSON.stringify(inspectingLog.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
};
