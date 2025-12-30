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

export const BASE_SOCKET = 'http://172.20.10.5:5005';
export const config: AppConfig = {
  apiBaseUrl: extra.apiBaseUrl || 'http://172.20.10.5:5005/api/v1',
  googleClientId: extra.googleClientId,
  googleIosId: extra.googleIosId,
  googleAndroidId: extra.googleAndroidId,
};

