import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { AdminSidebar, type AdminTabKey } from '../../components/admin/AdminSidebar';

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
  const [activeTab, setActiveTab] = useState<AdminTabKey>(initialTab);
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
          <main className="flex-1 min-w-0 w-full">
            {activeTab === 'overview' && <AdminOverviewTab />}
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
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-4xl">
                <BloodSystemSettings />
              </div>
            )}
            {activeTab === 'matching' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-4xl">
                <MatchingSettings />
              </div>
            )}
            {activeTab === 'eligibility' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-4xl">
                <DonorEligibilitySettings />
              </div>
            )}
            {activeTab === 'request_rules' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-4xl">
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
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-4xl">
                <OrganizationSettings />
              </div>
            )}
            {activeTab === 'branding' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-4xl">
                <BrandingSettings />
              </div>
            )}
            {activeTab === 'website' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-4xl">
                <WebsiteSettings />
              </div>
            )}
            {activeTab === 'seo' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-4xl">
                <SeoSettings />
              </div>
            )}
            {activeTab === 'gamification' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-4xl">
                <GamificationSettings />
              </div>
            )}
            {activeTab === 'pwa' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs max-w-4xl">
                <PwaSettings />
              </div>
            )}

            {/* Security, Audit & Backup */}
            {activeTab === 'backup' && <AdminBackupTab />}
            {activeTab === 'audit' && <AdminAuditTab />}
            {activeTab === 'settings' && <AdminSettingsTab onNavigateToTab={(t) => setActiveTab(t as AdminTabKey)} />}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
};
