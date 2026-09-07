import React, { useState } from 'react';
import {
  Sliders,
  Users,
  Droplets,
  Award,
  Building2,
  Heart,
  ShieldCheck,
  MapPin,
  Database,
  FileText,
  Flame,
  Bell,
  BarChart3,
  Calendar,
  Activity,
  Search,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  UserCheck,
  Globe,
  Palette,
  Layout,
  Smartphone,
  Building,
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import type { PermissionKey } from '../../types';

export type AdminTabKey =
  | 'overview'
  | 'analytics'
  | 'health'
  | 'donors'
  | 'requests'
  | 'emergency'
  | 'donations'
  | 'camps'
  | 'blood_groups'
  | 'matching'
  | 'eligibility'
  | 'request_rules'
  | 'hospitals'
  | 'branches'
  | 'users'
  | 'notifications'
  | 'funds'
  | 'organization'
  | 'branding'
  | 'website'
  | 'seo'
  | 'gamification'
  | 'pwa'
  | 'backup'
  | 'audit'
  | 'settings';

export interface NavItem {
  id: AdminTabKey;
  label: string;
  description?: string;
  badgeCount?: number;
  badgeVariant?: 'red' | 'amber' | 'emerald' | 'indigo' | 'slate';
  icon: React.FC<{ className?: string }>;
  keywords: string;
  requiredPermission?: PermissionKey;
  minRole?: 'super_admin' | 'admin' | 'moderator' | 'volunteer';
}

export interface NavGroup {
  id: string;
  title: string;
  icon: React.FC<{ className?: string }>;
  accentColor: {
    bg: string;
    text: string;
    border: string;
  };
  items: NavItem[];
}

interface AdminSidebarProps {
  activeTab: AdminTabKey;
  onSelectTab: (tab: AdminTabKey) => void;
  counts: {
    donors: number;
    requests: number;
    donations: number;
    camps?: number;
    hospitals: number;
    funds: number;
    users: number;
    branches: number;
    notifications?: number;
    audit: number;
  };
}

const ROLE_RANK: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  moderator: 60,
  volunteer: 40,
  donor: 20,
  recipient: 10,
};

