import { useMemo } from 'react';
import { getPlatform } from '@/lib/capacitor';

/**
 * Platform detection hook.
 * Returns which platform the app is currently running on.
 */
export function usePlatform() {
  return useMemo(() => {
    const platform = getPlatform();
    return {
      platform,
      isWeb: platform === 'web',
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
      isNative: platform !== 'web',
    };
  }, []);
}
