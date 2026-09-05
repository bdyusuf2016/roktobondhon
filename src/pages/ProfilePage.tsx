import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Phone,
  Mail,
  LogOut,
  Droplets,
  Heart,
  Calendar,
  CheckCircle2,
  Clock,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout, updateCurrentUser } = useAuth();
  const { donors, bloodRequests, donations, updateDonor } = useData();

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          প্রোফাইল দেখতে প্রথমে লগইন করুন
        </h2>
        <Link
          to="/login"
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold inline-block border border-red-700/60 shadow-xs"
        >
          লগইন পাতায় যান
        </Link>
      </div>
    );
  }

  // Find linked donor record if any
  const myDonor = donors.find((d) => d.userId === currentUser.id || d.phone === currentUser.phone);
  // User's blood requests
  const myRequests = bloodRequests.filter((r) => r.userId === currentUser.id);
  // User's donations
  const myDonations = donations.filter(
    (d) => d.donorUserId === currentUser.id || (myDonor && d.donorId === myDonor.donorId)
  );

  const handleToggleAvailability = async () => {
    if (!myDonor) return;
    await updateDonor(myDonor.id, { availability: !myDonor.availability });
  };

  const handleToggleEmergency = async () => {
    if (!myDonor) return;
    await updateDonor(myDonor.id, { emergencyAvailable: !myDonor.emergencyAvailable });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-red-50 text-red-700 font-black text-2xl flex items-center justify-center border border-red-200">
            {currentUser.fullName.slice(0, 1)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {currentUser.fullName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                {currentUser.role}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {currentUser.phone}
              </span>
              {currentUser.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {currentUser.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center justify-center gap-1.5 transition-colors self-start sm:self-center"
        >
          <LogOut className="w-4 h-4" />
          লগআউট
        </button>
      </div>

      {/* Donor Controls if registered as donor */}
      {myDonor ? (
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                রক্তদাতা স্ট্যাটাস ({myDonor.bloodGroup} গ্রুপ)
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {myDonor.donorId}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">রক্তদানের প্রস্তুতি</p>
                <p className="text-[11px] text-slate-500">
                  {myDonor.availability ? 'বর্তমানে রক্তদানে প্রস্তুত' : 'অনুপলব্ধ হিসেবে চিহ্নিত'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAvailability}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  myDonor.availability
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {myDonor.availability ? 'প্রস্তুত (ON)' : 'বন্ধ (OFF)'}
              </button>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">জরুরি সেবা (২৪/৭)</p>
                <p className="text-[11px] text-slate-500">জরুরি রাতেও প্রস্তুত</p>
              </div>
              <button
                type="button"
                onClick={handleToggleEmergency}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  myDonor.emergencyAvailable
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {myDonor.emergencyAvailable ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50/40 border border-red-200 rounded-xl p-6 text-center space-y-3">
          <Droplets className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">
            আপনি এখনো রক্তদাতা হিসেবে নিবন্ধিত নন
          </h2>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            মাত্র ২ মিনিটে আপনার রক্তদাতা প্রোফাইল তৈরি করুন এবং জীবন বাঁচাতে এগিয়ে আসুন।
          </p>
          <Link
            to="/become-donor"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold inline-block shadow-xs border border-red-700/60"
          >
            রক্তদাতা হিসেবে নিবন্ধন করুন
          </Link>
        </div>
      )}

      {/* My Blood Requests */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          আমার রক্তের আবেদনসমূহ ({myRequests.length})
        </h2>

        {myRequests.length > 0 ? (
          <div className="space-y-2">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-red-700">{req.bloodGroup}</span>
                    <span className="font-semibold text-slate-800">{req.patientName}</span>
                    <span className="font-mono text-slate-400">({req.requestId})</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">{req.hospital} • {req.requiredDate}</p>
                </div>
                <Link
                  to={`/request/${req.id}`}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-red-700 border border-slate-200 rounded-lg font-bold transition-colors"
                >
                  ম্যাচিং দেখুন
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            আপনার কোনো সক্রিয় রক্তের আবেদন নেই।
          </p>
        )}
      </div>

      {/* My Donation Logs */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          আমার রক্তদানের হিস্ট্রি ({myDonations.length})
        </h2>

        {myDonations.length > 0 ? (
          <div className="space-y-2">
            {myDonations.map((don) => (
              <div
                key={don.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800">{don.hospital}</p>
                  <p className="text-slate-500 mt-0.5">
                    তারিখ: {don.donationDate} • {don.units} ব্যাগ ({don.donationType})
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  যাচাইকৃত
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            এখনো কোনো রক্তদান লিপিবদ্ধ করা হয়নি।
          </p>
        )}
      </div>
    </div>
  );
};
