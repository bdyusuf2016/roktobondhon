import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useDialog } from '../../contexts/DialogContext';
import { usePermission } from '../../hooks/usePermission';
import { isDemoMode } from '../../supabase/config';
import { AdminGuard } from '../../components/admin/AdminGuard';
import {
  AdminSidebar,
  getModuleMetadata,
  isTabPermitted,
  type AdminTabKey,
} from '../../components/admin/AdminSidebar';
import { Sliders, Menu, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { toBengaliNumber } from '../../utils/bengali';

// Subcomponents
import { AdminOverviewTab } from '../../components/admin/overview/AdminOverviewTab';
import { AdminAnalyticsTab } from '../../components/admin/analytics/AdminAnalyticsTab';
import { SystemHealthTab } from '../../components/admin/system/SystemHealthTab';
import { AdminDonorsTab } from '../../components/admin/donors/AdminDonorsTab';
import { AdminRequestsTab } from '../../components/admin/requests/AdminRequestsTab';
import { EmergencyControlTab } from '../../components/admin/emergency/EmergencyControlTab';
import { AdminDonationsTab } from '../../components/admin/donations/AdminDonationsTab';
import { AdminCampsTab } from '../../components/admin/camps/AdminCampsTab';
import { AdminHospitalsTab } from '../../components/admin/hospitals/AdminHospitalsTab';
import { AdminFundsTab } from '../../components/admin/funds/AdminFundsTab';
import { AdminUsersTab } from '../../components/admin/users/AdminUsersTab';
import { AdminBranchesTab } from '../../components/admin/locations/AdminBranchesTab';
import { AdminNotificationsTab } from '../../components/admin/notifications/AdminNotificationsTab';
import { AdminBackupTab } from '../../components/admin/backup/AdminBackupTab';
import { AdminAuditTab } from '../../components/admin/audit/AdminAuditTab';
import { AdminSettingsTab } from '../../components/admin/settings/AdminSettingsTab';

// Individual System Settings
import { OrganizationSettings } from '../../components/admin/settings/OrganizationSettings';
import { BrandingSettings } from '../../components/admin/settings/BrandingSettings';
import { WebsiteSettings } from '../../components/admin/settings/WebsiteSettings';
import { SeoSettings } from '../../components/admin/settings/SeoSettings';
import { GamificationSettings } from '../../components/admin/settings/GamificationSettings';
import { PwaSettings } from '../../components/admin/settings/PwaSettings';
import { BloodSystemSettings } from '../../components/admin/blood/BloodSystemSettings';
import { MatchingSettings } from '../../components/admin/blood/MatchingSettings';
import { DonorEligibilitySettings } from '../../components/admin/blood/DonorEligibilitySettings';
import { BloodRequestSettings } from '../../components/admin/requests/BloodRequestSettings';

interface AdminDashboardPageProps {
  initialTab?: AdminTabKey;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  initialTab = 'overview',
}) => {
  const [searchParams] = useSearchParams();
  const dialog = useDialog();
  const queryTab = searchParams.get('tab') as AdminTabKey | null;
  const [activeTab, setActiveTab] = useState<AdminTabKey>(queryTab || initialTab);
  const { can, currentRole, isSuperAdmin } = usePermission();

  // Collapsible Sidebar & Mobile Drawer State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('roktobondhon_admin_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('roktobondhon_admin_sidebar_collapsed', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Keyboard shortcut: Ctrl+B to toggle sidebar, Escape to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      } else if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (queryTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);
  const {
    donors,
    bloodRequests,
    donations,
    bloodCamps,
    hospitals,
    fundDonations,
    users,
    branches,
    notifications,
    auditLogs,
    resetDemoData,
  } = useData();

// Dynamically validate activeTab based on permission matrix and role rank
  useEffect(() => {
    if (isSuperAdmin) return;

    if (!isTabPermitted(activeTab, currentRole, isSuperAdmin, can)) {
      setActiveTab('overview');
    }
  }, [currentRole, activeTab, isSuperAdmin, can]);

  const counts = {
    donors: donors.length,
    requests: bloodRequests.length,
    donations: donations.length,
    camps: bloodCamps.length,
    hospitals: hospitals.length,
    funds: fundDonations.length,
    users: users.length,
    branches: branches.length,
    notifications: notifications.length,
    audit: auditLogs.length,
  };

  const currentMeta = getModuleMetadata(activeTab);
  const ActiveIcon = currentMeta?.item.icon || Sliders;

  return (
    <AdminGuard>
      <div className="w-full px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-24 lg:pb-12 space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row items-start gap-5 lg:gap-6">
          {/* Collapsible Sticky/Fixed Sidebar (Desktop) - Safely positioned below Navbar */}
          <div
            className={`hidden lg:block shrink-0 sticky top-24 z-20 h-[calc(100vh-7.5rem)] min-h-[580px] transition-all duration-300 ease-in-out ${
              isSidebarCollapsed ? 'w-20' : 'w-72'
            }`}
          >
            <AdminSidebar
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              counts={counts}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebarCollapse}
            />
          </div>

          {/* Main Content Panel */}
          <main className="flex-1 min-w-0 w-full space-y-4 sm:space-y-5">
            {/* Active Module Header Context Banner */}
            {currentMeta && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden">
                {/* Subtle top accent gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs border ${currentMeta.group.accentColor.bg} ${currentMeta.group.accentColor.text} ${currentMeta.group.accentColor.border}`}
                  >
                    <ActiveIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${currentMeta.group.accentColor.bg} ${currentMeta.group.accentColor.text} ${currentMeta.group.accentColor.border}`}
                      >
                        {currentMeta.group.title}
                      </span>
                      <span className="text-[11px] text-slate-300">/</span>
                      <span className="text-xs font-semibold text-slate-500 truncate">
                        {currentMeta.item.label}
                      </span>
                    </div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5 truncate">
                      {currentMeta.item.label}
                    </h1>
                    {currentMeta.item.description && (
                      <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1 sm:line-clamp-none">
                        {currentMeta.item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side status indicator & quick actions */}
                <div className="flex items-center gap-2 self-stretch sm:self-center justify-between sm:justify-end shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-wrap">
                  {/* Mobile Menu Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(true)}
                    className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer border border-slate-700 active:scale-95"
                    title="কন্ট্রোল মেনু খুলুন"
                  >
                    <Menu className="w-4 h-4 text-red-400" />
                    <span>কন্ট্রোল মেনু</span>
                  </button>

                  {/* Demo Reset (Visible only in demo mode for Super Admin) */}
                  {isDemoMode && isSuperAdmin && (
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = await dialog.confirm({
                          title: 'টেস্ট ডেটাবেজ রিসেট',
                          message:
                            'আপনি কি টেস্ট ডেটাবেজ রিসেট করতে চান? (১০০ ডোনার, ২০ রিকোয়েস্ট, ৫০ রক্তদান তৈরি হবে)',
                          type: 'danger',
                          confirmText: 'হ্যাঁ, রিসেট করুন',
                          cancelText: 'বাতিল',
                        });
                        if (confirmed) {
                          resetDemoData();
                          dialog.alert({
                            title: 'রিসেট সম্পন্ন!',
                            message: 'ডেটাবেজ সফলভাবে রিসেট ও সিড করা হয়েছে!',
                            type: 'success',
                          });
                        }
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 border border-slate-200 cursor-pointer transition-colors shadow-2xs"
                      title="১০০ জন ডোনার, ২০ আবেদন এবং ৫০ রক্তদান পুনঃলোড করুন"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                      <span className="hidden sm:inline text-[11px]">ডেমো রিসেট</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      সক্রিয়
                    </span>
                    {isSuperAdmin && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-amber-300 border border-slate-700">
                        SUPER ADMIN
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab Modules */}
            <div>
              {activeTab === 'overview' && (
                <AdminOverviewTab onNavigateToTab={(t) => setActiveTab(t as AdminTabKey)} />
              )}
              {activeTab === 'analytics' && <AdminAnalyticsTab />}
              {activeTab === 'health' && <SystemHealthTab />}

              {/* Operations */}
              {activeTab === 'donors' && <AdminDonorsTab />}
              {activeTab === 'requests' && <AdminRequestsTab />}
              {activeTab === 'emergency' && <EmergencyControlTab />}
              {activeTab === 'donations' && <AdminDonationsTab />}
              {activeTab === 'camps' && <AdminCampsTab />}

              {/* Blood System Policies */}
              {activeTab === 'blood_groups' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm w-full hover:border-slate-300 transition-colors">
                  <BloodSystemSettings />
                </div>
              )}
              {activeTab === 'matching' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm w-full hover:border-slate-300 transition-colors">
                  <MatchingSettings />
                </div>
              )}
              {activeTab === 'eligibility' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm w-full hover:border-slate-300 transition-colors">
                  <DonorEligibilitySettings />
                </div>
              )}
              {activeTab === 'request_rules' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm w-full hover:border-slate-300 transition-colors">
                  <BloodRequestSettings />
                </div>
              )}

              {/* Directory */}
              {activeTab === 'hospitals' && <AdminHospitalsTab />}
              {activeTab === 'branches' && <AdminBranchesTab />}

              {/* Users & Access */}
              {activeTab === 'users' && <AdminUsersTab />}

              {/* Notifications */}
              {activeTab === 'notifications' && <AdminNotificationsTab />}

              {/* Finance */}
              {activeTab === 'funds' && <AdminFundsTab />}

              {/* Content & Branding */}
              {activeTab === 'organization' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm w-full hover:border-slate-300 transition-colors">
                  <OrganizationSettings />
                </div>
              )}
              {activeTab === 'branding' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm w-full hover:border-slate-300 transition-colors">
                  <BrandingSettings />
                </div>
              )}
              {activeTab === 'website' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm w-full hover:border-slate-300 transition-colors">
                  <WebsiteSettings />
                </div>
              )}
              {activeTab === 'seo' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm w-full hover:border-slate-300 transition-colors">
                  <SeoSettings />
                </div>
              )}
              {activeTab === 'gamification' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm w-full hover:border-slate-300 transition-colors">
                  <GamificationSettings />
                </div>
              )}
              {activeTab === 'pwa' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm w-full hover:border-slate-300 transition-colors">
                  <PwaSettings />
                </div>
              )}

              {/* Security, Audit & Backup */}
              {activeTab === 'backup' && <AdminBackupTab />}
              {activeTab === 'audit' && <AdminAuditTab />}
              {activeTab === 'settings' && (
                <AdminSettingsTab onNavigateToTab={(t) => setActiveTab(t as AdminTabKey)} />
              )}
            </div>
          </main>
        </div>

        {/* Mobile Slide-In Sidebar (Only for Mobile Screens) */}
        {isMobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
              onClick={() => setIsMobileDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 max-w-full flex">
              <div className="w-80 max-w-[88vw] h-full shadow-2xl bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-left">
                <AdminSidebar
                  activeTab={activeTab}
                  onSelectTab={(tab) => {
                    setActiveTab(tab);
                    setIsMobileDrawerOpen(false);
                  }}
                  counts={counts}
                  isMobileDrawer={true}
                  onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminGuard>
  );
};


