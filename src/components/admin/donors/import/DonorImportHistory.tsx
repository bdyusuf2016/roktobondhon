import React, { useState, useEffect } from 'react';
import {
  History,
  FileSpreadsheet,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Clock,
  UserCheck,
  Download,
} from 'lucide-react';
import {
  getDonorImportBatches,
  rollbackDonorImportBatch,
  generateErrorReportCsv,
} from '../../../../services/donorImportService';
import type { DonorImportBatchSummary } from '../../../../types/donorImport';
import { useAuth } from '../../../../contexts/AuthContext';
import { useData } from '../../../../contexts/DataContext';

export const DonorImportHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const { addAuditLog } = useData();

  const [batches, setBatches] = useState<DonorImportBatchSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedBatchForDetails, setSelectedBatchForDetails] = useState<DonorImportBatchSummary | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<DonorImportBatchSummary | null>(null);
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isSuperAdminOrAdmin =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const data = await getDonorImportBatches();
      setBatches(data);
    } catch (err) {
      console.error('Error loading import batches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleRollbackConfirm = async () => {
    if (!rollbackTarget) return;
    setIsRollingBack(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await rollbackDonorImportBatch(rollbackTarget.id);
      setActionSuccess(`ব্যাচ "${rollbackTarget.filename}" সফলভাবে রোলব্যাক করা হয়েছে। মোট ${res.deletedCount} জন পেন্ডিং ডোনার মুছে ফেলা হয়েছে।`);
      setRollbackTarget(null);
      addAuditLog(
        `আমদানি ব্যাচ রোলব্যাক: ${rollbackTarget.filename}`,
        'DonorImportBatch',
        rollbackTarget.id,
        { deletedCount: res.deletedCount }
      );
      loadBatches();
    } catch (err: any) {
      setActionError(err.message || 'ব্যাচ রোলব্যাক করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleDownloadBatchErrors = (batch: DonorImportBatchSummary) => {
    if (!batch.errorDetails || batch.errorDetails.length === 0) return;
    const blob = generateErrorReportCsv(batch.errorDetails);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-${batch.id}-errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-red-600" />
            পূর্ববর্তী আমদানি ইতিহাস (Import History & Batches)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            কাগজের তালিকা থেকে আমদানিকৃত ফাইলগুলোর পূর্ণ অডিট ট্রেইল ও লগ
          </p>
        </div>

        <button
          type="button"
          onClick={loadBatches}
          disabled={isLoading}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          রিফ্রেশ
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-500 mb-2" />
          আমদানি হিস্ট্রি লোড হচ্ছে...
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs space-y-2">
          <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-400" />
          <p className="font-bold text-slate-700">এখনো কোনো ডোনার ফাইল আমদানি করা হয়নি।</p>
          <p className="text-slate-400">এক্সেল বা সিএসভি ফাইল থেকে ডোনার আমদানি করলে এখানে বিস্তারিত হিস্ট্রি সংরক্ষিত হবে।</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="p-3">তারিখ ও সময়</th>
                <th className="p-3">ফাইলের নাম</th>
                <th className="p-3">আমদানিকারী</th>
                <th className="p-3 text-center">মোট</th>
                <th className="p-3 text-center">সফল</th>
                <th className="p-3 text-center">ডুপ্লিকেট</th>
                <th className="p-3 text-center">ত্রুটি</th>
                <th className="p-3">অবস্থা</th>
                <th className="p-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono text-slate-600 text-[11px]">
                    {new Date(b.createdAt).toLocaleString('bn-BD', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate max-w-[180px]">{b.filename}</span>
                  </td>
                  <td className="p-3 text-slate-600">
                    {b.importedByName || 'Authorized Staff'}
                  </td>
                  <td className="p-3 text-center font-mono font-bold">{b.totalRows}</td>
                  <td className="p-3 text-center font-mono text-emerald-700 font-bold">{b.successCount}</td>
                  <td className="p-3 text-center font-mono text-indigo-700 font-bold">{b.duplicateCount}</td>
                  <td className="p-3 text-center font-mono text-red-700 font-bold">{b.errorCount}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        b.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : b.status === 'completed_with_errors'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : b.status === 'rolled_back'
                          ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {b.status === 'completed'
                        ? 'সফল'
                        : b.status === 'completed_with_errors'
                        ? 'ত্রুটিসহ সম্পন্ন'
                        : b.status === 'rolled_back'
                        ? 'রোলব্যাককৃত'
                        : 'ব্যর্থ'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {b.errorDetails && b.errorDetails.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleDownloadBatchErrors(b)}
                          title="ত্রুটি ও ডুপ্লিকেট তালিকা ডাউনলোড করুন"
                          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-red-700 rounded-lg"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedBatchForDetails(b)}
                        title="বিস্তারিত দেখুন"
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px]"
                      >
                        বিস্তারিত
                      </button>

                      {isSuperAdminOrAdmin && b.status !== 'rolled_back' && (
                        <button
                          type="button"
                          onClick={() => setRollbackTarget(b)}
                          title="এই ব্যাচের আমদানিকৃত পেন্ডিং প্রোফাইলগুলো রোলব্যাক (মুছে ফেলা) করুন"
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-[11px] border border-red-200 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          রোলব্যাক
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {selectedBatchForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  ব্যাচ বিবরণী: {selectedBatchForDetails.filename}
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedBatchForDetails.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatchForDetails(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500 text-[10px]">মোট সারি</p>
                <p className="font-bold text-slate-900 text-sm font-mono">{selectedBatchForDetails.totalRows}</p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-emerald-700 text-[10px]">সফল</p>
                <p className="font-bold text-emerald-800 text-sm font-mono">{selectedBatchForDetails.successCount}</p>
              </div>
              <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
                <p className="text-indigo-700 text-[10px]">ডুপ্লিকেট</p>
                <p className="font-bold text-indigo-800 text-sm font-mono">{selectedBatchForDetails.duplicateCount}</p>
              </div>
              <div className="p-2.5 bg-red-50 rounded-xl border border-red-200">
                <p className="text-red-700 text-[10px]">ত্রুটি</p>
                <p className="font-bold text-red-800 text-sm font-mono">{selectedBatchForDetails.errorCount}</p>
              </div>
            </div>

            {selectedBatchForDetails.errorDetails && selectedBatchForDetails.errorDetails.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-bold text-slate-800 text-xs">বাদ পড়া বা ডুপ্লিকেট সারির বিবরণ ({selectedBatchForDetails.errorDetails.length} টি)</h5>
                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                  {selectedBatchForDetails.errorDetails.map((err, idx) => (
                    <div key={idx} className="p-2.5 flex items-start justify-between gap-2 hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-900">সারি #{err.rowNumber}: {err.name || 'অজানা'}</span>
                        <span className="font-mono text-slate-500 text-[11px] ml-2">({err.phone || 'ফোন নেই'})</span>
                        <p className="text-red-600 text-[11px] mt-0.5">{err.reason}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {err.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBatchForDetails(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rollback Confirmation Modal */}
      {rollbackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-base">আমদানি ব্যাচ রোলব্যাক নিশ্চিতকরণ</h4>
              <p className="text-xs text-slate-600 mt-1">
                আপনি কি নিশ্চিত যে <strong>"{rollbackTarget.filename}"</strong> ফাইলের মাধ্যমে আমদানিকৃত অপ্রমাণিত (Pending) রক্তদাতাদের প্রোফাইলগুলো ডাটাবেজ থেকে মুছে ফেলতে চান?
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
              <p className="font-bold">সতর্কতা:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                <li>শুধুমাত্র এই ব্যাচের পেন্ডিং এবং অ্যাকাউন্টবিহীন ডোনাররাই মুছে যাবে।</li>
                <li>ইতিমধ্যে ভেরিফাইড হওয়া বা অ্যাকাউন্টের সাথে যুক্ত প্রোফাইল অক্ষত থাকবে।</li>
                <li>এই কাজের পূর্ণ অডিট রেকর্ড সংরক্ষিত হবে।</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isRollingBack}
                onClick={() => setRollbackTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isRollingBack}
                onClick={handleRollbackConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                {isRollingBack ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    রোলব্যাক হচ্ছে...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    হ্যাঁ, রোলব্যাক করুন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
