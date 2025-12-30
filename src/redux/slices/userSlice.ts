import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

interface NotificationPrefs {
    push: { enabled: boolean };
    email: { enabled: boolean };
    sms: { enabled: boolean };
    donationNotifications: boolean;
    withdrawalNotifications: boolean;
}

interface PrivacySettings {
    showNameInDonations: boolean;
    showContactDetailsToFamily: boolean;
}

export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    bio: string;
    isVerified: boolean;
    expoPushToken: string | null;
    notificationPreferences: NotificationPrefs;
    privacySettings: PrivacySettings;
}

interface UserState {
    user: User | null;          // logged-in user
    allUsers: User[];           // list of all users
    selectedUser: User | null;  // user fetched by ID
    loading: boolean;
    error: string | null;
    updateSuccess: boolean;
}

const initialState: UserState = {
    user: null,
    allUsers: [],
    selectedUser: null,
    loading: false,
    error: null,
    updateSuccess: false,
};

/** THUNKS **/

// Fetch currently logged-in user
export const fetchUserProfile = createAsyncThunk(
    "user/fetchProfile",
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get("/users/profile");
            return response.data.user;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch profile");
        }
    }
);

// Fetch all users (admin/protected)
export const fetchAllUsers = createAsyncThunk(
    "user/fetchAllUsers",
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get("/users");
            return response.data.users;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch users");
        }
    }
);

// Fetch user by ID
export const fetchUserById = createAsyncThunk(
    "user/fetchById",
    async (userId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/users/${userId}`);
            return response.data.user;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch user");
        }
    }
);

// Update logged-in user's profile
export const updateUserProfile = createAsyncThunk(
    "user/updateProfile",
    async (userData: Partial<User>, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.patch("/users/profile", userData);
            return response.data.user;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to update profile");
        }
    }
);

// Update push token
export const updatePushToken = createAsyncThunk(
    "user/updatePushToken",
    async (token: string | null, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.patch("/users/profile", { expoPushToken: token });
            return response.data.user;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

// Update notification settings
export const updateNotificationSettings = createAsyncThunk(
    "user/updateNotificationSettings",
    async (settingsUpdate: any, { rejectWithValue }) => {
        try {
            const payload = settingsUpdate.data ? settingsUpdate.data : settingsUpdate;
            const response = await axiosInstance.patch("/users/profile", payload);
            return response.data.user;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to update settings");
        }
    }
);

/** SLICE **/

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
        },
        clearUserError: (state) => {
            state.error = null;
            state.updateSuccess = false;
        },
        logoutUser: (state) => {
            state.user = null;
            state.allUsers = [];
            state.selectedUser = null;
            state.error = null;
            state.updateSuccess = false;
        },
    },
    extraReducers: (builder) => {
        builder
            // Pending state for all thunks
            .addMatcher(
                (action) => action.type.startsWith("user/") && action.type.endsWith("/pending"),
                (state) => {
                    state.loading = true;
                    state.error = null;
                    state.updateSuccess = false;
                }
            )
            // Fetch all users fulfilled
            .addMatcher(
                (action) => action.type === fetchAllUsers.fulfilled.type,
                (state, action: PayloadAction<User[]>) => {
                    state.loading = false;
                    state.allUsers = action.payload;
                    state.updateSuccess = true;
                }
            )
            // Fetch user by ID fulfilled
            .addMatcher(
                (action) => action.type === fetchUserById.fulfilled.type,
                (state, action: PayloadAction<User>) => {
                    state.loading = false;
                    state.selectedUser = action.payload;
                    state.updateSuccess = true;
                }
            )
            // Profile/update/push token/notification settings fulfilled
            .addMatcher(
                (action) =>
                    action.type.startsWith("user/") &&
                    action.type.endsWith("/fulfilled") &&
                    !action.type.includes("fetchAllUsers") &&
                    !action.type.includes("fetchById"),
                (state, action: PayloadAction<User>) => {
                    state.loading = false;
                    state.user = action.payload;
                    state.updateSuccess = true;
                }
            )
            // Rejected state for all thunks
            .addMatcher(
                (action) => action.type.startsWith("user/") && action.type.endsWith("/rejected"),
                (state, action) => {
                    state.loading = false;
                    state.error = action.payload as string;
                    state.updateSuccess = false;
                }
            );
    },
});

export const { setUser, clearUserError, logoutUser } = userSlice.actions;
export default userSlice.reducer;