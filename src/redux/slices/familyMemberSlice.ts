import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

// ===============================
// Types
// ===============================

export interface MemberRights {
    canPostNews?: boolean;
    canCreateTasks?: boolean;
    canManageMembers?: boolean;
    canViewReports?: boolean;
    [key: string]: any;
}

export interface FamilyMember {
    _id: string;
    userId: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    role: "Owner" | "Admin" | "Member";
    status: "Active" | "Restricted" | "Banned";
    joinedAt: string;
    rights: MemberRights;
    restrictionReason?: string;
}

interface FamilyMemberState {
    members: FamilyMember[];
    loading: boolean;
    updating: boolean;
    error: string | null;
}

const initialState: FamilyMemberState = {
    members: [],
    loading: false,
    updating: false,
    error: null,
};

// ===============================
// Async Thunks
// ===============================

/**
 * 1️⃣ Get all members by Family ID
 */
export const getFamilyMembers = createAsyncThunk(
    "familyMembers/fetchAll",
    async (familyId: string, { rejectWithValue }) => {
        try {
            const res = await axiosInstance.post("/family-members/get-members", {
                familyId,
            });
            return res.data.members;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to fetch family members"
            );
        }
    }
);

/**
 * 2️⃣ Update a specific member (Role, Status, or Rights)
 */
export const updateFamilyMember = createAsyncThunk(
    "familyMembers/update",
    async (
        {
            memberId,
            role,
            status,
            rights,
            restrictionReason,
            familyId,
            userId
        }: {
            memberId: string;
            role?: string;
            status?: string;
            rights?: MemberRights;
            restrictionReason?: string;
            familyId?: any
            userId?: any
        },
        { rejectWithValue }
    ) => {
        try {
            const res = await axiosInstance.put("/family-members/update-member", {
                memberId,
                role,
                status,
                rights,
                familyId,
                restrictionReason,
                userId
            });
            return res.data.member;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to update member"
            );
        }
    }
);

// ===============================
// Slice
// ===============================

const familyMemberSlice = createSlice({
    name: "familyMembers",
    initialState,
    reducers: {
        resetMemberState: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            // Fetch Members
            .addCase(getFamilyMembers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getFamilyMembers.fulfilled, (state, action: PayloadAction<FamilyMember[]>) => {
                state.loading = false;
                state.members = action.payload;
            })
            .addCase(getFamilyMembers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Update Member
            .addCase(updateFamilyMember.pending, (state) => {
                state.updating = true;
            })
            .addCase(updateFamilyMember.fulfilled, (state, action: PayloadAction<FamilyMember>) => {
                state.updating = false;
                const index = state.members.findIndex((m) => m._id === action.payload._id);
                if (index !== -1) {
                    state.members[index] = action.payload;
                }
            })
            .addCase(updateFamilyMember.rejected, (state, action) => {
                state.updating = false;
                state.error = action.payload as string;
            });
    },
});

export const { resetMemberState } = familyMemberSlice.actions;
export default familyMemberSlice.reducer;