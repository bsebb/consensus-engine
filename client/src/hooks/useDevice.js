import { useState, useEffect } from 'react';

/**
 * useDevice - Auto-detects desktop vs mobile viewports and pointer types.
 *
 * Automatically updates on window resize and sets `data-device="desktop"|"mobile"`
 * on document.documentElement for pure CSS targeting without layout shifts.
 */
export function useDevice() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768;
  });

  const [isWide, setIsWide] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mqDesktop = window.matchMedia('(min-width: 768px)');
    const mqWide = window.matchMedia('(min-width: 1024px)');

    const handleUpdate = () => {
      const desktop = mqDesktop.matches;
      const wide = mqWide.matches;
      setIsDesktop(desktop);
      setIsWide(wide);
      document.documentElement.setAttribute('data-device', desktop ? 'desktop' : 'mobile');
    };

    handleUpdate();

    mqDesktop.addEventListener('change', handleUpdate);
    mqWide.addEventListener('change', handleUpdate);

    return () => {
      mqDesktop.removeEventListener('change', handleUpdate);
      mqWide.removeEventListener('change', handleUpdate);
    };
  }, []);

  return { isDesktop, isWide };
}

export default useDevice;
