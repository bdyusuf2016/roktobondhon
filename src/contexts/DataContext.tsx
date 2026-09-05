import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  AuditLog,
  BloodRequest,
  Branch,
  Donation,
  Donor,
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
  PERMISSION_DEFINITIONS,
} from '../data/seedData';
import { HOSPITALS_DATA } from '../data/hospitalsData';
import { INITIAL_LOCATIONS, INITIAL_BRANCHES } from '../services/locationService';
import { generateBloodRequestId, generateDonorId, getLocationCode } from '../services/idGenerator';
import { db, isFirebaseConfigured } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, getDocs } from 'firebase/firestore';

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
    const saved = localStorage.getItem(STORAGE_KEYS.DONORS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return generateSeedDonors();
  });

  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return generateSeedRequests();
  });

  const [donorRequests, setDonorRequests] = useState<DonorRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DONOR_REQUESTS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [donations, setDonations] = useState<Donation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DONATIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return generateSeedDonations(donors, bloodRequests);
  });

  const [locations, setLocations] = useState<LocationItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_LOCATIONS;
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_BRANCHES;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
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
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
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
    return INITIAL_FUND_DONATIONS;
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
    return INITIAL_FUND_DISBURSEMENTS;
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
    return INITIAL_DEMO_USERS;
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

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync to localStorage
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

  const addAuditLog = useCallback(
    (
      action: string,
      targetType: string,
      targetId: string,
      metadata?: Record<string, any>,
      user?: { id: string; name: string; role: UserRole }
    ) => {
      const newLog: AuditLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
    },
    []
  );

  const createBloodRequest = async (
    data: Omit<BloodRequest, 'id' | 'requestId' | 'createdAt' | 'status' | 'verification'>
  ): Promise<BloodRequest> => {
    setIsLoading(true);
    try {
      const id = `req-${Date.now()}`;
      const requestId = generateBloodRequestId(bloodRequests.length + 101);
      const newReq: BloodRequest = {
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
          console.warn('Firestore write fallback to local', err);
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

      addAuditLog('Blood Request Created', 'BloodRequest', id, { requestId, bloodGroup: newReq.bloodGroup });
      return newReq;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBloodRequestStatus = async (id: string, status: BloodRequest['status']) => {
    setBloodRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'bloodRequests', id), { status });
      } catch (e) {
        console.warn('Firestore update error', e);
      }
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

      const newDonor: Donor = {
        ...data,
        id,
        donorId,
        verificationStatus: 'pending',
        totalDonations: data.lastDonationDate ? 1 : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'donors', id), newDonor);
        } catch (err) {
          console.warn('Firestore write error fallback', err);
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
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'donors', id), data);
      } catch (e) {
        console.warn('Firestore update error', e);
      }
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
    addAuditLog(`Donor Verification: ${status}`, 'Donor', donorId, { verifierName, notes });
  };

  const sendDonorRequest = async (
    bloodRequestId: string,
    donor: Donor,
    requesterUserId: string,
    matchScore: number
  ): Promise<DonorRequest> => {
    // Check if duplicate request exists for this donor & request
    const existing = donorRequests.find(
      (r) => r.bloodRequestId === bloodRequestId && r.donorId === donor.id
    );
    if (existing) {
      return existing;
    }

    const bloodReq = bloodRequests.find((r) => r.id === bloodRequestId);

    const newRequest: DonorRequest = {
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

    addAuditLog(`Donor Response: ${status}`, 'DonorRequest', requestId, { status, declineReason });
  };

  const recordDonation = async (donationData: Omit<Donation, 'id'>): Promise<Donation> => {
    const id = `don-${Date.now()}`;
    const newDonation: Donation = { ...donationData, id };

    setDonations((prev) => [newDonation, ...prev]);

    // Also update donor's totalDonations & lastDonationDate
    setDonors((prev) =>
      prev.map((d) =>
        d.donorId === donationData.donorId || d.userId === donationData.donorUserId
          ? {
              ...d,
              totalDonations: (d.totalDonations || 0) + 1,
              lastDonationDate: donationData.donationDate,
              availability: false, // automatically set unavailable after recent donation
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );

    // If there's an associated blood request, update its status to fulfilled
    if (donationData.requestId) {
      setBloodRequests((prev) =>
        prev.map((r) =>
          r.requestId === donationData.requestId || r.id === donationData.requestId
            ? { ...r, status: 'fulfilled' }
            : r
        )
      );
    }

    addAuditLog('Donation Completed', 'Donation', id, {
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

  const addBranch = async (branchData: Omit<Branch, 'id'>): Promise<Branch> => {
    const id = `br-${Date.now()}`;
    const newBranch: Branch = { ...branchData, id };
    setBranches((prev) => [...prev, newBranch]);
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
    addAuditLog(
      `নতুন হাসপাতাল যুক্ত করা হয়েছে: ${newHospital.nameBn}`,
      'HOSPITAL',
      newHospital.id,
      { nameBn: newHospital.nameBn, upazila: newHospital.upazila, isCommunityAdded: newHospital.isCommunityAdded }
    );
    return newHospital;
  };

  const updateHospital = async (id: string, data: Partial<Hospital>) => {
    setHospitals((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...data } : h))
    );
    addAuditLog(
      `হাসপাতালের তথ্য আপডেট করা হয়েছে`,
      'HOSPITAL',
      id,
      data
    );
  };

  const deleteHospital = async (id: string) => {
    const target = hospitals.find((h) => h.id === id);
    setHospitals((prev) => prev.filter((h) => h.id !== id));
    addAuditLog(
      `হাসপাতাল মুছে ফেলা হয়েছে: ${target?.nameBn || id}`,
      'HOSPITAL',
      id
    );
  };

  const verifyHospital = async (id: string) => {
    setHospitals((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, verificationStatus: 'verified', isCommunityAdded: false }
          : h
      )
    );
    addAuditLog(
      `হাসপাতাল ভেরিফাই ও অনুমোদন করা হয়েছে`,
      'HOSPITAL',
      id
    );
  };

  // --- FINANCIAL DONATIONS ---
  const addFundDonation = async (
    donationData: Omit<FundDonation, 'id' | 'createdAt' | 'status'>
  ): Promise<FundDonation> => {
    const newDonation: FundDonation = {
      ...donationData,
      id: `fdon-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setFundDonations((prev) => [newDonation, ...prev]);
    addAuditLog(
      `নতুন আর্থিক অনুদান জমা দেওয়া হয়েছে: ৳${newDonation.amount} (${newDonation.paymentMethod})`,
      'FUND_DONATION',
      newDonation.id,
      { amount: newDonation.amount, method: newDonation.paymentMethod, donor: newDonation.donorName }
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
    addAuditLog(`অনুদান ভেরিফাই ও অনুমোদন করা হয়েছে: ${id}`, 'FUND_DONATION', id);
  };

  const rejectFundDonation = async (id: string) => {
    setFundDonations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'rejected' } : d))
    );
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
    addAuditLog(`ব্যয় রেকর্ড মুছে ফেলা হয়েছে: ${id}`, 'DISBURSEMENT', id);
  };

  const updatePaymentMethod = async (id: string, data: Partial<PaymentMethodConfig>) => {
    setPaymentMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...data } : m))
    );
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
    addAuditLog(`নতুন পেমেন্ট মেথড যুক্ত করা হয়েছে: ${newMethod.nameBn}`, 'PAYMENT_METHOD', newMethod.id);
    return newMethod;
  };

  const deletePaymentMethod = async (id: string) => {
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
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

  // --- USER MANAGEMENT ---
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: newRole, updatedAt: new Date().toISOString() } : u
      )
    );
    addAuditLog(`ব্যবহারকারীর রোল পরিবর্তন করা হয়েছে: ${userId} -> ${newRole}`, 'USER', userId, { newRole });
  };

  const updateUser = async (userId: string, data: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, ...data, updatedAt: new Date().toISOString() } : u
      )
    );
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
    addAuditLog(`নতুন ব্যবহারকারী যুক্ত করা হয়েছে: ${newUser.fullName} (${newUser.role})`, 'USER', newUser.id);
    return newUser;
  };

  const deleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    addAuditLog(`ব্যবহারকারী মুছে ফেলা হয়েছে: ${userId}`, 'USER', userId);
  };

  // --- ROLE & PERMISSION MATRIX MANAGEMENT ---
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

  // --- DATA BACKUP & RESTORE ---
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

  const resetDemoData = () => {
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
