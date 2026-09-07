import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';

export const AdminDonorsTab: React.FC = () => {
  const { donors, verifyDonor } = useData();
  const { currentUser } = useAuth();
  const [donorFilterStatus, setDonorFilterStatus] = useState<string>('all');
  const [donorSearch, setDonorSearch] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleStatusChange = async (donorId: string, newStatus: 'verified' | 'suspended') => {
    if (verifyingId) return; // Prevent concurrent clicks
    setVerifyingId(donorId);
    setActionError(null);
    try {
      await verifyDonor(donorId, newStatus, currentUser?.fullName || 'Admin');
    } catch (err: any) {
      setActionError(err.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।');
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredDonors = donors.filter((d) => {
    if (donorFilterStatus !== 'all' && d.verificationStatus !== donorFilterStatus) return false;
    if (donorSearch) {
      const q = donorSearch.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.donorId.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.area.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-600 hover:text-red-800 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'pending', 'verified', 'unverified'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setDonorFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                donorFilterStatus === status
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'all'
                ? 'সকল রক্তদাতা'
                : status === 'pending'
                ? 'যাচাইকরণ বাকি (Pending)'
                : status === 'verified'
                ? 'ভেরিফাইড (Verified)'
                : 'অপ্রমাণিত'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={donorSearch}
            onChange={(e) => setDonorSearch(e.target.value)}
            placeholder="আইডি, নাম, ফোন বা এলাকা..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-300 w-full sm:w-60 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-y border-slate-200 text-slate-600">
            <tr>
              <th className="py-2.5 px-3 font-semibold">ডোনার আইডি</th>
              <th className="py-2.5 px-3 font-semibold">নাম</th>
              <th className="py-2.5 px-3 font-semibold">রক্তের গ্রুপ</th>
              <th className="py-2.5 px-3 font-semibold">অবস্থান</th>
              <th className="py-2.5 px-3 font-semibold">মোবাইল</th>
              <th className="py-2.5 px-3 font-semibold">স্ট্যাটাস</th>
              <th className="py-2.5 px-3 text-right font-semibold">অ্যাকশন (Action)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDonors.slice(0, 50).map((d) => {
              const isCurrentVerifying = verifyingId === d.id;
              return (
                <tr key={d.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {d.donorId}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {d.fullName}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {d.bloodGroup}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {d.area}, {d.upazila}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-mono">
                    {d.phone}
                  </td>
                  <td className="py-2.5 px-3">
                    {d.verificationStatus === 'verified' ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1">
                    {d.verificationStatus !== 'verified' ? (
                      <button
                        type="button"
                        disabled={Boolean(verifyingId)}
                        onClick={() => handleStatusChange(d.id, 'verified')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          isCurrentVerifying
                            ? 'bg-emerald-400 text-white cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isCurrentVerifying ? 'যাচাই হচ্ছে...' : 'Verify'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(verifyingId)}
                        onClick={() => handleStatusChange(d.id, 'suspended')}
                        className={`px-2 py-1 rounded text-[11px] transition-colors ${
                          isCurrentVerifying
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-700'
                        }`}
                      >
                        {isCurrentVerifying ? 'প্রসেস হচ্ছে...' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
