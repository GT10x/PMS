import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.globaltechtrums.pms',
  appName: 'PMS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://pms.globaltechtrums.com',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: '#4f46e5',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
  },
};

export default config;
