import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  MapPin,
  Calendar,
  Award,
  Phone,
  Send,
  Droplets,
  ArrowLeft,
  Lock,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { RequestDonorModal } from '../components/RequestDonorModal';

export const DonorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { donors, donations } = useData();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const donor = donors.find((d) => d.id === id || d.donorId === id);

  if (!donor) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          রক্তদাতার প্রোফাইল পাওয়া যায়নি
        </h2>
        <Link
          to="/find-blood"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg border border-red-700/60 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          রক্তদাতা তালিকায় ফিরে যান
        </Link>
      </div>
    );
  }

  const isSelf = currentUser?.id === donor.userId;
  const isPrivileged =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'moderator';

  const canSeePrivate = isSelf || isPrivileged;
  const canSeePhone = canSeePrivate || donor.privacy.showPhone;

  // Donor's verified donations
  const donorDonations = donations.filter(
    (don) => don.donorId === donor.donorId || don.donorUserId === donor.userId
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        পূর্ববর্তী পাতায় যান
      </button>

      {/* Main Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Blood Group Badge */}
            <div className="w-20 h-20 rounded-xl bg-red-600 text-white flex flex-col items-center justify-center font-black border border-red-700/80 shadow-xs shrink-0 font-mono">
              <span className="text-3xl leading-none">{donor.bloodGroup}</span>
              <span className="text-[10px] font-bold opacity-90 mt-1 uppercase font-sans">রক্তের গ্রুপ</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {donor.fullName}
                </h1>
                {donor.verificationStatus === 'verified' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ভেরিফাইড ডোনার
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    যাচাইকরণ বাকি
                  </span>
                )}
              </div>

              <p className="text-xs font-mono text-slate-500">
                Donor ID: <strong className="text-slate-800">{donor.donorId}</strong>
              </p>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {donor.area}, {donor.upazila}, {donor.district}
                </span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs border border-red-700/60 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              রক্তের অনুরোধ পাঠান
            </button>

            <Link
              to={`/certificate?donorId=${donor.donorId}`}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-300 transition-colors shadow-2xs"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              সনদপত্র ও মেডেল
            </Link>

            {canSeePhone && (
              <a
                href={`tel:${donor.phone}`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                {donor.phone}
              </a>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block font-medium">রক্তদানে প্রস্তুতি</span>
            <span className={`font-bold mt-1 block ${donor.availability ? 'text-emerald-700' : 'text-amber-700'}`}>
              {donor.availability ? '● প্রস্তুত' : '○ অনুপলব্ধ'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block font-medium">মোট রক্তদান</span>
            <span className="font-bold text-slate-800 mt-1 block">
              {donor.totalDonations || 0} বার
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block font-medium">সর্বশেষ রক্তদান</span>
            <span className="font-bold text-slate-800 mt-1 block">
              {donor.lastDonationDate || 'রেকর্ড নেই'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
            <span className="text-[10px] text-slate-500 block font-medium">জরুরি সেবা</span>
            <span className="font-bold text-red-700 mt-1 block">
              {donor.emergencyAvailable ? '২৪/৭ প্রস্তুত' : 'স্বাভাবিক'}
            </span>
          </div>
        </div>

        {!canSeePrivate && !donor.privacy.showPhone && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              ব্যক্তিগত গোপনীয়তা নীতির কারণে রক্তদাতার ফোন নম্বর গোপন রাখা হয়েছে। সরাসরি অ্যাপের মাধ্যমে রক্তের অনুরোধ পাঠাতে পারবেন।
            </span>
          </div>
        )}
      </div>

      {/* Donation History Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              রক্তদানের ইতিহাস ({donorDonations.length})
            </h2>
          </div>
        </div>

        {donorDonations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">তারিখ</th>
                  <th className="py-2.5 px-3">হাসপাতাল</th>
                  <th className="py-2.5 px-3">ধরন</th>
                  <th className="py-2.5 px-3">পরিমাণ</th>
                  <th className="py-2.5 px-3">যাচাইকারী</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donorDonations.map((don) => (
                  <tr key={don.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {don.donationDate}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{don.hospital}</td>
                    <td className="py-2.5 px-3 text-slate-600">{don.donationType}</td>
                    <td className="py-2.5 px-3 font-bold text-red-700">{don.units} ব্যাগ</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {don.verifiedBy || 'ভলান্টিয়ার টিম'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            এখনো কোনো রক্তদানের হিস্ট্রি রেকর্ড করা হয়নি।
          </div>
        )}
      </div>

      {isModalOpen && (
        <RequestDonorModal
          donor={donor}
          matchScore={90}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
