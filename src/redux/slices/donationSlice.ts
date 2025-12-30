import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

// --- Types ---

interface Campaign {
    _id: string;
    family: string;
    createdBy: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    title: string;
    description: string;
    targetAmount: number;
    currentAmount: number;
    minimumDonation: number;
    deadline: string;
    status: "active" | "completed" | "cancelled";
    createdAt: string;
}

interface DonationState {
    campaigns: Campaign[];
    loading: boolean;
    error: string | null;
}

const initialState: DonationState = {
    campaigns: [],
    loading: false,
    error: null,
};

// --- Async Thunks ---

// 1. Create Campaign
export const createCampaign = createAsyncThunk(
    "donation/createCampaign",
    async (
        { familyId, data }: { familyId: string; data: Partial<Campaign> },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(
                `/donations/families/${familyId}/donations`,
                data
            );
            return response.data.campaign;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to create campaign");
        }
    }
);

// 2. Get Campaigns by Family ID
export const getFamilyCampaigns = createAsyncThunk(
    "donation/getFamilyCampaigns",
    async (familyId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/donations/families/${familyId}/donations`);
            return response.data; // This is the array of campaigns
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch campaigns");
        }
    }
);

// 3. Update Campaign
export const updateCampaign = createAsyncThunk(
    "donation/updateCampaign",
    async (
        { campaignId, data }: { campaignId: string; data: Partial<Campaign> },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.put(`/donations/donations/${campaignId}`, data);
            return response.data.campaign;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to update campaign");
        }
    }
);

// 4. Delete Campaign
export const deleteCampaign = createAsyncThunk(
    "donation/deleteCampaign",
    async (campaignId: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/donations/donations/${campaignId}`);
            return campaignId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to delete campaign");
        }
    }
);

// --- Slice ---

const donationSlice = createSlice({
    name: "donation",
    initialState,
    reducers: {
        clearDonationError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Campaigns
            .addCase(getFamilyCampaigns.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getFamilyCampaigns.fulfilled, (state, action: PayloadAction<Campaign[]>) => {
                state.loading = false;
                state.campaigns = action.payload;
            })
            .addCase(getFamilyCampaigns.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Create Campaign
            .addCase(createCampaign.fulfilled, (state, action: PayloadAction<Campaign>) => {
                state.campaigns.unshift(action.payload); // Add new campaign to start of list
            })

            // Update Campaign
            .addCase(updateCampaign.fulfilled, (state, action: PayloadAction<Campaign>) => {
                const index = state.campaigns.findIndex((c) => c._id === action.payload._id);
                if (index !== -1) {
                    state.campaigns[index] = action.payload;
                }
            })

            // Delete Campaign
            .addCase(deleteCampaign.fulfilled, (state, action: PayloadAction<string>) => {
                state.campaigns = state.campaigns.filter((c) => c._id !== action.payload);
            });
    },
});

export const { clearDonationError } = donationSlice.actions;
export default donationSlice.reducer;