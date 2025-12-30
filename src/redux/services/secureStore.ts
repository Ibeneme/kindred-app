import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "co_authToken";
const LAST_ACCESS_KEY = "co_lastAccess";

const decodeJwt = (token: string) => {
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded;
  } catch {
    return null;
  }
};

export const isTokenValid = (token: string | null): boolean => {
  if (!token || typeof token !== "string" || token.trim() === "") return false;
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp > now;
};

export const saveAuthToken = async (token: string | null | undefined): Promise<void> => {
  try {
    if (!token || typeof token !== "string" || token.trim() === "") {
      await removeAuthToken();
      return;
    }

    if (!isTokenValid(token)) {
      await removeAuthToken();
      return;
    }

    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch { }
};



export const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);

    if (!token || !isTokenValid(token)) {
      await removeAuthToken();
      return null;
    }

    // Save last access time
    await SecureStore.setItemAsync(LAST_ACCESS_KEY, Date.now().toString());

    return token;
  } catch {
    return null;
  }
};



const SECURE_STORE_EMAIL_KEY = "userEmail";
const SECURE_STORE_PASSWORD_KEY = "userPassword";

export const removeAuthToken = async (): Promise<void> => {
  try {
    console.log("🧹 Removing auth token and credentials...");

    // Delete main token from SecureStore
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    console.log(`✅ Deleted token from SecureStore (${TOKEN_KEY})`);

    // Delete saved credentials
    await SecureStore.deleteItemAsync(SECURE_STORE_EMAIL_KEY);
    console.log(`✅ Deleted saved email (${SECURE_STORE_EMAIL_KEY})`);
    await SecureStore.deleteItemAsync(SECURE_STORE_PASSWORD_KEY);
    console.log(`✅ Deleted saved password (${SECURE_STORE_PASSWORD_KEY})`);

    // Remove other stored keys from AsyncStorage
    const authKeys = ["user_profile", "refresh_token", "telusmore_token", "telusmore_user"];
    await AsyncStorage.multiRemove(authKeys);
    console.log(`✅ Cleared AsyncStorage keys: ${authKeys.join(", ")}`);

    console.log("🧹 Auth cleanup complete!");
  } catch (error: any) {
    console.error("❌ Error clearing auth token:", error);
    if (error?.message?.includes("couldn’t be removed")) {
      console.warn("⚠️ Some items couldn’t be removed, ignoring...");
    }
  }
};