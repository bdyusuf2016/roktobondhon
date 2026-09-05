import React, { useState } from 'react';
import { Phone, Mail, MapPin, Building2, Send, CheckCircle2 } from 'lucide-react';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import { useData } from '../contexts/DataContext';

export const ContactPage: React.FC = () => {
  const { config } = useOrgConfig();
  const { branches } = useData();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setName('');
    setPhone('');
    setMessage('');
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          যোগাযোগ ও কেন্দ্রীয় সহায়তা
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          ধামরাই, সাভার ও মানিকগঞ্জে যেকোনো সহায়তায় আমাদের সাথে সরাসরি যোগাযোগ করুন
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs space-y-6 text-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">
              জরুরি হটলাইন ও কেন্দ্রীয় দপ্তর
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <Phone className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">২৪/৭ জরুরি রক্তের হটলাইন</span>
                  <a href={`tel:${config.emergencyHotline}`} className="font-bold text-sm text-red-700 hover:underline">
                    {config.emergencyHotline}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">ইমেইল সহায়তা</span>
                  <span className="font-bold text-slate-800">{config.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">কেন্দ্রীয় কার্যালয়</span>
                  <span className="font-medium text-slate-800">{config.address}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-2"> শাখাভিত্তিক ফোকাল পয়েন্ট</h3>
            <div className="space-y-2">
              {branches.map((b) => (
                <div key={b.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{b.nameBn}</p>
                    <p className="text-[11px] text-slate-500">{b.coordinatorName}</p>
                  </div>
                  <a href={`tel:${b.coordinatorPhone}`} className="text-red-600 font-bold hover:underline">
                    {b.coordinatorPhone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            আমাদের বার্তা পাঠান
          </h2>

          {sent && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>আপনার বার্তা সফলভাবে পাঠানো হয়েছে। ধন্যবাদ!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                আপনার নাম *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: রাশেদুল ইসলাম"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                মোবাইল নম্বর *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                বার্তা / মতামত *
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="আপনার বার্তা বা প্রশ্ন লিখুন..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-xs transition-colors border border-red-700/60"
            >
              <Send className="w-3.5 h-3.5" />
              বার্তা প্রেরণ করুন
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
