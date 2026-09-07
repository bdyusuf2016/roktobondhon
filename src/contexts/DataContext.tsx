import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  AuditLog,
  BloodRequest,
  Branch,
  Donation,
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
import { supabase, isSupabaseConfigured, isDemoMode } from '../supabase/config';
import {
  createDonorRecord,
  updateDonorRecord,
  verifyDonorStatus,
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
import { recordDonationInFirestore } from '../services/donationService';
import { recordAuditLog } from '../services/auditService';
import { generatePlatformBackup, resolveSelectiveRestore } from '../services/backupService';
import type { BackupCollectionKey, PlatformBackupPayload } from '../types/backup';

interface DataContextType {
  donors: Donor[];
  bloodRequests: BloodRequest[];
  donorRequests: DonorRequest[];
  donations: Donation[];
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
  updateDonor: (id: string, data: Partial<Donor>) => Promise<void>;
  verifyDonor: (donorId: string, status: VerificationStatus, verifierName: string, notes?: string) => Promise<void>;
  sendDonorRequest: (bloodRequestId: string, donor: Donor, requesterUserId: string, matchScore: number) => Promise<DonorRequest>;
  respondDonorRequest: (requestId: string, status: 'accepted' | 'maybe' | 'declined', declineReason?: string) => Promise<void>;
  recordDonation: (donation: Omit<Donation, 'id'>) => Promise<Donation>;
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
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<User>;
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
    return isDemoMode ? generateSeedDonors() : [];
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
    return isDemoMode ? generateSeedRequests() : [];
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
    return isDemoMode ? generateSeedDonations(generateSeedDonors(), generateSeedRequests()) : [];
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
    return INITIAL_LOCATIONS;
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
    return INITIAL_BRANCHES;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const defaultNotif: NotificationItem[] = [
      {
        id: 'notif-welcome',
        userId: 'all',
        title: 'স্বাগতম রক্তবন্ধন প্ল্যাটফর্মে',
        message: 'ধামরাই, সাভার ও মানিকগঞ্জে স্বেচ্ছাসেবী রক্তদাতাদের নেটওয়ার্কে আপনাকে স্বাগতম।',
        type: 'system',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return defaultNotif;
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
    return HOSPITALS_DATA;
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
    return isDemoMode ? INITIAL_FUND_DONATIONS : [];
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
    return INITIAL_PAYMENT_METHODS;
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
    return INITIAL_DONATION_CAUSES;
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
    return isDemoMode ? INITIAL_FUND_DISBURSEMENTS : [];
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
    return isDemoMode ? INITIAL_DEMO_USERS : [];
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
    return INITIAL_BLOOD_CAMPS;
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
        if (donorsData && donorsData.length > 0 && isMounted) {
          setDonors(donorsData.map(mapDonorRow));
        } else if (isDemoMode && isMounted) {
          setDonors((prev) => (prev.length > 0 ? prev : generateSeedDonors()));
        }

        // 2. Fetch blood requests
        const { data: reqsData } = await supabase
          .from('blood_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (reqsData && reqsData.length > 0 && isMounted) {
          setBloodRequests(reqsData.map(mapBloodRequestRow));
        } else if (isDemoMode && isMounted) {
          setBloodRequests((prev) => (prev.length > 0 ? prev : generateSeedRequests()));
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
      } catch (err) {
        console.warn('Supabase initial synchronization notice:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSupabaseData();

    return () => {
      isMounted = false;
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
      addAuditLog('Donor Registered', 'Donor', id, { donorId, bloodGroup: newDonor.bloodGroup });
      return newDonor;
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
    setDonors((prev) =>
      prev.map((d) =>
        d.id === donorId
          ? {
              ...d,
              verificationStatus: status,
              verifiedBy: verifierName,
              verifiedAt: new Date().toISOString(),
              adminNotes: notes || d.adminNotes,
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );

    if (isSupabaseConfigured) {
      await verifyDonorStatus(donorId, status, verifierName, notes);
    }

    addAuditLog(`Donor Verification: ${status}`, 'Donor', donorId, { verifierName, notes });
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

    // Also update donor's totalDonations & lastDonationDate
    setDonors((prev) =>
      prev.map((d) =>
        d.donorId === donationData.donorId || d.userId === donationData.donorUserId || d.id === donationData.donorId
          ? {
              ...d,
              totalDonations: (d.totalDonations || 0) + 1,
              lastDonationDate: donationData.donationDate,
              availability: false,
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );

    // If associated blood request exists, fulfill it
    if (donationData.requestId) {
      setBloodRequests((prev) =>
        prev.map((r) =>
          r.requestId === donationData.requestId || r.id === donationData.requestId
            ? { ...r, status: 'fulfilled' }
            : r
        )
      );
      if (isSupabaseConfigured) {
        updateBloodRequestStatusInFirestore(donationData.requestId, 'fulfilled').catch(() => {});
      }
    }

    addAuditLog('Donation Completed', 'Donation', newDonation.id, {
      donorId: donationData.donorId,
      units: donationData.units,
      hospital: donationData.hospital,
    });

    return newDonation;
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
    addAuditLog('Branch Created', 'Branch', id, { nameBn: newBranch.nameBn });
    return newBranch;
  };

  const updateBranch = async (id: string, data: Partial<Branch>): Promise<void> => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...data } : b))
    );
    addAuditLog('Branch Updated', 'Branch', id, data);
  };

  const deleteBranch = async (id: string): Promise<void> => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
    addAuditLog('Branch Deleted', 'Branch', id);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
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
      supabase.from('notifications').insert({
        id: newNotif.id,
        user_id: newNotif.userId,
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type,
        link: newNotif.link || null,
        is_read: newNotif.isRead,
        created_at: newNotif.createdAt,
      }).then(() => {});
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
      supabase.from('notifications').delete().eq('id', id).then(() => {});
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
      if (userId) {
        supabase
          .from('notifications')
          .update({ is_read: true })
          .in('user_id', [userId, 'all'])
          .then(() => {});
      } else {
        supabase
          .from('notifications')
          .update({ is_read: true })
          .then(() => {});
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
      supabase.from('hospitals').insert({
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
      }).then(() => {});
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

      supabase.from('hospitals').update(dbUpdates).eq('id', id).then(() => {});
    }
    addAuditLog('হাসপাতালের তথ্য আপডেট করা হয়েছে', 'HOSPITAL', id, data);
  };

  const deleteHospital = async (id: string) => {
    setHospitals((prev) => prev.filter((h) => h.id !== id));
    if (isSupabaseConfigured && supabase) {
      supabase.from('hospitals').delete().eq('id', id).then(() => {});
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
      supabase.from('hospitals').update({
        verification_status: 'verified',
        is_community_added: false,
      }).eq('id', id).then(() => {});
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
      supabase.from('fund_donations').insert({
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
      }).then(() => {});
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
      supabase.from('fund_donations').update({
        status: 'verified',
        verified_by: verifierName,
        verified_at: new Date().toISOString(),
      }).eq('id', id).then(() => {});
    }
    addAuditLog(`অনুদান ভেরিফাই ও অনুমোদন করা হয়েছে: ${id}`, 'FUND_DONATION', id);
  };

  const rejectFundDonation = async (id: string) => {
    setFundDonations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'rejected' } : d))
    );
    if (isSupabaseConfigured && supabase) {
      supabase.from('fund_donations').update({ status: 'rejected' }).eq('id', id).then(() => {});
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
      supabase.from('fund_disbursements').insert({
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
      }).then(() => {});
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
      supabase.from('fund_disbursements').delete().eq('id', id).then(() => {});
    }
    addAuditLog(`ব্যয় রেকর্ড মুছে ফেলা হয়েছে: ${id}`, 'DISBURSEMENT', id);
  };

  const updatePaymentMethod = async (id: string, data: Partial<PaymentMethodConfig>) => {
    setPaymentMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...data } : m))
    );
    if (isSupabaseConfigured && supabase) {
      const dbUpdates: Record<string, any> = {};
      if (data.name !== undefined) dbUpdates.name = data.name;
      if (data.nameBn !== undefined) dbUpdates.name_bn = data.nameBn;
      if (data.type !== undefined) dbUpdates.type = data.type;
      if (data.accountNumber !== undefined) dbUpdates.account_number = data.accountNumber;
      if (data.accountType !== undefined) dbUpdates.account_type = data.accountType;
      if (data.instructionsBn !== undefined) dbUpdates.instructions_bn = data.instructionsBn;
      if (data.qrCodeUrl !== undefined) dbUpdates.qr_code_url = data.qrCodeUrl;
      if (data.isActive !== undefined) dbUpdates.is_active = data.isActive;

      supabase.from('payment_methods').update(dbUpdates).eq('id', id).then(() => {});
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
      supabase.from('payment_methods').insert({
        id: newMethod.id,
        name: newMethod.name,
        name_bn: newMethod.nameBn,
        type: newMethod.type,
        account_number: newMethod.accountNumber,
        account_type: newMethod.accountType,
        instructions_bn: newMethod.instructionsBn,
        qr_code_url: newMethod.qrCodeUrl || null,
        is_active: newMethod.isActive,
      }).then(() => {});
    }
    addAuditLog(`নতুন পেমেন্ট মেথড যুক্ত করা হয়েছে: ${newMethod.nameBn}`, 'PAYMENT_METHOD', newMethod.id);
    return newMethod;
  };

  const deletePaymentMethod = async (id: string) => {
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
    if (isSupabaseConfigured && supabase) {
      supabase.from('payment_methods').delete().eq('id', id).then(() => {});
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
      supabase.from('users').update({
        role: newRole,
        updated_at: new Date().toISOString(),
      }).eq('id', userId).then(() => {});
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
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (data.fullName !== undefined) dbUpdates.full_name = data.fullName;
      if (data.phone !== undefined) dbUpdates.phone = data.phone;
      if (data.email !== undefined) dbUpdates.email = data.email;
      if (data.photoUrl !== undefined) dbUpdates.photo_url = data.photoUrl;
      if (data.status !== undefined) dbUpdates.status = data.status;

      supabase.from('users').update(dbUpdates).eq('id', userId).then(() => {});
    }
    addAuditLog(`ব্যবহারকারীর তথ্য আপডেট করা হয়েছে: ${userId}`, 'USER', userId, data);
  };

  const addUser = async (
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<User> => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUsers((prev) => [newUser, ...prev]);
    if (isSupabaseConfigured && supabase) {
      supabase.from('users').insert({
        id: newUser.id,
        full_name: newUser.fullName,
        phone: newUser.phone,
        email: newUser.email || null,
        role: newUser.role,
        organization_id: newUser.organizationId,
        branch_id: newUser.branchId || null,
        photo_url: newUser.photoUrl || null,
        status: newUser.status,
        phone_verified: newUser.phoneVerified,
        created_at: newUser.createdAt,
        updated_at: newUser.updatedAt,
      }).then(() => {});
    }
    addAuditLog(`নতুন ব্যবহারকারী যুক্ত করা হয়েছে: ${newUser.fullName} (${newUser.role})`, 'USER', newUser.id);
    return newUser;
  };

  const deleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (isSupabaseConfigured && supabase) {
      supabase.from('users').delete().eq('id', userId).then(() => {});
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
        updateDonor,
        verifyDonor,
        sendDonorRequest,
        respondDonorRequest,
        recordDonation,
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
