import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";


export interface FamilyMember {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export interface Family {
    _id: string;
    familyName: string;
    familyType: string;
    description: string;
    owner: FamilyMember | string;
    members: FamilyMember[];
    pendingInvites?: string[];
    joinRequests?: FamilyMember[] | string[];
    inviteCode: string;
    createdAt: string;
    isMember?: boolean;
    isNotMember?: boolean;
    isInviteSent?: boolean;
    isJoinRequestSent?: boolean;
    invitationCode?: any;
    unreadSummary?: any
}

export interface InviteFamilyResponse {
    family: Family;
    isOwner: boolean;
}

interface FamilyState {
    families: Family[];
    selectedFamily: Family | null;
    joinRequests: FamilyMember[];
    inviteFamily: Family | null;
    inviteIsOwner: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: FamilyState = {
    families: [],
    selectedFamily: null,
    joinRequests: [],
    inviteFamily: null,
    inviteIsOwner: false,
    loading: false,
    error: null,
};


export const createFamily = createAsyncThunk("family/create", async (data: any, { rejectWithValue }) => {
    try { const res = await axiosInstance.post("/families", data); return res.data.family; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});

export const getFamilies = createAsyncThunk("family/getAll", async (_, { rejectWithValue }) => {
    try { const res = await axiosInstance.get("/families"); return res.data; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});

export const getFamilyById = createAsyncThunk("family/getOne", async (id: string, { rejectWithValue }) => {
    try { const res = await axiosInstance.get(`/families/${id}`); return res.data; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});

export const getFamilyByInviteCode = createAsyncThunk("family/getByInviteCode", async (code: string, { rejectWithValue }) => {
    try { const res = await axiosInstance.get(`/families/invite/${code}`); return res.data as InviteFamilyResponse; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});

export const updateFamily = createAsyncThunk("family/update", async ({ id, data }: { id: string, data: any }, { rejectWithValue }) => {
    try { const res = await axiosInstance.put(`/families/${id}`, data); return res.data.family; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});

export const sendInvite = createAsyncThunk<
    { message: string; familyId: string; userId: string },
    { familyId: string; userId: string },
    { rejectValue: string }
>(
    "family/sendInvite",
    async ({ familyId, userId }, { rejectWithValue }) => {
        try {
            const res = await axiosInstance.post(
                `/families/${familyId}/invite`,
                { userId }
            );

            return {
                message: res.data.message,
                familyId,
                userId,
            };
        } catch (err: any) {
            return rejectWithValue(
                err.response?.data?.message || "Failed to send invite"
            );
        }
    }
);


export const deleteFamily = createAsyncThunk("family/delete", async (id: string, { rejectWithValue }) => {
    try { await axiosInstance.delete(`/families/${id}`); return id; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});



export const acceptInvite = createAsyncThunk("family/acceptInvite", async (familyId: string, { rejectWithValue }) => {
    try { const res = await axiosInstance.post(`/families/${familyId}/accept`); return res.data.family; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});

export const declineInvite = createAsyncThunk("family/declineInvite", async (familyId: string, { rejectWithValue }) => {
    try { await axiosInstance.post(`/families/${familyId}/decline`); return familyId; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});

export const requestToJoin = createAsyncThunk("family/requestJoin", async (familyId: string, { rejectWithValue }) => {
    try { const res = await axiosInstance.post(`/families/${familyId}/request`); return res.data; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});

export const getJoinRequests = createAsyncThunk("family/getRequests", async (familyId: string, { rejectWithValue }) => {
    try { const res = await axiosInstance.get(`/families/${familyId}/requests`); return res.data.joinRequests; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});

export const acceptJoinRequest = createAsyncThunk("family/acceptRequest", async ({ familyId, userId }: { familyId: string, userId: string }, { rejectWithValue }) => {
    try { const res = await axiosInstance.post(`/families/${familyId}/requests/${userId}/accept`); return { family: res.data.family, userId }; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});

export const declineJoinRequest = createAsyncThunk("family/declineRequest", async ({ familyId, userId }: { familyId: string, userId: string }, { rejectWithValue }) => {
    try { await axiosInstance.post(`/families/${familyId}/requests/${userId}/decline`); return userId; }
    catch (err: any) { return rejectWithValue(err.response?.data?.message); }
});


export const replaceFamilyMembers = createAsyncThunk(
    "family/replaceMembers",
    async (
        { familyId, emails }: { familyId: string; emails: string[] },
        { rejectWithValue }
    ) => {
        try {
            const res = await axiosInstance.post(
                `/families/new-invite/send`,
                { emails, familyId }
            );

            return res.data.family as Family;
        } catch (err: any) {
            return rejectWithValue(
                err.response?.data?.message || "Failed to update family members"
            );
        }
    }
);


const familySlice = createSlice({
    name: "family",
    initialState,
    reducers: {
        clearFamilyError: (state) => { state.error = null; },
        clearSelectedFamily: (state) => { state.selectedFamily = null; state.joinRequests = []; },
    },
    extraReducers: (builder) => {
        builder
            // --- 1. ALL addCase CALLS MUST BE FIRST ---
            .addCase(getFamilies.fulfilled, (state, action: PayloadAction<Family[]>) => {
                state.loading = false;
                state.families = action.payload;
            })
            .addCase(createFamily.fulfilled, (state, action: PayloadAction<Family>) => {
                state.loading = false;
                state.families.unshift(action.payload);
            })
            .addCase(getFamilyById.fulfilled, (state, action: PayloadAction<{ family: Family, isOwner: boolean }>) => {
                state.loading = false;
                state.selectedFamily = action.payload.family;
            })
            .addCase(getFamilyByInviteCode.fulfilled, (state, action: PayloadAction<InviteFamilyResponse>) => {
                state.loading = false;
                state.inviteFamily = action.payload.family;
                state.inviteIsOwner = action.payload.isOwner;
            })
            .addCase(updateFamily.fulfilled, (state, action: PayloadAction<Family>) => {
                state.loading = false;
                const idx = state.families.findIndex(f => f._id === action.payload._id);
                if (idx !== -1) state.families[idx] = action.payload;
                if (state.selectedFamily?._id === action.payload._id) state.selectedFamily = action.payload;
            })
            .addCase(deleteFamily.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.families = state.families.filter(f => f._id !== action.payload);
                state.selectedFamily = null;
            })
            .addCase(acceptInvite.fulfilled, (state, action: PayloadAction<Family>) => {
                state.loading = false;
                state.families.unshift(action.payload);
            })
            .addCase(getJoinRequests.fulfilled, (state, action: PayloadAction<FamilyMember[]>) => {
                state.loading = false;
                state.joinRequests = action.payload;
            })
            .addCase(acceptJoinRequest.fulfilled, (state, action: PayloadAction<{ family: Family, userId: string }>) => {
                state.loading = false;
                state.joinRequests = state.joinRequests.filter(r => r._id !== action.payload.userId);
                state.selectedFamily = action.payload.family;
            })
            .addCase(declineJoinRequest.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.joinRequests = state.joinRequests.filter(r => r._id !== action.payload);
            })
       
            // --- 2. ALL addMatcher CALLS MUST BE AT THE END ---
            .addMatcher(
                (action) => action.type.endsWith("/pending"),
                (state) => {
                    state.loading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                (action) => action.type.endsWith("/rejected"),
                (state, action: PayloadAction<string>) => {
                    state.loading = false;
                    state.error = action.payload || "An unexpected error occurred";
                }
            );
    },
});

export const { clearFamilyError, clearSelectedFamily } = familySlice.actions;
export default familySlice.reducer;