import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  AuditLog,
  BloodGroup,
  BloodRequest,
  Branch,
  Donation,
  DonationSubmission,
  DonationSubmissionStatus,
  Donor,
  DonorPublic,
  DonorPrivate,
  DonorRequest,
  LocationItem,
  NotificationItem,
  VerificationStatus,
  UserRole,
  Hospital,
  FundDonation,
  PaymentMethodConfig,
  FundDisbursement,
  DonationCauseConfig,
  User,
  RolePermissionMatrix,
  PermissionKey,
  BloodCamp,
  CampRegistration,
  DonorBadge,
} from '../types';
import {
  generateSeedDonors,
  generateSeedRequests,
  generateSeedDonations,
  INITIAL_DEMO_USERS,
  INITIAL_PAYMENT_METHODS,
  INITIAL_DONATION_CAUSES,
  INITIAL_FUND_DONATIONS,
  INITIAL_FUND_DISBURSEMENTS,
  DEFAULT_PERMISSION_MATRIX,
  INITIAL_BLOOD_CAMPS,
  DONOR_BADGES_LIST,
} from '../data/seedData';
import { HOSPITALS_DATA } from '../data/hospitalsData';
import { INITIAL_LOCATIONS, INITIAL_BRANCHES } from '../services/locationService';
import { generateBloodRequestId, generateDonorId, getLocationCode } from '../services/idGenerator';
import { supabase, isSupabaseConfigured, isDemoMode, createIsolatedSupabaseClient } from '../supabase/config';
import {
  createDonorRecord,
  updateDonorRecord,
  verifyDonorStatus,
  deleteDonorAccount,
  mapDonorRow,
} from '../services/donorService';
import {
  createBloodRequestRecord,
  updateBloodRequestStatusInFirestore,
  verifyBloodRequestInFirestore,
  mapBloodRequestRow,
} from '../services/bloodRequestService';
import {
  sendDonorContactRequest,
  respondToDonorRequest,
} from '../services/donorRequestService';
import {
  recordDonationInFirestore,
  updateDonationInSupabase,
  deleteDonationInFirestore,
} from '../services/donationService';
import {
  mapDonationSubmissionRow,
  getAllDonationSubmissionsFromSupabase,
  submitDonationReportInSupabase,
  updateDonationSubmissionInSupabase,
  cancelDonationSubmissionInSupabase,
  approveDonationSubmissionInSupabase,
  rejectDonationSubmissionInSupabase,
  requestDonationSubmissionInfoInSupabase,
  checkDuplicateDonation,
} from '../services/donationSubmissionService';
import { sendNotificationToSupabase } from '../services/notificationService';
import { recordAuditLog } from '../services/auditService';
import { generatePlatformBackup, resolveSelectiveRestore } from '../services/backupService';
import type { BackupCollectionKey, PlatformBackupPayload } from '../types/backup';

