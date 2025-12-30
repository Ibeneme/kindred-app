// src/features/news/newsSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

// --- Types ---
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

export interface NewsItem {
    _id: string;
    family: string;
    author: Author;
    title: string;
    content: string;
    images: Image[];
    voiceNote: VoiceNote | null;
    createdAt: string;
    updatedAt: string;
}

interface NewsState {
    news: NewsItem[];              // List of news for current family
    currentNews: NewsItem | null;  // Single news item (for detail/edit)
    loading: boolean;
    error: string | null;
}

// Initial state
const initialState: NewsState = {
    news: [],
    currentNews: null,
    loading: false,
    error: null,
};

// --- Async Thunks ---

// Create News (FormData - images & voice note handled separately in component)
export const createNews = createAsyncThunk(
    "news/create",
    async (
        {
            familyId,
            title,
            content,
            images,
            voiceNote,
            voiceDuration,
        }: {
            familyId: string;
            title: string;
            content: string;
            images?: File[];
            voiceNote?: File;
            voiceDuration?: number;
        },
        { rejectWithValue }
    ) => {
        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("content", content);

            if (voiceDuration) {
                formData.append("voiceDuration", voiceDuration.toString());
            }

            images?.forEach((image) => {
                formData.append("images", image);
            });

            if (voiceNote) {
                formData.append("voiceNote", voiceNote);
            }

            const response = await axiosInstance.post(
                `/news/family/${familyId}`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            return response.data.news;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to create news"
            );
        }
    }
);

// Get all news for a family
export const getNewsByFamily = createAsyncThunk(
    "news/getByFamily",
    async (familyId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/news/family/${familyId}`);
            return response.data.news; // array
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to fetch news"
            );
        }
    }
);

// Get single news item
export const getNewsById = createAsyncThunk(
    "news/getById",
    async (newsId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/news/${newsId}`);
            return response.data.news;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to fetch news"
            );
        }
    }
);

// Update news
export const updateNews = createAsyncThunk(
    "news/update",
    async (
        {
            newsId,
            data
        }: {
            newsId: string;
            data: any[]
        },
        { rejectWithValue }
    ) => {
        try {
       
            console.warn(data, 'payloadpayload')
            const response = await axiosInstance.put(
                `/news/${newsId}`,
                data // ✅ JSON body
            );

            return response.data.news;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to update news"
            );
        }
    }
);

// Delete news
export const deleteNews = createAsyncThunk(
    "news/delete",
    async (newsId: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/news/${newsId}`);
            return newsId; // Return ID to remove from state
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to delete news"
            );
        }
    }
);

// --- Slice ---
const newsSlice = createSlice({
    name: "news",
    initialState,
    reducers: {
        clearNewsError: (state) => {
            state.error = null;
        },
        clearCurrentNews: (state) => {
            state.currentNews = null;
        },
        resetNewsState: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            // === Create News ===
            .addCase(createNews.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createNews.fulfilled, (state, action: PayloadAction<NewsItem>) => {
                state.loading = false;
                state.news.unshift(action.payload); // Add to top
            })
            .addCase(createNews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // === Get News by Family ===
            .addCase(getNewsByFamily.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getNewsByFamily.fulfilled, (state, action: PayloadAction<NewsItem[]>) => {
                state.loading = false;
                state.news = action.payload;
            })
            .addCase(getNewsByFamily.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // === Get Single News ===
            .addCase(getNewsById.pending, (state) => {
                state.loading = true;
            })
            .addCase(getNewsById.fulfilled, (state, action: PayloadAction<NewsItem>) => {
                state.loading = false;
                state.currentNews = action.payload;
            })
            .addCase(getNewsById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // === Update News ===
            .addCase(updateNews.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateNews.fulfilled, (state, action: PayloadAction<NewsItem>) => {
                state.loading = false;
                // Update in list
                const index = state.news.findIndex((n) => n._id === action.payload._id);
                if (index !== -1) {
                    state.news[index] = action.payload;
                }
                // Update current if matches
                if (state.currentNews?._id === action.payload._id) {
                    state.currentNews = action.payload;
                }
            })
            .addCase(updateNews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // === Delete News ===
            .addCase(deleteNews.pending, (state) => {
                state.loading = true;
            })
            .addCase(deleteNews.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.news = state.news.filter((n) => n._id !== action.payload);
                if (state.currentNews?._id === action.payload) {
                    state.currentNews = null;
                }
            })
            .addCase(deleteNews.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearNewsError, clearCurrentNews, resetNewsState } =
    newsSlice.actions;

export default newsSlice.reducer;