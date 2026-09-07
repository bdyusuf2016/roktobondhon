import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { SystemConfig, SystemConfigSection } from '../types/config';
import {
  DEFAULT_SYSTEM_CONFIG,
  getAllConfig,
  updateConfig as updateConfigService,
  migrateLegacySettings,
} from '../services/configService';
import { useAuth } from './AuthContext';

interface SystemConfigContextType {
  config: SystemConfig;
  isLoading: boolean;
  error: string | null;
  updateSection: <K extends SystemConfigSection>(
    section: K,
    updates: Partial<SystemConfig[K]>
  ) => Promise<{ success: boolean; error?: string }>;
  refreshConfig: () => Promise<void>;
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

export const SystemConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Run idempotent legacy migration on first mount
      await migrateLegacySettings();
      const resolvedConfig = await getAllConfig();
      setConfig(resolvedConfig);
    } catch (err: any) {
      console.warn('[SystemConfigProvider] Failed to load config, using safe defaults:', err);
      setError(err?.message || 'কনফিগারেশন লোড করতে সমস্যা হয়েছে।');
      setConfig(DEFAULT_SYSTEM_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const updateSection = async <K extends SystemConfigSection>(
    section: K,
    updates: Partial<SystemConfig[K]>
  ): Promise<{ success: boolean; error?: string }> => {
    const actor = {
      id: currentUser?.id || 'sys-admin',
      name: currentUser?.fullName || 'এডমিন',
      role: currentUser?.role || 'admin',
    };

    const result = await updateConfigService(section, updates, actor);
    if (result.success) {
      setConfig((prev) => ({
        ...prev,
        [section]: result.data,
      }));
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const refreshConfig = async () => {
    await loadConfig();
  };

  return (
    <SystemConfigContext.Provider
      value={{
        config,
        isLoading,
        error,
        updateSection,
        refreshConfig,
      }}
    >
      {children}
    </SystemConfigContext.Provider>
  );
};

export function useSystemConfig(): SystemConfigContextType {
  const context = useContext(SystemConfigContext);
  if (!context) {
    return {
      config: DEFAULT_SYSTEM_CONFIG,
      isLoading: false,
      error: null,
      updateSection: async () => ({ success: true }),
      refreshConfig: async () => {},
    };
  }
  return context;
}
