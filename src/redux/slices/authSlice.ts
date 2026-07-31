// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";
import { getAuthToken, removeAuthToken, saveAuthToken } from "../services/secureStore";

// Types
interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
}

interface LoginRejectValue {
    message: string;
    notVerified?: boolean;
    email?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    unverifiedEmail: string | null; // NEW: lets the UI redirect to OTP screen
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    unverifiedEmail: null,
};

// Login
export const login = createAsyncThunk<
    { token: string; user: any },
    { email: string; password: string },
    { rejectValue: LoginRejectValue }
>(
    "auth/login",
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post("/auth/login", {
                email,
                password,
            });

            // Backend returns 202 for "account not verified" — axios treats
            // this as success, so we must check it explicitly.
            if (response.data?.isVerified === false) {
                return rejectWithValue({
                    message: response.data.message || "Account not verified",
                    notVerified: true,
                    email: response.data.email,
                });
            }

            const { token, user } = response.data;

            if (!token || !user) {
                return rejectWithValue({ message: "Malformed login response" });
            }

            if (token) {
                await saveAuthToken(token);
            }

            return {
                token,
                user: {
                    id: user.id || user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                },
            };
        } catch (err: any) {
            // axiosInstance's interceptor rejects with { status, message, data }
            const message = err?.message || "Login failed";
            return rejectWithValue({ message });
        }
    }
);

// Register (sends OTP)
export const register = createAsyncThunk(
    "auth/register",
    async (
        {
            firstName,
            lastName,
            email,
            phone,
            dateOfBirth,
            password,
        }: {
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            dateOfBirth: string;
            password: string;
        },
        { rejectWithValue }
    ) => {
        try {
            await axiosInstance.post("/auth/register", {
                firstName,
                lastName,
                email,
                phone,
                dateOfBirth,
                password,
            });

            return { email };
        } catch (err: any) {
            const message = err?.message || "Registration failed";
            return rejectWithValue(message);
        }
    }
);

// Verify OTP (email)
export const verifyOtp = createAsyncThunk(
    "auth/verifyOtp",
    async (
        { email, otp }: { email: string; otp: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post("/auth/verify-otp", {
                email,
                otp,
            });

            return { message: response.data.message };
        } catch (err: any) {
            const message = err?.message || "OTP verification failed";
            return rejectWithValue(message);
        }
    }
);

// Resend OTP
export const resendOtp = createAsyncThunk(
    "auth/resendOtp",
    async ({ email }: { email: string }, { rejectWithValue }) => {
        try {
            await axiosInstance.post("/auth/resend-otp", { email });
            return true;
        } catch (err: any) {
            const message = err?.message || "Failed to resend OTP";
            return rejectWithValue(message);
        }
    }
);

// Forgot Password - Send OTP
export const forgotPassword = createAsyncThunk(
    "auth/forgotPassword",
    async ({ email }: { email: string }, { rejectWithValue }) => {
        try {
            await axiosInstance.post("/auth/forgot-password", { email });
            return { email };
        } catch (err: any) {
            const message = err?.message || "Failed to send reset OTP";
            return rejectWithValue(message);
        }
    }
);

// Reset Password with OTP
export const resetPassword = createAsyncThunk(
    "auth/resetPassword",
    async (
        { email, otp, newPassword }: { email: string; otp: string; newPassword: string },
        { rejectWithValue }
    ) => {
        try {
            await axiosInstance.post("/auth/reset-password", {
                email,
                otp,
                newPassword,
            });
            return true;
        } catch (err: any) {
            const message = err?.message || "Password reset failed";
            return rejectWithValue(message);
        }
    }
);

// Check auth state on app load
export const checkAuth = createAsyncThunk("auth/checkAuth", async () => {
    const token = await getAuthToken();
    if (token) {
        return { token };
    }
    return null;
});

// Logout
export const logout = createAsyncThunk("auth/logout", async () => {
    await removeAuthToken();
    return;
});

// Slice
const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Login
        builder
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.unverifiedEmail = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.isAuthenticated = true;
                state.token = action.payload.token;
                state.user = action.payload.user;
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.isAuthenticated = false; // don't leave a stale true
                state.error = action.payload?.message || "Login failed";
                if (action.payload?.notVerified) {
                    state.unverifiedEmail = action.payload.email || null;
                }
            });

        // Register
        builder
            .addCase(register.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(register.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(register.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Verify OTP
        builder
            .addCase(verifyOtp.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(verifyOtp.fulfilled, (state) => {
                state.loading = false;
                state.isAuthenticated = true;
            })
            .addCase(verifyOtp.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Resend OTP
        builder.addCase(resendOtp.fulfilled, (state) => {
            state.error = null;
        });

        // Forgot & Reset Password
        builder
            .addCase(forgotPassword.pending, (state) => {
                state.loading = true;
            })
            .addCase(forgotPassword.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(resetPassword.fulfilled, (state) => {
                state.loading = false;
            });

        // Check Auth
        builder.addCase(checkAuth.fulfilled, (state, action) => {
            if (action.payload?.token) {
                state.isAuthenticated = true;
                state.token = action.payload.token;
            }
        });

        // Logout
        builder.addCase(logout.fulfilled, (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
        });
    },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;