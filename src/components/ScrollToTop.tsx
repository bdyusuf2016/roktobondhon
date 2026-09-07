import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Helper function to smoothly or immediately scroll window to top
 */
export const scrollToTop = (smooth: boolean = true) => {
  if (typeof window === 'undefined') return;
  try {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: smooth ? 'smooth' : 'instant',
    });
  } catch {
    window.scrollTo(0, 0);
  }
};

/**
 * ScrollToTop component that listens to route changes and resets scroll to top
 */
export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // When route pathname changes, smoothly scroll to top
    scrollToTop(true);
  }, [pathname]);

  return null;
};
