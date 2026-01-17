import Constants from "expo-constants";

interface AppExtra {
  apiBaseUrl?: string;
  googleClientId?: string;
  googleIosId?: string;
  googleAndroidId?: string;
}

type AppConfig = {
  apiBaseUrl: string;
  googleClientId?: string;
  googleIosId?: string;
  googleAndroidId?: string;
};

const extra = (Constants.expoConfig?.extra || {}) as AppExtra;
// 'https://kindred-server.onrender.com';
export const BASE_SOCKET = 'https://kindred-server.onrender.com';
export const config: AppConfig = {
  apiBaseUrl: extra.apiBaseUrl || 'https://kindred-server.onrender.com/api/v1',
  googleClientId: extra.googleClientId,
  googleIosId: extra.googleIosId,
  googleAndroidId: extra.googleAndroidId,
};

