import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { usePermission } from '../../hooks/usePermission';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { AdminHeader } from '../../components/admin/AdminHeader';
import {
  AdminSidebar,
  getModuleMetadata,
  type AdminTabKey,
} from '../../components/admin/AdminSidebar';
import { Sliders } from 'lucide-react';

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
  const queryTab = searchParams.get('tab') as AdminTabKey | null;
  const [activeTab, setActiveTab] = useState<AdminTabKey>(queryTab || initialTab);
  const { can, currentRole, isSuperAdmin } = usePermission();

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
  } = useData();

  // Validate activeTab when role changes or when navigating
  useEffect(() => {
    if (isSuperAdmin) return;

    // Check specific tab restrictions for lower roles
    const adminOnlyTabs: AdminTabKey[] = [
      'health',
      'blood_groups',
      'matching',
      'eligibility',
      'request_rules',
      'branches',
      'users',
      'notifications',
      'organization',
      'branding',
      'website',
      'seo',
      'gamification',
      'pwa',
      'backup',
      'audit',
      'settings',
    ];

    const isRestrictedForCurrent =
      (currentRole === 'volunteer' && (adminOnlyTabs.includes(activeTab) || activeTab === 'donors' || activeTab === 'emergency' || activeTab === 'hospitals' || activeTab === 'funds' || activeTab === 'analytics')) ||
      (currentRole === 'moderator' && adminOnlyTabs.includes(activeTab));

    if (isRestrictedForCurrent) {
      setActiveTab('overview');
    }
  }, [currentRole, activeTab, isSuperAdmin]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <AdminHeader />

        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Categorized Navigation Sidebar */}
          <AdminSidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            counts={counts}
          />

          {/* Right Main Content Panel */}
          <main className="flex-1 min-w-0 w-full space-y-5">
            {/* Active Module Header Context Banner */}
            {currentMeta && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
                {/* Subtle top accent gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs border ${currentMeta.group.accentColor.bg} ${currentMeta.group.accentColor.text} ${currentMeta.group.accentColor.border}`}
                  >
                    <ActiveIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${currentMeta.group.accentColor.bg} ${currentMeta.group.accentColor.text} ${currentMeta.group.accentColor.border}`}
                      >
                        {currentMeta.group.title}
                      </span>
                      <span className="text-[11px] text-slate-300">/</span>
                      <span className="text-xs font-semibold text-slate-500">
                        {currentMeta.item.label}
                      </span>
                    </div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                      {currentMeta.item.label}
                    </h1>
                    {currentMeta.item.description && (
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {currentMeta.item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Live Module Badge / Security Indicator */}
                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    সক্রিয় মডিউল
                  </span>
                  {isSuperAdmin && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-amber-300 border border-slate-700">
                      SUPER ADMIN
                    </span>
                  )}
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
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-4xl hover:border-slate-300 transition-colors">
                  <BloodSystemSettings />
                </div>
              )}
              {activeTab === 'matching' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-4xl hover:border-slate-300 transition-colors">
                  <MatchingSettings />
                </div>
              )}
              {activeTab === 'eligibility' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-4xl hover:border-slate-300 transition-colors">
                  <DonorEligibilitySettings />
                </div>
              )}
              {activeTab === 'request_rules' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-4xl hover:border-slate-300 transition-colors">
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
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-4xl hover:border-slate-300 transition-colors">
                  <OrganizationSettings />
                </div>
              )}
              {activeTab === 'branding' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-4xl hover:border-slate-300 transition-colors">
                  <BrandingSettings />
                </div>
              )}
              {activeTab === 'website' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-4xl hover:border-slate-300 transition-colors">
                  <WebsiteSettings />
                </div>
              )}
              {activeTab === 'seo' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-4xl hover:border-slate-300 transition-colors">
                  <SeoSettings />
                </div>
              )}
              {activeTab === 'gamification' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-4xl hover:border-slate-300 transition-colors">
                  <GamificationSettings />
                </div>
              )}
              {activeTab === 'pwa' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm max-w-4xl hover:border-slate-300 transition-colors">
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
      </div>
    </AdminGuard>
  );
};