export const navGroupsConfig: NavGroup[] = [
  {
    id: 'dashboard',
    title: 'ড্যাশবোর্ড ও এনালিটিক্স',
    icon: BarChart3,
    accentColor: {
      bg: 'bg-sky-50',
      text: 'text-sky-600',
      border: 'border-sky-200',
    },
    items: [
      { id: 'overview', label: 'ওভারভিউ ড্যাশবোর্ড', description: 'সিস্টেমের সামগ্রিক স্ট্যাটাস ও কেপিআই রিপোর্ট', icon: Sliders, keywords: 'overview dashboard summary kpi', minRole: 'volunteer' },
      { id: 'analytics', label: 'এনালিটিক্স ও রিপোর্ট', description: 'রক্তদান প্রবণতা, অগ্রগতি ও ভৌগোলিক পরিসংখ্যান', icon: BarChart3, keywords: 'analytics report charts stats', minRole: 'moderator' },
      { id: 'health', label: 'সিস্টেম হেলথ ও মনিটরিং', description: 'ডাটাবেজ কানেক্টিভিটি, স্টোরেজ ও পারফরম্যান্স মেট্রিক্স', icon: Activity, keywords: 'health system status db latency pwa storage', minRole: 'admin' },
    ],
  },
  {
    id: 'operations',
    title: 'ব্লাড অপারেশনস ও ফিল্ড',
    icon: Droplets,
    accentColor: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-200',
    },
    items: [
      { id: 'donors', label: 'রক্তদাতা তালিকা', description: 'রক্তদাতাদের বিস্তারিত প্রোফাইল ও যাচাইকরণ কন্ট্রোল', badgeVariant: 'slate', icon: Users, keywords: 'donors list verification blood group', requiredPermission: 'manage_donors' },
      { id: 'requests', label: 'রক্তের আবেদন ট্র্যাকার', description: 'জরুরি রক্তের চাহিদা, রিয়েল-টাইম ট্র্যাকিং ও আপডেট', badgeVariant: 'red', icon: Droplets, keywords: 'requests blood urgent patient hospital', requiredPermission: 'manage_requests' },
      { id: 'emergency', label: 'জরুরি রেসপন্স ও ব্রডকাস্ট', description: 'হোয়াটসঅ্যাপ, এসএমএস ও পুশ অ্যালার্ট ব্রডকাস্ট সেন্টার', icon: Flame, badgeVariant: 'red', keywords: 'emergency response broadcast alerts whatsapp', requiredPermission: 'manage_requests', minRole: 'moderator' },
      { id: 'donations', label: 'রক্তদান হিস্ট্রি ও লগ', description: 'রক্তদানের অফিশিয়াল রেকর্ড ও ডিজিটাল সার্টিফিকেট প্রস্তুত', badgeVariant: 'emerald', icon: Award, keywords: 'donations history logs units certificate', requiredPermission: 'record_donation' },
      { id: 'camps', label: 'রক্তদান ক্যাম্প ও ড্রাইভ', description: 'ক্যাম্পেইন শিডিউলিং, স্থান নির্ধারণ ও প্রি-রেজিস্ট্রেশন', badgeVariant: 'indigo', icon: Calendar, keywords: 'camps drives events pre-registration', minRole: 'volunteer' },
    ],
  },
  {
    id: 'directory',
    title: 'ডিরেক্টরি ও নেটওয়ার্ক',
    icon: Building2,
    accentColor: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-200',
    },
    items: [
      { id: 'hospitals', label: 'হাসপাতাল ও ব্লাড ব্যাংক', description: 'হাসপাতাল তালিকা, আইসিইউ ব্যবস্থা ও জরুরি যোগাযোগ', badgeVariant: 'slate', icon: Building2, keywords: 'hospitals blood banks directory icu', requiredPermission: 'manage_hospitals' },
      { id: 'branches', label: ' শাখা ও আঞ্চলিক সমন্বয়ক', description: 'ধামরাই, সাভার, মানিকগঞ্জ আঞ্চলিক কো-অর্ডিনেটর নেটওয়ার্ক', badgeVariant: 'slate', icon: MapPin, keywords: 'branches locations dhamrai savar manikganj', requiredPermission: 'manage_branches' },
    ],
  },
  {
    id: 'finance_group',
    title: 'অর্থায়ন ও তহবিল',
    icon: Heart,
    accentColor: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
    },
    items: [
      { id: 'funds', label: 'তহবিল, অনুদান ও পেমেন্ট', description: 'বিকাশ/নগদ ডোনেশন হিসাব, ভাউচার ও স্বচ্ছ হিসাব বিবরণী', badgeVariant: 'emerald', icon: Heart, keywords: 'funds donations bkash nagad rocket disbursements', requiredPermission: 'manage_funds' },
    ],
  },
  {
    id: 'blood_system',
    title: 'ব্লাড সিস্টেম ও পলিসি',
    icon: SlidersHorizontal,
    accentColor: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200',
    },
    items: [
      { id: 'blood_groups', label: 'রক্তের গ্রুপ ও কম্প্যাটিবিলিটি', description: 'ABO/Rh সামঞ্জস্য ম্যাট্রিক্স ও ব্লাড গ্রুপ নিয়মাবলী', icon: Droplets, keywords: 'blood groups compatibility abo rh', minRole: 'admin', requiredPermission: 'manage_settings' },
      { id: 'matching', label: 'ম্যাচিং স্কোরিং ও সিমুলেটর', description: 'স্মার্ট ডোনার ম্যাচিং অ্যালগরিদম ও দূরত্ব ওয়েটেজ ফ্যাক্টর', icon: SlidersHorizontal, keywords: 'matching engine algorithm weights simulator', minRole: 'admin', requiredPermission: 'manage_settings' },
      { id: 'eligibility', label: 'রক্তদাতা যোগ্যতা নীতি', description: 'রক্তদানের বয়সসীমা, ন্যূনতম ওজন ও স্বাস্থ্যগত ব্যবধান নীতিমালা', icon: UserCheck, keywords: 'eligibility criteria age weight interval', minRole: 'admin', requiredPermission: 'manage_settings' },
      { id: 'request_rules', label: 'আবেদন নীতিমালা ও সময়সীমা', description: 'আবেদনের বৈধতা মেয়াদ, পুনরাবৃত্তি সীমা ও যাচাইকরণ শর্ত', icon: FileText, keywords: 'requests rules expiry limits', minRole: 'admin', requiredPermission: 'manage_settings' },
    ],
  },
  {
    id: 'users_access',
    title: 'ইউজার ও সিকিউরিটি অ্যাক্সেস',
    icon: ShieldCheck,
    accentColor: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-200',
    },
    items: [
      { id: 'users', label: 'ইউজার, রোল ও পারমিশন', description: 'RBAC রোল ভিত্তিক নিরাপত্তা ও অ্যাক্সেস কন্ট্রোল নিয়ন্ত্রণ', badgeVariant: 'slate', icon: ShieldCheck, keywords: 'users roles rbac permissions matrix super admin volunteer', requiredPermission: 'manage_users' },
    ],
  },
  {
    id: 'notifications_group',
    title: 'যোগাযোগ ও নোটিফিকেশন',
    icon: Bell,
    accentColor: {
      bg: 'bg-pink-50',
      text: 'text-pink-600',
      border: 'border-pink-200',
    },
    items: [
      { id: 'notifications', label: 'এসএমএস, গেটওয়ে ও টেমপ্লেট', description: 'এসএমএস ব্যালেন্স, স্বয়ংক্রিয় মেসেজ টেমপ্লেট ও ওয়েব পুশ', badgeVariant: 'slate', icon: Bell, keywords: 'notifications sms whatsapp push templates logs', minRole: 'admin', requiredPermission: 'manage_settings' },
    ],
  },
  {
    id: 'content_group',
    title: 'সংগঠন, ব্র্যান্ডিং ও সাইট',
    icon: Globe,
    accentColor: {
      bg: 'bg-teal-50',
      text: 'text-teal-600',
      border: 'border-teal-200',
    },
    items: [
      { id: 'organization', label: 'প্রতিষ্ঠান ও পরিচিতি', description: 'সংগঠনের অফিশিয়াল নাম, হটলাইন, স্লোগান ও ঠিকানা', icon: Building, keywords: 'organization name hotline slogan contact address', minRole: 'admin', requiredPermission: 'manage_settings' },
      { id: 'branding', label: 'ব্র্যান্ডিং, লোগো ও থিম', description: 'লোগো, ফেভিকন ও প্রাতিষ্ঠানিক থিম কালার কাস্টমাইজেশন', icon: Palette, keywords: 'branding logo favicon colors theme', minRole: 'admin', requiredPermission: 'manage_settings' },
      { id: 'website', label: 'ওয়েবসাইট ও ব্যানার', description: 'হোমপেজ ব্যানার, জরুরি ঘোষণা ও সামাজিক প্রচারণা কনটেন্ট', icon: Layout, keywords: 'website homepage announcement banner', minRole: 'admin', requiredPermission: 'manage_settings' },
      { id: 'seo', label: 'এসইও ও সোশ্যাল শেয়ারিং', description: 'সার্চ ইঞ্জিন অপটিমাইজেশন, মেটা ট্যাগ ও সোশ্যাল প্রিভিউ', icon: Globe, keywords: 'seo meta tags keywords og image', minRole: 'admin', requiredPermission: 'manage_settings' },
      { id: 'gamification', label: 'সনদপত্র ও ব্যাজ পলিসি', description: 'গেমিফিকেশন রিওয়ার্ড, ব্যাজ রুলস ও ডিজিটাল প্রশংসাপত্র', icon: Award, keywords: 'gamification badges certificate milestone', minRole: 'admin', requiredPermission: 'manage_settings' },
      { id: 'pwa', label: 'মোবাইল অ্যাপ ও অফলাইন PWA', description: 'প্রগ্রেসিভ ওয়েব অ্যাপ কনফিগ, অফলাইন ক্যাশিং ও ইনস্টলেশন', icon: Smartphone, keywords: 'pwa offline mobile app install manifest', minRole: 'admin', requiredPermission: 'manage_settings' },
    ],
  },
  {
    id: 'security_backup',
    title: 'নিরাপত্তা, অডিট ও ব্যাকআপ',
    icon: Database,
    accentColor: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
    },
    items: [
      { id: 'audit', label: 'অডিট ট্রেইল ও লগ', description: 'সিস্টেমের সকল পরিবর্তনের অপরিবর্তনীয় ফরেনসিক হিস্ট্রি', badgeVariant: 'slate', icon: FileText, keywords: 'audit logs security actions immutable', requiredPermission: 'view_audit_logs' },
      { id: 'backup', label: 'ক্লাউড ব্যাকআপ ও রিস্টোর', description: 'সুপাবেজ ক্লাউড ডাটাবেজ ব্যাকআপ ও রিকভারি স্ন্যাপশট', icon: Database, keywords: 'backup restore export import json', requiredPermission: 'manage_backup' },
    ],
  },
];

