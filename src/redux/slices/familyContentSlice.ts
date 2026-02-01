import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

// ... (Interfaces Comment and FamilyContent remain same)

export interface Comment {
    _id: string;
    user: {
        _id: string;
        firstName: string;
        lastName: string;
        profilePicture?: string;
    };
    text: string;
    createdAt: string;
}

export interface FamilyContent {
    _id: string;
    familyId: string;
    contentType: string;
    title: string;
    description?: string;
    images: { url: string; _id?: string }[];
    voiceNote?: {
        url: string;
        duration?: number;
    };
    likes: string[];
    comments: Comment[];
    metadata?: {
        role?: string;
        dateOccurred?: string;
        lessonLevel?: string;
        parentMemberId?: string;
        visibility?: "private" | "family" | "public";
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

// --- Async Thunks ---

export const fetchFamilyContent = createAsyncThunk(
    "familyContent/fetchByType",
    async ({ familyId, type }: { familyId: string; type: string }, { rejectWithValue }) => {
        try {
            const res = await axiosInstance.get(`/family-content/family/${familyId}/${type}`);
            return res.data.contents;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to load content");
        }
    }
);

export const createFamilyContent = createAsyncThunk(
    "familyContent/create",
    async (payload: any, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            Object.keys(payload).forEach(key => {
                if (key === 'images' && payload.images) {
                    payload.images.forEach((img: any) => formData.append("images", img));
                } else if (key === 'metadata') {
                    formData.append("metadata", JSON.stringify(payload.metadata));
                } else if (payload[key] !== undefined) {
                    formData.append(key, payload[key]);
                }
            });
            const res = await axiosInstance.post("/family-content", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return res.data.content;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to create content");
        }
    }
);

export const updateFamilyContent = createAsyncThunk(
    "familyContent/update",
    async ({ id, ...payload }: any, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            Object.keys(payload).forEach(key => {
                if (key === 'images' && payload.images) {
                    payload.images.forEach((img: any) => formData.append("images", img));
                } else if (key === 'metadata') {
                    formData.append("metadata", JSON.stringify(payload.metadata));
                } else if (payload[key] !== undefined) {
                    formData.append(key, payload[key]);
                }
            });
            const res = await axiosInstance.put(`/family-content/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return res.data.content;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to update content");
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
            return rejectWithValue(error.response?.data?.message || "Failed to delete content");
        }
    }
);

export const likeFamilyContent = createAsyncThunk(
    "familyContent/like",
    async (id: string, { rejectWithValue }) => {
        try {
            const res = await axiosInstance.post(`/family-content/content-content/${id}/like`);
            return { id, likes: res.data.likes };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Action failed");
        }
    }
);

export const addFamilyContentComment = createAsyncThunk(
    "familyContent/addComment",
    async ({ id, text }: { id: string; text: string }, { rejectWithValue }) => {
        try {
            const res = await axiosInstance.post(`/family-content/content-content/${id}/comment`, { text });
            return { id, comment: res.data.comment };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to add comment");
        }
    }
);

const familyContentSlice = createSlice({
    name: "familyContent",
    initialState,
    reducers: {
        resetFamilyContent: () => initialState,
        // REAL-TIME OPTIMISTIC UI REDUCER
        toggleLikeOptimistic: (state, action: PayloadAction<{ id: string; userId: string }>) => {
            const content = state.contents.find((c) => c._id === action.payload.id);
            if (content) {
                const index = content.likes.indexOf(action.payload.userId);
                if (index !== -1) {
                    content.likes.splice(index, 1);
                } else {
                    content.likes.push(action.payload.userId);
                }
            }
        },
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
            })
            .addCase(likeFamilyContent.fulfilled, (state, action) => {
                const content = state.contents.find((c) => c._id === action.payload.id);
                if (content && action.payload.likes) {
                    content.likes = action.payload.likes;
                }
            })
            .addCase(addFamilyContentComment.fulfilled, (state, action) => {
                const content = state.contents.find((c) => c._id === action.payload.id);
                if (content) {
                    content.comments.push(action.payload.comment);
                }
            });
    },
});

export const { resetFamilyContent, toggleLikeOptimistic } = familyContentSlice.actions;
export default familyContentSlice.reducer;