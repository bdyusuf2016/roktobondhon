import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Flame,
  Activity,
  Droplet,
  Award,
  PhoneCall,
  MessageSquare,
  CheckCircle2,
  Palette,
  Maximize2,
  Copy,
  Check,
  Eye,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Code2,
} from 'lucide-react';
import {
  ModalTheme,
  EmergencyAlertModal,
  EligibilityCheckModal,
  BloodCompatibilityModal,
  DonorAppreciationModal,
  EmergencyHotlineModal,
  FeedbackReportModal,
  BaseModal,
} from '../components/modals';
import { useDialog } from '../contexts/DialogContext';

export const ModalShowcasePage: React.FC = () => {
  const dialog = useDialog();

  // Global theme switcher for preview
  const [selectedTheme, setSelectedTheme] = useState<ModalTheme>('modern');

  // Modal visibility states
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isEligibilityOpen, setIsEligibilityOpen] = useState(false);
  const [isCompatibilityOpen, setIsCompatibilityOpen] = useState(false);
  const [isAppreciationOpen, setIsAppreciationOpen] = useState(false);
  const [isHotlineOpen, setIsHotlineOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isCustomBaseOpen, setIsCustomBaseOpen] = useState(false);

  // Result log for window dialog replacements
  const [lastDialogResult, setLastDialogResult] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const themesList: { id: ModalTheme; name: string; desc: string; previewBadge: string }[] = [
    {
      id: 'modern',
      name: 'মডার্ন ক্লিন (Modern Clean)',
      desc: 'ক্রিস্প হোয়াইট ও স্লেট বর্ডার, সূক্ষ্ম শ্যাডো এবং পেশাদার ভিজ্যুয়াল শৈলী।',
      previewBadge: 'bg-white text-slate-800 border-slate-300',
    },
    {
      id: 'glassmorphism',
      name: 'ফ্রস্টেড গ্লাস (Glassmorphism)',
      desc: 'উচ্চ ব্যাকড্রপ ব্লার (Backdrop blur), ট্রান্সলুসেন্ট ব্যাকগ্রাউন্ড ও নরম আলো।',
      previewBadge: 'bg-white/70 backdrop-blur-md text-slate-900 border-white/50',
    },
    {
      id: 'emergency',
      name: 'জরুরি ক্রাইসিস পালস (Emergency Crimson)',
      desc: 'রক্তিম গ্লো ও হাই-কনট্রাস্ট অ্যালার্ট রিং, জরুরি রক্তের রিকুয়েস্টের জন্য আদর্শ।',
      previewBadge: 'bg-red-50 text-red-700 border-red-400 ring-2 ring-red-200',
    },
    {
      id: 'darkLuxury',
      name: 'স্লিক ডার্ক মোড (Dark Luxury)',
      desc: 'ডিপ স্লেট-৯৫০ এবং উজ্জ্বল নিয়ন কন্ট্রাস্ট, ওলেড স্ক্রিন বান্ধব প্রিমিয়াম লুক।',
      previewBadge: 'bg-slate-900 text-white border-slate-700',
    },
    {
      id: 'warmFriendly',
      name: 'স্নিগ্ধ মানবিক (Warm Friendly)',
      desc: 'রোজ ও অ্যাম্বার গ্র্যাডিয়েন্ট, রক্তদাতাদের ধন্যবাদ ও সনদের জন্য আন্তরিক আবহ।',
      previewBadge: 'bg-gradient-to-r from-rose-100 to-amber-100 text-rose-950 border-rose-300',
    },
  ];

  const modalCards = [
    {
      id: 'emergency',
      title: 'জরুরি রক্তের ব্রডকাস্ট ডায়ালগ',
      subtitle: 'Emergency Alert Modal',
      badge: 'হাই প্রায়োরিটি',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      icon: <Flame className="w-5 h-5 text-red-600" />,
      desc: 'জরুরি রক্তের চাহিদা সম্পন্ন রোগীদের জন্য তাত্ক্ষণিক এসএমএস ও পুশ ব্রডকাস্ট পাঠানোর জন্য ডিজাইন করা ডায়ালগ।',
      trigger: () => setIsEmergencyOpen(true),
    },
    {
      id: 'eligibility',
      title: 'রক্তদানের যোগ্যতা যাচাইকরণ কুইজ',
      subtitle: 'Medical Eligibility Quiz Modal',
      badge: 'ইন্টারেক্টিভ ক্যালকুলেটর',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: <Activity className="w-5 h-5 text-emerald-600" />,
      desc: 'বয়স, ওজন, রক্তের মধ্যবর্তী ব্যবধান ও স্বাস্থ্য সংক্রান্ত প্রশ্নের মাধ্যমে তাৎক্ষণিক যোগ্যতা নির্ধারণ।',
      trigger: () => setIsEligibilityOpen(true),
    },
    {
      id: 'compatibility',
      title: 'রক্তের গ্রুপ সামঞ্জস্যতা ডায়ালগ',
      subtitle: 'Blood Compatibility Matrix Modal',
      badge: 'ভিজ্যুয়াল ইনফোগ্রাফিক',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <Droplet className="w-5 h-5 text-blue-600" />,
      desc: 'ইন্টারেক্টিভ চার্ট যাতে ক্লিক করে যেকোনো রক্তের গ্রুপের দাতা ও গ্রহীতার ম্যাচিং সরাসরি দেখা যায়।',
      trigger: () => setIsCompatibilityOpen(true),
    },
    {
      id: 'appreciation',
      title: 'রক্তদাতা সম্মাননা সনদ ও ব্যাজ',
      subtitle: 'Donor Appreciation & Certificate',
      badge: 'স্বীকৃতি ও শেয়ার',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: <Award className="w-5 h-5 text-amber-600" />,
      desc: 'রক্তদাতাকে অভিবাদন জানাতে গোল্ড ব্যাজ, সংরক্ষিত জীবনের সংখ্যা এবং ভার্চুয়াল সার্টিফিকেট কার্ড।',
      trigger: () => setIsAppreciationOpen(true),
    },
    {
      id: 'hotline',
      title: 'জরুরি হটলাইন ও অ্যাম্বুলেন্স ডায়ালার',
      subtitle: 'Emergency Hotline Modal',
      badge: 'দ্রুত কল ও সহায়তা',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: <PhoneCall className="w-5 h-5 text-rose-600" />,
      desc: '৯৯৯, কেন্দ্রীয় ব্লাড ব্যাংক, সরকারি হাসপাতাল ও স্থানীয় অ্যাম্বুলেন্সের হটলাইন নম্বর এক ট্যাপে কল ও কপি করার ব্যবস্থা।',
      trigger: () => setIsHotlineOpen(true),
    },
    {
      id: 'feedback',
      title: 'মতামত ও অভিযোগ রিপোর্ট ডায়ালগ',
      subtitle: 'Feedback & Issue Reporter',
      badge: 'ইউজার রেটিং ও ফর্ম',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: <MessageSquare className="w-5 h-5 text-purple-600" />,
      desc: 'স্টার রেটিং, ক্যাটাগরি ড্রপডাউন এবং নিরাপদ রিপোর্ট জমা দেওয়ার জন্য প্রস্তুত ডায়ালগ মডাল।',
      trigger: () => setIsFeedbackOpen(true),
    },
  ];

  const codeExample = `// window.alert / window.confirm এর পরিবর্তে ব্যবহার করুন:
import { useDialog } from './contexts/DialogContext';

const MyComponent = () => {
  const dialog = useDialog();

  // 1. সুন্দর Alert ডায়ালগ:
  await dialog.alert({
    title: 'রক্তদান সম্পন্ন!',
    message: 'রক্তদাতার তথ্য সফলভাবে রেকর্ড করা হয়েছে।',
    type: 'success', // 'success' | 'warning' | 'danger' | 'info'
  });

  // 2. সুন্দর Confirm ডায়ালগ (Promise boolean ফেরত দেয়):
  const isConfirmed = await dialog.confirm({
    title: 'আবেদন মুছে ফেলবেন?',
    message: 'আপনি কি নিশ্চিত যে এই আবেদনটি বাতিল করতে চান?',
    type: 'danger',
    confirmText: 'হ্যাঁ, মুছুন',
    cancelText: 'বাতিল',
  });
  if (isConfirmed) {
    // অ্যাকশন সম্পাদন করুন
  }
};`;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(codeExample);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-red-950 text-white p-6 sm:p-10 shadow-2xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/30 border border-red-500/40 text-red-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            <span>ডায়ালগ মডাল ডিজাইন সিস্টেম ও গ্যালারি</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            আধুনিক ও নান্দনিক ডায়ালগ মডাল কালেকশন
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            বিরক্তিকর ডিফল্ট <code className="bg-slate-800 px-1.5 py-0.5 rounded text-red-300 font-mono text-xs">window.alert()</code> ও <code className="bg-slate-800 px-1.5 py-0.5 rounded text-red-300 font-mono text-xs">window.confirm()</code> এর পরিবর্তে মসৃণ অ্যানিমেশন, আধুনিক ব্যাকড্রপ ব্লার এবং বিভিন্ন কাজের জন্য বিশেষায়িত প্রিমিয়াম ডায়ালগ বক্স।
          </p>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-red-600/20 to-transparent pointer-events-none"></div>
      </div>

      {/* ========================================================================= */}
      {/* WINDOW.ALERT & WINDOW.CONFIRM REPLACEMENT SHOWCASE (HIGH-PRIORITY SECTION) */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-red-200/80 shadow-lg space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Window.dialogue এর আধুনিক প্রিমিয়াম বিকল্প</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              কাস্টম অ্যালার্ট, কনফার্ম ও প্রম্পট ডায়ালগ টেস্ট করুন
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              নিচের বাটনগুলোতে ক্লিক করে দেখুন কীভাবে ব্রাউজারের ধূসর পপআপের জায়গায় মসৃণ ইন্টার‍্যাক্টিভ ডায়ালগ প্রদর্শিত হয়
            </p>
          </div>

          {lastDialogResult && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-semibold text-slate-500 block text-[10px] uppercase tracking-wider">
                সর্বশেষ ডায়ালগ আউটপুট:
              </span>
              <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                {lastDialogResult}
              </span>
            </div>
          )}
        </div>

        {/* Action Trigger Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Success Alert */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>সাফল্য অ্যালার্ট (Success Alert)</span>
              </div>
              <p className="text-xs text-slate-600">
                তথ্য সংরক্ষণ, রক্তদানের আবেদন বা কপি নিশ্চিতকরণের জন্য।
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await dialog.alert({
                  title: 'রক্তদান রেকর্ড সম্পন্ন!',
                  message: 'রক্তদাতার প্রোফাইলে সফলভাবে রক্তদানের নতুন তথ্য যুক্ত হয়েছে। মানবতার কল্যাণে ধন্যবাদ।',
                  type: 'success',
                  confirmText: 'অসাধারণ, বুঝেছি',
                });
                setLastDialogResult('Success Alert: ব্যবহারকারী ডায়ালগ বন্ধ করেছেন');
              }}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
            >
              সাকসেস অ্যালার্ট টেস্ট
            </button>
          </div>

          {/* Danger / Warning Alert */}
          <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-red-800 font-bold text-xs uppercase mb-1">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                <span>সতর্কতা অ্যালার্ট (Danger Alert)</span>
              </div>
              <p className="text-xs text-slate-600">
                জরুরি নোটিফিকেশন, মেয়াদোত্তীর্ণ অনুরোধ বা ভুল ইনপুট সতর্কতায়।
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await dialog.alert({
                  title: 'জরুরি রক্তের চাহিদা!',
                  message: 'রোগীর অবস্থা আশঙ্কাজনক। অতিদ্রুত এনাম মেডিকেল কলেজ হাসপাতালের ব্লাড ব্যাংকে যোগাযোগ করুন।',
                  type: 'danger',
                  confirmText: 'জরুরি নোটিশ গৃহীত',
                });
                setLastDialogResult('Danger Alert: জরুরি সতর্কতা প্রদর্শন সমাপ্ত');
              }}
              className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
            >
              ডেঞ্জার অ্যালার্ট টেস্ট
            </button>
          </div>

          {/* Confirm Dialog (Returns Boolean) */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>কনফার্ম ডায়ালগ (Confirm Box)</span>
              </div>
              <p className="text-xs text-slate-600">
                মুছে ফেলা বা গুরুত্বপূর্ণ সিদ্ধান্ত নেওয়ার আগে ইউজার কনফার্মেশন।
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const res = await dialog.confirm({
                  title: 'রক্তের আবেদন মুছে ফেলবেন?',
                  message: 'আপনি কি নিশ্চিত যে এই আবেদনটি ডেটাবেজ থেকে স্থায়ীভাবে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।',
                  type: 'danger',
                  confirmText: 'হ্যাঁ, মুছে ফেলুন',
                  cancelText: 'না, রাখুন',
                });
                setLastDialogResult(`Confirm Dialog: ফলাফল = ${res ? '✅ "হ্যাঁ, মুছে ফেলুন" ক্লিক করা হয়েছে (True)' : '❌ "বাতিল" ক্লিক করা হয়েছে (False)'}`);
              }}
              className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
            >
              কনফার্ম ডায়ালগ টেস্ট
            </button>
          </div>

          {/* Prompt Dialog (Returns String) */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase mb-1">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <span>প্রম্পট ডায়ালগ (Input Prompt)</span>
              </div>
              <p className="text-xs text-slate-600">
                ছোট টেক্সট, কারণ বা নোট নেওয়ার জন্য ইনপুট ডায়ালগ।
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const res = await dialog.prompt({
                  title: 'বাতিলের কারণ উল্লেখ করুন',
                  message: 'আবেদনটি বাতিল করার কারণ সংক্ষেপে লিখুন:',
                  placeholder: 'যেমন: রক্তদাতা পেয়ে গেছি / রোগী সুস্থ',
                  confirmText: 'সাবমিট করুন',
                  cancelText: 'বাতিল',
                });
                setLastDialogResult(`Prompt Dialog: ইনপুট দেওয়া হয়েছে = "${res !== null ? res : 'বাতিল করা হয়েছে'}"`);
              }}
              className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
            >
              প্রম্পট ডায়ালগ টেস্ট
            </button>
          </div>
        </div>
      </section>

      {/* Global Theme Switcher Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              গ্লোবাল মডাল থিম নির্বাচন করুন (Theme Switcher):
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            যেকোনো থিম সিলেক্ট করে নিচের মডালগুলোতে ক্লিক করে লাইভ পরিবর্তন দেখুন
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {themesList.map((t) => {
            const isSelected = selectedTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTheme(t.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-red-600 bg-red-50/50 shadow-sm ring-2 ring-red-500/20 scale-[1.02]'
                    : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${t.previewBadge}`}>
                    {t.id}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                </div>
                <h4 className="font-bold text-xs text-slate-900">{t.name}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Modal Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-600" />
            বিভিন্ন বিশেষায়িত ডায়ালগ মডাল লাইভ ডেমো
          </h2>
          <span className="text-xs font-semibold text-slate-500">মোট ৬টি রেডিমেড ডিজাইন</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modalCards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {card.icon}
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">{card.title}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{card.subtitle}</p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
              </div>

              <div className="pt-5 border-t border-slate-100 mt-5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  থিম: <strong className="text-slate-700 uppercase">{selectedTheme}</strong>
                </span>
                <button
                  type="button"
                  onClick={card.trigger}
                  className="px-4 py-2 bg-slate-900 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>ওপেন করে দেখুন</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom BaseModal Test Box */}
      <div className="bg-gradient-to-r from-red-50 via-white to-slate-50 rounded-2xl p-6 border border-red-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-slate-900 text-base">কাস্টম ডায়ালগ মডাল টেস্ট করতে চান?</h3>
          <p className="text-xs text-slate-600 max-w-xl">
            যে কোনো নতুন ফর্ম, কনফার্মেশন প্রম্পট বা কনটেন্টের জন্য সরাসরি <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-red-600 text-xs">&lt;BaseModal /&gt;</code> ব্যবহার করতে পারেন।
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCustomBaseOpen(true)}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-red-600/20 shrink-0 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
          <span>কাস্টম বেস মডাল খুলুন</span>
        </button>
      </div>

      {/* Code Snippet Box */}
      <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 text-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>রিসোর্স কোড ব্যবহার নির্দেশিকা (Component Usage)</span>
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'কপি হয়েছে' : 'কোড কপি করুন'}</span>
          </button>
        </div>
        <pre className="text-xs font-mono bg-slate-900 p-4 rounded-xl overflow-x-auto text-emerald-400 border border-slate-850 leading-relaxed">
          {codeExample}
        </pre>
      </div>

      {/* ALL MODAL INSTANCES CONTROLLED HERE */}
      <EmergencyAlertModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        theme={selectedTheme}
      />

      <EligibilityCheckModal
        isOpen={isEligibilityOpen}
        onClose={() => setIsEligibilityOpen(false)}
        theme={selectedTheme}
      />

      <BloodCompatibilityModal
        isOpen={isCompatibilityOpen}
        onClose={() => setIsCompatibilityOpen(false)}
        theme={selectedTheme}
      />

      <DonorAppreciationModal
        isOpen={isAppreciationOpen}
        onClose={() => setIsAppreciationOpen(false)}
        theme={selectedTheme}
      />

      <EmergencyHotlineModal
        isOpen={isHotlineOpen}
        onClose={() => setIsHotlineOpen(false)}
        theme={selectedTheme}
      />

      <FeedbackReportModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        theme={selectedTheme}
      />

      {/* Custom BaseModal Demo */}
      <BaseModal
        isOpen={isCustomBaseOpen}
        onClose={() => setIsCustomBaseOpen(false)}
        theme={selectedTheme}
        size="md"
        icon={
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
        }
        title="কাস্টম বেস ডায়ালগ (Base Modal)"
        subtitle={`বর্তমান সক্রিয় থিম: ${selectedTheme}`}
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCustomBaseOpen(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
            >
              বন্ধ করুন
            </button>
            <button
              type="button"
              onClick={() => setIsCustomBaseOpen(false)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              নিশ্চিত করুন
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs leading-relaxed text-slate-600">
          <p>
            এই মডালটি সম্পূর্ণ ডাইনামিক। আপনি সহজেই এর সাইজ (<code className="font-mono text-red-600">sm, md, lg, xl, 2xl</code>), থিম (<code className="font-mono text-red-600">modern, glassmorphism, emergency, darkLuxury, warmFriendly</code>), হেডার আইকন এবং ফুটার পরিবর্তন করতে পারেন।
          </p>
          <div className="p-3 rounded-xl bg-slate-100/70 border border-slate-200 font-medium text-slate-800">
            ✓ স্বয়ংক্রিয়ভাবে ESC প্রেস করলে বন্ধ হয়<br />
            ✓ ব্যাকড্রপে ক্লিক করলে বন্ধ হয়<br />
            ✓ ব্যাকগ্রাউন্ড স্ক্রোল লক সুরক্ষা অন্তর্ভুক্ত
          </div>
        </div>
      </BaseModal>
    </div>
  );
};
