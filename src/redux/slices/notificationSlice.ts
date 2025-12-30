import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

export interface Notification {
    _id: string;
    recipient: string;
    familyId?: string;
    type: 'NEW_SUGGESTION' | 'NEW_TASK' | 'NEW_DONATION' | 'MEMBER_JOINED' | 'INVITATION_RECEIVED' | 'POLL_CREATED' | 'REPORT_SUBMITTED';
    title: string;
    message: string;
    relatedId?: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
}

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
};

// --- Async Thunks ---

// Fetch all notifications
export const fetchNotifications = createAsyncThunk(
    "notifications/fetchAll",
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get("/notifications");
            return response.data.notifications;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to load notifications");
        }
    }
);

// Mark a single notification as read
export const markAsRead = createAsyncThunk(
    "notifications/markAsRead",
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosInstance.patch(`/notifications/${id}/read`);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

// Mark all as read
export const markAllAsRead = createAsyncThunk(
    "notifications/markAllRead",
    async (_, { rejectWithValue }) => {
        try {
            await axiosInstance.patch("/notifications/read-all");
            return true;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message);
        }
    }
);

// --- Slice ---

const notificationSlice = createSlice({
    name: "notifications",
    initialState,
    reducers: {
        // Helpful for clearing state on logout
        resetNotifications: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            // Fetch Notifications
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<Notification[]>) => {
                state.loading = false;
                state.notifications = action.payload;
                // Update unread count based on fetched data
                state.unreadCount = action.payload.filter(n => !n.isRead).length;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Mark Single as Read (Optimistic Update)
            .addCase(markAsRead.fulfilled, (state, action: PayloadAction<string>) => {
                const notification = state.notifications.find(n => n._id === action.payload);
                if (notification && !notification.isRead) {
                    notification.isRead = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })

            // Mark All as Read
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.notifications = state.notifications.map(n => ({ ...n, isRead: true }));
                state.unreadCount = 0;
            });
    },
});

export const { resetNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;