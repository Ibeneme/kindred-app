import axios, { InternalAxiosRequestConfig } from "axios";
import { router } from "expo-router";
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
    console.log("[Axios] Request URL:", requestUrl);

    await removeAuthToken();

    if (shouldSkipLogoutRedirect(requestUrl)) {
        console.log("[Axios] Redirect skipped for auth/user route");
        return;
    }

    router.replace("/(auth)/sign-in");
};

/**
 * Axios instance
 */
const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 300000000, // request timeout ONLY (safe to keep)
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
        console.log(token, 'tokentoken')
        console.log(
            `[Axios Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
            { data: config.data }
        );

        return config;
    },
    (error) => {
        console.error("[Axios Request Error]", error);
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor
 */
axiosInstance.interceptors.response.use(
    (response) => {
        console.log(
            `[Axios Response] ${response.config.method?.toUpperCase()} ${response.config.baseURL}${response.config.url}`,
            { status: response.status }
        );

        return response;
    },
    async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        // No server response (network issue, server down)
        if (!error.response) {
            console.warn("[Axios Error] No response from server");
            await logout("no response", originalRequest?.url);
            return Promise.reject(error);
        }

        // Unauthorized
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            await logout("401 Unauthorized", originalRequest.url);
        } else {
            console.error(
                "[Axios Error]",
                error.response.status,
                error.response.data
            );
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;