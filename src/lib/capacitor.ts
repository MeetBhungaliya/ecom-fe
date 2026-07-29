import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for Capacitor.
 */
export function getPlatform(): 'web' | 'ios' | 'android' {
  return Capacitor.getPlatform() as 'web' | 'ios' | 'android';
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isWeb(): boolean {
  return getPlatform() === 'web';
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}
