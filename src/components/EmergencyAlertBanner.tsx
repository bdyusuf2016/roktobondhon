import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Phone, ArrowRight, X, AlertTriangle } from 'lucide-react';
import { useSystemConfig } from '../contexts/SystemConfigContext';

export const EmergencyAlertBanner: React.FC = () => {
  const { config } = useSystemConfig();
  const [isDismissed, setIsDismissed] = useState(false);

  const emergencyMode = config.emergency?.emergencyMode;
  const emergencyPhone = config.organization?.emergencyPhone || config.organization?.phone || '+8801712-345678';

  if (!emergencyMode || isDismissed) {
    return null;
  }

  return (
    <aside aria-label="জরুরি রেড অ্যালার্ট নোটিশ" className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-md relative z-40 border-b border-red-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-semibold">
          {/* Alert Message */}
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <span className="p-1 bg-white/20 rounded-lg shrink-0 animate-bounce">
              <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
            </span>
            <span>
              <strong className="font-extrabold text-amber-200">জরুরি রেড অ্যালার্ট (Emergency Red Alert):</strong>{' '}
              ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের সংকট দেখা দিয়েছে। রক্তদাতাদের জরুরি ভিত্তিতে রক্তদানে এগিয়ে আসার জন্য অনুরোধ করা হচ্ছে!
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/find-blood"
              className="px-3 py-1 bg-white text-red-700 hover:bg-rose-50 font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1"
            >
              <span>জরুরি আবেদনসমূহ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <a
              href={`tel:${emergencyPhone}`}
              className="px-2.5 py-1 bg-red-900/60 hover:bg-red-900 text-white rounded-lg text-xs flex items-center gap-1 border border-red-400/40 transition-colors"
            >
              <Phone className="w-3 h-3" />
              <span>{emergencyPhone}</span>
            </a>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="বন্ধ করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
