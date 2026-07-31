import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ecom.app',
  appName: 'Ecom App',
  webDir: 'dist',
  server: {
    allowNavigation: ['ecommanager.duckdns.org'],
    cleartext: true,
  },
};

export default config;
