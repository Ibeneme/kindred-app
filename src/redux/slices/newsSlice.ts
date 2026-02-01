import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

// --- Updated Types ---
export interface Image {
    url: string;
}

export interface VoiceNote {
    url: string;
    duration: number | null;
}

export interface Author {
    _id: string;
    firstName: string;
    lastName: string;
}

export interface Comment {
    _id: string;
    author: Author;
    text: string;
    createdAt: string;
}

export interface NewsItem {
    _id: string;
    family: string;
    author: Author;
    title: string;
    content: string;
    images: Image[];
    voiceNote: VoiceNote | null;
    likes: string[]; // Array of user IDs
    comments: Comment[];
    createdAt: string;
    updatedAt: string;
}

interface NewsState {
    news: NewsItem[];
    currentNews: NewsItem | null;
    loading: boolean;
    error: string | null;
}

const initialState: NewsState = {
    news: [],
    currentNews: null,
    loading: false,
    error: null,
};

// --- Existing & New Async Thunks ---

export const createNews = createAsyncThunk(
    "news/create",
    async (payload: { familyId: string; title: string; content: string; images?: any[]; voiceNote?: any; voiceDuration?: number }, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append("title", payload.title);
            formData.append("content", payload.content);
            if (payload.voiceDuration) formData.append("voiceDuration", payload.voiceDuration.toString());
            payload.images?.forEach((image) => formData.append("images", image));
            if (payload.voiceNote) formData.append("voiceNote", payload.voiceNote);

            const response = await axiosInstance.post(`/news/family/${payload.familyId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data.news;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to create news");
        }
    }
);

// Toggle Like
export const likeNews = createAsyncThunk(
    "news/like",
    async (newsId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/news/news-news/${newsId}/like`);
            return { newsId, likes: response.data.likes }; // returns updated likes array
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to process like");
        }
    }
);

// Add Comment
export const addComment = createAsyncThunk(
    "news/addComment",
    async ({ newsId, text }: { newsId: string; text: string }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/news/news-news/${newsId}/comment`, { text });
            return { newsId, comment: response.data.comment };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to add comment");
        }
    }
);

// Delete Comment
export const deleteComment = createAsyncThunk(
    "news/deleteComment",
    async ({ newsId, commentId }: { newsId: string; commentId: string }, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/news/news-news/${newsId}/comment/${commentId}`);
            return { newsId, commentId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to delete comment");
        }
    }
);

export const getNewsByFamily = createAsyncThunk(
    "news/getByFamily",
    async (familyId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/news/family/${familyId}`);
            return response.data.news;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch news");
        }
    }
);

export const updateNews = createAsyncThunk(
    "news/update",
    async ({ newsId, data }: { newsId: string; data: any }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.put(`/news/${newsId}`, data);
            return response.data.news;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to update news");
        }
    }
);

export const deleteNews = createAsyncThunk(
    "news/delete",
    async (newsId: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/news/${newsId}`);
            return newsId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to delete news");
        }
    }
);

// --- Slice ---
const newsSlice = createSlice({
    name: "news",
    initialState,
    reducers: {
        clearNewsError: (state) => { state.error = null; },
        resetNewsState: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(getNewsByFamily.fulfilled, (state, action) => {
                state.loading = false;
                state.news = action.payload;
            })
            // === Like Case ===
            .addCase(likeNews.fulfilled, (state, action) => {
                const item = state.news.find(n => n._id === action.payload.newsId);
                if (item) item.likes = action.payload.likes;
            })
            // === Comment Cases ===
            .addCase(addComment.fulfilled, (state, action) => {
                const item = state.news.find(n => n._id === action.payload.newsId);
                if (item) item.comments.push(action.payload.comment);
            })
            .addCase(deleteComment.fulfilled, (state, action) => {
                const item = state.news.find(n => n._id === action.payload.newsId);
                if (item) {
                    item.comments = item.comments.filter(c => c._id !== action.payload.commentId);
                }
            })
            // === Standard News CRUD ===
            .addCase(createNews.fulfilled, (state, action) => {
                state.news.unshift(action.payload);
            })
            .addCase(deleteNews.fulfilled, (state, action) => {
                state.news = state.news.filter(n => n._id !== action.payload);
            })
            .addCase(updateNews.fulfilled, (state, action) => {
                const index = state.news.findIndex(n => n._id === action.payload._id);
                if (index !== -1) state.news[index] = action.payload;
            });
    },
});

export const { clearNewsError, resetNewsState } = newsSlice.actions;
export default newsSlice.reducer;