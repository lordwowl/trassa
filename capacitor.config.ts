import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // appId задаётся один раз и больше не меняется (идентификатор в магазине)
  appId: 'io.github.lordwowl.trassa',
  appName: 'Трасса',
  webDir: 'dist',
  android: {
    backgroundColor: '#101820',
  },
};

export default config;
