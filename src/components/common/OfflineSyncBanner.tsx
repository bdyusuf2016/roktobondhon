import React, { useState } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export const OfflineSyncBanner: React.FC = () => {
  const { isOnline, pendingSyncCount, triggerSync } = usePWA();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // If online and no pending queue, do not render
  if (isOnline && pendingSyncCount === 0 && !syncFeedback) {
    return null;
  }

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const { processed, failed } = await triggerSync();
      if (processed > 0 || failed > 0) {
        setSyncFeedback(`${processed} টি ডেটা সফলভাবে ক্লাউডে সিঙ্ক হয়েছে${failed > 0 ? `, ${failed} টি ব্যর্থ` : ''}।`);
        setTimeout(() => setSyncFeedback(null), 5000);
      } else {
        setSyncFeedback('সিঙ্ক করার মতো কোনো অফলাইন ডেটা নেই।');
        setTimeout(() => setSyncFeedback(null), 3000);
      }
    } catch {
      setSyncFeedback('সিঙ্ক করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করুন।');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      className={`w-full px-4 py-2 text-xs font-semibold flex items-center justify-between transition-all duration-300 z-50 sticky top-0 shadow-xs ${
        !isOnline
          ? 'bg-amber-500 text-amber-950'
          : syncFeedback
          ? 'bg-emerald-600 text-white'
          : 'bg-indigo-600 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <WifiOff className="w-4 h-4 text-amber-950 shrink-0 animate-pulse" />
          ) : syncFeedback ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <Wifi className="w-4 h-4 shrink-0" />
          )}

          <div>
            {!isOnline ? (
              <span>
                <strong>অফলাইন মোড সক্রিয়:</strong> ইন্টারনেট সংযোগ বিচ্ছিন্ন। আপনার আবেদন ও তথ্য অফলাইনে সংরক্ষিত হচ্ছে।
              </span>
            ) : syncFeedback ? (
              <span>{syncFeedback}</span>
            ) : (
              <span>
                <strong>অফলাইন ডেটা প্রস্তুত:</strong> {pendingSyncCount} টি অফলাইন আবেদন/অ্যাকশন ক্লাউডে সিঙ্ক করার অপেক্ষায়।
              </span>
            )}
          </div>
        </div>

        {isOnline && pendingSyncCount > 0 && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-1 bg-white text-indigo-900 hover:bg-indigo-50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক করুন'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
