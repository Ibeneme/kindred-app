import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

// --- Types --- (Keeping your existing interfaces)
export interface NewsItem { _id: string; title: string; content: string; author: { firstName: string; lastName: string }; createdAt: string; }
export interface TaskItem { _id: string; title: string; deadline: string; status: "pending" | "completed"; assignedTo: string[]; }
export interface SuggestionItem { _id: string; text: string; isAnonymous: boolean; createdAt: string; }
export interface PollItem { _id: string; question: string; options: { text: string; votes: number }[]; voters: string[]; }

export type FeatureType = "news" | "tasks" | "suggestions" | "polls";

interface FeatureState {
    news: NewsItem[];
    tasks: TaskItem[];
    suggestions: SuggestionItem[];
    polls: PollItem[];
    loading: boolean;
    submitting: boolean;
    error: string | null;
}

const initialState: FeatureState = {
    news: [],
    tasks: [],
    suggestions: [],
    polls: [],
    loading: false,
    submitting: false,
    error: null,
};

// --- Async Thunks ---

export const fetchFamilyFeatures = createAsyncThunk(
    "features/fetchAll",
    async (familyId: string, { rejectWithValue }) => {
        try {
            // Note: If you don't have a single "all" route, you can use Promise.all here
            const response = await axiosInstance.get(`/features/${familyId}`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch features");
        }
    }
);

export const createFeature = createAsyncThunk(
    "features/create",
    async (
        { familyId, type, data }: { familyId: string; type: FeatureType; data: any },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(`/features/${familyId}/${type}`, data);
            return { type, data: response.data };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || `Failed to create ${type}`);
        }
    }
);

// NEW: Generic Delete Thunk
export const deleteFeature = createAsyncThunk(
    "features/delete",
    async (
        { id, type }: { id: string; type: FeatureType },
        { rejectWithValue }
    ) => {
        try {
            await axiosInstance.delete(`/features/${type}/${id}`);
            return { id, type }; // Return these so we can update the UI state
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || `Failed to delete ${type}`);
        }
    }
);

// --- Slice ---

const featureSlice = createSlice({
    name: "features",
    initialState,
    reducers: {
        clearFeatureError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetching Logic
            .addCase(fetchFamilyFeatures.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFamilyFeatures.fulfilled, (state, action) => {
                state.loading = false;
                state.news = action.payload.news || [];
                state.tasks = action.payload.tasks || [];
                state.suggestions = action.payload.suggestions || [];
                state.polls = action.payload.polls || [];
            })
            .addCase(fetchFamilyFeatures.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Creation Logic
            .addCase(createFeature.pending, (state) => {
                state.submitting = true;
            })
            .addCase(createFeature.fulfilled, (state, action) => {
                state.submitting = false;
                const { type, data } = action.payload;
                state[type].unshift(data as any); // Dynamic assignment
            })
            .addCase(createFeature.rejected, (state, action) => {
                state.submitting = false;
                state.error = action.payload as string;
            })

            // NEW: Deletion Logic
            .addCase(deleteFeature.pending, (state) => {
                state.submitting = true;
            })
            .addCase(deleteFeature.fulfilled, (state, action) => {
                state.submitting = false;
                const { id, type } = action.payload;
                // Filter out the deleted item from the correct array
                // state[type] = state[type].filter((item: any) => item._id !== id);
            })
            .addCase(deleteFeature.rejected, (state, action) => {
                state.submitting = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearFeatureError } = featureSlice.actions;
export default featureSlice.reducer;