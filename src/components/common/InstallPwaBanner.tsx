import React, { useState } from 'react';
import { Smartphone, Download, X, CheckCircle2 } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { useSystemConfig } from '../../contexts/SystemConfigContext';

export const InstallPwaBanner: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const { config } = useSystemConfig();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already installed, not installable, dismissed, or disabled in config
  if (!isInstallable || isInstalled || isDismissed || config.pwa?.installBannerEnabled === false) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 animate-slideUp">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white">
              {config.pwa?.appNameBn || 'রক্তবন্ধন অ্যাপ ইনস্টল করুন'}
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              অফলাইনে রক্তদাতা খুঁজতে এবং দ্রুত জরুরি রক্তের আবেদন পেতে ফোনে অ্যাপটি যোগ করুন।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg transition-colors"
        >
          পরে
        </button>
        <button
          type="button"
          onClick={handleInstall}
          disabled={isInstalling}
          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isInstalling ? 'ইনস্টল হচ্ছে...' : 'ইনস্টল করুন'}</span>
        </button>
      </div>
    </div>
  );
};
