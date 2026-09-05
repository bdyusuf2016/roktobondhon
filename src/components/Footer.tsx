import React from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Heart, Shield, Phone, Mail, MapPin } from 'lucide-react';
import { useOrgConfig } from '../contexts/OrgConfigContext';

export const Footer: React.FC = () => {
  const { config } = useOrgConfig();

  return (
    <footer className="bg-slate-950 text-slate-300 pt-12 pb-24 lg:pb-12 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Brand & Mission */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600 border border-red-500/40 flex items-center justify-center text-white shadow-xs">
                <Droplets className="w-5 h-5 fill-white" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">{config.name}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {config.footerAboutBn ||
                'ধামরাই, সাভার ও মানিকগঞ্জে জরুরি রক্তের প্রয়োজনে নিঃস্বার্থ রক্তদাতাদের তাৎক্ষণিক সংযোগকারী মানবিক ও স্বেচ্ছাসেবী প্রযুক্তি প্ল্যাটফর্ম।'}
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <Shield className="w-4 h-4" />
              <span>{config.footerSecurityBadgeBn || 'নিরাপদ ও প্রাইভেসি-সুরক্ষিত ডোনার ডেটাবেজ'}</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase mb-3">
              প্রয়োজনীয় লিংক
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/find-blood" className="text-slate-400 hover:text-white transition-colors">
                  রক্তদাতা খুঁজুন (Smart Search)
                </Link>
              </li>
              <li>
                <Link to="/request-blood" className="text-slate-400 hover:text-white transition-colors">
                  রক্তের জরুরি আবেদন করুন
                </Link>
              </li>
              <li>
                <Link to="/become-donor" className="text-slate-400 hover:text-white transition-colors">
                  রক্তদাতা হিসেবে নিবন্ধন
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-slate-400 hover:text-white transition-colors">
                  কার্যপ্রণালী ও নির্দেশিকা
                </Link>
              </li>
              <li>
                <Link to="/hospitals" className="text-slate-400 hover:text-white transition-colors">
                  হাসপাতাল ও ব্লাড ব্যাংক তালিকা
                </Link>
              </li>
              <li>
                <Link to="/donate" className="text-red-400 font-bold hover:text-red-300 transition-colors">
                  ❤️ ডোনেট এবং সাপোর্ট করুন
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-slate-400 hover:text-white transition-colors">
                  সাধারণ প্রশ্নোত্তর (FAQ)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Coverage Areas */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase mb-3">
              কার্যক্রমের আওতাভুক্ত এলাকা
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <p className="font-bold text-slate-100">{config.coverageArea1Title || 'ধামরাই ও সাভার শাখা (ঢাকা)'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{config.coverageArea1Details || 'ধামরাই সদর, কালামপুর, কুশুরা, বালিয়া, সাভার বাজার, আশুলিয়া'}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <p className="font-bold text-slate-100">{config.coverageArea2Title || 'মানিকগঞ্জ জেলা শাখা'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{config.coverageArea2Details || 'মানিকগঞ্জ সদর, সিংগাইর, সাটুরিয়া, শিবালয়, হরিরামপুর'}</p>
              </div>
            </div>
          </div>

          {/* Column 4: Emergency Hotline */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase mb-3">
              জরুরি যোগাযোগ
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-500 shrink-0" />
                <a href={`tel:${config.emergencyHotline}`} className="font-bold text-red-400 hover:underline font-mono tracking-wider">
                  {config.emergencyHotline}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-400">{config.email}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-400">{config.address}</span>
              </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-3 text-xs">
              <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">প্রাইভেসি পলিসি</Link>
              <span className="text-slate-700">•</span>
              <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">ব্যবহারের শর্তাবলী</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800/90 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {config.name}। {config.footerCopyrightText || 'সর্বস্বত্ব সংরক্ষিত।'}</p>
          <p className="flex items-center gap-1.5">
            <span>নির্মিত হয়েছে মানবতার কল্যাণে</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
            <span className="text-slate-400">{config.footerTaglineBn || 'ধামরাই, সাভার ও মানিকগঞ্জ'}</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
