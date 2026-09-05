import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type ModalTheme = 'modern' | 'glassmorphism' | 'emergency' | 'darkLuxury' | 'warmFriendly';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  theme?: ModalTheme;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  theme = 'modern',
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Size mappings
  const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  // Theme-specific styles
  const themeStyles: Record<
    ModalTheme,
    {
      overlay: string;
      container: string;
      headerBorder: string;
      titleColor: string;
      subtitleColor: string;
      closeBtn: string;
      footerBg: string;
    }
  > = {
    modern: {
      overlay: 'bg-slate-900/60 backdrop-blur-sm',
      container: 'bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl',
      headerBorder: 'border-b border-slate-100',
      titleColor: 'text-slate-900',
      subtitleColor: 'text-slate-500',
      closeBtn: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
      footerBg: 'bg-slate-50 border-t border-slate-100',
    },
    glassmorphism: {
      overlay: 'bg-slate-950/70 backdrop-blur-md',
      container: 'bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl text-slate-900 dark:text-white border border-white/40 dark:border-slate-700/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] rounded-2xl',
      headerBorder: 'border-b border-white/20 dark:border-slate-800',
      titleColor: 'text-slate-900 dark:text-white',
      subtitleColor: 'text-slate-500 dark:text-slate-400',
      closeBtn: 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10',
      footerBg: 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-t border-white/20 dark:border-slate-800',
    },
    emergency: {
      overlay: 'bg-red-950/75 backdrop-blur-sm',
      container: 'bg-white text-slate-900 border-2 border-red-500/80 shadow-[0_0_35px_rgba(239,68,68,0.35)] rounded-2xl ring-4 ring-red-500/10',
      headerBorder: 'border-b border-red-100 bg-red-50/60',
      titleColor: 'text-red-950',
      subtitleColor: 'text-red-700/80',
      closeBtn: 'text-red-400 hover:text-red-700 hover:bg-red-100/60',
      footerBg: 'bg-red-50/50 border-t border-red-100',
    },
    darkLuxury: {
      overlay: 'bg-black/80 backdrop-blur-md',
      container: 'bg-slate-950 text-slate-100 border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl',
      headerBorder: 'border-b border-slate-800/80 bg-slate-900/40',
      titleColor: 'text-white',
      subtitleColor: 'text-slate-400',
      closeBtn: 'text-slate-400 hover:text-white hover:bg-slate-800',
      footerBg: 'bg-slate-900/60 border-t border-slate-800',
    },
    warmFriendly: {
      overlay: 'bg-rose-950/60 backdrop-blur-sm',
      container: 'bg-gradient-to-b from-rose-50/70 via-white to-white text-slate-900 border border-rose-200/80 shadow-2xl rounded-3xl',
      headerBorder: 'border-b border-rose-100/80',
      titleColor: 'text-slate-900',
      subtitleColor: 'text-rose-700/80',
      closeBtn: 'text-slate-400 hover:text-rose-700 hover:bg-rose-100/50',
      footerBg: 'bg-rose-50/40 border-t border-rose-100/60',
    },
  };

  const currentTheme = themeStyles[theme];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto ${currentTheme.overlay} transition-opacity duration-200`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`w-full ${sizeClasses[size]} overflow-hidden transform transition-all duration-200 scale-100 animate-in fade-in zoom-in-95 ${currentTheme.container} ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`p-4 sm:p-5 flex items-start justify-between gap-3 ${currentTheme.headerBorder}`}>
            <div className="flex items-start gap-3">
              {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
              <div>
                {title && (
                  <h3 className={`text-base sm:text-lg font-bold leading-snug ${currentTheme.titleColor}`}>
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className={`text-xs sm:text-sm mt-0.5 ${currentTheme.subtitleColor}`}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className={`p-1.5 rounded-lg transition-colors shrink-0 -mr-1 -mt-1 ${currentTheme.closeBtn}`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`p-3.5 sm:p-4.5 flex items-center justify-end gap-2.5 ${currentTheme.footerBg}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
