import React, { useState, useEffect } from 'react';
import { Droplets, Shield, ArrowUp, ArrowDown, Check, X, Save, Lock, AlertTriangle } from 'lucide-react';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import {
  getCompatibilityMatrix,
  updateGroupCompatibility,
  DEFAULT_COMPATIBILITY_MATRIX,
} from '../../../services/compatibilityService';
import type { BloodGroup, UserRole } from '../../../types';
import type { BloodSystemConfig } from '../../../types/config';

export const BloodSystemSettings: React.FC = () => {
  const { config, updateSection } = useSystemConfig();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const [bloodConfig, setBloodConfig] = useState<BloodSystemConfig>(config.bloodSystem);
  const [compatibility, setCompatibility] = useState<Record<BloodGroup, BloodGroup[]>>(DEFAULT_COMPATIBILITY_MATRIX);
  const [selectedRecipientGroup, setSelectedRecipientGroup] = useState<BloodGroup>('O+');
  const [isSaving, setIsSaving] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const allGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    setBloodConfig(config.bloodSystem);
    getCompatibilityMatrix().then(setCompatibility);
  }, [config.bloodSystem]);

  const toggleGroupActive = (group: string) => {
    const isCurrentlyActive = bloodConfig.activeBloodGroups.includes(group);
    let updatedActive: string[];
    if (isCurrentlyActive) {
      if (bloodConfig.activeBloodGroups.length <= 1) {
        dialog.alert({
          title: 'সতর্কতা',
          message: 'কমপক্ষে একটি রক্তের গ্রুপ সক্রিয় থাকতে হবে।',
          theme: 'warning',
        });
        return;
      }
      updatedActive = bloodConfig.activeBloodGroups.filter((g) => g !== group);
    } else {
      updatedActive = [...bloodConfig.activeBloodGroups, group];
    }

    setBloodConfig((prev) => ({
      ...prev,
      activeBloodGroups: updatedActive,
    }));
  };

  const moveGroup = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...bloodConfig.order];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setBloodConfig((prev) => ({
      ...prev,
      order: newOrder,
    }));
  };

  const handleLabelChange = (group: string, newLabel: string) => {
    setBloodConfig((prev) => ({
      ...prev,
      displayLabels: {
        ...prev.displayLabels,
        [group]: newLabel,
      },
    }));
  };

  const handleSaveBloodGroups = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateSection('bloodSystem', bloodConfig);
    setIsSaving(false);

    if (res.success) {
      dialog.alert({
        title: 'রক্তের গ্রুপ সেটিংস সংরক্ষিত',
        message: 'রক্তের গ্রুপ তালিকা, ডিসপ্লে লেবেল ও ক্রম সফলভাবে সংরক্ষণ করা হয়েছে।',
        theme: 'success',
      });
    } else {
      dialog.alert({
        title: 'সংরক্ষণ ব্যর্থ',
        message: res.error || 'রক্তের গ্রুপ সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।',
        theme: 'danger',
      });
    }
  };

  const handleToggleCompatibilityDonor = async (recipient: BloodGroup, donor: BloodGroup) => {
    if (!isSuperAdmin) {
      dialog.alert({
        title: 'অননুমোদিত প্রবেশাধিকার',
        message: 'রক্তের চিকিৎসাগত সামঞ্জস্যতা (Compatibility) নিয়ম পরিবর্তনের অনুমতি শুধুমাত্র সুপার এডমিনের জন্য সংরক্ষিত।',
        theme: 'warning',
      });
      return;
    }

    const currentList = compatibility[recipient] || [];
    const isIncluded = currentList.includes(donor);
    let newList: BloodGroup[];

    if (isIncluded) {
      if (currentList.length <= 1) {
        dialog.alert({
          title: 'চিকিৎসাগত নিরাপত্তা সতর্কতা',
          message: 'গ্রাহকের জন্য কমপক্ষে একটি সামঞ্জস্যপূর্ণ রক্তের গ্রুপ নির্বাচন থাকা আবশ্যক।',
          theme: 'warning',
        });
        return;
      }
      newList = currentList.filter((g) => g !== donor);
    } else {
      newList = [...currentList, donor];
    }

    const actor = {
      id: currentUser?.id || 'admin',
      name: currentUser?.fullName || 'সুপার এডমিন',
      role: (currentUser?.role || 'super_admin') as UserRole,
    };

    const res = await updateGroupCompatibility(recipient, newList, actor);
    if (res.success && res.data) {
      setCompatibility(res.data);
    } else {
      dialog.alert({
        title: 'আপডেট ব্যর্থ',
        message: res.error || 'সামঞ্জস্যতা আপডেট করা যায়নি।',
        theme: 'danger',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-red-50/70 p-4 rounded-xl border border-red-100 text-xs flex items-start gap-2.5">
        <Droplets className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-red-900 block text-sm">
            রক্তের গ্রুপ ও সামঞ্জস্যতা কনফিগারেশন (Blood Group & Compatibility Matrix)
          </span>
          <p className="text-slate-600 mt-0.5 leading-relaxed">
            ৮টি প্রমিত রক্তের গ্রুপের ডিসপ্লে লেবেল, ক্রমবিন্যাস ও সক্রিয়করণ পরিচালনা করুন। চিকিৎসাগত সামঞ্জস্যতা নিয়ম শুধুমাত্র সুপার এডমিন পরিবর্তন করতে পারেন।
          </p>
        </div>
      </div>

      {/* Section 1: Blood Groups List, Order, Display Labels */}
      <form onSubmit={handleSaveBloodGroups} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 text-xs shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Droplets className="w-4 h-4 text-red-600" />
            রক্তের গ্রুপের সক্রিয়করণ ও ডিসপ্লে লেবেল
          </h3>
          <span className="text-slate-500 text-[11px]">
            সক্রিয়: {bloodConfig.activeBloodGroups.length} / {bloodConfig.order.length} টি
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-2.5 px-3">ক্রম</th>
                <th className="py-2.5 px-3">গ্রুপ কোড</th>
                <th className="py-2.5 px-3">ডিসপ্লে লেবেল (বাংলা / ইংরেজি)</th>
                <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                <th className="py-2.5 px-3 text-right">পুনর্বিন্যাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bloodConfig.order.map((group, idx) => {
                const isActive = bloodConfig.activeBloodGroups.includes(group);
                const label = bloodConfig.displayLabels[group] || group;

                return (
                  <tr key={group} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md font-mono font-black text-red-700 bg-red-50 border border-red-200">
                        {group}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={label}
                        onChange={(e) => handleLabelChange(group, e.target.value)}
                        className="w-full max-w-sm px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleGroupActive(group)}
                        className={`px-3 py-1 rounded-full font-bold text-[10px] transition-colors ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-500 border border-slate-300'
                        }`}
                      >
                        {isActive ? '✓ সক্রিয়' : '✕ নিষ্ক্রিয়'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveGroup(idx, 'up')}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
                          title="উপরে নিন"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === bloodConfig.order.length - 1}
                          onClick={() => moveGroup(idx, 'down')}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30"
                          title="নিচে নিন"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-xs transition-colors border border-red-700/60 text-xs flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'রক্তের গ্রুপ তালিকা সংরক্ষণ করুন'}</span>
          </button>
        </div>
      </form>

      {/* Section 2: Medically Sensitive Compatibility Matrix */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 text-xs shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              রক্তের সামঞ্জস্যতা ম্যাট্রিক্স (Compatibility Configuration)
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              কোন রক্তের গ্রুপের রোগী কোন কোন গ্রুপের রক্ত গ্রহণ করতে পারবেন তা নির্ধারণ করুন।
            </p>
          </div>

          {!isSuperAdmin && (
            <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-semibold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              শুধুমাত্র সুপার এডমিন পরিবর্তন করতে পারেন
            </div>
          )}
        </div>

        {/* Recipient Group Selector Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-700 mr-1">রোগীর রক্তের গ্রুপ:</span>
          {allGroups.map((grp) => (
            <button
              key={grp}
              type="button"
              onClick={() => setSelectedRecipientGroup(grp)}
              className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition-all ${
                selectedRecipientGroup === grp
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {grp}
            </button>
          ))}
        </div>

        {/* Compatible Donors for Selected Recipient */}
        <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-950 text-xs">
              "{selectedRecipientGroup}" রক্তের গ্রুপের রোগীর জন্য সামঞ্জস্যপূর্ণ রক্তদাতা গ্রুপসমূহ:
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {allGroups.map((donorGrp) => {
              const isCompatible = (compatibility[selectedRecipientGroup] || []).includes(donorGrp);
              return (
                <button
                  key={donorGrp}
                  type="button"
                  disabled={!isSuperAdmin}
                  onClick={() => handleToggleCompatibilityDonor(selectedRecipientGroup, donorGrp)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    isCompatible
                      ? 'bg-white border-purple-300 text-purple-900 shadow-2xs font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-400 font-medium'
                  } ${isSuperAdmin ? 'hover:border-purple-400 cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div className="font-mono text-sm block">{donorGrp}</div>
                  <span className="text-[10px] block mt-0.5">
                    {isCompatible ? '✓ গ্রহণ করতে পারবে' : '✕ সামঞ্জস্যপূর্ণ নয়'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
