import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

interface Comment {
    _id: string;
    user: {
        _id: string;
        firstName: string;
        lastName: string;
        profilePicture?: string;
    };
    message: string;
    createdAt: string;
}

interface Suggestion {
    _id: string;
    familyId: string;
    sender: {
        _id: string;
        firstName: string;
        lastName: string;
        profilePicture?: string;
    };
    title: string;
    description: string;
    imageUrl?: string;
    upvoteCount: number;
    hasUpvoted: boolean;
    likeCount: number;
    hasLiked: boolean;
    comments: Comment[];
    isOwner: boolean;
    status: "pending" | "reviewed" | "implemented";
    createdAt: string;
    visibility: "all" | "admins";
}

interface SuggestionState {
    suggestions: Suggestion[];
    loading: boolean;
    error: string | null;
}

const initialState: SuggestionState = {
    suggestions: [],
    loading: false,
    error: null,
};

// CREATE
export const createSuggestion = createAsyncThunk(
    "suggestions/create",
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post("/suggestions", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data.suggestion;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to add suggestion");
        }
    }
);

// FETCH BY FAMILY
export const fetchSuggestionsByFamily = createAsyncThunk(
    "suggestions/fetchByFamily",
    async (familyId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/suggestions/family/${familyId}`);
            return response.data.suggestions;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch suggestions");
        }
    }
);

// TOGGLE UPVOTE (Likes)
export const toggleUpvote = createAsyncThunk(
    "suggestions/toggleUpvote",
    async (suggestionId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.patch(`/suggestions/${suggestionId}/upvote`);
            return { suggestionId, upvoteCount: response.data.upvotes };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Action failed");
        }
    }
);

// ADD COMMENT
export const addSuggestionComment = createAsyncThunk(
    "suggestions/addComment",
    async (
        { suggestionId, message }: { suggestionId: string; message: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(`/suggestions/${suggestionId}/comment`, {
                message,
            });
            return { suggestionId, comments: response.data.comments };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to add comment");
        }
    }
);

// DELETE
export const deleteSuggestion = createAsyncThunk(
    "suggestions/delete",
    async (suggestionId: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/suggestions/${suggestionId}`);
            return suggestionId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to delete");
        }
    }
);

const suggestionSlice = createSlice({
    name: "suggestions",
    initialState,
    reducers: {
        clearSuggestionError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSuggestionsByFamily.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchSuggestionsByFamily.fulfilled, (state, action) => {
                state.loading = false;
                state.suggestions = action.payload;
            })
            .addCase(fetchSuggestionsByFamily.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createSuggestion.fulfilled, (state, action) => {
                state.suggestions.unshift({
                    ...action.payload,
                    isOwner: true,
                    upvoteCount: 0,
                    hasUpvoted: false,
                    likeCount: 0,
                    hasLiked: false,
                    comments: [],
                });
            })
            .addCase(toggleUpvote.fulfilled, (state, action) => {
                const item = state.suggestions.find((s) => s._id === action.payload.suggestionId);
                if (item) {
                    item.upvoteCount = action.payload.upvoteCount;
                    item.hasUpvoted = !item.hasUpvoted;
                }
            })
            .addCase(addSuggestionComment.fulfilled, (state, action) => {
                const item = state.suggestions.find((s) => s._id === action.payload.suggestionId);
                if (item) {
                    item.comments = action.payload.comments;
                }
            })
            .addCase(deleteSuggestion.fulfilled, (state, action) => {
                state.suggestions = state.suggestions.filter((s) => s._id !== action.payload);
            });
    },
});

export const { clearSuggestionError } = suggestionSlice.actions;
export default suggestionSlice.reducer;