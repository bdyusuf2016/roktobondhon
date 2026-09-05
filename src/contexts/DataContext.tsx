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
} from '../data/seedData';
import { HOSPITALS_DATA } from '../data/hospitalsData';
import { INITIAL_LOCATIONS, INITIAL_BRANCHES } from '../services/locationService';
import { generateBloodRequestId, generateDonorId, getLocationCode } from '../services/idGenerator';
import { db, isFirebaseConfigured, isDemoMode } from '../firebase/config';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import {
  createDonorRecord,
  updateDonorRecord,
  verifyDonorStatus,
} from '../services/donorService';
import {
  createBloodRequestRecord,
  updateBloodRequestStatusInFirestore,
  verifyBloodRequestInFirestore,
} from '../services/bloodRequestService';
import {
  sendDonorContactRequest,
  respondToDonorRequest,
} from '../services/donorRequestService';
import { recordDonationInFirestore } from '../services/donationService';
import { recordAuditLog } from '../services/auditService';

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
  permissionMatrix: RolePermissionMatrix;
  updateRolePermission: (role: UserRole, permission: PermissionKey, allowed: boolean) => Promise<void>;
  resetPermissionMatrix: () => void;
  hasPermission: (role: UserRole, permission: PermissionKey) => boolean;
  isLoading: boolean;
  createBloodRequest: (data: Omit<BloodRequest, 'id' | 'requestId' | 'createdAt' | 'status' | 'verification'>) => Promise<BloodRequest>;
  updateBloodRequestStatus: (id: string, status: BloodRequest['status']) => Promise<void>;
  verifyBloodRequest: (id: string, verifierName: string) => Promise<void>;
  registerDonor: (data: Omit<Donor, 'id' | 'donorId' | 'createdAt' | 'updatedAt' | 'verificationStatus' | 'totalDonations'>) => Promise<Donor>;
  updateDonor: (id: string, data: Partial<Donor>) => Promise<void>;
  verifyDonor: (donorId: string, status: VerificationStatus, verifierName: string, notes?: string) => Promise<void>;
  sendDonorRequest: (bloodRequestId: string, donor: Donor, requesterUserId: string, matchScore: number) => Promise<DonorRequest>;
  respondDonorRequest: (requestId: string, status: 'accepted' | 'maybe' | 'declined', declineReason?: string) => Promise<void>;
  recordDonation: (donation: Omit<Donation, 'id'>) => Promise<Donation>;
  addLocation: (location: Omit<LocationItem, 'id'>) => Promise<LocationItem>;
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<Branch>;
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
  addAuditLog: (action: string, targetType: string, targetId: string, metadata?: Record<string, any>, user?: { id: string; name: string; role: UserRole }) => void;
  markNotificationRead: (id: string) => void;
  resetDemoData: () => void;
  migrateLocalToFirestore: () => Promise<{ success: boolean; message: string }>;
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
  PERMISSION_MATRIX: 'roktobondon_permission_matrix_v1',
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [donors, setDonors] = useState<Donor[]>(() => {
    if (!isDemoMode) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.DONORS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return generateSeedDonors();
  });

  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>(() => {
    if (!isDemoMode) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return generateSeedRequests();
  });

  const [donorRequests, setDonorRequests] = useState<DonorRequest[]>(() => {
    if (!isDemoMode) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.DONOR_REQUESTS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [donations, setDonations] = useState<Donation[]>(() => {
    if (!isDemoMode) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.DONATIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return generateSeedDonations(generateSeedDonors(), generateSeedRequests());
  });

  const [locations, setLocations] = useState<LocationItem[]>(() => {
    if (!isDemoMode) return INITIAL_LOCATIONS;
    const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_LOCATIONS;
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    if (!isDemoMode) return INITIAL_BRANCHES;
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
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
    if (!isDemoMode) return defaultNotif;
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return defaultNotif;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    if (!isDemoMode) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 'log-init',
        userId: 'system',
        userName: 'System Initialization',
        userRole: 'super_admin',
        action: 'System Bootstrapped',
        targetType: 'SYSTEM',
        targetId: 'GLOBAL',
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [hospitals, setHospitals] = useState<Hospital[]>(() => {
    if (!isDemoMode) return HOSPITALS_DATA;
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
    if (!isDemoMode) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.FUND_DONATIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_FUND_DONATIONS;
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(() => {
    if (!isDemoMode) return INITIAL_PAYMENT_METHODS;
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
    if (!isDemoMode) return INITIAL_DONATION_CAUSES;
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
    if (!isDemoMode) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.FUND_DISBURSEMENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_FUND_DISBURSEMENTS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    if (!isDemoMode) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_DEMO_USERS;
  });

  const [permissionMatrix, setPermissionMatrix] = useState<RolePermissionMatrix>(() => {
    if (!isDemoMode) return DEFAULT_PERMISSION_MATRIX;
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

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Synchronize with Firestore when in production mode or when configured
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    let isMounted = true;
    const loadFirestoreData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch public donors
        const donorsSnap = await getDocs(collection(db, 'donorPublic'));
        if (!donorsSnap.empty && isMounted) {
          const loadedDonors: Donor[] = donorsSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              donorId: data.donorId || d.id,
              fullName: data.fullName || 'স্বেচ্ছাসেবী রক্তদাতা',
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
              totalDonations: data.totalDonations || 0,
              verificationStatus: data.verificationStatus || 'pending',
              organizationId: data.organizationId || 'org-roktobondon',
              branchId: data.branchId || 'br-dhm',
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
              userId: data.userId || d.id,
              phone: data.phone || '', // hidden by default in donorPublic
              privacy: data.privacy || {
                showPhone: false,
                showGender: false,
                showAge: false,
                allowDirectContact: true,
              },
            };
          });
          setDonors(loadedDonors);
        } else if (isDemoMode && isMounted) {
          // If Firestore is empty and demo mode is on, fallback to local seed donors
          setDonors((prev) => (prev.length > 0 ? prev : generateSeedDonors()));
        }

        // 2. Fetch blood requests (attempt private first, fallback to public emergency listing)
        let loadedReqs: BloodRequest[] = [];
        try {
          const reqSnap = await getDocs(collection(db, 'bloodRequests'));
          if (!reqSnap.empty && isMounted) {
            loadedReqs = reqSnap.docs.map((d) => ({
              id: d.id,
              requestId: d.data().requestId || d.id,
              ...d.data(),
            } as BloodRequest));
          }
        } catch {
          // If unauthenticated or regular donor without private read permission, fetch public emergency requests
          try {
            const pubReqSnap = await getDocs(collection(db, 'bloodRequestPublic'));
            if (!pubReqSnap.empty && isMounted) {
              loadedReqs = pubReqSnap.docs.map((d) => {
                const data = d.data();
                return {
                  id: d.id,
                  requestId: data.requestId || d.id,
                  userId: data.userId || '',
                  patientName: 'জরুরি রক্তের আবেদন',
                  bloodGroup: data.bloodGroup,
                  requiredUnits: data.requiredUnits || 1,
                  requiredDate: data.requiredDate,
                  requiredTime: data.requiredTime,
                  hospital: data.hospital,
                  division: data.division || 'Dhaka',
                  district: data.district,
                  upazila: data.upazila,
                  area: data.area,
                  contactPerson: '',
                  contactNumber: '',
                  relationship: '',
                  emergencyLevel: data.emergencyLevel || 'NORMAL',
                  notes: '',
                  status: data.status,
                  verification: data.verification || { isVerified: false },
                  organizationId: data.organizationId || 'org-roktobondon',
                  createdAt: data.createdAt || new Date().toISOString(),
                  expiresAt: data.expiresAt,
                } as BloodRequest;
              });
            }
          } catch (pubErr) {
            console.warn('Could not fetch public blood requests:', pubErr);
          }
        }

        if (loadedReqs.length > 0 && isMounted) {
          setBloodRequests(loadedReqs);
        } else if (isDemoMode && isMounted) {
          setBloodRequests((prev) => (prev.length > 0 ? prev : generateSeedRequests()));
        }

        // 3. Fetch donor requests
        const dreqSnap = await getDocs(collection(db, 'donorRequests'));
        if (!dreqSnap.empty && isMounted) {
          setDonorRequests(dreqSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DonorRequest)));
        }

        // 4. Fetch donations
        const donSnap = await getDocs(collection(db, 'donations'));
        if (!donSnap.empty && isMounted) {
          setDonations(donSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation)));
        }

        // 5. Fetch hospitals
        const hospSnap = await getDocs(collection(db, 'hospitals'));
        if (!hospSnap.empty && isMounted) {
          setHospitals(hospSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Hospital)));
        }

        // 6. Fetch fund donations (Restricted to authenticated staff or donor owner)
        try {
          const fundSnap = await getDocs(collection(db, 'fundDonations'));
          if (!fundSnap.empty && isMounted) {
            setFundDonations(fundSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FundDonation)));
          }
        } catch {
          // Fund donations are private; public unauthenticated visitors read only local/demo fallbacks
        }

        // 7. Fetch payment methods
        const paySnap = await getDocs(collection(db, 'paymentMethods'));
        if (!paySnap.empty && isMounted) {
          setPaymentMethods(paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentMethodConfig)));
        }

        // 8. Fetch users
        const usersSnap = await getDocs(collection(db, 'users'));
        if (!usersSnap.empty && isMounted) {
          setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
        }
      } catch (err) {
        console.warn('Firestore initial synchronization notice:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFirestoreData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync to localStorage only in Demo Mode
  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.DONORS, JSON.stringify(donors));
    }
  }, [donors]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(bloodRequests));
    }
  }, [bloodRequests]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.DONOR_REQUESTS, JSON.stringify(donorRequests));
    }
  }, [donorRequests]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(donations));
    }
  }, [donations]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    }
  }, [locations]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
    }
  }, [branches]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
    }
  }, [auditLogs]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(hospitals));
    }
  }, [hospitals]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.FUND_DONATIONS, JSON.stringify(fundDonations));
    }
  }, [fundDonations]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(paymentMethods));
    }
  }, [paymentMethods]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.DONATION_CAUSES, JSON.stringify(donationCauses));
    }
  }, [donationCauses]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.FUND_DISBURSEMENTS, JSON.stringify(fundDisbursements));
    }
  }, [fundDisbursements]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEYS.PERMISSION_MATRIX, JSON.stringify(permissionMatrix));
    }
  }, [permissionMatrix]);

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
      if (isFirebaseConfigured && !isDemoMode) {
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
      if (isFirebaseConfigured && !isDemoMode) {
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

        if (isFirebaseConfigured && db) {
          try {
            await setDoc(doc(db, 'bloodRequests', id), newReq);
          } catch (err) {
            console.warn('Firestore fallback', err);
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
    if (isFirebaseConfigured) {
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
    if (isFirebaseConfigured) {
      await verifyBloodRequestInFirestore(id, verifierName);
    }
    addAuditLog('Request Verified', 'BloodRequest', id, { verifierName });
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
      if (isFirebaseConfigured && !isDemoMode) {
        newDonor = await createDonorRecord(publicData, privateData);
      } else {
        newDonor = {
          ...publicData,
          ...privateData,
          updatedAt: new Date().toISOString(),
        };
        if (isFirebaseConfigured && db) {
          try {
            await createDonorRecord(publicData, privateData);
          } catch (e) {
            console.warn('Firestore donor fallback', e);
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

    if (isFirebaseConfigured) {
      const publicFields: Partial<DonorPublic> = {};
      const privateFields: Partial<DonorPrivate> = {};

      if (data.fullName !== undefined) publicFields.fullName = data.fullName;
      if (data.photoUrl !== undefined) publicFields.photoUrl = data.photoUrl;
      if (data.bloodGroup !== undefined) publicFields.bloodGroup = data.bloodGroup;
      if (data.district !== undefined) publicFields.district = data.district;
      if (data.upazila !== undefined) publicFields.upazila = data.upazila;
      if (data.area !== undefined) publicFields.area = data.area;
      if (data.availability !== undefined) publicFields.availability = data.availability;
      if (data.emergencyAvailable !== undefined) publicFields.emergencyAvailable = data.emergencyAvailable;
      if (data.lastDonationDate !== undefined) publicFields.lastDonationDate = data.lastDonationDate;
      if (data.totalDonations !== undefined) publicFields.totalDonations = data.totalDonations;

      if (data.phone !== undefined) privateFields.phone = data.phone;
      if (data.email !== undefined) privateFields.email = data.email;
      if (data.gender !== undefined) privateFields.gender = data.gender;
      if (data.dateOfBirth !== undefined) privateFields.dateOfBirth = data.dateOfBirth;
      if (data.exactAddress !== undefined) privateFields.exactAddress = data.exactAddress;
      if (data.privacy !== undefined) privateFields.privacy = data.privacy;
      if (data.adminNotes !== undefined) privateFields.adminNotes = data.adminNotes;

      await updateDonorRecord(id, publicFields, privateFields);
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

    if (isFirebaseConfigured) {
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

    if (isFirebaseConfigured && !isDemoMode && bloodReq) {
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

    if (isFirebaseConfigured) {
      await respondToDonorRequest(requestId, status, declineReason);
    }

    addAuditLog(`Donor Response: ${status}`, 'DonorRequest', requestId, { status, declineReason });
  };

  const recordDonation = async (donationData: Omit<Donation, 'id'>): Promise<Donation> => {
    let newDonation: Donation;
    if (isFirebaseConfigured && !isDemoMode) {
      newDonation = await recordDonationInFirestore(donationData);
    } else {
      const id = `don-${Date.now()}`;
      newDonation = { ...donationData, id };
      if (isFirebaseConfigured && db) {
        try {
          await recordDonationInFirestore(donationData);
        } catch (e) {
          console.warn('Firestore donation fallback', e);
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
      if (isFirebaseConfigured) {
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
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'locations', id), newLoc).catch(() => {});
    }
    addAuditLog('Location Added', 'Location', id, { upazila: newLoc.upazila });
    return newLoc;
  };

  const addBranch = async (branchData: Omit<Branch, 'id'>): Promise<Branch> => {
    const id = `br-${Date.now()}`;
    const newBranch: Branch = { ...branchData, id };
    setBranches((prev) => [...prev, newBranch]);
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'branches', id), newBranch).catch(() => {});
    }
    addAuditLog('Branch Created', 'Branch', id, { nameBn: newBranch.nameBn });
    return newBranch;
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const addHospital = async (hospitalData: Omit<Hospital, 'id'>): Promise<Hospital> => {
    const id = `hosp-custom-${Date.now()}`;
    const newHospital: Hospital = {
      ...hospitalData,
      id,
    };
    setHospitals((prev) => [newHospital, ...prev]);
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'hospitals', id), newHospital).catch(() => {});
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
    if (isFirebaseConfigured && db) {
      updateDoc(doc(db, 'hospitals', id), data).catch(() => {});
    }
    addAuditLog('হাসপাতালের তথ্য আপডেট করা হয়েছে', 'HOSPITAL', id, data);
  };

  const deleteHospital = async (id: string) => {
    setHospitals((prev) => prev.filter((h) => h.id !== id));
    if (isFirebaseConfigured && db) {
      deleteDoc(doc(db, 'hospitals', id)).catch(() => {});
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
    if (isFirebaseConfigured && db) {
      updateDoc(doc(db, 'hospitals', id), {
        verificationStatus: 'verified',
        isCommunityAdded: false,
      }).catch(() => {});
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
    if (isFirebaseConfigured && db) {
      const cleanData = Object.fromEntries(
        Object.entries(newDonation).filter(([_, v]) => v !== undefined)
      );
      setDoc(doc(db, 'fundDonations', newDonation.id), cleanData).catch((err) => {
        console.error('Firestore add fund donation error:', err);
      });
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
    if (isFirebaseConfigured && db) {
      updateDoc(doc(db, 'fundDonations', id), {
        status: 'verified',
        verifiedBy: verifierName,
        verifiedAt: new Date().toISOString(),
      }).catch(() => {});
    }
    addAuditLog(`অনুদান ভেরিফাই ও অনুমোদন করা হয়েছে: ${id}`, 'FUND_DONATION', id);
  };

  const rejectFundDonation = async (id: string) => {
    setFundDonations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'rejected' } : d))
    );
    if (isFirebaseConfigured && db) {
      updateDoc(doc(db, 'fundDonations', id), { status: 'rejected' }).catch(() => {});
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
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'fundDisbursements', newDisb.id), newDisb).catch(() => {});
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
    if (isFirebaseConfigured && db) {
      deleteDoc(doc(db, 'fundDisbursements', id)).catch(() => {});
    }
    addAuditLog(`ব্যয় রেকর্ড মুছে ফেলা হয়েছে: ${id}`, 'DISBURSEMENT', id);
  };

  const updatePaymentMethod = async (id: string, data: Partial<PaymentMethodConfig>) => {
    setPaymentMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...data } : m))
    );
    if (isFirebaseConfigured && db) {
      updateDoc(doc(db, 'paymentMethods', id), data).catch(() => {});
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
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'paymentMethods', newMethod.id), newMethod).catch(() => {});
    }
    addAuditLog(`নতুন পেমেন্ট মেথড যুক্ত করা হয়েছে: ${newMethod.nameBn}`, 'PAYMENT_METHOD', newMethod.id);
    return newMethod;
  };

  const deletePaymentMethod = async (id: string) => {
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
    if (isFirebaseConfigured && db) {
      deleteDoc(doc(db, 'paymentMethods', id)).catch(() => {});
    }
    addAuditLog(`পেমেন্ট মেথড মুছে ফেলা হয়েছে: ${id}`, 'PAYMENT_METHOD', id);
  };

  const updateDonationCause = async (id: string, data: Partial<DonationCauseConfig>) => {
    setDonationCauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
    if (isFirebaseConfigured && db) {
      updateDoc(doc(db, 'donationCauses', id), data).catch(() => {});
    }
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
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'donationCauses', newCause.id), newCause).catch(() => {});
    }
    addAuditLog(`নতুন অনুদান খাত যুক্ত করা হয়েছে: ${newCause.nameBn}`, 'DONATION_CAUSE', newCause.id);
    return newCause;
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: newRole, updatedAt: new Date().toISOString() } : u
      )
    );
    if (isFirebaseConfigured && db) {
      updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString(),
        serverUpdatedAt: serverTimestamp(),
      }).catch(() => {});
    }
    addAuditLog(`ব্যবহারকারীর রোল পরিবর্তন করা হয়েছে: ${userId} -> ${newRole}`, 'USER', userId, { newRole });
  };

  const updateUser = async (userId: string, data: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, ...data, updatedAt: new Date().toISOString() } : u
      )
    );
    if (isFirebaseConfigured && db) {
      updateDoc(doc(db, 'users', userId), {
        ...data,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
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
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'users', newUser.id), newUser).catch(() => {});
    }
    addAuditLog(`নতুন ব্যবহারকারী যুক্ত করা হয়েছে: ${newUser.fullName} (${newUser.role})`, 'USER', newUser.id);
    return newUser;
  };

  const deleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (isFirebaseConfigured && db) {
      deleteDoc(doc(db, 'users', userId)).catch(() => {});
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

    const backupObj = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      platform: 'RoktoBondon Blood Donation Platform',
      orgConfig,
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
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
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
    return jsonStr;
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

  /**
   * Migrate current local seed state into Firestore with donorPublic / donorPrivate partitioning
   */
  const migrateLocalToFirestore = async (): Promise<{ success: boolean; message: string }> => {
    if (!isFirebaseConfigured || !db) {
      return { success: false, message: 'Firebase কনফিগার করা নেই। .env ভেরিয়েবল চেক করুন।' };
    }

    try {
      setIsLoading(true);
      const batch = writeBatch(db);

      // Seed donors partitioned
      for (const d of donors) {
        const pubRef = doc(db, 'donorPublic', d.id);
        const privRef = doc(db, 'donorPrivate', d.id);

        batch.set(pubRef, {
          id: d.id,
          donorId: d.donorId,
          fullName: d.fullName,
          photoUrl: d.photoUrl || '',
          bloodGroup: d.bloodGroup,
          district: d.district,
          upazila: d.upazila,
          area: d.area,
          availability: d.availability,
          emergencyAvailable: d.emergencyAvailable,
          lastDonationDate: d.lastDonationDate || '',
          totalDonations: d.totalDonations || 0,
          verificationStatus: d.verificationStatus,
          organizationId: d.organizationId || 'org-roktobondon',
          branchId: d.branchId || 'br-dhm',
          createdAt: d.createdAt || new Date().toISOString(),
        });

        batch.set(privRef, {
          donorId: d.donorId,
          userId: d.userId || d.id,
          phone: d.phone || '',
          email: d.email || '',
          gender: d.gender || 'male',
          dateOfBirth: d.dateOfBirth || '',
          exactAddress: d.exactAddress || '',
          privacy: d.privacy,
          adminNotes: d.adminNotes || '',
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Seed blood requests (both private and public-safe collections)
      for (const req of bloodRequests) {
        const reqRef = doc(db, 'bloodRequests', req.id);
        batch.set(reqRef, req);

        const pubRef = doc(db, 'bloodRequestPublic', req.id);
        batch.set(pubRef, {
          id: req.id,
          requestId: req.requestId,
          userId: req.userId,
          bloodGroup: req.bloodGroup,
          requiredUnits: req.requiredUnits,
          division: req.division,
          district: req.district,
          upazila: req.upazila,
          area: req.area,
          emergencyLevel: req.emergencyLevel,
          requiredDate: req.requiredDate,
          requiredTime: req.requiredTime,
          hospital: req.hospital,
          status: req.status,
          verification: req.verification,
          organizationId: req.organizationId || 'org-roktobondon',
          createdAt: req.createdAt,
          expiresAt: req.expiresAt,
        });
      }

      // Seed hospitals
      for (const hosp of hospitals) {
        const hospRef = doc(db, 'hospitals', hosp.id);
        batch.set(hospRef, hosp);
      }

      // Seed payment methods
      for (const pay of paymentMethods) {
        const payRef = doc(db, 'paymentMethods', pay.id);
        batch.set(payRef, pay);
      }

      // Seed donation causes
      for (const cause of donationCauses) {
        const causeRef = doc(db, 'donationCauses', cause.id);
        batch.set(causeRef, cause);
      }

      await batch.commit();
      addAuditLog('ডেটা সফলভাবে ফায়ারবেজ ক্লাউড ফায়ারস্টোরে মাইগ্রেট করা হয়েছে', 'MIGRATION', 'FIRESTORE');
      return { success: true, message: 'সকল লোকাল ডেটা ফায়ারস্টোর ক্লাউডে সফলভাবে সেভ করা হয়েছে!' };
    } catch (err: any) {
      console.error('Migration failed:', err);
      return { success: false, message: err.message || 'ফায়ারস্টোরে মাইগ্রেশন ব্যর্থ হয়েছে।' };
    } finally {
      setIsLoading(false);
    }
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
        isLoading,
        createBloodRequest,
        updateBloodRequestStatus,
        verifyBloodRequest,
        registerDonor,
        updateDonor,
        verifyDonor,
        sendDonorRequest,
        respondDonorRequest,
        recordDonation,
        addLocation,
        addBranch,
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
        addAuditLog,
        markNotificationRead,
        resetDemoData,
        migrateLocalToFirestore,
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
