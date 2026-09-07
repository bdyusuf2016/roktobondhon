import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Send,
  Radio,
  Mail,
  Smartphone,
  MessageSquare,
  Globe,
  Sliders,
  Sparkles,
  AlertTriangle,
  Flame,
  Droplets,
  Award,
  ShieldCheck,
  CheckCheck,
  ExternalLink,
  Users,
  Filter
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { BaseModal } from '../../modals/BaseModal';
import type { NotificationItem, UserRole } from '../../../types';

export const AdminNotificationsTab: React.FC = () => {
  const {
    notifications,
    addNotification,
    deleteNotification,
    markNotificationRead,
    markAllNotificationsRead,
    hasPermission,
    users,
  } = useData();
  const { currentUser } = useAuth();
  const dialog = useDialog();
  const { config, updateSection } = useSystemConfig();
  const [isSaving, setIsSaving] = useState(false);

  const canManageSettings = hasPermission(currentUser?.role || 'admin', 'manage_settings');

  // Sub-tabs: 'broadcast' (Feed & broadcast manager) vs 'channels' (Channel Gateway Config)
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'channels'>('feed');

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<NotificationItem['type']>('system');
  const [targetAudience, setTargetAudience] = useState<'all' | UserRole | string>('all');
  const [newLink, setNewLink] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Local state for notification settings
  const [smsEnabled, setSmsEnabled] = useState(config.notifications.smsEnabled);
  const [emailEnabled, setEmailEnabled] = useState(config.notifications.emailEnabled);
  const [pushEnabled, setPushEnabled] = useState(config.notifications.pushEnabled);
  const [whatsappEnabled, setWhatsappEnabled] = useState(config.notifications.whatsappEnabled);
  const [smsProvider, setSmsProvider] = useState(config.notifications.smsProvider || 'mock');
  const [emailProvider, setEmailProvider] = useState(config.notifications.emailProvider || 'mock');
  const [defaultLanguage, setDefaultLanguage] = useState<'bn' | 'en'>(config.notifications.defaultLanguage || 'bn');

  // Stats
  const totalNotifs = notifications.length;
  const unreadNotifs = notifications.filter((n) => !n.isRead).length;
  const broadcastNotifs = notifications.filter((n) => n.userId === 'all' || n.type === 'system').length;
  const requestNotifs = notifications.filter((n) => n.type === 'request' || n.type === 'match').length;

  const handleSaveChannels = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSection('notifications', {
        smsEnabled,
        emailEnabled,
        pushEnabled,
        whatsappEnabled,
        smsProvider,
        emailProvider,
        defaultLanguage,
      });
      dialog.alert({
        title: 'নোটিফিকেশন চ্যানেল সংরক্ষিত',
        message: 'নোটিফিকেশন ও গেটওয়ে সেটিংস সফলভাবে আপডেট করা হয়েছে।',
        theme: 'success',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) {
      dialog.alert({
        title: 'অসম্পূর্ণ বার্তা',
        message: 'অনুগ্রহ করে বার্তার শিরোনাম ও বিস্তারিত লিখুন।',
        theme: 'warning',
      });
      return;
    }

    setIsBroadcasting(true);
    try {
      await addNotification({
        userId: targetAudience,
        title: newTitle.trim(),
        message: newMessage.trim(),
        type: newType,
        link: newLink.trim() || undefined,
        isRead: false,
      });

      setShowBroadcastModal(false);
      setNewTitle('');
      setNewMessage('');
      setNewType('system');
      setTargetAudience('all');
      setNewLink('');

      dialog.alert({
        title: 'বার্তা পাঠানো হয়েছে',
        message: 'সফলভাবে নির্ধারিত গ্রাহকদের কাছে নোটিফিকেশন পৌঁছে দেওয়া হয়েছে।',
        theme: 'success',
      });
    } catch (err: any) {
      dialog.alert({
        title: 'ব্যর্থ হয়েছে',
        message: err.message || 'নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।',
        theme: 'danger',
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleDeleteNotif = async (id: string, title: string) => {
    const ok = await dialog.confirm({
      title: 'নোটিফিকেশন মুছে ফেলবেন?',
      message: `"${title}" বার্তাটি মুছে ফেলতে চান?`,
      confirmText: 'হ্যাঁ, মুছুন',
      confirmTheme: 'danger',
    });
    if (ok) {
      await deleteNotification(id);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    dialog.alert({
      title: 'সকল নোটিফিকেশন পঠিত',
      message: 'সকল বার্তা পঠিত হিসেবে চিহ্নিত করা হয়েছে।',
      theme: 'success',
    });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (statusFilter === 'unread' && n.isRead) return false;
    if (statusFilter === 'read' && !n.isRead) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.userId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getTypeBadge = (type: NotificationItem['type']) => {
    switch (type) {
      case 'request':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <Droplets className="w-2.5 h-2.5 text-red-600" />
            রক্তের অনুরোধ
          </span>
        );
      case 'match':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-2.5 h-2.5 text-blue-600" />
            ম্যাচিং অ্যালার্ট
          </span>
        );
      case 'verification':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-2.5 h-2.5 text-purple-600" />
            যাচাইকরণ
          </span>
        );
      case 'donation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Award className="w-2.5 h-2.5 text-emerald-600" />
            রক্তদান সম্পন্ন
          </span>
        );
      case 'system':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Radio className="w-2.5 h-2.5 text-slate-600" />
            সিস্টেম ঘোষণা
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট নোটিফিকেশন</span>
          <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight">{totalNotifs}</span>
          <span className="text-[10px] text-slate-500">ইন-অ্যাপ ও ব্রডকাস্ট মেসেজ</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">অপঠিত নোটিফিকেশন</span>
          <span className="text-2xl font-black text-red-600 block mt-1 tracking-tight">{unreadNotifs}</span>
          <span className="text-[10px] text-slate-500">পড়ার অপেক্ষায় রয়েছে</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">সাধারণ ব্রডকাস্ট</span>
          <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight">{broadcastNotifs}</span>
          <span className="text-[10px] text-slate-500">সর্বজনীন সিস্টেম ঘোষণা</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">জরুরি ও রক্তের রিকোয়েস্ট</span>
          <span className="text-2xl font-black text-amber-600 block mt-1 tracking-tight">{requestNotifs}</span>
          <span className="text-[10px] text-slate-500">স্বয়ংক্রিয় ডোনার অ্যালার্ট</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Sub-tab Navigation Header */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('feed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'feed'
                ? 'bg-white text-red-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Bell className="w-4 h-4" />
            নোটিফিকেশন ফিড ও ব্রডকাস্ট ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('channels')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'channels'
                ? 'bg-white text-red-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Sliders className="w-4 h-4" />
            ডেলিভারি চ্যানেল ও গেটওয়ে সেটিংস
          </button>
        </div>

        {/* TAB 1: Notification Feed */}
        {activeSubTab === 'feed' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  নোটিফিকেশন ফিড ও অডিয়েন্স ব্রডকাস্ট
                </h2>
                <p className="text-xs text-slate-500">
                  সকল ব্যবহারকারী বা নির্দিষ্ট রোলের জন্য ঘোষণা ও তাৎক্ষণিক বার্তা প্রেরণ করুন
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadNotifs > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    সব পঠিত করুন
                  </button>
                )}
                {canManageSettings && (
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(true)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    নতুন ব্রডকাস্ট পাঠান
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="শিরোনাম, বার্তার বিষয় বা ইউজার আইডি দিয়ে অনুসন্ধান..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
              >
                <option value="all">সকল ধরন</option>
                <option value="system">সিস্টেম ঘোষণা</option>
                <option value="request">রক্তের অনুরোধ</option>
                <option value="match">ম্যাচিং অ্যালার্ট</option>
                <option value="verification">যাচাইকরণ</option>
                <option value="donation">রক্তদান</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-36 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
              >
                <option value="all">সকল স্ট্যাটাস</option>
                <option value="unread">শুধুমাত্র অপঠিত</option>
                <option value="read">শুধুমাত্র পঠিত</option>
              </select>
            </div>

            {/* Notification Items List */}
            <div className="divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Bell className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">কোনো নোটিফিকেশন পাওয়া যায়নি</p>
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`py-3.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg transition-colors ${
                      n.isRead ? 'bg-white hover:bg-slate-50/70' : 'bg-red-50/40 hover:bg-red-50/60'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(n.type)}
                        <h4 className={`text-xs font-bold ${n.isRead ? 'text-slate-800' : 'text-slate-900'}`}>
                          {n.title}
                        </h4>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-red-600 ring-2 ring-red-100" />
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(n.createdAt).toLocaleString('bn-BD', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">{n.message}</p>

                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                        <span>
                          টার্গেট গ্রাহক:{' '}
                          <strong className="text-slate-700 font-mono">
                            {n.userId === 'all' ? 'সকল ব্যবহারকারী (All)' : n.userId}
                          </strong>
                        </span>
                        {n.link && (
                          <a
                            href={n.link}
                            className="text-red-600 hover:text-red-700 hover:underline flex items-center gap-0.5 ml-2 font-medium"
                          >
                            <ExternalLink className="w-3 h-3" />
                            সংযুক্ত লিংক
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(n.id)}
                          className="px-2 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-medium border border-slate-200 flex items-center gap-1"
                          title="পঠিত হিসেবে চিহ্নিত করুন"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          পঠিত
                        </button>
                      )}
                      {canManageSettings && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNotif(n.id, n.title)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Channel Delivery Configuration */}
        {activeSubTab === 'channels' && (
          <form onSubmit={handleSaveChannels} className="p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                ডেলিভারি চ্যানেল ও গেটওয়ে কনফিগারেশন
              </h2>
              <p className="text-xs text-slate-500">
                ব্যবহারকারীদের কাছে জরুরি রক্তদান, ম্যাচিং ও সিস্টেম অ্যালার্ট পৌঁছানোর মাধ্যম নির্ধারণ করুন
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Push Notifications */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">ওয়েব পুশ ও ইন-অ্যাপ নোটিফিকেশন</h3>
                      <p className="text-[11px] text-slate-500">ব্রাউজার ও পিডব্লিউএ রিয়েলটাইম পুশ</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushEnabled}
                      onChange={(e) => setPushEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                  সিস্টেমের সকল রিকোয়েস্ট ও ব্রডকাস্ট তাৎক্ষণিকভাবে ব্রাউজার পুশ নোটিফিকেশন আকারে প্রদর্শিত হয়।
                </p>
              </div>

              {/* SMS Gateway */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">মোবাইল এসএমএস (SMS Gateway)</h3>
                      <p className="text-[11px] text-slate-500">জরুরি রক্তের প্রয়োজনে সরাসরি ফোনে এসএমএস</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsEnabled}
                      onChange={(e) => setSmsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>
                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-slate-700">এসএমএস প্রোভাইডার নির্বাচন</label>
                  <select
                    value={smsProvider}
                    onChange={(e) => setSmsProvider(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="mock">সিমুলেশন মোড (Mock Gateway)</option>
                    <option value="greenweb">Greenweb BD Gateway</option>
                    <option value="bulksmsbd">BulkSMSBD API</option>
                    <option value="sslwireless">SSL Wireless Gateway</option>
                  </select>
                </div>
              </div>

              {/* Email Gateway */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">ইমেইল নোটিফিকেশন (Email / SMTP)</h3>
                      <p className="text-[11px] text-slate-500">অডিট রিপোর্ট ও মাসিক সামারি প্রেরণে</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>
                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-slate-700">ইমেইল প্রোভাইডার</label>
                  <select
                    value={emailProvider}
                    onChange={(e) => setEmailProvider(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="mock">সিমুলেশন মোড (Mock SMTP)</option>
                    <option value="sendgrid">SendGrid Email API</option>
                    <option value="resend">Resend API</option>
                    <option value="custom_smtp">Custom SMTP Server</option>
                  </select>
                </div>
              </div>

              {/* WhatsApp Gateway */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">হোয়াটসঅ্যাপ ইন্টিগ্রেশন</h3>
                      <p className="text-[11px] text-slate-500">হোয়াটসঅ্যাপ বিজনেস ক্লাউড এলার্ট</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappEnabled}
                      onChange={(e) => setWhatsappEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>
                <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                  জরুরি প্রয়োজনে ডোনারের সাথে তাৎক্ষণিক যোগাযোগ স্থাপনের জন্য হোয়াটসঅ্যাপ ডিরেক্ট ডিপ-লিংক সুবিধা।
                </p>
              </div>
            </div>

            {/* Language Selection */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                ডিফল্ট নোটিফিকেশন ভাষা (Notification Template Language)
              </label>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="defaultLanguage"
                    checked={defaultLanguage === 'bn'}
                    onChange={() => setDefaultLanguage('bn')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  বাংলা (Bangla)
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="defaultLanguage"
                    checked={defaultLanguage === 'en'}
                    onChange={() => setDefaultLanguage('en')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  English
                </label>
              </div>
            </div>

            {canManageSettings && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-lg text-xs shadow-xs transition-all border border-red-700/60 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'চ্যানেল সেটিংস সংরক্ষণ করুন'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Broadcast Creation Modal */}
      <BaseModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        theme="modern"
        size="lg"
        icon={<Send className="w-5 h-5 text-red-600" />}
        title="নতুন সিস্টেম নোটিফিকেশন ব্রডকাস্ট"
        subtitle="প্ল্যাটফর্মের সকল বা নির্দিষ্ট গ্রাহকদের কাছে গুরুত্বপূর্ণ ঘোষণা প্রেরণ করুন।"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowBroadcastModal(false)}
              disabled={isBroadcasting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleSendBroadcast}
              disabled={isBroadcasting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors border border-red-700/60 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isBroadcasting ? 'পাঠানো হচ্ছে...' : 'নোটিফিকেশন পাঠান'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSendBroadcast} className="space-y-3.5 text-xs py-1">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              নোটিফিকেশনের শিরোনাম *
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="যেমন: ধামরাই ও সাভারে জরুরি রক্তদান ক্যাম্পেইন"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                বার্তার ধরন (Type) *
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
              >
                <option value="system">সাধারণ সিস্টেম ঘোষণা</option>
                <option value="request">জরুরি রক্তের অনুরোধ</option>
                <option value="donation">রক্তদান ও স্বীকৃতি</option>
                <option value="verification">ভেরিফিকেশন অ্যালার্ট</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                টার্গেট অডিয়েন্স (Target Audience) *
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
              >
                <option value="all">সকল গ্রাহক (Broadcast to All)</option>
                <option value="donor">শুধুমাত্র রক্তদাতাগণ (Donors)</option>
                <option value="volunteer">স্বেচ্ছাসেবকগণ (Volunteers)</option>
                <option value="moderator">মডারেটর ও এডমিনগণ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              বিস্তারিত বার্তা বিবরণ *
            </label>
            <textarea
              rows={3}
              required
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="বার্তার সম্পূর্ণ বিস্তারিত বিবরণ লিখুন..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ক্লিকঅ্যাকশন লিংক (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="/requests অথবা /become-donor"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
          </div>
        </form>
      </BaseModal>
    </div>
  );
};
