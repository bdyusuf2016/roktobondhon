export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'volunteer' | 'donor' | 'recipient';

export type PermissionKey =
  | 'manage_donors'
  | 'manage_requests'
  | 'record_donation'
  | 'manage_hospitals'
  | 'manage_funds'
  | 'manage_disbursements'
  | 'manage_payment_methods'
  | 'manage_branches'
  | 'manage_users'
  | 'manage_roles_matrix'
  | 'manage_settings'
  | 'manage_backup'
  | 'view_audit_logs';

export type RolePermissionMatrix = Record<UserRole, Record<PermissionKey, boolean>>;

export interface PermissionDefinition {
  key: PermissionKey;
  labelBn: string;
  descriptionBn: string;
  category: 'blood' | 'directory' | 'funds' | 'system';
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended';

export type EmergencyLevel = 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL';

export type RequestStatus = 'pending' | 'verified' | 'active' | 'matched' | 'fulfilled' | 'cancelled' | 'expired';

export type DonorRequestStatus = 'pending' | 'accepted' | 'maybe' | 'declined';

export type DonationType = 'Whole Blood' | 'Platelets' | 'Plasma' | 'RBC';

export type Gender = 'male' | 'female' | 'other';

export interface User {
  id: string; // User ID (Auth UID)
  fullName: string;
  email?: string;
  phone: string;
  role: UserRole;
  organizationId: string;
  branchId?: string;
  photoUrl?: string;
  status?: 'active' | 'suspended' | 'pending';
  phoneVerified?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface DonorPrivacySettings {
  showPhone: boolean;
  showGender: boolean;
  showAge: boolean;
  allowDirectContact: boolean;
}

export interface DonorPublic {
  id: string; // doc ID (e.g. donorId)
  donorId: string; // DNR-DHM-000125
  fullName: string;
  photoUrl?: string;
  bloodGroup: BloodGroup;
  division?: string;
  districtId?: string;
  district: string;
  upazilaId?: string;
  upazila: string;
  areaId?: string;
  area: string;
  locationLabel?: string;
  availability: boolean;
  emergencyAvailable: boolean;
  lastDonationDate?: string;
  firstDonationDate?: string;
  totalDonations: number;
  verificationStatus: VerificationStatus;
  organizationId: string;
  branchId?: string;
  createdAt: string;
}

export interface DonorPrivate {
  donorId: string;
  userId: string;
  phone: string;
  email?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  exactAddress?: string;
  emergencyContact?: string;
  adminNotes?: string;
  verificationDocuments?: string[];
  nidOrIdNumber?: string;
  privacy: DonorPrivacySettings;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Donor extends DonorPublic {
  userId: string;
  phone: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  email?: string;
  union?: string;
  branchId?: string;
  exactAddress?: string;
  emergencyContact?: string;
  privacy: DonorPrivacySettings;
  adminNotes?: string;
  nidOrIdNumber?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  updatedAt: string;
}


export interface BloodRequestPublic {
  id: string;
  requestId: string; // BD-2026-000184
  userId?: string;
  bloodGroup: BloodGroup;
  requiredUnits: number;
  requiredDate: string;
  requiredTime: string;
  hospital: string;
  division?: string;
  district: string;
  upazila: string;
  area: string;
  emergencyLevel: EmergencyLevel;
  status: RequestStatus;
  verification: {
    isVerified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
  };
  organizationId?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface BloodRequest {
  id: string;
  requestId: string; // BD-2026-000184
  userId: string;
  patientName: string;
  bloodGroup: BloodGroup;
  requiredUnits: number;
  requiredDate: string;
  requiredTime: string;
  hospital: string;
  division: string;
  district: string;
  upazila: string;
  area: string;
  contactPerson: string;
  contactNumber: string;
  relationship: string;
  emergencyLevel: EmergencyLevel;
  notes?: string;
  status: RequestStatus;
  verification: {
    isVerified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
  };
  organizationId?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface DonorRequest {
  id: string;
  bloodRequestId: string;
  donorId: string;
  donorUserId: string;
  requesterUserId: string;
  status: DonorRequestStatus;
  declineReason?: string;
  matchScore: number;
  patientName: string;
  hospital: string;
  bloodGroup: BloodGroup;
  emergencyLevel: EmergencyLevel;
  createdAt: string;
  respondedAt?: string;
}

export interface Donation {
  id: string;
  donorId: string;
  donorUserId: string;
  donorName: string;
  bloodGroup: BloodGroup;
  requestId?: string;
  donationDate: string;
  hospital: string;
  units: number;
  donationType: DonationType;
  verifiedBy: string;
  verificationDate: string;
  notes?: string;
}

export interface LocationItem {
  id: string;
  division: string;
  district: string;
  upazila: string;
  unions: string[];
  isActive: boolean;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  nameBn: string;
  district: string;
  upazila: string;
  coordinatorName: string;
  coordinatorPhone: string;
  isActive: boolean;
}

export interface OrganizationConfig {
  id: string;
  name: string;
  nameBn: string;
  sloganBn: string;
  headerSubtitleBn: string;
  logoUrl: string;
  primaryColor: string;
  emergencyHotline: string;
  email: string;
  address: string;
  facebookUrl?: string;
  activeDistricts: string[];
  // Dynamic Announcement Banner
  showAnnouncement: boolean;
  announcementTextBn: string;
  announcementLink?: string;
  // Dynamic Footer Fields
  footerAboutBn: string;
  footerSecurityBadgeBn: string;
  footerTaglineBn: string;
  footerCopyrightText: string;
  coverageArea1Title: string;
  coverageArea1Details: string;
  coverageArea2Title: string;
  coverageArea2Details: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'request' | 'match' | 'verification' | 'donation' | 'system';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface VerificationLog {
  id: string;
  donorId: string;
  verifiedBy: string;
  status: VerificationStatus;
  notes?: string;
  timestamp: string;
}

export interface MatchResult {
  donor: Donor;
  matchScore: number;
  breakdown: {
    bloodCompatibility: number;
    availability: number;
    verified: number;
    location: number;
    emergency: number;
  };
}

export type HospitalCategory = 'government' | 'medical_college' | 'private' | 'blood_bank';

export interface Hospital {
  id: string;
  nameBn: string;
  nameEn: string;
  category: HospitalCategory;
  district: string;
  upazila: string;
  address: string;
  hotline: string;
  emergencyPhone?: string;
  ambulancePhone?: string;
  hasBloodBank: boolean;
  hasICU: boolean;
  isOpen24Hours: boolean;
  mapUrl?: string;
  notes?: string;
  isCommunityAdded?: boolean;
  verificationStatus?: 'verified' | 'unverified';
  addedBy?: string;
}

export interface FundDonation {
  id: string;
  donorName: string;
  donorPhone: string;
  donorEmail?: string;
  amount: number;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Bank';
  transactionId: string;
  accountNumber?: string;
  fundCause: string;
  area?: string;
  message?: string;
  isAnonymous: boolean;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  organizationId?: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  nameBn: string;
  type: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'Bank';
  accountNumber: string;
  accountType: 'personal' | 'merchant' | 'agent';
  instructionsBn: string;
  qrCodeUrl?: string;
  isActive: boolean;
}

export interface FundDisbursement {
  id: string;
  title: string;
  cause: string;
  amount: number;
  recipient: string;
  area: string;
  approvedBy: string;
  voucherNo?: string;
  date: string;
  notes?: string;
}

export interface DonationCauseConfig {
  id: string;
  nameBn: string;
  descriptionBn: string;
  targetAmount?: number;
  raisedAmount?: number;
  isActive: boolean;
}

export interface BloodCamp {
  id: string;
  titleBn: string;
  titleEn: string;
  organizerName: string;
  partnerHospital?: string;
  division: string;
  district: string;
  upazila: string;
  venueAddress: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // e.g. "09:00 AM"
  endTime: string; // e.g. "05:00 PM"
  targetUnits: number;
  collectedUnits?: number;
  contactPerson: string;
  contactPhone: string;
  bannerUrl?: string;
  descriptionBn: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  registeredCount: number;
  mapUrl?: string;
  createdAt: string;
}

export interface CampRegistration {
  id: string;
  campId: string;
  campTitle: string;
  donorName: string;
  phone: string;
  bloodGroup: BloodGroup;
  preferredTime?: string;
  userId?: string;
  status: 'registered' | 'donated' | 'cancelled';
  createdAt: string;
}

export interface DonorBadge {
  id: string;
  titleBn: string;
  titleEn: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend';
  minDonations: number;
  iconName: string;
  descriptionBn: string;
  color: string;
}


