import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { OrgConfigProvider } from './contexts/OrgConfigContext';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { DialogProvider } from './contexts/DialogContext';
import { EmergencyAlertBanner } from './components/EmergencyAlertBanner';
import { EmergencyBanner } from './components/EmergencyBanner';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';

// Pages
import { HomePage } from './pages/HomePage';
import { FindBloodPage } from './pages/FindBloodPage';
import { RequestBloodPage } from './pages/RequestBloodPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { BecomeDonorPage } from './pages/BecomeDonorPage';
import { DonorProfilePage } from './pages/DonorProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AboutPage } from './pages/AboutPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { FaqPage } from './pages/FaqPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { LoginPage } from './pages/LoginPage';
import { ModalShowcasePage } from './pages/ModalShowcasePage';
import { HospitalDirectoryPage } from './pages/HospitalDirectoryPage';
import { DonatePage } from './pages/DonatePage';
import { CertificatePage } from './pages/CertificatePage';
import { BloodCampsPage } from './pages/BloodCampsPage';
import { HealthEligibilityPage } from './pages/HealthEligibilityPage';
import { useSEO } from './hooks/useSEO';

function AppContent() {
  useSEO();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-red-600 selection:text-white print:bg-white print:p-0">
      <div className="print:hidden">
        <ScrollToTop />
        <EmergencyAlertBanner />
        <EmergencyBanner />
        <Navbar />
      </div>

      <main className="flex-1 pb-16 md:pb-0 print:pb-0 print:m-0">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/find-blood" element={<FindBloodPage />} />
          <Route path="/request-blood" element={<RequestBloodPage />} />
          <Route path="/request/:id" element={<RequestDetailPage />} />
          <Route path="/become-donor" element={<BecomeDonorPage />} />
          <Route path="/donor/:id" element={<DonorProfilePage />} />
          <Route path="/camps" element={<BloodCampsPage />} />
          <Route path="/certificate" element={<CertificatePage />} />
          <Route path="/health-checker" element={<HealthEligibilityPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/modals" element={<ModalShowcasePage />} />
          <Route path="/hospitals" element={<HospitalDirectoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <div className="print:hidden">
        <Footer />
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <SystemConfigProvider>
          <OrgConfigProvider>
            <DataProvider>
              <DialogProvider>
                <AppContent />
              </DialogProvider>
            </DataProvider>
          </OrgConfigProvider>
        </SystemConfigProvider>
      </AuthProvider>
    </Router>
  );
}
