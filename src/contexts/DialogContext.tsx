import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Info,
  HelpCircle,
  X,
  Check,
} from 'lucide-react';

export type DialogType = 'success' | 'warning' | 'danger' | 'info';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export interface PromptOptions {
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  alert: (options: string | AlertOptions) => Promise<void>;
  confirm: (options: string | ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

// Global ref so it can be called even outside React tree if needed
let globalDialogHandler: DialogContextType | null = null;

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    if (globalDialogHandler) return globalDialogHandler;
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

// Global helper functions
export const appAlert = (options: string | AlertOptions) => {
  if (globalDialogHandler) return globalDialogHandler.alert(options);
  window.alert(typeof options === 'string' ? options : options.message);
  return Promise.resolve();
};

export const appConfirm = (options: string | ConfirmOptions): Promise<boolean> => {
  if (globalDialogHandler) return globalDialogHandler.confirm(options);
  const msg = typeof options === 'string' ? options : options.message;
  return Promise.resolve(window.confirm(msg));
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for Alert
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: DialogType;
    confirmText: string;
    resolve?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'ঠিক আছে',
  });

  // State for Confirm
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    confirmText: string;
    cancelText: string;
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'নিশ্চিত করুন',
    cancelText: 'বাতিল',
  });

  // State for Prompt
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    placeholder: string;
    value: string;
    confirmText: string;
    cancelText: string;
    resolve?: (value: string | null) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    placeholder: '',
    value: '',
    confirmText: 'জমা দিন',
    cancelText: 'বাতিল',
  });

  const promptInputRef = useRef<HTMLInputElement>(null);

  // Alert Handler
  const alert = useCallback((options: string | AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      const isString = typeof options === 'string';
      const type = isString ? 'info' : options.type || 'info';
      const defaultTitle =
        type === 'success'
          ? 'সফল হয়েছে'
          : type === 'danger'
          ? 'সতর্কতা'
          : type === 'warning'
          ? 'মনোযোগ দিন'
          : 'বিজ্ঞপ্তি';

      setAlertConfig({
        isOpen: true,
        title: isString ? defaultTitle : options.title || defaultTitle,
        message: isString ? options : options.message,
        type,
        confirmText: isString ? 'ঠিক আছে' : options.confirmText || 'ঠিক আছে',
        resolve,
      });
    });
  }, []);

  const closeAlert = () => {
    if (alertConfig.resolve) alertConfig.resolve();
    setAlertConfig((prev) => ({ ...prev, isOpen: false }));
  };

  // Confirm Handler
  const confirm = useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const isString = typeof options === 'string';
      const type = isString ? 'warning' : options.type || 'warning';
      const defaultTitle = type === 'danger' ? 'আপনি কি নিশ্চিত?' : 'নিশ্চিতকরণ';

      setConfirmConfig({
        isOpen: true,
        title: isString ? defaultTitle : options.title || defaultTitle,
        message: isString ? options : options.message,
        type,
        confirmText: isString ? 'হ্যাঁ, নিশ্চিত' : options.confirmText || 'হ্যাঁ, নিশ্চিত',
        cancelText: isString ? 'বাতিল' : options.cancelText || 'বাতিল',
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmConfig.resolve) confirmConfig.resolve(result);
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
  };

  // Prompt Handler
  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptConfig({
        isOpen: true,
        title: options.title || 'তথ্য প্রদান করুন',
        message: options.message,
        placeholder: options.placeholder || '',
        value: options.defaultValue || '',
        confirmText: options.confirmText || 'জমা দিন',
        cancelText: options.cancelText || 'বাতিল',
        resolve,
      });
      setTimeout(() => promptInputRef.current?.focus(), 100);
    });
  }, []);

  const handlePromptClose = (submit: boolean) => {
    if (promptConfig.resolve) {
      promptConfig.resolve(submit ? promptConfig.value : null);
    }
    setPromptConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const contextValue = { alert, confirm, prompt };
  globalDialogHandler = contextValue;

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      {/* ========================================================= */}
      {/* 1. CUSTOM BEAUTIFUL ALERT DIALOG BOX                      */}
      {/* ========================================================= */}
      {alertConfig.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={closeAlert}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center space-y-4">
              {/* Animated Icon */}
              <div className="mx-auto">
                {alertConfig.type === 'success' && (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                )}
                {alertConfig.type === 'danger' && (
                  <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto shadow-sm">
                    <AlertOctagon className="w-8 h-8" />
                  </div>
                )}
                {alertConfig.type === 'warning' && (
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                )}
                {alertConfig.type === 'info' && (
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto shadow-sm">
                    <Info className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {alertConfig.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  {alertConfig.message}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  autoFocus
                  onClick={closeAlert}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-98 ${
                    alertConfig.type === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : alertConfig.type === 'danger'
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                      : alertConfig.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
                  }`}
                >
                  {alertConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CUSTOM BEAUTIFUL CONFIRM DIALOG BOX                    */}
      {/* ========================================================= */}
      {confirmConfig.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => handleConfirmClose(false)}
        >
          <div
            className={`w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-150 border ${
              confirmConfig.type === 'danger'
                ? 'border-red-300 ring-4 ring-red-500/10'
                : 'border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    confirmConfig.type === 'danger'
                      ? 'bg-red-100 text-red-600'
                      : confirmConfig.type === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {confirmConfig.type === 'danger' ? (
                    <AlertOctagon className="w-6 h-6" />
                  ) : confirmConfig.type === 'warning' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <HelpCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {confirmConfig.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    {confirmConfig.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  {confirmConfig.cancelText}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => handleConfirmClose(true)}
                  className={`px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition-all active:scale-98 ${
                    confirmConfig.type === 'danger'
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                      : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
                  }`}
                >
                  {confirmConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CUSTOM BEAUTIFUL PROMPT DIALOG BOX                     */}
      {/* ========================================================= */}
      {promptConfig.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => handlePromptClose(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePromptClose(true);
              }}
              className="p-5 sm:p-6 space-y-4"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {promptConfig.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {promptConfig.message}
                </p>
              </div>

              <div>
                <input
                  ref={promptInputRef}
                  type="text"
                  value={promptConfig.value}
                  onChange={(e) =>
                    setPromptConfig((prev) => ({ ...prev, value: e.target.value }))
                  }
                  placeholder={promptConfig.placeholder}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-hidden font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handlePromptClose(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  {promptConfig.cancelText}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 transition-all active:scale-98"
                >
                  {promptConfig.confirmText}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
