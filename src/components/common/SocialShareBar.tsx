import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Send,
  Facebook,
  Twitter,
  MessageCircle,
} from 'lucide-react';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import { generateCrisisShareText, generateSocialShareUrl } from '../../services/seoService';
import type { BloodRequest } from '../../types';

import { copyToClipboard } from '../../utils/clipboard';

interface SocialShareBarProps {
  request?: BloodRequest;
  customTitle?: string;
  customUrl?: string;
  className?: string;
}

export const SocialShareBar: React.FC<SocialShareBarProps> = ({
  request,
  customTitle,
  customUrl,
  className = '',
}) => {
  const { config } = useSystemConfig();
  const [copied, setCopied] = useState(false);

  const seoConfig = config?.seo;
  const buttonsConfig = seoConfig?.socialShareButtons || {
    facebook: true,
    whatsapp: true,
    telegram: true,
    twitter: true,
    copyLink: true,
  };

  const shareUrl =
    customUrl || (typeof window !== 'undefined' ? window.location.href : seoConfig?.canonicalUrl || '');

  const shareText = request
    ? generateCrisisShareText(
        seoConfig?.crisisShareTemplateBn || '',
        request,
        shareUrl
      )
    : customTitle
    ? `${customTitle}\n${shareUrl}`
    : `${seoConfig?.siteTitleBn || 'রক্ত দান পরিবার কালামপুর রক্তদান প্ল্যাটফর্ম'}\n${shareUrl}`;

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const openShare = (channel: 'whatsapp' | 'facebook' | 'telegram' | 'twitter') => {
    const url = generateSocialShareUrl(channel, shareText, shareUrl);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
    }
  };

  return (
    <div className={`p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
          <Share2 className="w-4 h-4 text-red-600" />
          <span>সোশ্যাল মিডিয়া ও বন্ধুদের সাথে শেয়ার করুন</span>
        </div>
        {request && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
            জরুরি শেয়ার
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* WhatsApp */}
        {buttonsConfig.whatsapp && (
          <button
            type="button"
            onClick={() => openShare('whatsapp')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            title="হোয়াটসঅ্যাপে শেয়ার করুন"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        )}

        {/* Facebook */}
        {buttonsConfig.facebook && (
          <button
            type="button"
            onClick={() => openShare('facebook')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            title="ফেসবুকে শেয়ার করুন"
          >
            <Facebook className="w-3.5 h-3.5" />
            <span>Facebook</span>
          </button>
        )}

        {/* Telegram */}
        {buttonsConfig.telegram && (
          <button
            type="button"
            onClick={() => openShare('telegram')}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            title="টেলিগ্রামে শেয়ার করুন"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </button>
        )}

        {/* Twitter / X */}
        {buttonsConfig.twitter && (
          <button
            type="button"
            onClick={() => openShare('twitter')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            title="টুইটারে শেয়ার করুন"
          >
            <Twitter className="w-3.5 h-3.5" />
            <span>Twitter (X)</span>
          </button>
        )}

        {/* Copy Link */}
        {buttonsConfig.copyLink && (
          <button
            type="button"
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
              copied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>লিংক কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>লিংক কপি</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
