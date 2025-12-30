import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

interface PollOption {
    _id: string;
    text: string;
    votes: string[]; // User IDs
}

interface Poll {
    _id: string;
    familyId: string;
    sender: {
        _id: string;
        name: string;
        profilePicture?: string;
    };
    title: string;
    description?: string;
    options: PollOption[];
    endDate?: string;
    status: 'active' | 'closed';
    createdAt: string;
    // Computed properties from backend
    isOwner: boolean;
    totalVotes: number;
    userVotedOptionId: string | null;
    isExpired: boolean;
}

interface PollState {
    polls: Poll[];
    loading: boolean;
    error: string | null;
}

const initialState: PollState = {
    polls: [],
    loading: false,
    error: null,
};

// --- Async Thunks ---

// CREATE POLL
export const createPoll = createAsyncThunk(
    "polls/create",
    async (pollData: {
        title: string;
        description?: string;
        options: string[];
        endDate?: string;
        familyId: string
    }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post("/polls", pollData);
            return response.data.poll;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to create poll");
        }
    }
);

// FETCH POLLS BY FAMILY
export const fetchPollsByFamily = createAsyncThunk(
    "polls/fetchByFamily",
    async (familyId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/polls/family/${familyId}`);
            return response.data.polls;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch polls");
        }
    }
);

// VOTE IN POLL
export const voteInPoll = createAsyncThunk(
    "polls/vote",
    async ({ pollId, optionId }: { pollId: string; optionId: string }, { rejectWithValue }) => {
        try {
            await axiosInstance.patch(`/polls/${pollId}/vote`, { optionId });
            return { pollId, optionId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to record vote");
        }
    }
);

// DELETE POLL
export const deletePoll = createAsyncThunk(
    "polls/delete",
    async (pollId: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/polls/${pollId}`);
            return pollId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to delete poll");
        }
    }
);

// --- Slice ---

const pollSlice = createSlice({
    name: "polls",
    initialState,
    reducers: {
        clearPollError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch
            .addCase(fetchPollsByFamily.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchPollsByFamily.fulfilled, (state, action: PayloadAction<Poll[]>) => {
                state.loading = false;
                state.polls = action.payload;
            })
            .addCase(fetchPollsByFamily.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Create
            .addCase(createPoll.fulfilled, (state, action: PayloadAction<Poll>) => {
                state.polls.unshift({
                    ...action.payload,
                    isOwner: true,
                    totalVotes: 0,
                    userVotedOptionId: null
                });
            })

            // Vote Logic (Optimistic UI Update)
            .addCase(voteInPoll.fulfilled, (state, action) => {
                const { pollId, optionId } = action.payload;
                const poll = state.polls.find(p => p._id === pollId);

                if (poll) {
                    // If user had a previous vote, decrease total count (backend handles DB, we handle UI)
                    if (poll.userVotedOptionId === null) {
                        poll.totalVotes += 1;
                    }
                    poll.userVotedOptionId = optionId;

                    // Re-fetching is usually cleaner for votes, but this logic 
                    // keeps the UI snappy while the DB processes.
                }
            })

            // Delete
            .addCase(deletePoll.fulfilled, (state, action: PayloadAction<string>) => {
                state.polls = state.polls.filter(p => p._id !== action.payload);
            });
    },
});

export const { clearPollError } = pollSlice.actions;
export default pollSlice.reducer;