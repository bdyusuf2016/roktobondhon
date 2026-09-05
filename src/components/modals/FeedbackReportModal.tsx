import React, { useState } from 'react';
import { BaseModal, ModalTheme } from './BaseModal';
import { MessageSquare, Star, Send, CheckCircle2 } from 'lucide-react';

interface FeedbackReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ModalTheme;
}

export const FeedbackReportModal: React.FC<FeedbackReportModalProps> = ({
  isOpen,
  onClose,
  theme = 'modern',
}) => {
  const [type, setType] = useState<'feedback' | 'report'>('feedback');
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<string>('সেবার মান ও অভিজ্ঞতা');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setMessage('');
        onClose();
      }, 1500);
    }, 1000);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      size="md"
      icon={
        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/20">
          <MessageSquare className="w-5 h-5" />
        </div>
      }
      title={type === 'feedback' ? 'আপনার মতামত ও অভিজ্ঞতা জানান' : 'সমস্যা বা অভিযোগ রিপোর্ট করুন'}
      subtitle="আপনার প্রতিটি মতামত প্ল্যাটফর্মটিকে আরও নির্ভুল ও দ্রুত সেবা দিতে সাহায্য করবে"
    >
      {isSubmitted ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">ধন্যবাদ! আপনার বার্তা জমা হয়েছে</h4>
          <p className="text-xs text-slate-600">
            রক্তবন্ধন এডমিন ও ভলান্টিয়ার টিম দ্রুত আপনার মতামত পর্যালোচনা করবে।
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setType('feedback')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                type === 'feedback'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              প্রশংসা ও মতামত
            </button>
            <button
              type="button"
              onClick={() => setType('report')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                type === 'report'
                  ? 'bg-white text-red-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              অভিযোগ / টেকনিক্যাল সমস্যা
            </button>
          </div>

          {type === 'feedback' && (
            <div className="text-center py-1">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                প্ল্যাটফর্ম ব্যবহারে আপনার রেটিং দিন:
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ক্যাটাগরি
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            >
              {type === 'feedback' ? (
                <>
                  <option value="সেবার মান ও অভিজ্ঞতা">সেবার মান ও সার্বিক অভিজ্ঞতা</option>
                  <option value="রক্তদাতা পাওয়ার গতি">রক্তদাতা পাওয়ার দ্রুততা</option>
                  <option value="নতুন ফিচারের পরামর্শ">নতুন কোনো ফিচারের প্রস্তাবনা</option>
                </>
              ) : (
                <>
                  <option value="ভুয়া আবেদন বা প্রতারণা">ভুয়া রক্তের আবেদন বা আর্থিক প্রতারণা</option>
                  <option value="ভুল ফোন নম্বর">রক্তদাতার নম্বর ভুল বা বন্ধ</option>
                  <option value="বাগ বা ত্রুটি">অ্যাপে প্রযুক্তিগত ত্রুটি (Bug Report)</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              বিস্তারিত লিখুন:
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="আপনার অভিজ্ঞতা বা সমস্যার বিবরণ এখানে লিখুন..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'পাঠানো হচ্ছে...' : 'জমা দিন'}
            </button>
          </div>
        </form>
      )}
    </BaseModal>
  );
};
