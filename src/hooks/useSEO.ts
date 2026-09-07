import { useEffect } from 'react';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { applySeoTags } from '../services/seoService';
import type { BloodRequest } from '../types';

export interface UseSeoOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  bloodRequest?: BloodRequest;
}

export function useSEO(options?: UseSeoOptions) {
  const { config } = useSystemConfig();

  useEffect(() => {
    if (config?.seo) {
      applySeoTags(config.seo, options);
    }
  }, [
    config?.seo,
    options?.title,
    options?.description,
    options?.ogImage,
    options?.canonicalUrl,
    options?.bloodRequest?.id,
  ]);
}
