import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Radio,
  Send,
  AlertOctagon,
  Clock,
  Phone,
  Building,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Settings,
  Activity,
  Sliders,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { useDialog } from '../../../contexts/DialogContext';
import { EmergencyBroadcastModal } from '../../EmergencyBroadcastModal';
import { EmergencyControlSettings } from './EmergencyControlSettings';
import type { BloodRequest } from '../../../types';

export const EmergencyControlTab: React.FC = () => {
  const { bloodRequests, donors, verifyBloodRequest } = useData();
  const { config, updateSection } = useSystemConfig();
  const dialog = useDialog();

  const [activeSubtab, setActiveSubtab] = useState<'board' | 'settings'>('board');
  const [selectedBroadcastRequest, setSelectedBroadcastRequest] = useState<BloodRequest | null>(null);
  const [isTogglingMode, setIsTogglingMode] = useState(false);

  const emergencyConfig = config.emergency;
  const isEmergencyMode = emergencyConfig?.emergencyMode ?? false;

  // Filter urgent and critical blood requests
  const emergencyRequests = useMemo(() => {
    return bloodRequests.filter(
      (r) =>
        (r.emergencyLevel === 'CRITICAL' || r.emergencyLevel === 'URGENT') &&
        r.status !== 'fulfilled' &&
        r.status !== 'cancelled'
    );
  }, [bloodRequests]);

  // Find ready emergency donors count
  const emergencyDonorsCount = useMemo(() => {
    return donors.filter((d) => d.emergencyAvailable && d.availability).length;
  }, [donors]);

  const handleToggleEmergencyMode = async () => {
    const nextState = !isEmergencyMode;
    const confirmed = await dialog.confirm({
      title: nextState ? '🚨 রেড অ্যালার্ট মোড সক্রিয়করণ' : 'রেড অ্যালার্ট মোড বন্ধকরণ',
      message: nextState
        ? 'আপনি কি প্ল্যাটফর্মের সেন্ট্রাল রেড অ্যালার্ট চালু করতে চান? এর ফলে ওয়েবসাইটে ক্রাইসিস ব্যানার প্রদর্শিত হবে এবং জরুরি আবেদনগুলো অগ্রাধিকার পাবে।'
        : 'আপনি কি প্ল্যাটফর্মের রেড অ্যালার্ট মোড প্রত্যাহার করে স্বাভাবিক কার্যক্রমে ফিরে যেতে চান?',
      confirmText: nextState ? 'হ্যাঁ, চালু করুন' : 'হ্যাঁ, বন্ধ করুন',
      confirmTheme: nextState ? 'danger' : 'info',
    });

    if (confirmed) {
      setIsTogglingMode(true);
      await updateSection('emergency', {
        ...emergencyConfig,
        emergencyMode: nextState,
      });
      setIsTogglingMode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Top Control Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isEmergencyMode
          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg border-red-800'
          : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`p-2 rounded-2xl ${isEmergencyMode ? 'bg-white/20' : 'bg-red-50 text-red-600'}`}>
                <Flame className={`w-6 h-6 ${isEmergencyMode ? 'text-amber-300 fill-amber-300 animate-pulse' : 'fill-red-600'}`} />
              </span>
              <h2 className={`text-xl font-black tracking-tight ${isEmergencyMode ? 'text-white' : 'text-slate-900'}`}>
                জরুরি রেসপন্স ও ক্রাইসিস কন্ট্রোল সেন্টার (Emergency Control Center)
              </h2>
              {isEmergencyMode ? (
                <span className="px-3 py-1 rounded-full bg-amber-400 text-red-950 font-black text-xs uppercase tracking-wider animate-pulse shadow-xs">
                  🚨 রেড অ্যালার্ট সক্রিয় (CRISIS MODE)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                  স্বাভাবিক অপারেশন (STANDBY)
                </span>
              )}
            </div>
            <p className={`text-xs max-w-2xl leading-relaxed ${isEmergencyMode ? 'text-rose-100' : 'text-slate-600'}`}>
              ধামরাই, সাভার ও মানিকগঞ্জে সড়ক দুর্ঘটনা, প্রাকৃতিক বিপর্যয় বা ক্রাইসিসে ১-ক্লিকে প্ল্যাটফর্ম-ব্যাপী রেড অ্যালার্ট চালু করুন এবং সংশ্লিষ্ট এলাকার রক্তদাতাদের কাছে পুশ ব্রডকাস্ট পাঠান।
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleToggleEmergencyMode}
              disabled={isTogglingMode}
              className={`px-5 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                isEmergencyMode
                  ? 'bg-white text-red-700 hover:bg-rose-50 hover:shadow-lg'
                  : 'bg-red-600 hover:bg-red-700 text-white border border-red-700/60'
              }`}
            >
              <AlertOctagon className="w-4 h-4" />
              <span>{isEmergencyMode ? 'রেড অ্যালার্ট বন্ধ করুন' : 'রেড অ্যালার্ট চালু করুন (ACTIVATE)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode Sub-navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubtab('board')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeSubtab === 'board'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>লাইভ ক্রাইসিস বোর্ড ({emergencyRequests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeSubtab === 'settings'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>জরুরি ও ব্রডকাস্ট নীতিমালা</span>
        </button>
      </div>

      {activeSubtab === 'settings' ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <EmergencyControlSettings />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Real-time Status Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-red-200 bg-red-50/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-700 font-bold">সক্রিয় জরুরি আবেদন</span>
                <Flame className="w-4 h-4 text-red-600 fill-red-600" />
              </div>
              <div className="text-2xl font-black text-red-800">{emergencyRequests.length} টি</div>
              <span className="text-[11px] text-red-600">ক্রিটিক্যাল ও আর্জেন্ট ক্যাটাগরি</span>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-bold">জরুরি প্রস্তুত রক্তদাতা</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-800">{emergencyDonorsCount} জন</div>
              <span className="text-[11px] text-emerald-600">অন-কল রেডিনেসে থাকা রক্তদাতা</span>
            </div>

            <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-700 font-bold">ব্রডকাস্ট পেরিমিটার রেডিয়াস</span>
                <Radio className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-800">{emergencyConfig?.broadcastRadiusKm || 50} কিমি</div>
              <span className="text-[11px] text-indigo-600">ধামরাই, সাভার ও মানিকগঞ্জ জোন</span>
            </div>
          </div>

          {/* Active Emergency Requests Live Board */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-600 fill-red-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  লাইভ ইমার্জেন্সি কিউ (Active Emergency Dispatch Queue)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                জরুরি প্রয়োজনে ১-ক্লিকে সোশ্যাল ও এসএমএস ব্রডকাস্ট পাঠান
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {emergencyRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-bold text-slate-800 text-sm">বর্তমানে কোন জরুরি ক্রাইসিস আবেদন নেই</p>
                  <p className="text-xs text-slate-500">সকল জরুরি রক্তের আবেদন সফলভাবে সম্পন্ন বা হ্যান্ডেল করা হয়েছে।</p>
                </div>
              ) : (
                emergencyRequests.map((req) => {
                  const isCritical = req.emergencyLevel === 'CRITICAL';

                  return (
                    <div
                      key={req.id}
                      className={`p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
                        isCritical ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Left info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg bg-red-600 text-white font-black text-xs shadow-xs">
                            {req.bloodGroup} ({req.requiredUnits} ব্যাগ)
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                              isCritical
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            <Flame className="w-3 h-3 fill-current" /> {req.emergencyLevel}
                          </span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            {req.requestId}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 text-sm">
                          {req.patientName} — {req.hospital}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {req.upazila ? `${req.upazila}, ` : ''}{req.district}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {req.requiredDate} ({req.requiredTime})
                          </span>
                          {req.contactNumber && (
                            <span className="flex items-center gap-1 text-slate-700 font-semibold">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <a href={`tel:${req.contactNumber}`} className="hover:underline">
                                {req.contactNumber}
                              </a>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                        <Link
                          to={`/blood-requests/${req.id}`}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>ম্যাচড ডোনার</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setSelectedBroadcastRequest(req)}
                          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>১-ক্লিক ব্রডকাস্ট পাঠান</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Emergency Broadcast Modal */}
      {selectedBroadcastRequest && (
        <EmergencyBroadcastModal
          request={selectedBroadcastRequest}
          isOpen={Boolean(selectedBroadcastRequest)}
          onClose={() => setSelectedBroadcastRequest(null)}
        />
      )}
    </div>
  );
};
