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
import type { PermissionKey, UserRole } from '../../types';

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

  const navGroups: NavGroup[] = [
    {
      id: 'dashboard',
      title: 'ড্যাশবোর্ড ও এনালিটিক্স',
      icon: BarChart3,
      items: [
        { id: 'overview', label: 'ওভারভিউ ড্যাশবোর্ড', icon: Sliders, keywords: 'overview dashboard summary kpi', minRole: 'volunteer' },
        { id: 'analytics', label: 'এনালিটিক্স ও রিপোর্ট', icon: BarChart3, keywords: 'analytics report charts stats', minRole: 'moderator' },
        { id: 'health', label: 'সিস্টেম হেলথ ও মনিটরিং', icon: Activity, keywords: 'health system status db latency pwa storage', minRole: 'admin' },
      ],
    },
    {
      id: 'operations',
      title: 'ব্লাড অপারেশনস ও ফিল্ড',
      icon: Droplets,
      items: [
        { id: 'donors', label: 'রক্তদাতা তালিকা', badgeCount: counts.donors, badgeVariant: 'slate', icon: Users, keywords: 'donors list verification blood group', requiredPermission: 'manage_donors' },
        { id: 'requests', label: 'রক্তের আবেদন ট্র্যাকার', badgeCount: counts.requests, badgeVariant: 'red', icon: Droplets, keywords: 'requests blood urgent patient hospital', requiredPermission: 'manage_requests' },
        { id: 'emergency', label: 'জরুরি রেসপন্স ও ব্রডকাস্ট', icon: Flame, badgeVariant: 'red', keywords: 'emergency response broadcast alerts whatsapp', requiredPermission: 'manage_requests', minRole: 'moderator' },
        { id: 'donations', label: 'রক্তদান হিস্ট্রি ও লগ', badgeCount: counts.donations, badgeVariant: 'emerald', icon: Award, keywords: 'donations history logs units certificate', requiredPermission: 'record_donation' },
        { id: 'camps', label: 'রক্তদান ক্যাম্প ও ড্রাইভ', badgeCount: counts.camps || 0, badgeVariant: 'indigo', icon: Calendar, keywords: 'camps drives events pre-registration', minRole: 'volunteer' },
      ],
    },
    {
      id: 'directory',
      title: 'ডিরেক্টরি ও নেটওয়ার্ক',
      icon: Building2,
      items: [
        { id: 'hospitals', label: 'হাসপাতাল ও ব্লাড ব্যাংক', badgeCount: counts.hospitals, badgeVariant: 'slate', icon: Building2, keywords: 'hospitals blood banks directory icu', requiredPermission: 'manage_hospitals' },
        { id: 'branches', label: 'শাখা ও আঞ্চলিক সমন্বয়ক', badgeCount: counts.branches, badgeVariant: 'slate', icon: MapPin, keywords: 'branches locations dhamrai savar manikganj', requiredPermission: 'manage_branches' },
      ],
    },
    {
      id: 'finance_group',
      title: 'অর্থায়ন ও তহবিল',
      icon: Heart,
      items: [
        { id: 'funds', label: 'তহবিল, অনুদান ও পেমেন্ট', badgeCount: counts.funds, badgeVariant: 'emerald', icon: Heart, keywords: 'funds donations bkash nagad rocket disbursements', requiredPermission: 'manage_funds' },
      ],
    },
    {
      id: 'blood_system',
      title: 'ব্লাড সিস্টেম ও পলিসি',
      icon: SlidersHorizontal,
      items: [
        { id: 'blood_groups', label: 'রক্তের গ্রুপ ও কম্প্যাটিবিলিটি', icon: Droplets, keywords: 'blood groups compatibility abo rh', minRole: 'admin', requiredPermission: 'manage_settings' },
        { id: 'matching', label: 'ম্যাচিং স্কোরিং ও সিমুলেটর', icon: SlidersHorizontal, keywords: 'matching engine algorithm weights simulator', minRole: 'admin', requiredPermission: 'manage_settings' },
        { id: 'eligibility', label: 'রক্তদাতা যোগ্যতা নীতি', icon: UserCheck, keywords: 'eligibility criteria age weight interval', minRole: 'admin', requiredPermission: 'manage_settings' },
        { id: 'request_rules', label: 'আবেদন নীতিমালা ও সময়সীমা', icon: FileText, keywords: 'requests rules expiry limits', minRole: 'admin', requiredPermission: 'manage_settings' },
      ],
    },
    {
      id: 'users_access',
      title: 'ইউজার ও সিকিউরিটি অ্যাক্সেস',
      icon: ShieldCheck,
      items: [
        { id: 'users', label: 'ইউজার, রোল ও পারমিশন', badgeCount: counts.users, badgeVariant: 'slate', icon: ShieldCheck, keywords: 'users roles rbac permissions matrix super admin volunteer', requiredPermission: 'manage_users' },
      ],
    },
    {
      id: 'notifications_group',
      title: 'যোগাযোগ ও নোটিফিকেশন',
      icon: Bell,
      items: [
        { id: 'notifications', label: 'এসএমএস, গেটওয়ে ও টেমপ্লেট', badgeCount: counts.notifications || 0, badgeVariant: 'slate', icon: Bell, keywords: 'notifications sms whatsapp push templates logs', minRole: 'admin', requiredPermission: 'manage_settings' },
      ],
    },
    {
      id: 'content_group',
      title: 'সংগঠন, ব্র্যান্ডিং ও সাইট',
      icon: Globe,
      items: [
        { id: 'organization', label: 'প্রতিষ্ঠান ও পরিচিতি', icon: Building, keywords: 'organization name hotline slogan contact address', minRole: 'admin', requiredPermission: 'manage_settings' },
        { id: 'branding', label: 'ব্র্যান্ডিং, লোগো ও থিম', icon: Palette, keywords: 'branding logo favicon colors theme', minRole: 'admin', requiredPermission: 'manage_settings' },
        { id: 'website', label: 'ওয়েবসাইট ও ব্যানার', icon: Layout, keywords: 'website homepage announcement banner', minRole: 'admin', requiredPermission: 'manage_settings' },
        { id: 'seo', label: 'এসইও ও সোশ্যাল শেয়ারিং', icon: Globe, keywords: 'seo meta tags keywords og image', minRole: 'admin', requiredPermission: 'manage_settings' },
        { id: 'gamification', label: 'সনদপত্র ও ব্যাজ পলিসি', icon: Award, keywords: 'gamification badges certificate milestone', minRole: 'admin', requiredPermission: 'manage_settings' },
        { id: 'pwa', label: 'মোবাইল অ্যাপ ও অফলাইন PWA', icon: Smartphone, keywords: 'pwa offline mobile app install manifest', minRole: 'admin', requiredPermission: 'manage_settings' },
      ],
    },
    {
      id: 'security_backup',
      title: 'নিরাপত্তা, অডিট ও ব্যাকআপ',
      icon: Database,
      items: [
        { id: 'audit', label: 'অডিট ট্রেইল ও লগ', badgeCount: counts.audit, badgeVariant: 'slate', icon: FileText, keywords: 'audit logs security actions immutable', requiredPermission: 'view_audit_logs' },
        { id: 'backup', label: 'ক্লাউড ব্যাকআপ ও রিস্টোর', icon: Database, keywords: 'backup restore export import json', requiredPermission: 'manage_backup' },
      ],
    },
  ];

  const query = searchQuery.toLowerCase().trim();

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
    <aside className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 sm:p-4 space-y-4">
      {/* Quick Filter Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="মডিউল খুঁজুন (Search control)..."
          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Accordion Sections */}
      <div className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    hasActiveItem
                      ? 'text-red-700 bg-red-50/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <GroupIcon className="w-3.5 h-3.5" />
                    <span>{group.title}</span>
                  </span>
                  {!query && (
                    <span>
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </span>
                  )}
                </button>

                {!isCollapsed && (
                  <div className="space-y-0.5 pl-1.5">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectTab(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-red-600 text-white font-bold shadow-xs border border-red-700/60'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <ItemIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isActive ? 'text-white' : 'text-slate-400'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </span>

                          {item.badgeCount !== undefined && item.badgeCount > 0 && (
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : item.badgeVariant === 'red'
                                  ? 'bg-red-100 text-red-700'
                                  : item.badgeVariant === 'emerald'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : item.badgeVariant === 'indigo'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-slate-100 text-slate-600'
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