export const getModuleMetadata = (tabId: AdminTabKey) => {
  for (const group of navGroupsConfig) {
    const item = group.items.find((i) => i.id === tabId);
    if (item) {
      return {
        item,
        group,
      };
    }
  }
  return null;
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  counts,
}) => {
  const { can, currentRole, isSuperAdmin } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const userRank = currentRole ? ROLE_RANK[currentRole] || 0 : 0;

  const isItemPermitted = (item: NavItem): boolean => {
    if (isSuperAdmin) return true;
    if (item.minRole && userRank < (ROLE_RANK[item.minRole] || 0)) {
      return false;
    }
    if (item.requiredPermission && !can(item.requiredPermission)) {
      return false;
    }
    return true;
  };

  // Populate dynamic badge counts
  const navGroups: NavGroup[] = navGroupsConfig.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      let badgeCount = item.badgeCount;
      if (item.id === 'donors') badgeCount = counts.donors;
      if (item.id === 'requests') badgeCount = counts.requests;
      if (item.id === 'donations') badgeCount = counts.donations;
      if (item.id === 'camps') badgeCount = counts.camps || 0;
      if (item.id === 'hospitals') badgeCount = counts.hospitals;
      if (item.id === 'branches') badgeCount = counts.branches;
      if (item.id === 'funds') badgeCount = counts.funds;
      if (item.id === 'users') badgeCount = counts.users;
      if (item.id === 'notifications') badgeCount = counts.notifications || 0;
      if (item.id === 'audit') badgeCount = counts.audit;

      return {
        ...item,
        badgeCount,
      };
    }),
  }));

  const query = searchQuery.toLowerCase().trim();

  // Total permitted modules for badge
  const totalPermittedCount = navGroups.reduce(
    (acc, g) => acc + g.items.filter(isItemPermitted).length,
    0
  );

  // Filter groups and items based on role and query
  const visibleGroups = navGroups
    .map((group) => {
      const permittedItems = group.items.filter((item) => isItemPermitted(item));
      const matchingItems = permittedItems.filter((item) => {
        if (!query) return true;
        return (
          item.label.toLowerCase().includes(query) ||
          item.keywords.toLowerCase().includes(query) ||
          group.title.toLowerCase().includes(query)
        );
      });
      return {
        ...group,
        items: matchingItems,
      };
    })
    .filter((group) => group.items.length > 0);

  return (
    <aside className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3 sm:p-4 space-y-3.5">
      {/* Sidebar Header & Counter */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-xs">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 tracking-tight">কন্ট্রোল মডিউল</h3>
            <p className="text-[10px] text-slate-400 font-medium">সিস্টেম নেভিগেশন</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
          {totalPermittedCount}টি মডিউল
        </span>
      </div>

      {/* Quick Filter Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="মডিউল খুঁজুন..."
          className="w-full pl-8.5 pr-7 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Accordion Sections */}
      <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1 no-scrollbar">
        {visibleGroups.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 font-medium">
            কোনো অনুমোদিত মডিউল পাওয়া যায়নি।
          </div>
        ) : (
          visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const isCollapsed = !query && collapsedGroups[group.id];
            const hasActiveItem = group.items.some((item) => item.id === activeTab);

            return (
              <div key={group.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer ${
                    hasActiveItem
                      ? 'text-red-700 bg-red-50/60 border border-red-100/70 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${group.accentColor.bg} ${group.accentColor.text} ${group.accentColor.border}`}
                    >
                      <GroupIcon className="w-3 h-3" />
                    </span>
                    <span className="text-[11px] font-bold">{group.title}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {hasActiveItem && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                    )}
                    {!query && (
                      <span className="p-0.5 rounded-md hover:bg-slate-200/50 text-slate-400">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="space-y-1 pl-1 pt-0.5">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectTab(item.id)}
                          className={`group relative w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                            isActive
                              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-bold shadow-sm shadow-red-500/25 border border-red-500/50'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 hover:translate-x-0.5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div
                              className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                                isActive
                                  ? 'bg-white shadow-xs'
                                  : 'bg-transparent group-hover:bg-slate-300'
                              }`}
                            />
                            <ItemIcon
                              className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                                isActive
                                  ? 'text-white'
                                  : 'text-slate-400 group-hover:text-slate-700 group-hover:scale-110'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badgeCount !== undefined && item.badgeCount > 0 && (
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 transition-all ${
                                isActive
                                  ? 'bg-white/25 text-white backdrop-blur-xs border border-white/30'
                                  : item.badgeVariant === 'red'
                                  ? 'bg-red-50 text-red-600 border border-red-200'
                                  : item.badgeVariant === 'emerald'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : item.badgeVariant === 'indigo'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {item.badgeCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

