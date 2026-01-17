import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

// ===============================
// Types
// ===============================

export interface FamilyContent {
    _id: string;
    familyId: string;
    contentType: string;
    title: string;
    description?: string;
    images: { url: string; _id?: string }[]; // Updated to match DB structure
    voiceNote?: {
        url: string;
        duration?: number;
    };
    metadata?: {
        role?: string;
        dateOccurred?: string;
        lessonLevel?: string;
        parentMemberId?: string;
    };
    creator: {
        _id: string;
        firstName: string;
        lastName: string;
        profilePicture?: string;
    };
    createdAt: string;
}

interface FamilyContentState {
    contents: FamilyContent[];
    loading: boolean;
    error: string | null;
}

const initialState: FamilyContentState = {
    contents: [],
    loading: false,
    error: null,
};

// ===============================
// Async Thunks
// ===============================

export const fetchFamilyContent = createAsyncThunk(
    "familyContent/fetchByType",
    async (
        { familyId, type }: { familyId: string; type: string },
        { rejectWithValue }
    ) => {
        try {
            const res = await axiosInstance.get(
                `/family-content/family/${familyId}/${type}`
            );
            return res.data.contents;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to load family content"
            );
        }
    }
);

// UPDATED: Create new family content using FormData
export const createFamilyContent = createAsyncThunk(
    "familyContent/create",
    async (
        {
            familyId,
            contentType,
            title,
            description,
            images,
            voiceNote,
            voiceDuration,
            metadata,
        }: {
            familyId: string;
            contentType: string;
            title: string;
            description?: string;
            images?: any[]; // File/Blob for Mobile/Web
            voiceNote?: any;
            voiceDuration?: number;
            metadata?: any;
        },
        { rejectWithValue }
    ) => {
        try {
            const formData = new FormData();
            formData.append("familyId", familyId);
            formData.append("contentType", contentType);
            formData.append("title", title);

            if (description) formData.append("description", description);
            if (voiceDuration) formData.append("voiceDuration", voiceDuration.toString());

            // Handle Metadata if passed (stringify because FormData handles strings)
            if (metadata) {
                formData.append("metadata", JSON.stringify(metadata));
            }

            // Append multiple images
            images?.forEach((image) => {
                formData.append("images", image);
            });

            // Append voice note
            if (voiceNote) {
                formData.append("voiceNote", voiceNote);
            }

            const res = await axiosInstance.post("/family-content", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            return res.data.content;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to create content"
            );
        }
    }
);

// Update family content using FormData
export const updateFamilyContent = createAsyncThunk(
    "familyContent/update",
    async (
        {
            id,
            title,
            description,
            images,
            voiceNote,
            voiceDuration,
            metadata,
        }: {
            id: string;
            title?: string;
            description?: string;
            images?: any[];
            voiceNote?: any;
            voiceDuration?: number;
            metadata?: any;
        },
        { rejectWithValue }
    ) => {
        try {
            const formData = new FormData();

            if (title) formData.append("title", title);
            if (description) formData.append("description", description);
            if (voiceDuration) formData.append("voiceDuration", voiceDuration.toString());

            if (metadata) {
                formData.append("metadata", JSON.stringify(metadata));
            }

            // Append new images if any
            images?.forEach((image) => {
                formData.append("images", image);
            });

            // Append new voice note if any
            if (voiceNote) {
                formData.append("voiceNote", voiceNote);
            }

            const res = await axiosInstance.put(`/family-content/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            return res.data.content;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to update content"
            );
        }
    }
);
export const deleteFamilyContent = createAsyncThunk(
    "familyContent/delete",
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/family-content/${id}`);
            return id;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to delete content"
            );
        }
    }
);

// ===============================
// Slice
// ===============================

const familyContentSlice = createSlice({
    name: "familyContent",
    initialState,
    reducers: {
        resetFamilyContent: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchFamilyContent.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFamilyContent.fulfilled, (state, action) => {
                state.loading = false;
                state.contents = action.payload;
            })
            .addCase(fetchFamilyContent.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createFamilyContent.fulfilled, (state, action) => {
                state.contents.unshift(action.payload);
            })
            .addCase(updateFamilyContent.fulfilled, (state, action) => {
                const index = state.contents.findIndex((c) => c._id === action.payload._id);
                if (index !== -1) state.contents[index] = action.payload;
            })
            .addCase(deleteFamilyContent.fulfilled, (state, action) => {
                state.contents = state.contents.filter((c) => c._id !== action.payload);
            });
    },
});

export const { resetFamilyContent } = familyContentSlice.actions;
export default familyContentSlice.reducer;