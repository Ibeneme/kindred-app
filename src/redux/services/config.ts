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
//http://localhost:5006/api/v1/auth
export const BASE_SOCKET = 'http://localhost:5005';
export const config: AppConfig = {
  apiBaseUrl: extra.apiBaseUrl || 'http://localhost:5005/api/v1',
  googleClientId: extra.googleClientId,
  googleIosId: extra.googleIosId,
  googleAndroidId: extra.googleAndroidId,
};