interface DataContextType {
  donors: Donor[];
  bloodRequests: BloodRequest[];
  donorRequests: DonorRequest[];
  donations: Donation[];
  donationSubmissions: DonationSubmission[];
  locations: LocationItem[];
  branches: Branch[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  hospitals: Hospital[];
  fundDonations: FundDonation[];
  paymentMethods: PaymentMethodConfig[];
  donationCauses: DonationCauseConfig[];
  fundDisbursements: FundDisbursement[];
  users: User[];
  bloodCamps: BloodCamp[];
  campRegistrations: CampRegistration[];
  donorBadges: DonorBadge[];
  permissionMatrix: RolePermissionMatrix;
  updateRolePermission: (role: UserRole, permission: PermissionKey, allowed: boolean) => Promise<void>;
  resetPermissionMatrix: () => void;
  hasPermission: (role: UserRole, permission: PermissionKey) => boolean;
  isLoading: boolean;
  createBloodRequest: (data: Omit<BloodRequest, 'id' | 'requestId' | 'createdAt' | 'status' | 'verification'>) => Promise<BloodRequest>;
  updateBloodRequestStatus: (id: string, status: BloodRequest['status']) => Promise<void>;
  verifyBloodRequest: (id: string, verifierName: string) => Promise<void>;
  deleteBloodRequest: (id: string) => Promise<void>;
  registerDonor: (data: Omit<Donor, 'id' | 'donorId' | 'createdAt' | 'updatedAt' | 'verificationStatus' | 'totalDonations'>) => Promise<Donor>;
  onboardDonor: (
    data: {
      fullName: string;
      phone: string;
      email?: string;
      bloodGroup: BloodGroup;
      gender?: 'male' | 'female' | 'other';
      dateOfBirth?: string;
      weight?: number;
      district: string;
      upazila: string;
      area: string;
      exactAddress?: string;
      lastDonationDate?: string;
      totalDonations?: number;
      availability?: boolean;
      emergencyAvailable?: boolean;
      adminNotes?: string;
      branchId?: string;
    },
    adminUser?: { id: string; fullName: string }
  ) => Promise<{ donor: Donor; user?: User; tempPassword: string }>;
  updateDonor: (id: string, data: Partial<Donor>) => Promise<void>;
  verifyDonor: (donorId: string, status: VerificationStatus, verifierName: string, notes?: string) => Promise<void>;
  deleteDonor: (donorId: string) => Promise<void>;
  sendDonorRequest: (bloodRequestId: string, donor: Donor, requesterUserId: string, matchScore: number) => Promise<DonorRequest>;
  respondDonorRequest: (requestId: string, status: 'accepted' | 'maybe' | 'declined', declineReason?: string) => Promise<void>;
  recordDonation: (donation: Omit<Donation, 'id'>) => Promise<Donation>;
  updateDonation: (id: string, data: Partial<Donation>) => Promise<void>;
  deleteDonation: (donationId: string) => Promise<void>;
  submitDonationReport: (
    data: Omit<
      DonationSubmission,
      'id' | 'status' | 'submittedAt' | 'createdAt' | 'updatedAt' | 'reviewedAt' | 'reviewedBy' | 'reviewNotes' | 'approvedDonationId'
    >
  ) => Promise<DonationSubmission>;
  updateDonationSubmission: (
    id: string,
    updates: Partial<Pick<DonationSubmission, 'donationDate' | 'hospital' | 'location' | 'campId' | 'bloodRequestId' | 'units' | 'donationType' | 'notes'>>
  ) => Promise<void>;
  cancelDonationSubmission: (id: string) => Promise<void>;
  approveDonationSubmission: (id: string, reviewNotes?: string) => Promise<{ success: boolean; donationId?: string }>;
  rejectDonationSubmission: (id: string, reason: string) => Promise<void>;
  requestDonationSubmissionInfo: (id: string, message: string) => Promise<void>;
  addBloodCamp: (camp: Omit<BloodCamp, 'id' | 'createdAt' | 'registeredCount'>) => Promise<BloodCamp>;
  updateBloodCamp: (id: string, data: Partial<BloodCamp>) => Promise<void>;
  deleteBloodCamp: (id: string) => Promise<void>;
  registerForCamp: (registration: Omit<CampRegistration, 'id' | 'createdAt' | 'status'>) => Promise<CampRegistration>;
  addLocation: (location: Omit<LocationItem, 'id'>) => Promise<LocationItem>;
  updateLocation: (id: string, data: Partial<LocationItem>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<Branch>;
  updateBranch: (id: string, data: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  addHospital: (hospital: Omit<Hospital, 'id'>) => Promise<Hospital>;
  updateHospital: (id: string, data: Partial<Hospital>) => Promise<void>;
  deleteHospital: (id: string) => Promise<void>;
  verifyHospital: (id: string) => Promise<void>;
  addFundDonation: (donation: Omit<FundDonation, 'id' | 'createdAt' | 'status'>) => Promise<FundDonation>;
  verifyFundDonation: (id: string, verifierName: string) => Promise<void>;
  rejectFundDonation: (id: string) => Promise<void>;
  addFundDisbursement: (disbursement: Omit<FundDisbursement, 'id'>) => Promise<FundDisbursement>;
  deleteFundDisbursement: (id: string) => Promise<void>;
  updatePaymentMethod: (id: string, data: Partial<PaymentMethodConfig>) => Promise<void>;
  addPaymentMethod: (method: Omit<PaymentMethodConfig, 'id'>) => Promise<PaymentMethodConfig>;
  deletePaymentMethod: (id: string) => Promise<void>;
  updateDonationCause: (id: string, data: Partial<DonationCauseConfig>) => Promise<void>;
  addDonationCause: (cause: Omit<DonationCauseConfig, 'id'>) => Promise<DonationCauseConfig>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  updateUser: (userId: string, data: Partial<User>) => Promise<void>;
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, password?: string) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  exportBackupData: () => string;
  importBackupData: (jsonStr: string) => { success: boolean; message: string };
  restoreSelectiveBackup?: (
    payload: any,
    selectedKeys: string[],
    strategy?: 'replace' | 'merge'
  ) => { success: boolean; message: string; restoredCounts: Record<string, number> };
  addAuditLog: (action: string, targetType: string, targetId: string, metadata?: Record<string, any>, user?: { id: string; name: string; role: UserRole }) => void;
  markNotificationRead: (id: string) => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'createdAt'>) => Promise<NotificationItem>;
  deleteNotification: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId?: string) => Promise<void>;
  resetDemoData: () => void;
  migrateLocalToFirestore: () => Promise<{ success: boolean; message: string }>;
  migrateLocalToSupabase?: () => Promise<{ success: boolean; message: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  DONORS: 'roktobondon_donors_v1',
  REQUESTS: 'roktobondon_requests_v1',
  DONOR_REQUESTS: 'roktobondon_donor_requests_v1',
  DONATIONS: 'roktobondon_donations_v1',
  DONATION_SUBMISSIONS: 'roktobondon_donation_submissions_v1',
  LOCATIONS: 'roktobondon_locations_v1',
  BRANCHES: 'roktobondon_branches_v1',
  NOTIFICATIONS: 'roktobondon_notifications_v1',
  AUDIT_LOGS: 'roktobondon_audit_logs_v1',
  HOSPITALS: 'roktobondon_hospitals_v1',
  FUND_DONATIONS: 'roktobondon_fund_donations_v1',
  PAYMENT_METHODS: 'roktobondon_payment_methods_v1',
  DONATION_CAUSES: 'roktobondon_donation_causes_v1',
  FUND_DISBURSEMENTS: 'roktobondon_fund_disbursements_v1',
  USERS: 'roktobondon_users_v1',
  BLOOD_CAMPS: 'roktobondon_blood_camps_v1',
  CAMP_REGISTRATIONS: 'roktobondon_camp_registrations_v1',
  PERMISSION_MATRIX: 'roktobondon_permission_matrix_v1',
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [donors, setDonors] = useState<Donor[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DONORS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [donorRequests, setDonorRequests] = useState<DonorRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DONOR_REQUESTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [donations, setDonations] = useState<Donation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DONATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [donationSubmissions, setDonationSubmissions] = useState<DonationSubmission[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DONATION_SUBMISSIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [locations, setLocations] = useState<LocationItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((n) => n.id !== 'notif-welcome');
          return filtered;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const defaultAudit = [
      {
        id: 'log-init',
        userId: 'system',
        userName: 'System Initialization',
        userRole: 'super_admin' as UserRole,
        action: 'System Bootstrapped',
        targetType: 'SYSTEM',
        targetId: 'GLOBAL',
        timestamp: new Date().toISOString(),
      },
    ];
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return defaultAudit;
  });

  const [hospitals, setHospitals] = useState<Hospital[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HOSPITALS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [fundDonations, setFundDonations] = useState<FundDonation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FUND_DONATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENT_METHODS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [donationCauses, setDonationCauses] = useState<DonationCauseConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DONATION_CAUSES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [fundDisbursements, setFundDisbursements] = useState<FundDisbursement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FUND_DISBURSEMENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [permissionMatrix, setPermissionMatrix] = useState<RolePermissionMatrix>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PERMISSION_MATRIX);
    if (saved) {
      try {
        return { ...DEFAULT_PERMISSION_MATRIX, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_PERMISSION_MATRIX;
  });

  const [bloodCamps, setBloodCamps] = useState<BloodCamp[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BLOOD_CAMPS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [campRegistrations, setCampRegistrations] = useState<CampRegistration[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CAMP_REGISTRATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const donorBadges = DONOR_BADGES_LIST;

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Synchronize with Supabase when in production mode or when configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let isMounted = true;
    const loadSupabaseData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch donors
        const { data: donorsData } = await supabase.from('donors').select('*');
        if (donorsData && isMounted) {
          setDonors(donorsData.map(mapDonorRow));
        }

        // 2. Fetch blood requests
        const { data: reqsData } = await supabase
          .from('blood_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (reqsData && isMounted) {
          setBloodRequests(reqsData.map(mapBloodRequestRow));
        }

        // 3. Fetch donor requests
        const { data: dreqsData } = await supabase.from('donor_requests').select('*');
        if (dreqsData && isMounted) {
          setDonorRequests(
            dreqsData.map((row) => ({
              id: row.id,
              bloodRequestId: row.blood_request_id,
              donorId: row.donor_id,
              donorUserId: row.donor_user_id,
              requesterUserId: row.requester_user_id,
              status: row.status,
              declineReason: row.decline_reason,
              matchScore: Number(row.match_score) || 85,
              patientName: row.patient_name,
              hospital: row.hospital,
              bloodGroup: row.blood_group,
              emergencyLevel: row.emergency_level,
              respondedAt: row.responded_at,
              createdAt: row.created_at,
            }))
          );
        }

        // 4. Fetch donations
        const { data: donData } = await supabase.from('donations').select('*');
        if (donData && isMounted) {
          setDonations(
            donData.map((row) => ({
              id: row.id,
              donorId: row.donor_id,
              donorUserId: row.donor_user_id,
              donorName: row.donor_name,
              bloodGroup: row.blood_group,
              requestId: row.request_id,
              donationDate: row.donation_date,
              hospital: row.hospital,
              units: row.units || 1,
              donationType: row.donation_type || 'Whole Blood',
              verifiedBy: row.verified_by,
              verificationDate: row.verification_date || row.created_at,
              notes: row.notes,
            }))
          );
        }

        // 5. Fetch hospitals
        const { data: hospData } = await supabase.from('hospitals').select('*');
        if (hospData && hospData.length > 0 && isMounted) {
          setHospitals(
            hospData.map((row) => ({
              id: row.id,
              nameBn: row.name_bn,
              nameEn: row.name_en,
              category: row.category,
              district: row.district,
              upazila: row.upazila,
              address: row.address,
              hotline: row.hotline,
              emergencyPhone: row.emergency_phone,
              ambulancePhone: row.ambulance_phone,
              hasBloodBank: Boolean(row.has_blood_bank),
              hasICU: Boolean(row.has_icu),
              isOpen24Hours: Boolean(row.is_open_24_hours),
              mapUrl: row.map_url,
              notes: row.notes,
              isCommunityAdded: Boolean(row.is_community_added),
              verificationStatus: row.verification_status || 'verified',
              addedBy: row.added_by,
            }))
          );
        }

        // 6. Fetch fund donations
        const { data: fndData } = await supabase.from('fund_donations').select('*');
        if (fndData && isMounted) {
          setFundDonations(
            fndData.map((row) => ({
              id: row.id,
              donorName: row.donor_name,
              donorPhone: row.donor_phone,
              donorEmail: row.donor_email,
              amount: Number(row.amount),
              paymentMethod: row.payment_method,
              transactionId: row.transaction_id,
              accountNumber: row.account_number,
              fundCause: row.fund_cause,
              area: row.area,
              message: row.message,
              isAnonymous: Boolean(row.is_anonymous),
              status: row.status,
              verifiedBy: row.verified_by,
              verifiedAt: row.verified_at,
              organizationId: row.organization_id,
              createdAt: row.created_at,
            }))
          );
        }

        // 7. Fetch payment methods
        const { data: payData } = await supabase.from('payment_methods').select('*');
        if (payData && payData.length > 0 && isMounted) {
          setPaymentMethods(
            payData.map((row) => ({
              id: row.id,
              name: row.name,
              nameBn: row.name_bn,
              type: row.type,
              accountNumber: row.account_number,
              accountType: row.account_type || 'personal',
              instructionsBn: row.instructions_bn || '',
              qrCodeUrl: row.qr_code_url,
              isActive: Boolean(row.is_active),
            }))
          );
        }

        // 8. Fetch users
        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData && usersData.length > 0 && isMounted) {
          setUsers(
            usersData.map((row) => ({
              id: row.id,
              fullName: row.full_name,
              phone: row.phone,
              email: row.email,
              role: row.role,
              organizationId: row.organization_id || 'org-roktobondon',
              branchId: row.branch_id,
              photoUrl: row.photo_url,
              status: row.status,
              phoneVerified: Boolean(row.phone_verified),
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              lastLoginAt: row.last_login_at,
            }))
          );
        }

        // 9. Fetch branches
        const { data: branchesData } = await supabase.from('branches').select('*');
        if (branchesData && branchesData.length > 0 && isMounted) {
          setBranches(
            branchesData.map((row) => ({
              id: row.id,
              name: row.name,
              nameBn: row.name_bn,
              district: row.district,
              upazila: row.upazila,
              coordinatorName: row.coordinator_name || '',
              coordinatorPhone: row.coordinator_phone || '',
              isActive: Boolean(row.is_active),
            }))
          );
        }

        // 10. Fetch notifications
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });
        if (notifData && notifData.length > 0 && isMounted) {
          setNotifications(
            notifData.map((row) => ({
              id: row.id,
              userId: row.user_id,
              title: row.title,
              message: row.message,
              type: row.type || 'system',
              link: row.link || undefined,
              isRead: Boolean(row.is_read),
              createdAt: row.created_at || new Date().toISOString(),
            }))
          );
        }

        // 11. Fetch donation submissions
        const { data: subData } = await supabase
          .from('donation_submissions')
          .select('*')
          .order('submitted_at', { ascending: false });
        if (subData && subData.length > 0 && isMounted) {
          setDonationSubmissions(subData.map(mapDonationSubmissionRow));
        }
      } catch (err) {
        console.warn('Supabase initial synchronization notice:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSupabaseData();

    // Setup real-time listener for notifications
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as any;
            const newNotif: NotificationItem = {
              id: row.id,
              userId: row.user_id,
              title: row.title,
              message: row.message,
              type: row.type || 'system',
              link: row.link || undefined,
              isRead: Boolean(row.is_read),
              createdAt: row.created_at || new Date().toISOString(),
            };
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            setNotifications((prev) =>
              prev.map((n) => (n.id === row.id ? { ...n, isRead: Boolean(row.is_read) } : n))
            );
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as any;
            if (row?.id) {
              setNotifications((prev) => prev.filter((n) => n.id !== row.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync to localStorage for instant local caching and fast reloads
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DONORS, JSON.stringify(donors));
  }, [donors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(bloodRequests));
  }, [bloodRequests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DONOR_REQUESTS, JSON.stringify(donorRequests));
  }, [donorRequests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(donations));
  }, [donations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DONATION_SUBMISSIONS, JSON.stringify(donationSubmissions));
  }, [donationSubmissions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(hospitals));
  }, [hospitals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FUND_DONATIONS, JSON.stringify(fundDonations));
  }, [fundDonations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(paymentMethods));
  }, [paymentMethods]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DONATION_CAUSES, JSON.stringify(donationCauses));
  }, [donationCauses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FUND_DISBURSEMENTS, JSON.stringify(fundDisbursements));
  }, [fundDisbursements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PERMISSION_MATRIX, JSON.stringify(permissionMatrix));
  }, [permissionMatrix]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BLOOD_CAMPS, JSON.stringify(bloodCamps));
  }, [bloodCamps]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CAMP_REGISTRATIONS, JSON.stringify(campRegistrations));
  }, [campRegistrations]);

  const addAuditLog = useCallback(
    (
      action: string,
      targetType: string,
      targetId: string,
      metadata?: Record<string, any>,
      user?: { id: string; name: string; role: UserRole }
    ) => {
      const newLog: AuditLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: user?.id || 'system',
        userName: user?.name || 'অজ্ঞাত ব্যবহারকারী',
        userRole: user?.role || 'volunteer',
        action,
        targetType,
        targetId,
        metadata,
        timestamp: new Date().toISOString(),
      };
      setAuditLogs((prev) => [newLog, ...prev.slice(0, 99)]);
      if (isSupabaseConfigured && !isDemoMode) {
        recordAuditLog(action, targetType, targetId, metadata, user).catch(() => {});
      }
    },
    []
  );

  const createBloodRequest = async (
    data: Omit<BloodRequest, 'id' | 'requestId' | 'createdAt' | 'status' | 'verification'>
  ): Promise<BloodRequest> => {
    setIsLoading(true);
    try {
      let newReq: BloodRequest;
      if (isSupabaseConfigured && !isDemoMode) {
        newReq = await createBloodRequestRecord(data);
      } else {
        const id = `req-${Date.now()}`;
        const requestId = generateBloodRequestId(bloodRequests.length + 101);
        newReq = {
          ...data,
          id,
          requestId,
          status: 'active',
          verification: {
            isVerified: false,
          },
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
        };

        if (isSupabaseConfigured && supabase) {
          try {
            await createBloodRequestRecord(data);
          } catch (err) {
            console.warn('Supabase fallback', err);
          }
        }
      }

      setBloodRequests((prev) => [newReq, ...prev]);

      // Add notification
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          userId: 'all',
          title: `নতুন রক্তের আবেদন: ${newReq.bloodGroup}`,
          message: `${newReq.hospital}-এ ${newReq.patientName}-এর জন্য ${newReq.bloodGroup} রক্ত প্রয়োজন।`,
          type: 'request',
          link: `/request/${newReq.id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      addAuditLog('Blood Request Created', 'BloodRequest', newReq.id, {
        requestId: newReq.requestId,
        bloodGroup: newReq.bloodGroup,
      });
      return newReq;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBloodRequestStatus = async (id: string, status: BloodRequest['status']) => {
    setBloodRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    if (isSupabaseConfigured) {
      await updateBloodRequestStatusInFirestore(id, status);
    }
    addAuditLog('Request Status Updated', 'BloodRequest', id, { newStatus: status });
  };

  const verifyBloodRequest = async (id: string, verifierName: string) => {
    setBloodRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              verification: {
                isVerified: true,
                verifiedBy: verifierName,
                verifiedAt: new Date().toISOString(),
              },
            }
          : r
      )
    );
    if (isSupabaseConfigured) {
      await verifyBloodRequestInFirestore(id, verifierName);
    }
    addAuditLog('Request Verified', 'BloodRequest', id, { verifierName });
  };

  const deleteBloodRequest = async (id: string) => {
    setBloodRequests((prev) => prev.filter((r) => r.id !== id));
    addAuditLog('Blood Request Deleted', 'BloodRequest', id, {});
  };

  const registerDonor = async (
    data: Omit<Donor, 'id' | 'donorId' | 'createdAt' | 'updatedAt' | 'verificationStatus' | 'totalDonations'>
  ): Promise<Donor> => {
    setIsLoading(true);
    try {
      const id = `donor-${Date.now()}`;
      const locationCode = getLocationCode(data.upazila, data.district);
      const donorId = generateDonorId(locationCode, donors.length + 101);

      const publicData: DonorPublic = {
        id,
        donorId,
        fullName: data.fullName,
        photoUrl: data.photoUrl,
        bloodGroup: data.bloodGroup,
        division: data.division,
        districtId: data.districtId,
        district: data.district,
        upazilaId: data.upazilaId,
        upazila: data.upazila,
        areaId: data.areaId,
        area: data.area,
        locationLabel: data.locationLabel,
        availability: Boolean(data.availability),
        emergencyAvailable: Boolean(data.emergencyAvailable),
        lastDonationDate: data.lastDonationDate,
        firstDonationDate: data.firstDonationDate,
        totalDonations: data.lastDonationDate ? 1 : 0,
        verificationStatus: 'pending',
        organizationId: data.organizationId || 'org-roktobondon',
        branchId: data.branchId || 'br-dhm',
        createdAt: new Date().toISOString(),
      };

      const privateData: DonorPrivate = {
        donorId,
        userId: data.userId || id,
        phone: data.phone,
        email: data.email,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        exactAddress: data.exactAddress || '',
        emergencyContact: data.emergencyContact || '',
        adminNotes: data.adminNotes || '',
        nidOrIdNumber: data.nidOrIdNumber || '',
        privacy: data.privacy || {
          showPhone: false,
          showGender: false,
          showAge: false,
          allowDirectContact: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let newDonor: Donor;
      if (isSupabaseConfigured && !isDemoMode) {
        newDonor = await createDonorRecord(publicData, privateData);
      } else {
        newDonor = {
          ...publicData,
          ...privateData,
          updatedAt: new Date().toISOString(),
        };
        if (isSupabaseConfigured && supabase) {
          try {
            await createDonorRecord(publicData, privateData);
          } catch (e) {
            console.warn('Supabase donor fallback', e);
          }
        }
      }

      setDonors((prev) => [newDonor, ...prev]);

      // Generate notifications (for donor: Pending; for active reviewers: New Donor Awaiting Verification)
      const nowIso = new Date().toISOString();
      const donorNotif: NotificationItem = {
        id: `notif-${Date.now()}-donor`,
        userId: newDonor.userId || newDonor.id,
        title: 'রক্তদাতা প্রোফাইল যাচাইকরণ প্রক্রিয়াধীন',
        message: 'আপনার রক্তদাতা প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে। কালামপুর রক্ত দান পরিবারের তথ্য যাচাইয়ের পর আপনার প্রোফাইলটি সক্রিয় ও পাবলিক তালিকায় প্রদর্শিত হবে।',
        type: 'verification',
        link: '/profile',
        isRead: false,
        createdAt: nowIso,
      };

      const reviewerNotifs: NotificationItem[] = users
        .filter(
          (u) =>
            ['super_admin', 'admin', 'moderator'].includes(u.role) &&
            u.status === 'active' &&
            u.id !== newDonor.userId
        )
        .map((u, idx) => ({
          id: `notif-${Date.now()}-rev-${idx}`,
          userId: u.id,
          title: 'নতুন রক্তদাতা যাচাইয়ের জন্য অপেক্ষমাণ',
          message: `নতুন রক্তদাতা ${newDonor.fullName || 'নামহীন'} (আইডি: ${newDonor.donorId}) নিবন্ধিত হয়েছেন। অনুগ্রহ করে প্রোফাইলটি যাচাই করুন।`,
          type: 'verification',
          link: '/admin?tab=donors&subtab=pending',
          isRead: false,
          createdAt: nowIso,
        }));

      setNotifications((prev) => [donorNotif, ...reviewerNotifs, ...prev]);

      if (isSupabaseConfigured && donorNotif.userId) {
        sendNotificationToSupabase(donorNotif).catch((e) => {
          console.warn('Could not persist donor registration notification', e);
        });
      }

      addAuditLog('Donor Registered', 'Donor', id, { donorId, bloodGroup: newDonor.bloodGroup });
      return newDonor;
    } finally {
      setIsLoading(false);
    }
  };

  const onboardDonor = async (
    data: {
      fullName: string;
      phone: string;
      email?: string;
      bloodGroup: BloodGroup;
      gender?: 'male' | 'female' | 'other';
      dateOfBirth?: string;
      weight?: number;
      district: string;
      upazila: string;
      area: string;
      exactAddress?: string;
      lastDonationDate?: string;
      totalDonations?: number;
      availability?: boolean;
      emergencyAvailable?: boolean;
      adminNotes?: string;
      branchId?: string;
    },
    adminUser?: { id: string; fullName: string }
  ): Promise<{ donor: Donor; user?: User; tempPassword: string }> => {
    setIsLoading(true);
    try {
      const cleanPhone = data.phone.trim();
      const cleanEmail =
        data.email?.trim().toLowerCase() || `${cleanPhone}@donor.roktobondhon.org`;
      const tempPassword = cleanPhone; // Phone number as the default password!

      // 1. Check if user already exists
      let activeUserId: string | undefined;
      const existingUser = users.find(
        (u) =>
          u.phone === cleanPhone ||
          (u.email && u.email.toLowerCase() === cleanEmail)
      );

      let createdUser: User | undefined;
      if (existingUser) {
        activeUserId = existingUser.id;
      } else {
        try {
          createdUser = await addUser(
            {
              fullName: data.fullName.trim(),
              phone: cleanPhone,
              email: cleanEmail,
              role: 'donor',
              branchId:
                data.branchId ||
                (data.district === 'Manikganj'
                  ? 'br-mnk'
                  : data.upazila === 'Dhamrai'
                  ? 'br-dhm'
                  : 'br-svr'),
              organizationId: 'org-roktobondon',
              status: 'active',
            },
            tempPassword
          );
          activeUserId = createdUser.id;
        } catch (authErr) {
          console.warn('[onboardDonor] User account creation fallback:', authErr);
        }
      }

      // 2. Generate Donor ID & composite data
      const id = `donor-${Date.now()}`;
      const locationCode = getLocationCode(data.upazila, data.district);
      const donorId = generateDonorId(locationCode, donors.length + 101);
      const branchId =
        data.branchId ||
        (data.district === 'Manikganj'
          ? 'br-mnk'
          : data.upazila === 'Dhamrai'
          ? 'br-dhm'
          : 'br-svr');

      const publicData: DonorPublic = {
        id,
        donorId,
        fullName: data.fullName.trim(),
        bloodGroup: data.bloodGroup,
        division: 'Dhaka',
        district: data.district,
        upazila: data.upazila,
        area: data.area,
        availability: data.availability ?? true,
        emergencyAvailable: Boolean(data.emergencyAvailable),
        lastDonationDate: data.lastDonationDate || undefined,
        totalDonations:
          data.totalDonations !== undefined && data.totalDonations !== null
            ? Number(data.totalDonations)
            : data.lastDonationDate
            ? 1
            : 0,
        verificationStatus: 'verified', // Directly verified by Admin/Staff!
        organizationId: 'org-roktobondon',
        branchId,
        createdAt: new Date().toISOString(),
      };

      const privateData: DonorPrivate = {
        donorId,
        userId: activeUserId || id,
        phone: cleanPhone,
        email: cleanEmail,
        gender: data.gender || 'male',
        dateOfBirth: data.dateOfBirth,
        exactAddress: data.exactAddress || '',
        adminNotes: data.adminNotes || `Onboarded by ${adminUser?.fullName || 'Admin'}`,
        privacy: {
          showPhone: false,
          showGender: false,
          showAge: false,
          allowDirectContact: true,
        },
        verifiedBy: adminUser?.fullName || 'এডমিন',
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let newDonor: Donor;
      if (isSupabaseConfigured && !isDemoMode) {
        newDonor = await createDonorRecord(publicData, privateData);
      } else {
        newDonor = {
          ...publicData,
          ...privateData,
          updatedAt: new Date().toISOString(),
        };
        if (isSupabaseConfigured && supabase) {
          try {
            await createDonorRecord(publicData, privateData);
          } catch (e) {
            console.warn('Supabase donor onboarding fallback', e);
          }
        }
      }

      setDonors((prev) => [newDonor, ...prev]);

      addAuditLog(
        `এডমিন (${adminUser?.fullName || 'Admin'}) কর্তৃক রক্তদাতা অনবোর্ড সম্পন্ন: ${newDonor.fullName} (${newDonor.donorId}), প্রাথমিক পাসওয়ার্ড: মোবাইল নম্বর`,
        'DONOR',
        newDonor.id,
        { donorId: newDonor.donorId, phone: cleanPhone, bloodGroup: newDonor.bloodGroup }
      );

      return { donor: newDonor, user: existingUser || createdUser, tempPassword };
    } finally {
      setIsLoading(false);
    }
  };

  const updateDonor = async (id: string, data: Partial<Donor>) => {
    setDonors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d))
    );

    if (isSupabaseConfigured) {
      await updateDonorRecord(id, data);
    }

    addAuditLog('Donor Profile Updated', 'Donor', id);
  };

  const verifyDonor = async (
    donorId: string,
    status: VerificationStatus,
    verifierName: string,
    notes?: string
  ) => {
    // 1. Client-side idempotency guard: avoid redundant mutation if already in target status
    const currentDonor = donors.find((d) => d.id === donorId || d.donorId === donorId);
    if (currentDonor && currentDonor.verificationStatus === status) {
      return;
    }

    try {
      // 2. Execute authoritative database verification
      const result = await verifyDonorStatus(donorId, status, verifierName, notes);

      // 3. Synchronize local state with authoritative database confirmation
      setDonors((prev) =>
        prev.map((d) =>
          d.id === donorId || d.donorId === donorId || d.id === result.donorId
            ? {
                ...d,
                verificationStatus: result.status,
                verifiedBy: result.verifiedBy,
                verifiedAt: result.verifiedAt,
                adminNotes: notes || d.adminNotes,
                updatedAt: result.verifiedAt || new Date().toISOString(),
              }
            : d
        )
      );

      // 4. Generate notification for donor outcome
      let notifTitle = '';
      let notifMsg = '';
      if (status === 'verified') {
        notifTitle = 'অভিনন্দন! আপনার রক্তদাতা প্রোফাইল ভেরিফাইড হয়েছে';
        notifMsg = 'কালামপুর রক্ত দান পরিবার আপনার রক্তদাতা প্রোফাইলটি সফলভাবে যাচাই ও ভেরিফাইড করেছে। এখন থেকে আপনি সরাসরি জরুরি রক্তদানের অনুরোধ পাবেন।';
      } else if (status === 'rejected') {
        notifTitle = 'রক্তদাতা প্রোফাইল আবেদন স্থগিত বা প্রত্যাখ্যাত';
        notifMsg = notes
          ? `তথ্য অমিল বা অসম্পূর্ণতার কারণে আপনার আবেদনটি স্থগিত করা হয়েছে। কারণ: ${notes}`
          : 'তথ্য অমিল বা অসম্পূর্ণতার কারণে আপনার আবেদনটি গ্রহণ করা সম্ভব হয়নি।';
      } else if (status === 'suspended') {
        notifTitle = 'রক্তদাতা প্রোফাইল সাময়িকভাবে স্থগিত';
        notifMsg = notes
          ? `আপনার রক্তদাতা প্রোফাইলটি সাময়িকভাবে স্থগিত করা হয়েছে। কারণ: ${notes}`
          : 'আপনার রক্তদাতা প্রোফাইলটি সাময়িকভাবে স্থগিত করা হয়েছে।';
      } else {
        notifTitle = 'রক্তদাতা প্রোফাইল পুনর্যাচাই প্রক্রিয়াধীন';
        notifMsg = 'আপনার রক্তদাতা প্রোফাইলটি পুনরায় যাচাইকরণের জন্য অপেক্ষমান রাখা হয়েছে।';
      }

      const targetUserId = currentDonor?.userId || result.donorId;
      if (targetUserId) {
        const donorOutcomeNotif: NotificationItem = {
          id: `notif-${Date.now()}-outcome`,
          userId: targetUserId,
          title: notifTitle,
          message: notifMsg,
          type: 'verification',
          link: '/profile',
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => [donorOutcomeNotif, ...prev]);
      }

      addAuditLog(`Donor Verification: ${status}`, 'Donor', result.donorId, {
        verifierName: result.verifiedBy,
        notes,
        alreadyVerified: result.alreadyVerified,
      });
    } catch (err: any) {
      console.error('Error in verifyDonor:', err);
      throw err;
    }
  };

  const sendDonorRequest = async (
    bloodRequestId: string,
    donor: Donor,
    requesterUserId: string,
    matchScore: number
  ): Promise<DonorRequest> => {
    const existing = donorRequests.find(
      (r) => r.bloodRequestId === bloodRequestId && r.donorId === donor.id
    );
    if (existing) {
      return existing;
    }

    const bloodReq = bloodRequests.find((r) => r.id === bloodRequestId);
    let newRequest: DonorRequest;

    if (isSupabaseConfigured && !isDemoMode && bloodReq) {
      newRequest = await sendDonorContactRequest(bloodReq, donor, requesterUserId, matchScore);
    } else {
      newRequest = {
        id: `dreq-${Date.now()}`,
        bloodRequestId,
        donorId: donor.id,
        donorUserId: donor.userId,
        requesterUserId,
        status: 'pending',
        matchScore,
        patientName: bloodReq?.patientName || 'রোগী',
        hospital: bloodReq?.hospital || 'হাসপাতাল',
        bloodGroup: donor.bloodGroup,
        emergencyLevel: bloodReq?.emergencyLevel || 'NORMAL',
        createdAt: new Date().toISOString(),
      };
    }

    setDonorRequests((prev) => [newRequest, ...prev]);

    // Send notification to donor
    setNotifications((prev) => [
      {
        id: `notif-dreq-${Date.now()}`,
        userId: donor.userId,
        title: `জরুরি রক্তদানের অনুরোধ (${donor.bloodGroup})`,
        message: `${bloodReq?.hospital || 'হাসপাতাল'}-এ ${bloodReq?.patientName || 'রোগী'}-এর জন্য রক্তের প্রয়োজন।`,
        type: 'match',
        link: `/request/${bloodRequestId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    addAuditLog('Donor Contact Request Sent', 'DonorRequest', newRequest.id, {
      donorId: donor.id,
      bloodRequestId,
      matchScore,
    });

    return newRequest;
  };

  const respondDonorRequest = async (
    requestId: string,
    status: 'accepted' | 'maybe' | 'declined',
    declineReason?: string
  ) => {
    setDonorRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status,
              declineReason: status === 'declined' ? declineReason : undefined,
              respondedAt: new Date().toISOString(),
            }
          : r
      )
    );

    if (isSupabaseConfigured) {
      await respondToDonorRequest(requestId, status, declineReason);
    }

    addAuditLog(`Donor Response: ${status}`, 'DonorRequest', requestId, { status, declineReason });
  };

  const deleteDonor = async (donorId: string) => {
    try {
      const result = await deleteDonorAccount(donorId);
      setDonors((prev) => prev.filter((d) => d.id !== donorId && d.donorId !== donorId && d.id !== result.donorId));
      addAuditLog(result.isStaff ? 'Donor Profile Deleted' : 'Donor Account Deleted', 'Donor', donorId, {
        result,
      });
    } catch (err: any) {
      console.error('Error deleting donor:', err);
      throw err;
    }
  };

  const recordDonation = async (donationData: Omit<Donation, 'id'>): Promise<Donation> => {
    let newDonation: Donation;
    if (isSupabaseConfigured && !isDemoMode) {
      newDonation = await recordDonationInFirestore(donationData);
    } else {
      const id = `don-${Date.now()}`;
      newDonation = { ...donationData, id };
      if (isSupabaseConfigured && supabase) {
        try {
          await recordDonationInFirestore(donationData);
        } catch (e) {
          console.warn('Supabase donation fallback', e);
        }
      }
    }

    setDonations((prev) => [newDonation, ...prev]);

    // Update donor's totalDonations and lastDonationDate
    setDonors((prev) =>
      prev.map((d) => {
        if (
          d.donorId === donationData.donorId ||
          (donationData.donorUserId && d.userId === donationData.donorUserId) ||
          d.id === donationData.donorId
        ) {
          const currentLast = d.lastDonationDate;
          const newDate = donationData.donationDate;
          let latestDate = currentLast;
          if (newDate) {
            latestDate = currentLast && currentLast > newDate ? currentLast : newDate;
          }

          return {
            ...d,
            totalDonations: (d.totalDonations || 0) + 1,
            lastDonationDate: latestDate,
            availability: false,
            updatedAt: new Date().toISOString(),
          };
        }
        return d;
      })
    );

    // Send notification to donor if user_id is present (not NULL)
    if (donationData.donorUserId) {
      const donorNotif: NotificationItem = {
        id: `notif-don-${Date.now()}`,
        userId: donationData.donorUserId,
        title: 'রক্তদানের তথ্য সংরক্ষণ করা হয়েছে',
        message: `আপনার রক্তদানের তথ্য (${donationData.bloodGroup}, তারিখ: ${donationData.donationDate || 'উল্লেখ নেই'}) রক্ত দান পরিবার কালামপুর সিস্টেমে সংরক্ষিত হয়েছে। আপনাকে অসংখ্য ধন্যবাদ!`,
        type: 'donation',
        link: '/profile',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [donorNotif, ...prev]);
      if (isSupabaseConfigured) {
        sendNotificationToSupabase(donorNotif).catch((e) => console.warn('Could not send donation notif', e));
      }
    }

    // If associated blood request exists, fulfill it
    if (donationData.requestId || donationData.bloodRequestId) {
      const reqId = donationData.bloodRequestId || donationData.requestId;
      setBloodRequests((prev) =>
        prev.map((r) =>
          r.requestId === reqId || r.id === reqId
            ? { ...r, status: 'fulfilled' }
            : r
        )
      );
      if (isSupabaseConfigured && reqId) {
        updateBloodRequestStatusInFirestore(reqId, 'fulfilled').catch(() => {});
      }
    }

    addAuditLog('DONATION_CREATED', 'Donation', newDonation.id, {
      donorId: donationData.donorId,
      units: donationData.units,
      hospital: donationData.hospital,
      donationDate: donationData.donationDate,
    });

    return newDonation;
  };

  const updateDonation = async (donationId: string, updates: Partial<Donation>) => {
    if (isSupabaseConfigured) {
      await updateDonationInSupabase(donationId, updates);
    }

    setDonations((prev) =>
      prev.map((d) => (d.id === donationId ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d))
    );

    addAuditLog('DONATION_UPDATED', 'Donation', donationId, updates);
  };

  const deleteDonation = async (donationId: string) => {
    const targetDonation = donations.find((d) => d.id === donationId);
    if (isSupabaseConfigured) {
      await deleteDonationInFirestore(donationId);
    }
    setDonations((prev) => prev.filter((d) => d.id !== donationId));

    if (targetDonation) {
      // Re-calculate donor totalDonations and lastDonationDate from remaining donations
      setDonors((prev) =>
        prev.map((d) => {
          if (
            d.donorId === targetDonation.donorId ||
            (targetDonation.donorUserId && d.userId === targetDonation.donorUserId) ||
            d.id === targetDonation.donorId
          ) {
            const remaining = donations.filter(
              (don) => don.id !== donationId && (don.donorId === d.donorId || (d.userId && don.donorUserId === d.userId))
            );
            const dates = remaining
              .map((r) => r.donationDate)
              .filter((dt): dt is string => Boolean(dt))
              .sort();

            const histBaseline = d.historicalDonationCount ?? (d.totalDonations ? Math.max(0, d.totalDonations - 1) : 0);

            return {
              ...d,
              totalDonations: histBaseline + remaining.length,
              lastDonationDate: dates.length > 0 ? dates[dates.length - 1] : d.lastDonationDate,
              updatedAt: new Date().toISOString(),
            };
          }
          return d;
        })
      );
    }

    addAuditLog('DONATION_DELETED', 'Donation', donationId, {
      donorId: targetDonation?.donorId,
    });
  };

  const submitDonationReport = async (
    data: Omit<
      DonationSubmission,
      'id' | 'status' | 'submittedAt' | 'createdAt' | 'updatedAt' | 'reviewedAt' | 'reviewedBy' | 'reviewNotes' | 'approvedDonationId'
    >
  ): Promise<DonationSubmission> => {
    // 1. Duplicate check against existing official donations and pending submissions
    const dupCheck = checkDuplicateDonation(
      data.donorId,
      data.donorUserId,
      data.donationDate,
      donations,
      donationSubmissions
    );
    if (dupCheck.isDuplicate) {
      throw new Error(dupCheck.reason || 'এই তারিখের জন্য রক্তদানের তথ্য ইতোমধ্যে বিদ্যমান।');
    }

    let newSubmission: DonationSubmission;
    if (isSupabaseConfigured && !isDemoMode) {
      try {
        newSubmission = await submitDonationReportInSupabase(data);
      } catch (err: any) {
        console.warn('Supabase submission error, falling back to local state:', err);
        const now = new Date().toISOString();
        const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`;
        newSubmission = {
          ...data,
          id,
          status: 'pending',
          submittedAt: now,
          createdAt: now,
          updatedAt: now,
        };
      }
    } else {
      const now = new Date().toISOString();
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`;
      newSubmission = {
        ...data,
        id,
        status: 'pending',
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      if (isSupabaseConfigured && supabase) {
        try {
          await submitDonationReportInSupabase(data);
        } catch (e) {
          console.warn('Supabase submission fallback', e);
        }
      }
    }

    setDonationSubmissions((prev) => [newSubmission, ...prev]);

    // Send confirmation notification to donor
    if (data.donorUserId) {
      const donorNotif: NotificationItem = {
        id: `notif-sub-${Date.now()}`,
        userId: data.donorUserId,
        title: 'রক্তদানের তথ্য জমা হয়েছে',
        message: 'আপনার রক্তদানের তথ্য যাচাইয়ের জন্য জমা হয়েছে। এডমিন/মডারেটরের অনুমোদনের পর এটি আপনার রক্তদান ইতিহাসে যুক্ত হবে।',
        type: 'donation',
        link: '/profile',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [donorNotif, ...prev]);
      if (isSupabaseConfigured) {
        sendNotificationToSupabase(donorNotif).catch((e) => console.warn('Could not send donor notif', e));
      }
    }

    // Notify all active reviewers (super_admin, admin, moderator)
    const reviewers = users.filter(
      (u) => ['super_admin', 'admin', 'moderator'].includes(u.role) && u.status === 'active'
    );
    reviewers.forEach((rev) => {
      const staffNotif: NotificationItem = {
        id: `notif-rev-${rev.id}-${Date.now()}`,
        userId: rev.id,
        title: 'নতুন রক্তদানের তথ্য যাচাইয়ের জন্য অপেক্ষমাণ',
        message: `রক্তদাতা "${data.donorName}" (${data.donorId}) নতুন রক্তদানের তথ্য (${data.bloodGroup}, তারিখ: ${data.donationDate}) জমা দিয়েছেন। যাচাই প্রয়োজন।`,
        type: 'donation',
        link: '/admin',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [staffNotif, ...prev]);
      if (isSupabaseConfigured) {
        sendNotificationToSupabase(staffNotif).catch((e) => console.warn('Could not send reviewer notif', e));
      }
    });

    addAuditLog('DONATION_SUBMITTED', 'DonationSubmission', newSubmission.id, {
      donorId: data.donorId,
      donationDate: data.donationDate,
      bloodGroup: data.bloodGroup,
    });

    return newSubmission;
  };

  const updateDonationSubmission = async (
    id: string,
    updates: Partial<Pick<DonationSubmission, 'donationDate' | 'hospital' | 'location' | 'campId' | 'bloodRequestId' | 'units' | 'donationType' | 'notes'>>
  ): Promise<void> => {
    if (isSupabaseConfigured) {
      try {
        await updateDonationSubmissionInSupabase(id, updates);
      } catch (e) {
        console.warn('Supabase update submission fallback', e);
      }
    }

    setDonationSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s))
    );

    addAuditLog('DONATION_SUBMISSION_UPDATED', 'DonationSubmission', id, updates);
  };

  const cancelDonationSubmission = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      try {
        await cancelDonationSubmissionInSupabase(id);
      } catch (e) {
        console.warn('Supabase cancel submission fallback', e);
      }
    }

    setDonationSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'cancelled', updatedAt: new Date().toISOString() } : s))
    );

    addAuditLog('DONATION_SUBMISSION_CANCELLED', 'DonationSubmission', id);
  };

  const approveDonationSubmission = async (
    id: string,
    reviewNotes?: string
  ): Promise<{ success: boolean; donationId?: string }> => {
    const target = donationSubmissions.find((s) => s.id === id);
    if (!target) {
      throw new Error('Donation submission not found');
    }

    let donationId: string | undefined;
    if (isSupabaseConfigured) {
      try {
        const res = await approveDonationSubmissionInSupabase(id, reviewNotes);
        donationId = res.donationId;
      } catch (e) {
        console.warn('Supabase approve submission fallback', e);
        donationId = `don-${Date.now()}`;
      }
    } else {
      donationId = `don-${Date.now()}`;
    }

    const approvedDonId = donationId || `don-${Date.now()}`;

    // 1. Create official donation record
    const officialDonation: Donation = {
      id: approvedDonId,
      donorId: target.donorId,
      donorUserId: target.donorUserId,
      donorName: target.donorName,
      bloodGroup: target.bloodGroup,
      donationDate: target.donationDate,
      hospital: target.hospital || 'ধামরাই রক্তদান কেন্দ্র',
      location: target.location || target.hospital || 'ধামরাই',
      campId: target.campId,
      bloodRequestId: target.bloodRequestId,
      units: target.units || 1,
      donationType: target.donationType || 'Whole Blood',
      source: 'donor_reported',
      verifiedBy: 'এডমিন',
      verificationDate: new Date().toISOString().split('T')[0],
      notes: target.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDonations((prev) => [officialDonation, ...prev]);

    // 2. Update submission status in state
    setDonationSubmissions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'approved',
              approvedDonationId: approvedDonId,
              reviewedBy: 'এডমিন',
              reviewedAt: new Date().toISOString(),
              reviewNotes: reviewNotes || undefined,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );

    // 3. Update donor totalDonations and lastDonationDate
    setDonors((prev) =>
      prev.map((d) => {
        if (
          d.donorId === target.donorId ||
          (target.donorUserId && d.userId === target.donorUserId) ||
          d.id === target.donorId
        ) {
          const currentLast = d.lastDonationDate;
          const newDate = target.donationDate;
          let latestDate = currentLast;
          if (newDate) {
            latestDate = currentLast && currentLast > newDate ? currentLast : newDate;
          }

          return {
            ...d,
            totalDonations: (d.totalDonations || 0) + 1,
            lastDonationDate: latestDate,
            availability: false,
            updatedAt: new Date().toISOString(),
          };
        }
        return d;
      })
    );

    // 4. Send notification to donor
    if (target.donorUserId) {
      const donorNotif: NotificationItem = {
        id: `notif-appr-${Date.now()}`,
        userId: target.donorUserId,
        title: 'আপনার রক্তদানের তথ্য অনুমোদিত হয়েছে',
        message: `আপনার জমা দেওয়া রক্তদানের তথ্য (${target.bloodGroup}, তারিখ: ${target.donationDate}) সফলভাবে যাচাই ও সিস্টেমে সংরক্ষণ করা হয়েছে। ধন্যবাদ!`,
        type: 'donation',
        link: '/profile',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [donorNotif, ...prev]);
      if (isSupabaseConfigured) {
        sendNotificationToSupabase(donorNotif).catch((e) => console.warn('Could not send approval notif', e));
      }
    }

    addAuditLog('DONATION_SUBMISSION_APPROVED', 'DonationSubmission', id, {
      donorId: target.donorId,
      donationId: approvedDonId,
      donationDate: target.donationDate,
      reviewNotes,
    });
    addAuditLog('DONATION_CREATED', 'Donation', approvedDonId, {
      source: 'donor_reported',
      donorId: target.donorId,
      donationDate: target.donationDate,
    });

    return { success: true, donationId: approvedDonId };
  };

  const rejectDonationSubmission = async (id: string, reason: string): Promise<void> => {
    const target = donationSubmissions.find((s) => s.id === id);
    if (!target) {
      throw new Error('Donation submission not found');
    }

    if (isSupabaseConfigured) {
      try {
        await rejectDonationSubmissionInSupabase(id, reason);
      } catch (e) {
        console.warn('Supabase reject submission fallback', e);
      }
    }

    setDonationSubmissions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'rejected',
              reviewedBy: 'এডমিন',
              reviewedAt: new Date().toISOString(),
              reviewNotes: reason,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );

    if (target.donorUserId) {
      const donorNotif: NotificationItem = {
        id: `notif-rej-${Date.now()}`,
        userId: target.donorUserId,
        title: 'রক্তদানের তথ্য যাচাই করা যায়নি',
        message: `আপনার জমা দেওয়া রক্তদানের তথ্য (${target.donationDate}) অনুমোদিত হয়নি। কারণ: ${reason}`,
        type: 'donation',
        link: '/profile',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [donorNotif, ...prev]);
      if (isSupabaseConfigured) {
        sendNotificationToSupabase(donorNotif).catch((e) => console.warn('Could not send rejection notif', e));
      }
    }

    addAuditLog('DONATION_SUBMISSION_REJECTED', 'DonationSubmission', id, {
      donorId: target.donorId,
      reason,
    });
  };

  const requestDonationSubmissionInfo = async (id: string, message: string): Promise<void> => {
    const target = donationSubmissions.find((s) => s.id === id);
    if (!target) {
      throw new Error('Donation submission not found');
    }

    if (isSupabaseConfigured) {
      try {
        await requestDonationSubmissionInfoInSupabase(id, message);
      } catch (e) {
        console.warn('Supabase request info fallback', e);
      }
    }

    setDonationSubmissions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'needs_info',
              reviewedBy: 'এডমিন',
              reviewedAt: new Date().toISOString(),
              reviewNotes: message,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );

    if (target.donorUserId) {
      const donorNotif: NotificationItem = {
        id: `notif-ninfo-${Date.now()}`,
        userId: target.donorUserId,
        title: 'রক্তদানের তথ্য সম্পর্কে অতিরিক্ত তথ্য প্রয়োজন',
        message: `আপনার রক্তদানের তথ্য যাচাইয়ের জন্য কিছু অতিরিক্ত তথ্য প্রয়োজন: ${message}। অনুগ্রহ করে প্রোফাইল থেকে আপডেট করুন।`,
        type: 'donation',
        link: '/profile',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [donorNotif, ...prev]);
      if (isSupabaseConfigured) {
        sendNotificationToSupabase(donorNotif).catch((e) => console.warn('Could not send needs_info notif', e));
      }
    }

    addAuditLog('DONATION_SUBMISSION_NEEDS_INFO', 'DonationSubmission', id, {
      donorId: target.donorId,
      message,
    });
  };

  const addLocation = async (locationData: Omit<LocationItem, 'id'>): Promise<LocationItem> => {
    const id = `loc-${Date.now()}`;
    const newLoc: LocationItem = { ...locationData, id };
    setLocations((prev) => [...prev, newLoc]);
    addAuditLog('Location Added', 'Location', id, { upazila: newLoc.upazila });
    return newLoc;
  };

  const updateLocation = async (id: string, data: Partial<LocationItem>): Promise<void> => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, ...data } : loc))
    );
    addAuditLog('Location Updated', 'Location', id, data);
  };

  const deleteLocation = async (id: string): Promise<void> => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
    addAuditLog('Location Deleted', 'Location', id);
  };

  const addBranch = async (branchData: Omit<Branch, 'id'>): Promise<Branch> => {
    const id = `br-${Date.now()}`;
    const newBranch: Branch = { ...branchData, id };
    setBranches((prev) => [...prev, newBranch]);
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('branches').insert({
          id: newBranch.id,
          name: newBranch.name,
          name_bn: newBranch.nameBn,
          district: newBranch.district,
          upazila: newBranch.upazila,
          coordinator_name: newBranch.coordinatorName || null,
          coordinator_phone: newBranch.coordinatorPhone || null,
          is_active: newBranch.isActive,
          organization_id: 'org-roktobondon',
          created_at: new Date().toISOString(),
        });
        if (error) console.error('[DataContext] Error inserting branch:', error);
      } catch (err) {
        console.error('[DataContext] Exception inserting branch:', err);
      }
    }
    addAuditLog('Branch Created', 'Branch', id, { nameBn: newBranch.nameBn });
    return newBranch;
  };

  const updateBranch = async (id: string, data: Partial<Branch>): Promise<void> => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...data } : b))
    );
    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: Record<string, any> = {};
        if (data.name !== undefined) dbUpdates.name = data.name;
        if (data.nameBn !== undefined) dbUpdates.name_bn = data.nameBn;
        if (data.district !== undefined) dbUpdates.district = data.district;
        if (data.upazila !== undefined) dbUpdates.upazila = data.upazila;
        if (data.coordinatorName !== undefined) dbUpdates.coordinator_name = data.coordinatorName;
        if (data.coordinatorPhone !== undefined) dbUpdates.coordinator_phone = data.coordinatorPhone;
        if (data.isActive !== undefined) dbUpdates.is_active = data.isActive;

        const { error } = await supabase.from('branches').update(dbUpdates).eq('id', id);
        if (error) console.error('[DataContext] Error updating branch in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception updating branch:', err);
      }
    }
    addAuditLog('Branch Updated', 'Branch', id, data);
  };

  const deleteBranch = async (id: string): Promise<void> => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('branches').delete().eq('id', id);
        if (error) console.error('[DataContext] Error deleting branch in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception deleting branch:', err);
      }
    }
    addAuditLog('Branch Deleted', 'Branch', id);
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      } catch (err) {
        console.error('[DataContext] Exception updating notification:', err);
      }
    }
  };

  const addNotification = async (
    notificationData: Omit<NotificationItem, 'id' | 'createdAt'>
  ): Promise<NotificationItem> => {
    const id = `notif-${Date.now()}`;
    const newNotif: NotificationItem = {
      ...notificationData,
      id,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('notifications').insert({
          id: newNotif.id,
          user_id: newNotif.userId,
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type,
          link: newNotif.link || null,
          is_read: newNotif.isRead,
          created_at: newNotif.createdAt,
        });
        if (error) console.error('[DataContext] Error inserting notification:', error);
      } catch (err) {
        console.error('[DataContext] Exception inserting notification:', err);
      }
    }
    addAuditLog(`নোটিফিকেশন পাঠানো হয়েছে: ${newNotif.title}`, 'NOTIFICATION', newNotif.id, {
      userId: newNotif.userId,
      type: newNotif.type,
    });
    return newNotif;
  };

  const deleteNotification = async (id: string): Promise<void> => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('notifications').delete().eq('id', id);
      } catch (err) {
        console.error('[DataContext] Exception deleting notification:', err);
      }
    }
    addAuditLog('নোটিফিকেশন মুছে ফেলা হয়েছে', 'NOTIFICATION', id);
  };

  const markAllNotificationsRead = async (userId?: string): Promise<void> => {
    setNotifications((prev) =>
      prev.map((n) =>
        !userId || n.userId === userId || n.userId === 'all'
          ? { ...n, isRead: true }
          : n
      )
    );
    if (isSupabaseConfigured && supabase) {
      try {
        if (userId) {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('user_id', [userId, 'all']);
        } else {
          await supabase
            .from('notifications')
            .update({ is_read: true });
        }
      } catch (err) {
        console.error('[DataContext] Exception marking all notifications read:', err);
      }
    }
  };

  const addHospital = async (hospitalData: Omit<Hospital, 'id'>): Promise<Hospital> => {
    const id = `hosp-custom-${Date.now()}`;
    const newHospital: Hospital = {
      ...hospitalData,
      id,
    };
    setHospitals((prev) => [newHospital, ...prev]);
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('hospitals').insert({
          id: newHospital.id,
          name_bn: newHospital.nameBn,
          name_en: newHospital.nameEn,
          category: newHospital.category,
          district: newHospital.district,
          upazila: newHospital.upazila,
          address: newHospital.address,
          hotline: newHospital.hotline,
          emergency_phone: newHospital.emergencyPhone || null,
          ambulance_phone: newHospital.ambulancePhone || null,
          has_blood_bank: newHospital.hasBloodBank,
          has_icu: newHospital.hasICU,
          is_open_24_hours: newHospital.isOpen24Hours,
          map_url: newHospital.mapUrl || null,
          notes: newHospital.notes || null,
          is_community_added: newHospital.isCommunityAdded || false,
          verification_status: newHospital.verificationStatus || 'verified',
          added_by: newHospital.addedBy || null,
        });
        if (error) console.error('[DataContext] Error adding hospital to Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception adding hospital:', err);
      }
    }
    addAuditLog(
      `নতুন হাসপাতাল যুক্ত করা হয়েছে: ${newHospital.nameBn}`,
      'HOSPITAL',
      newHospital.id,
      { nameBn: newHospital.nameBn, upazila: newHospital.upazila }
    );
    return newHospital;
  };

  const updateHospital = async (id: string, data: Partial<Hospital>) => {
    setHospitals((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...data } : h))
    );
    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: Record<string, any> = {};
        if (data.nameBn !== undefined) dbUpdates.name_bn = data.nameBn;
        if (data.nameEn !== undefined) dbUpdates.name_en = data.nameEn;
        if (data.category !== undefined) dbUpdates.category = data.category;
        if (data.district !== undefined) dbUpdates.district = data.district;
        if (data.upazila !== undefined) dbUpdates.upazila = data.upazila;
        if (data.address !== undefined) dbUpdates.address = data.address;
        if (data.hotline !== undefined) dbUpdates.hotline = data.hotline;
        if (data.emergencyPhone !== undefined) dbUpdates.emergency_phone = data.emergencyPhone;
        if (data.ambulancePhone !== undefined) dbUpdates.ambulance_phone = data.ambulancePhone;
        if (data.hasBloodBank !== undefined) dbUpdates.has_blood_bank = data.hasBloodBank;
        if (data.hasICU !== undefined) dbUpdates.has_icu = data.hasICU;
        if (data.isOpen24Hours !== undefined) dbUpdates.is_open_24_hours = data.isOpen24Hours;
        if (data.mapUrl !== undefined) dbUpdates.map_url = data.mapUrl;
        if (data.notes !== undefined) dbUpdates.notes = data.notes;
        if (data.verificationStatus !== undefined) dbUpdates.verification_status = data.verificationStatus;

        const { error } = await supabase.from('hospitals').update(dbUpdates).eq('id', id);
        if (error) console.error('[DataContext] Error updating hospital in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception updating hospital:', err);
      }
    }
    addAuditLog('হাসপাতালের তথ্য আপডেট করা হয়েছে', 'HOSPITAL', id, data);
  };

  const deleteHospital = async (id: string) => {
    setHospitals((prev) => prev.filter((h) => h.id !== id));
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('hospitals').delete().eq('id', id);
        if (error) console.error('[DataContext] Error deleting hospital from Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception deleting hospital:', err);
      }
    }
    addAuditLog('হাসপাতাল মুছে ফেলা হয়েছে', 'HOSPITAL', id);
  };

  const verifyHospital = async (id: string) => {
    setHospitals((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, verificationStatus: 'verified', isCommunityAdded: false }
          : h
      )
    );
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('hospitals').update({
          verification_status: 'verified',
          is_community_added: false,
        }).eq('id', id);
        if (error) console.error('[DataContext] Error verifying hospital in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception verifying hospital:', err);
      }
    }
    addAuditLog('হাসপাতাল ভেরিফাই ও অনুমোদন করা হয়েছে', 'HOSPITAL', id);
  };

  const addFundDonation = async (
    donationData: Omit<FundDonation, 'id' | 'createdAt' | 'status'>
  ): Promise<FundDonation> => {
    const newDonation: FundDonation = {
      ...donationData,
      id: `fdon-${Date.now()}`,
      status: 'pending',
      organizationId: donationData.organizationId || 'org-roktobondon',
      createdAt: new Date().toISOString(),
    };
    setFundDonations((prev) => [newDonation, ...prev]);
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('fund_donations').insert({
          id: newDonation.id,
          donor_name: newDonation.donorName,
          donor_phone: newDonation.donorPhone,
          donor_email: newDonation.donorEmail || null,
          amount: newDonation.amount,
          payment_method: newDonation.paymentMethod,
          transaction_id: newDonation.transactionId,
          account_number: newDonation.accountNumber || null,
          fund_cause: newDonation.fundCause,
          area: newDonation.area || null,
          message: newDonation.message || null,
          is_anonymous: newDonation.isAnonymous,
          status: newDonation.status,
          organization_id: newDonation.organizationId || 'org-roktobondon',
          created_at: newDonation.createdAt,
        });
        if (error) console.error('[DataContext] Error inserting fund donation in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception inserting fund donation:', err);
      }
    }
    addAuditLog(
      `নতুন আর্থিক অনুদান জমা দেওয়া হয়েছে: ৳${newDonation.amount} (${newDonation.paymentMethod})`,
      'FUND_DONATION',
      newDonation.id,
      { amount: newDonation.amount, method: newDonation.paymentMethod }
    );
    return newDonation;
  };

  const verifyFundDonation = async (id: string, verifierName: string) => {
    setFundDonations((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: 'verified', verifiedBy: verifierName, verifiedAt: new Date().toISOString() }
          : d
      )
    );
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('fund_donations').update({
          status: 'verified',
          verified_by: verifierName,
          verified_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) console.error('[DataContext] Error verifying fund donation in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception verifying fund donation:', err);
      }
    }
    addAuditLog(`অনুদান ভেরিফাই ও অনুমোদন করা হয়েছে: ${id}`, 'FUND_DONATION', id);
  };

  const rejectFundDonation = async (id: string) => {
    setFundDonations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'rejected' } : d))
    );
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('fund_donations').update({ status: 'rejected' }).eq('id', id);
        if (error) console.error('[DataContext] Error rejecting fund donation in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception rejecting fund donation:', err);
      }
    }
    addAuditLog(`অনুদান বাতিল/অস্বীকৃত করা হয়েছে: ${id}`, 'FUND_DONATION', id);
  };

  const addFundDisbursement = async (
    data: Omit<FundDisbursement, 'id'>
  ): Promise<FundDisbursement> => {
    const newDisb: FundDisbursement = {
      ...data,
      id: `disb-${Date.now()}`,
    };
    setFundDisbursements((prev) => [newDisb, ...prev]);
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('fund_disbursements').insert({
          id: newDisb.id,
          title: newDisb.title,
          cause: newDisb.cause,
          amount: newDisb.amount,
          recipient: newDisb.recipient,
          area: newDisb.area,
          approved_by: newDisb.approvedBy,
          voucher_no: newDisb.voucherNo || null,
          date: newDisb.date,
          notes: newDisb.notes || null,
          created_at: new Date().toISOString(),
        });
        if (error) console.error('[DataContext] Error inserting disbursement in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception inserting disbursement:', err);
      }
    }
    addAuditLog(
      `তহবিল থেকে ব্যয়/বিতরণ রেকর্ড করা হয়েছে: ৳${newDisb.amount} (${newDisb.title})`,
      'DISBURSEMENT',
      newDisb.id,
      { amount: newDisb.amount, recipient: newDisb.recipient }
    );
    return newDisb;
  };

  const deleteFundDisbursement = async (id: string) => {
    setFundDisbursements((prev) => prev.filter((d) => d.id !== id));
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('fund_disbursements').delete().eq('id', id);
        if (error) console.error('[DataContext] Error deleting disbursement from Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception deleting disbursement:', err);
      }
    }
    addAuditLog(`ব্যয় রেকর্ড মুছে ফেলা হয়েছে: ${id}`, 'DISBURSEMENT', id);
  };

  const updatePaymentMethod = async (id: string, data: Partial<PaymentMethodConfig>) => {
    setPaymentMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...data } : m))
    );
    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: Record<string, any> = {};
        if (data.name !== undefined) dbUpdates.name = data.name;
        if (data.nameBn !== undefined) dbUpdates.name_bn = data.nameBn;
        if (data.type !== undefined) dbUpdates.type = data.type;
        if (data.accountNumber !== undefined) dbUpdates.account_number = data.accountNumber;
        if (data.accountType !== undefined) dbUpdates.account_type = data.accountType;
        if (data.instructionsBn !== undefined) dbUpdates.instructions_bn = data.instructionsBn;
        if (data.qrCodeUrl !== undefined) dbUpdates.qr_code_url = data.qrCodeUrl;
        if (data.isActive !== undefined) dbUpdates.is_active = data.isActive;

        const { error } = await supabase.from('payment_methods').update(dbUpdates).eq('id', id);
        if (error) console.error('[DataContext] Error updating payment method in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception updating payment method:', err);
      }
    }
    addAuditLog(`পেমেন্ট মেথড আপডেট করা হয়েছে: ${id}`, 'PAYMENT_METHOD', id, data);
  };

  const addPaymentMethod = async (
    methodData: Omit<PaymentMethodConfig, 'id'>
  ): Promise<PaymentMethodConfig> => {
    const newMethod: PaymentMethodConfig = {
      ...methodData,
      id: `pay-${Date.now()}`,
    };
    setPaymentMethods((prev) => [...prev, newMethod]);
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('payment_methods').insert({
          id: newMethod.id,
          name: newMethod.name,
          name_bn: newMethod.nameBn,
          type: newMethod.type,
          account_number: newMethod.accountNumber,
          account_type: newMethod.accountType,
          instructions_bn: newMethod.instructionsBn,
          qr_code_url: newMethod.qrCodeUrl || null,
          is_active: newMethod.isActive,
        });
        if (error) console.error('[DataContext] Error adding payment method to Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception adding payment method:', err);
      }
    }
    addAuditLog(`নতুন পেমেন্ট মেথড যুক্ত করা হয়েছে: ${newMethod.nameBn}`, 'PAYMENT_METHOD', newMethod.id);
    return newMethod;
  };

  const deletePaymentMethod = async (id: string) => {
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('payment_methods').delete().eq('id', id);
        if (error) console.error('[DataContext] Error deleting payment method from Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception deleting payment method:', err);
      }
    }
    addAuditLog(`পেমেন্ট মেথড মুছে ফেলা হয়েছে: ${id}`, 'PAYMENT_METHOD', id);
  };

  const updateDonationCause = async (id: string, data: Partial<DonationCauseConfig>) => {
    setDonationCauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
    addAuditLog(`অনুদান খাত আপডেট করা হয়েছে: ${id}`, 'DONATION_CAUSE', id, data);
  };

  const addDonationCause = async (
    causeData: Omit<DonationCauseConfig, 'id'>
  ): Promise<DonationCauseConfig> => {
    const newCause: DonationCauseConfig = {
      ...causeData,
      id: `cause-${Date.now()}`,
    };
    setDonationCauses((prev) => [...prev, newCause]);
    addAuditLog(`নতুন অনুদান খাত যুক্ত করা হয়েছে: ${newCause.nameBn}`, 'DONATION_CAUSE', newCause.id);
    return newCause;
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: newRole, updatedAt: new Date().toISOString() } : u
      )
    );
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('users').update({
          role: newRole,
          updated_at: new Date().toISOString(),
        }).eq('id', userId);
        if (error) console.error('[DataContext] Error updating user role in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception updating user role:', err);
      }
    }
    addAuditLog(`ব্যবহারকারীর রোল পরিবর্তন করা হয়েছে: ${userId} -> ${newRole}`, 'USER', userId, { newRole });
  };

  const updateUser = async (userId: string, data: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, ...data, updatedAt: new Date().toISOString() } : u
      )
    );
    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (data.fullName !== undefined) dbUpdates.full_name = data.fullName;
        if (data.phone !== undefined) dbUpdates.phone = data.phone;
        if (data.email !== undefined) dbUpdates.email = data.email;
        if (data.photoUrl !== undefined) dbUpdates.photo_url = data.photoUrl;
        if (data.status !== undefined) dbUpdates.status = data.status;

        const { error } = await supabase.from('users').update(dbUpdates).eq('id', userId);
        if (error) console.error('[DataContext] Error updating user in Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception updating user:', err);
      }
    }
    addAuditLog(`ব্যবহারকারীর তথ্য আপডেট করা হয়েছে: ${userId}`, 'USER', userId, data);
  };

  const addUser = async (
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
    password?: string
  ): Promise<User> => {
    let newUserId = `user-${Date.now()}`;
    const cleanPhone = userData.phone.trim();
    const cleanEmail = userData.email?.trim().toLowerCase() || `${cleanPhone}@roktobondhon.org`;
    const effectivePassword = password?.trim() || cleanPhone;

    if (isSupabaseConfigured && supabase) {
      if (!cleanEmail || !effectivePassword) {
        if (!isDemoMode) {
          throw new Error('ব্যবহারকারী অ্যাকাউন্ট তৈরির জন্য ইমেইল ও পাসওয়ার্ড প্রদান আবশ্যক।');
        }
      }

      // 1. Authoritative: Secure server-side Edge Function (auth.admin.createUser with email_confirm: true)
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('admin-create-user', {
        body: {
          fullName: userData.fullName.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          password: effectivePassword,
          role: userData.role,
          branchId: userData.branchId,
          organizationId: userData.organizationId || 'org-roktobondon',
        },
      });

      if (edgeErr || !edgeData?.success || !edgeData?.user) {
        let errorMsg = edgeData?.error || edgeErr?.message || 'ব্যবহারকারী অ্যাকাউন্ট তৈরি করা যায়নি।';
        if (
          errorMsg.includes('Failed to send a request') ||
          errorMsg.includes('404') ||
          errorMsg.includes('NOT_FOUND') ||
          errorMsg.includes('Requested function was not found')
        ) {
          errorMsg = 'সার্ভার ফাংশন (admin-create-user) প্রোডাকশনে এখনও ডেপ্লয় করা হয়নি। অনুগ্রহ করে Supabase CLI বা ড্যাশবোর্ড থেকে `admin-create-user` এজ ফাংশনটি ডেপ্লয় করুন।';
        }
        console.error('[DataContext] admin-create-user Edge Function error:', edgeErr || edgeData);
        throw new Error(errorMsg);
      }

      const userFromEdge: User = {
        id: edgeData.user.id,
        fullName: edgeData.user.fullName || userData.fullName,
        phone: edgeData.user.phone || cleanPhone,
        email: edgeData.user.email || cleanEmail,
        role: edgeData.user.role || userData.role,
        organizationId: edgeData.user.organizationId || userData.organizationId || 'org-roktobondon',
        branchId: edgeData.user.branchId || userData.branchId,
        status: edgeData.user.status || 'active',
        createdAt: edgeData.user.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUsers((prev) => [userFromEdge, ...prev.filter((u) => u.id !== userFromEdge.id)]);
      addAuditLog(`নতুন ব্যবহারকারী যুক্ত করা হয়েছে: ${userFromEdge.fullName} (${userFromEdge.role})`, 'USER', userFromEdge.id);
      return userFromEdge;
    }

    // Fallback for demo mode
    const newUser: User = {
      ...userData,
      id: newUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUsers((prev) => [newUser, ...prev]);
    addAuditLog(`নতুন ব্যবহারকারী যুক্ত করা হয়েছে: ${newUser.fullName} (${newUser.role})`, 'USER', newUser.id);
    return newUser;
  };

  const deleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) console.error('[DataContext] Error deleting user from Supabase:', error);
      } catch (err) {
        console.error('[DataContext] Exception deleting user:', err);
      }
    }
    addAuditLog(`ব্যবহারকারী মুছে ফেলা হয়েছে: ${userId}`, 'USER', userId);
  };

  const updateRolePermission = async (role: UserRole, permission: PermissionKey, allowed: boolean) => {
    setPermissionMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: allowed,
      },
    }));
    addAuditLog(`রোল পারমিশন পরিবর্তন: [${role}] -> ${permission} = ${allowed}`, 'ROLE_PERMISSION', role, {
      permission,
      allowed,
    });
  };

  const resetPermissionMatrix = () => {
    setPermissionMatrix(DEFAULT_PERMISSION_MATRIX);
    localStorage.removeItem(STORAGE_KEYS.PERMISSION_MATRIX);
    addAuditLog('রোল পারমিশন ম্যাট্রিক্স ডিফল্ট অবস্থায় রিস্টোর করা হয়েছে', 'ROLE_PERMISSION', 'RESET');
  };

  const hasPermission = (role: UserRole, permission: PermissionKey): boolean => {
    if (role === 'super_admin') return true;
    return Boolean(permissionMatrix[role]?.[permission]);
  };

  const exportBackupData = (): string => {
    const savedOrgConfig = localStorage.getItem('roktobondon_org_config');
    let orgConfig;
    if (savedOrgConfig) {
      try {
        orgConfig = JSON.parse(savedOrgConfig);
      } catch (e) {
        console.error(e);
      }
    }

    const savedSysConfig = localStorage.getItem('roktobondon_system_config');
    let systemConfig;
    if (savedSysConfig) {
      try {
        systemConfig = JSON.parse(savedSysConfig);
      } catch (e) {
        console.error(e);
      }
    }

    const { jsonString } = generatePlatformBackup({
      orgConfig,
      systemConfig,
      permissionMatrix,
      donors,
      bloodRequests,
      donorRequests,
      donations,
      locations,
      branches,
      hospitals,
      fundDonations,
      paymentMethods,
      donationCauses,
      fundDisbursements,
      users,
      auditLogs,
    });

    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `roktobondon_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Auto download error', e);
    }
    addAuditLog('সম্পূর্ণ ডাটাবেজ, পারমিশন ম্যাট্রিক্স ও প্ল্যাটফর্ম সেটিংস ব্যাকআপ এক্সপোর্ট করা হয়েছে', 'BACKUP', 'EXPORT');
    return jsonString;
  };

  const importBackupData = (jsonStr: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') {
        throw new Error('ভুল ফরম্যাটের ফাইল। অনুগ্রহ করে সঠিক JSON ব্যাকআপ ফাইল প্রদান করুন।');
      }

      if (data.orgConfig && typeof data.orgConfig === 'object') {
        localStorage.setItem('roktobondon_org_config', JSON.stringify(data.orgConfig));
      }
      if (data.systemConfig && typeof data.systemConfig === 'object') {
        localStorage.setItem('roktobondon_system_config', JSON.stringify(data.systemConfig));
      }
      if (data.permissionMatrix && typeof data.permissionMatrix === 'object') {
        setPermissionMatrix(data.permissionMatrix);
        localStorage.setItem(STORAGE_KEYS.PERMISSION_MATRIX, JSON.stringify(data.permissionMatrix));
      }
      if (Array.isArray(data.donors)) setDonors(data.donors);
      if (Array.isArray(data.bloodRequests)) setBloodRequests(data.bloodRequests);
      if (Array.isArray(data.donorRequests)) setDonorRequests(data.donorRequests);
      if (Array.isArray(data.donations)) setDonations(data.donations);
      if (Array.isArray(data.locations)) setLocations(data.locations);
      if (Array.isArray(data.branches)) setBranches(data.branches);
      if (Array.isArray(data.hospitals)) setHospitals(data.hospitals);
      if (Array.isArray(data.fundDonations)) setFundDonations(data.fundDonations);
      if (Array.isArray(data.paymentMethods)) setPaymentMethods(data.paymentMethods);
      if (Array.isArray(data.donationCauses)) setDonationCauses(data.donationCauses);
      if (Array.isArray(data.fundDisbursements)) setFundDisbursements(data.fundDisbursements);
      if (Array.isArray(data.users)) setUsers(data.users);

      addAuditLog('ব্যাকআপ ফাইল থেকে সকল ডেটা, রোল পারমিশন ও সেটিংস রিস্টোর সম্পন্ন হয়েছে', 'BACKUP', 'IMPORT');
      return { success: true, message: 'ব্যাকআপ সফলভাবে রিস্টোর হয়েছে এবং প্ল্যাটফর্ম সেটিংস ও পারমিশন আপডেট হয়েছে!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'ব্যাকআপ ফাইল রিস্টোর করতে ব্যর্থ হয়েছে।' };
    }
  };

  const restoreSelectiveBackup = (
    payload: PlatformBackupPayload,
    selectedKeys: string[],
    strategy: 'replace' | 'merge' = 'replace'
  ): { success: boolean; message: string; restoredCounts: Record<string, number> } => {
    try {
      const { restoredCounts, restoredData } = resolveSelectiveRestore(
        payload,
        selectedKeys as BackupCollectionKey[],
        strategy,
        {
          donors,
          bloodRequests,
          donorRequests,
          donations,
          locations,
          branches,
          hospitals,
          fundDonations,
          paymentMethods,
          donationCauses,
          fundDisbursements,
          users,
          auditLogs,
        }
      );

      if (restoredData.orgConfig && typeof restoredData.orgConfig === 'object') {
        localStorage.setItem('roktobondon_org_config', JSON.stringify(restoredData.orgConfig));
      }
      if (restoredData.systemConfig && typeof restoredData.systemConfig === 'object') {
        localStorage.setItem('roktobondon_system_config', JSON.stringify(restoredData.systemConfig));
      }
      if (restoredData.permissionMatrix && typeof restoredData.permissionMatrix === 'object') {
        setPermissionMatrix(restoredData.permissionMatrix);
        localStorage.setItem(STORAGE_KEYS.PERMISSION_MATRIX, JSON.stringify(restoredData.permissionMatrix));
      }
      if (Array.isArray(restoredData.donors)) setDonors(restoredData.donors);
      if (Array.isArray(restoredData.bloodRequests)) setBloodRequests(restoredData.bloodRequests);
      if (Array.isArray(restoredData.donorRequests)) setDonorRequests(restoredData.donorRequests);
      if (Array.isArray(restoredData.donations)) setDonations(restoredData.donations);
      if (Array.isArray(restoredData.locations)) setLocations(restoredData.locations);
      if (Array.isArray(restoredData.branches)) setBranches(restoredData.branches);
      if (Array.isArray(restoredData.hospitals)) setHospitals(restoredData.hospitals);
      if (Array.isArray(restoredData.fundDonations)) setFundDonations(restoredData.fundDonations);
      if (Array.isArray(restoredData.paymentMethods)) setPaymentMethods(restoredData.paymentMethods);
      if (Array.isArray(restoredData.donationCauses)) setDonationCauses(restoredData.donationCauses);
      if (Array.isArray(restoredData.fundDisbursements)) setFundDisbursements(restoredData.fundDisbursements);
      if (Array.isArray(restoredData.users)) setUsers(restoredData.users);

      addAuditLog(
        `সিলেক্টিভ ব্যাকআপ রিস্টোর সম্পন্ন হয়েছে (${selectedKeys.join(', ')}) [Strategy: ${strategy}]`,
        'BACKUP',
        'SELECTIVE_RESTORE',
        { selectedKeys, restoredCounts, strategy }
      );

      return {
        success: true,
        message: `নির্বাচিত মডিউল (${selectedKeys.length}টি) সফলভাবে রিস্টোর হয়েছে!`,
        restoredCounts,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'সিলেক্টিভ ব্যাকআপ রিস্টোর করতে ব্যর্থ হয়েছে।',
        restoredCounts: {},
      };
    }
  };

  /**
   * Migrate current local seed state into Supabase Database
   */
  const migrateLocalToFirestore = async (): Promise<{ success: boolean; message: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, message: 'Supabase কনফিগার করা নেই। .env ফাইলে VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY যোগ করুন।' };
    }

    try {
      setIsLoading(true);

      // Seed donors
      for (const d of donors) {
        await supabase.from('donors').upsert({
          id: d.id,
          donor_id: d.donorId,
          user_id: d.userId || d.id,
          full_name: d.fullName,
          photo_url: d.photoUrl || null,
          blood_group: d.bloodGroup,
          division: d.division || 'Dhaka',
          district_id: d.districtId || 'dist-dhaka',
          district: d.district,
          upazila_id: d.upazilaId || 'upa-dhamrai',
          upazila: d.upazila,
          area_id: d.areaId || null,
          area: d.area,
          location_label: d.locationLabel || null,
          availability: d.availability,
          emergency_available: d.emergencyAvailable,
          last_donation_date: d.lastDonationDate || null,
          first_donation_date: d.firstDonationDate || null,
          total_donations: d.totalDonations || 0,
          verification_status: d.verificationStatus,
          organization_id: d.organizationId || 'org-roktobondon',
          branch_id: d.branchId || 'br-dhm',
          phone: d.phone,
          email: d.email || null,
          gender: d.gender || null,
          date_of_birth: d.dateOfBirth || null,
          exact_address: d.exactAddress || null,
          emergency_contact: d.emergencyContact || null,
          admin_notes: d.adminNotes || null,
          nid_or_id_number: d.nidOrIdNumber || null,
          privacy: d.privacy,
        });
      }

      // Seed blood requests
      for (const req of bloodRequests) {
        await supabase.from('blood_requests').upsert({
          id: req.id,
          request_id: req.requestId,
          user_id: req.userId,
          patient_name: req.patientName,
          blood_group: req.bloodGroup,
          required_units: req.requiredUnits,
          required_date: req.requiredDate,
          required_time: req.requiredTime,
          hospital: req.hospital,
          division: req.division,
          district: req.district,
          upazila: req.upazila,
          area: req.area,
          contact_person: req.contactPerson,
          contact_number: req.contactNumber,
          relationship: req.relationship,
          emergency_level: req.emergencyLevel,
          notes: req.notes || null,
          status: req.status,
          is_verified: req.verification.isVerified,
          verified_by: req.verification.verifiedBy || null,
          verified_at: req.verification.verifiedAt || null,
          organization_id: req.organizationId || 'org-roktobondon',
          expires_at: req.expiresAt || null,
          created_at: req.createdAt,
        });
      }

      // Seed hospitals
      for (const hosp of hospitals) {
        await supabase.from('hospitals').upsert({
          id: hosp.id,
          name_bn: hosp.nameBn,
          name_en: hosp.nameEn,
          category: hosp.category,
          district: hosp.district,
          upazila: hosp.upazila,
          address: hosp.address,
          hotline: hosp.hotline,
          emergency_phone: hosp.emergencyPhone || null,
          ambulance_phone: hosp.ambulancePhone || null,
          has_blood_bank: hosp.hasBloodBank,
          has_icu: hosp.hasICU,
          is_open_24_hours: hosp.isOpen24Hours,
          map_url: hosp.mapUrl || null,
          notes: hosp.notes || null,
          is_community_added: hosp.isCommunityAdded || false,
          verification_status: hosp.verificationStatus || 'verified',
          added_by: hosp.addedBy || null,
        });
      }

      // Seed payment methods
      for (const pay of paymentMethods) {
        await supabase.from('payment_methods').upsert({
          id: pay.id,
          name: pay.name,
          name_bn: pay.nameBn,
          type: pay.type,
          account_number: pay.accountNumber,
          account_type: pay.accountType,
          instructions_bn: pay.instructionsBn,
          qr_code_url: pay.qrCodeUrl || null,
          is_active: pay.isActive,
        });
      }

      addAuditLog('ডেটা সফলভাবে Supabase ক্লাউড ডেটাবেজে মাইগ্রেট করা হয়েছে', 'MIGRATION', 'SUPABASE');
      return { success: true, message: 'সকল লোকাল ডেটা Supabase ক্লাউডে সফলভাবে সেভ করা হয়েছে!' };
    } catch (err: any) {
      console.error('Supabase Migration failed:', err);
      return { success: false, message: err.message || 'Supabase-এ মাইগ্রেশন ব্যর্থ হয়েছে।' };
    } finally {
      setIsLoading(false);
    }
  };

  const addBloodCamp = async (
    campData: Omit<BloodCamp, 'id' | 'createdAt' | 'registeredCount'>
  ): Promise<BloodCamp> => {
    const newCamp: BloodCamp = {
      ...campData,
      id: `camp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      registeredCount: 0,
      createdAt: new Date().toISOString(),
    };
    setBloodCamps((prev) => [newCamp, ...prev]);
    addAuditLog(`নতুন রক্তদান ক্যাম্প যোগ করা হয়েছে: ${newCamp.titleBn}`, 'CAMP', newCamp.id);
    return newCamp;
  };

  const updateBloodCamp = async (id: string, data: Partial<BloodCamp>): Promise<void> => {
    setBloodCamps((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
    addAuditLog(`রক্তদান ক্যাম্পের তথ্য আপডেট করা হয়েছে`, 'CAMP', id);
  };

  const deleteBloodCamp = async (id: string): Promise<void> => {
    setBloodCamps((prev) => prev.filter((c) => c.id !== id));
    addAuditLog(`রক্তদান ক্যাম্প মুছে ফেলা হয়েছে`, 'CAMP', id);
  };

  const registerForCamp = async (
    registrationData: Omit<CampRegistration, 'id' | 'createdAt' | 'status'>
  ): Promise<CampRegistration> => {
    const newReg: CampRegistration = {
      ...registrationData,
      id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'registered',
      createdAt: new Date().toISOString(),
    };
    setCampRegistrations((prev) => [newReg, ...prev]);
    setBloodCamps((prev) =>
      prev.map((c) =>
        c.id === registrationData.campId
          ? { ...c, registeredCount: (c.registeredCount || 0) + 1 }
          : c
      )
    );
    addAuditLog(`ক্যাম্পে নতুন রক্তদাতা প্রি-রেজিস্ট্রেশন করেছেন: ${registrationData.donorName}`, 'CAMP_REGISTRATION', newReg.id);
    return newReg;
  };

  const resetDemoData = () => {
    if (!isDemoMode) {
      console.warn('resetDemoData is strictly disabled in production mode');
      return;
    }
    const seedDonors = generateSeedDonors();
    const seedRequests = generateSeedRequests();
    const seedDonations = generateSeedDonations(seedDonors, seedRequests);

    setDonors(seedDonors);
    setBloodRequests(seedRequests);
    setDonations(seedDonations);
    setDonorRequests([]);
    setLocations(INITIAL_LOCATIONS);
    setBranches(INITIAL_BRANCHES);
    setHospitals(HOSPITALS_DATA);
    setFundDonations(INITIAL_FUND_DONATIONS);
    setPaymentMethods(INITIAL_PAYMENT_METHODS);
    setDonationCauses(INITIAL_DONATION_CAUSES);
    setFundDisbursements(INITIAL_FUND_DISBURSEMENTS);
    setUsers(INITIAL_DEMO_USERS);
    setBloodCamps(INITIAL_BLOOD_CAMPS);
    setCampRegistrations([]);

    setAuditLogs([
      {
        id: `log-reset-${Date.now()}`,
        userId: 'admin',
        userName: 'Admin Reset',
        userRole: 'super_admin',
        action: 'Database Re-seeded with Donors, Requests, Donations, and Fund Data',
        targetType: 'SYSTEM',
        targetId: 'GLOBAL',
        timestamp: new Date().toISOString(),
      },
    ]);

    localStorage.removeItem(STORAGE_KEYS.DONORS);
    localStorage.removeItem(STORAGE_KEYS.REQUESTS);
    localStorage.removeItem(STORAGE_KEYS.DONATIONS);
    localStorage.removeItem(STORAGE_KEYS.DONOR_REQUESTS);
    localStorage.removeItem(STORAGE_KEYS.LOCATIONS);
    localStorage.removeItem(STORAGE_KEYS.BRANCHES);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.HOSPITALS);
    localStorage.removeItem(STORAGE_KEYS.FUND_DONATIONS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_METHODS);
    localStorage.removeItem(STORAGE_KEYS.DONATION_CAUSES);
    localStorage.removeItem(STORAGE_KEYS.FUND_DISBURSEMENTS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.BLOOD_CAMPS);
    localStorage.removeItem(STORAGE_KEYS.CAMP_REGISTRATIONS);
  };

  return (
    <DataContext.Provider
      value={{
        donors,
        bloodRequests,
        donorRequests,
        donations,
        donationSubmissions,
        locations,
        branches,
        notifications,
        auditLogs,
        hospitals,
        fundDonations,
        paymentMethods,
        donationCauses,
        fundDisbursements,
        users,
        bloodCamps,
        campRegistrations,
        donorBadges,
        isLoading,
        createBloodRequest,
        updateBloodRequestStatus,
        verifyBloodRequest,
        deleteBloodRequest,
        registerDonor,
        onboardDonor,
        updateDonor,
        verifyDonor,
        deleteDonor,
        sendDonorRequest,
        respondDonorRequest,
        recordDonation,
        updateDonation,
        deleteDonation,
        submitDonationReport,
        updateDonationSubmission,
        cancelDonationSubmission,
        approveDonationSubmission,
        rejectDonationSubmission,
        requestDonationSubmissionInfo,
        addBloodCamp,
        updateBloodCamp,
        deleteBloodCamp,
        registerForCamp,
        addLocation,
        updateLocation,
        deleteLocation,
        addBranch,
        updateBranch,
        deleteBranch,
        addHospital,
        updateHospital,
        deleteHospital,
        verifyHospital,
        addFundDonation,
        verifyFundDonation,
        rejectFundDonation,
        addFundDisbursement,
        deleteFundDisbursement,
        updatePaymentMethod,
        addPaymentMethod,
        deletePaymentMethod,
        updateDonationCause,
        addDonationCause,
        updateUserRole,
        updateUser,
        addUser,
        deleteUser,
        permissionMatrix,
        updateRolePermission,
        resetPermissionMatrix,
        hasPermission,
        exportBackupData,
        importBackupData,
        restoreSelectiveBackup,
        addAuditLog,
        markNotificationRead,
        addNotification,
        deleteNotification,
        markAllNotificationsRead,
        resetDemoData,
        migrateLocalToFirestore,
        migrateLocalToSupabase: migrateLocalToFirestore,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
