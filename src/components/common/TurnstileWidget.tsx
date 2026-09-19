import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (error: any) => void;
          'expired-callback'?: () => void;
          theme?: string;
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onVerify,
  onExpire,
  onError,
  theme = 'light',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const siteKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURNSTILE_SITE_KEY) ||
    '1x00000000000000000000AA'; // Official Cloudflare test sitekey

  useEffect(() => {
    // 1. Check if script is already present
    const existingScript = document.getElementById('cloudflare-turnstile-script');
    if (existingScript) {
      if (window.turnstile) {
        setIsScriptLoaded(true);
      } else {
        existingScript.addEventListener('load', () => setIsScriptLoaded(true));
      }
      return;
    }

    // 2. Inject Turnstile Script
    const script = document.createElement('script');
    script.id = 'cloudflare-turnstile-script';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsScriptLoaded(true);
    };

    script.onerror = () => {
      console.warn('[Turnstile] Failed to load Turnstile script from Cloudflare.');
      setLoadError('নিরাপত্তা যাচাইকরণ মডিউল লোড করা যায়নি।');
      if (onError) onError('Failed to load Turnstile script');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup widget instance on unmount
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore unmount cleanup error
        }
      }
    };
  }, []);

  // Render widget once script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current || !window.turnstile) return;

    try {
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size: 'flexible',
        callback: (token: string) => {
          onVerify(token);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
        'error-callback': (err: any) => {
          console.warn('[Turnstile] Verification error:', err);
          if (onError) onError(typeof err === 'string' ? err : 'Turnstile challenge error');
        },
      });
    } catch (e: any) {
      console.warn('[Turnstile] Render error:', e);
    }
  }, [isScriptLoaded, siteKey, theme]);

  return (
    <div className={`turnstile-container my-3 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
        <span className="font-semibold text-slate-600">নিরাপত্তা ও স্প্যাম প্রতিরোধ যাচাইকরণ</span>
      </div>

      <div
        ref={containerRef}
        className="min-h-[65px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center justify-center transition-all"
      >
        {!isScriptLoaded && !loadError && (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
            <span>নিরাপত্তা চেক প্রস্তুত হচ্ছে...</span>
          </div>
        )}

        {loadError && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded w-full">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{loadError}</span>
          </div>
        )}
      </div>
    </div>
  );
};
