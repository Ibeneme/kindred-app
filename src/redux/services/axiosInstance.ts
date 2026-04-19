import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { router } from "expo-router";
import { DeviceEventEmitter } from "react-native";
import { getAuthToken, removeAuthToken } from "./secureStore";
import { config } from "./config";

const BASE_URL = config.apiBaseUrl;

/**
 * Skip redirect if request is already on auth/user routes
 */
const shouldSkipLogoutRedirect = (url?: string) => {
    if (!url) return false;
    return url.includes("/auth/") || url.includes("/user/");
};

/**
 * Centralized logout handler
 */
const logout = async (reason: string, requestUrl?: string) => {
    console.log(`[Axios] Logging out due to: ${reason}`);
    await removeAuthToken();

    if (shouldSkipLogoutRedirect(requestUrl)) {
        return;
    }

    router.replace("/(auth)/sign-in");
};

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000, // Reduced to 30s for better mobile UX
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Request Interceptor
 */
axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await getAuthToken();
        if (token) {
            config.headers = config.headers ?? {};
            (config.headers as any).Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor
 */
axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        // 1. Handle No Response
        if (!error.response) {
            console.warn("[Axios Error] No response from server");
            return Promise.reject({
                type: 'NETWORK',
                message: "Network error. Please check your connection."
            });
        }

        const { status, data } = error.response;

        // 2. Handle 401 Unauthorized
        if (status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            await logout("401 Unauthorized", originalRequest.url);
        }

        // 3. Handle 403 Forbidden / Suspension
        else if (status === 403) {
            const isSuspended = data?.isSuspended || false;
            const customMessage = data?.message || "Access Denied";

            if (isSuspended) {
                // Emit event to trigger the Styled Bottom Modal in UI
                DeviceEventEmitter.emit("SHOW_GLOBAL_MODAL", {
                    title: "Account Suspended",
                    message: customMessage,
                    type: "SUSPENDED"
                });

                // Optional: Logout user after showing modal or redirect
              //  await removeAuthToken();
            }
        }

        // 4. Default Error Logging
        console.error("[Axios Error]", status, data);

        // Normalize error object for the UI
        return Promise.reject({
            status,
            message: data?.message || "Something went wrong",
            data: data
        });
    }
);

export default axiosInstance;