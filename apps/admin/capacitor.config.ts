import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.schoolerp.parent',
  appName: 'Parent Portal',
  webDir: 'public', // Fallback assets directory
  server: {
    url: process.env.CAP_SERVER_URL || 'https://demo.schoolerp.in',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    }
  }
};

export default config;
