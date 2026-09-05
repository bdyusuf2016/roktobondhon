import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import {
  generateSeedDonors,
  generateSeedRequests,
  generateSeedDonations,
  INITIAL_DEMO_USERS,
  INITIAL_PAYMENT_METHODS,
  INITIAL_DONATION_CAUSES,
  INITIAL_FUND_DONATIONS,
  INITIAL_FUND_DISBURSEMENTS,
} from '../src/data/seedData';
import { HOSPITALS_DATA } from '../src/data/hospitalsData';
import { INITIAL_LOCATIONS, INITIAL_BRANCHES } from '../src/services/locationService';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Error: Firebase environment variables (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID) are missing!');
  console.error('Please configure your .env file before running the seed script.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedDatabase() {
  console.log('🚀 Starting RoktoBondhon Firestore Database Seed...');
  console.log(`Connected to Project ID: ${firebaseConfig.projectId}`);

  try {
    const batch = writeBatch(db);

    // 1. Seed Donors (Partitioned into donorPublic and donorPrivate)
    console.log('📦 Partitioning and seeding donors (donorPublic & donorPrivate)...');
    const donors = generateSeedDonors();
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
        firstDonationDate: d.firstDonationDate || '',
        totalDonations: d.totalDonations || 0,
        verificationStatus: d.verificationStatus,
        organizationId: d.organizationId || 'org-roktobondon',
        branchId: d.branchId || 'br-dhm',
        createdAt: d.createdAt,
        serverCreatedAt: serverTimestamp(),
      });

      batch.set(privRef, {
        donorId: d.donorId,
        userId: d.userId,
        phone: d.phone,
        email: d.email || '',
        gender: d.gender || 'male',
        dateOfBirth: d.dateOfBirth || '',
        exactAddress: d.exactAddress || '',
        emergencyContact: d.emergencyContact || '',
        adminNotes: d.adminNotes || '',
        privacy: d.privacy,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        serverCreatedAt: serverTimestamp(),
      });
    }

    // 2. Seed Blood Requests (Both private bloodRequests and public bloodRequestPublic)
    console.log('📦 Seeding blood requests (private & public representations)...');
    const requests = generateSeedRequests();
    for (const req of requests) {
      const reqRef = doc(db, 'bloodRequests', req.id);
      batch.set(reqRef, {
        ...req,
        serverCreatedAt: serverTimestamp(),
      });

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
        serverCreatedAt: serverTimestamp(),
      });
    }

    // 3. Seed Donations
    console.log('📦 Seeding donation history...');
    const donations = generateSeedDonations(donors, requests);
    for (const don of donations) {
      const donRef = doc(db, 'donations', don.id);
      batch.set(donRef, {
        ...don,
        serverCreatedAt: serverTimestamp(),
      });
    }

    // 4. Seed Hospitals
    console.log('📦 Seeding hospital directory...');
    for (const hosp of HOSPITALS_DATA) {
      const hospRef = doc(db, 'hospitals', hosp.id);
      batch.set(hospRef, hosp);
    }

    // 5. Seed Branches & Locations
    console.log('📦 Seeding branches and locations...');
    for (const br of INITIAL_BRANCHES) {
      const brRef = doc(db, 'branches', br.id);
      batch.set(brRef, br);
    }
    for (const loc of INITIAL_LOCATIONS) {
      const locRef = doc(db, 'locations', loc.id);
      batch.set(locRef, loc);
    }

    // 6. Seed Payment Methods & Causes
    console.log('📦 Seeding payment methods and charity causes...');
    for (const pay of INITIAL_PAYMENT_METHODS) {
      const payRef = doc(db, 'paymentMethods', pay.id);
      batch.set(payRef, pay);
    }
    for (const cause of INITIAL_DONATION_CAUSES) {
      const causeRef = doc(db, 'donationCauses', cause.id);
      batch.set(causeRef, cause);
    }

    // 7. Seed Initial Super Admin & Users
    console.log('📦 Seeding initial system users...');
    for (const u of INITIAL_DEMO_USERS) {
      const uRef = doc(db, 'users', u.id);
      batch.set(uRef, {
        ...u,
        serverCreatedAt: serverTimestamp(),
      });
    }

    // Commit batch
    console.log('💾 Committing writes to Cloud Firestore...');
    await batch.commit();

    console.log('✅ Firestore Database Seed successfully finished!');
    console.log(`- ${donors.length} Donors partitioned into donorPublic & donorPrivate`);
    console.log(`- ${requests.length} Blood requests created`);
    console.log(`- ${donations.length} Donation records created`);
    console.log(`- ${HOSPITALS_DATA.length} Hospitals loaded`);
    console.log(`- ${INITIAL_BRANCHES.length} Branches & ${INITIAL_LOCATIONS.length} Locations loaded`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
