import { createSlice, createAsyncThunk, PayloadAction, AnyAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

// --- Interfaces ---

export interface AccountDetails {
    accountNumber: string;
    bankName: string;
    accountName: string;
    otherDetails?: string;
}

export interface Campaign {
    _id: string;
    family: string;
    createdBy: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    title: string;
    purpose: string;
    targetAmount: number;
    totalRaised: number;
    minimumDonation: number;
    deadline: string;
    accountDetails: AccountDetails;
    visibility: "PUBLIC" | "PRIVATE" | "HIDDEN";
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    createdAt: string;
}

export interface Contribution {
    _id: string;
    campaign: string | { _id: string; title: string; status: string };
    contributor: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    amountSent: number;
    paymentProof: {
        url: string;
        size: number;
    };
    displayPreference: "NAMED" | "ANONYMOUS";
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
    rejectionReason?: string;
    createdAt: string;
}

interface DonationState {
    campaigns: Campaign[];
    familyContributions: Contribution[]; // For Admins/Creators to verify
    myContributions: Contribution[];     // For Users to see their history
    loading: boolean;
    isSubmitting: boolean;
    error: string | null;
}

const initialState: DonationState = {
    campaigns: [],
    familyContributions: [],
    myContributions: [],
    loading: false,
    isSubmitting: false,
    error: null,
};

// --- Async Thunks ---

export const createCampaign = createAsyncThunk(
    "donation/createCampaign",
    async ({ familyId, data }: { familyId: string; data: Partial<Campaign> }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/donations/families/${familyId}/donations`, data);
            return response.data.campaign;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to create campaign");
        }
    }
);

export const getFamilyCampaigns = createAsyncThunk(
    "donation/getFamilyCampaigns",
    async (familyId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/donations/families/${familyId}/donations`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch campaigns");
        }
    }
);

export const updateCampaign = createAsyncThunk(
    "donation/updateCampaign",
    async ({ campaignId, data }: { campaignId: string; data: Partial<Campaign> }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.put(`/donations/donations/${campaignId}`, data);
            return response.data.campaign;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to update campaign");
        }
    }
);

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

export const contributeToCampaign = createAsyncThunk(
    "donation/contributeToCampaign",
    async ({ campaignId, formData }: { campaignId: string; formData: FormData }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(
                `/donations/donations/${campaignId}/contribute`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            return response.data.contribution;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to submit contribution");
        }
    }
);

export const getAdminFamilyContributions = createAsyncThunk(
    "donation/getAdminFamilyContributions",
    async (familyId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/donations/families/${familyId}/admin/contributions`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch admin list");
        }
    }
);

export const verifyContribution = createAsyncThunk(
    "donation/verifyContribution",
    async (
        { contributionId, status, rejectionReason }: { contributionId: string; status: "VERIFIED" | "REJECTED"; rejectionReason?: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.patch(`/donations/contributions/${contributionId}/verify`, {
                status,
                rejectionReason,
            });
            return response.data.contribution;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Verification failed");
        }
    }
);

export const getMyContributions = createAsyncThunk(
    "donation/getMyContributions",
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/donations/my-contributions`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch history");
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
        resetAdminState: (state) => {
            state.familyContributions = [];
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getFamilyCampaigns.fulfilled, (state, action) => {
                state.loading = false;
                state.campaigns = action.payload;
            })
            .addCase(createCampaign.fulfilled, (state, action) => {
                state.isSubmitting = false;
                state.campaigns.unshift(action.payload);
            })
            .addCase(deleteCampaign.fulfilled, (state, action) => {
                state.campaigns = state.campaigns.filter((c) => c._id !== action.payload);
            })
            .addCase(getAdminFamilyContributions.fulfilled, (state, action) => {
                state.loading = false;
                state.familyContributions = action.payload;
            })
            .addCase(verifyContribution.fulfilled, (state, action: PayloadAction<Contribution>) => {
                state.isSubmitting = false;
                const index = state.familyContributions.findIndex((c) => c._id === action.payload._id);
                if (index !== -1) {
                    state.familyContributions[index] = action.payload;
                }

                if (action.payload.verificationStatus === "VERIFIED") {
                    const campId = typeof action.payload.campaign === 'string'
                        ? action.payload.campaign
                        : action.payload.campaign._id;

                    const campIndex = state.campaigns.findIndex((c) => c._id === campId);
                    if (campIndex !== -1) {
                        state.campaigns[campIndex].totalRaised += action.payload.amountSent;
                    }
                }
            })
            .addCase(getMyContributions.fulfilled, (state, action) => {
                state.loading = false;
                state.myContributions = action.payload;
            })

            // --- Matchers with Fixed Typing ---
            .addMatcher(
                (action): action is AnyAction => action.type.endsWith("/pending"),
                (state, action) => {
                    if (action.type.includes("create") || action.type.includes("verify") || action.type.includes("contribute")) {
                        state.isSubmitting = true;
                    } else {
                        state.loading = true;
                    }
                    state.error = null;
                }
            )
            .addMatcher(
                (action): action is AnyAction => action.type.endsWith("/rejected"),
                (state, action) => {
                    state.loading = false;
                    state.isSubmitting = false;
                    // Fixed: TS now recognizes payload via AnyAction cast
                    state.error = (action.payload as string) || "An unexpected error occurred";
                }
            );
    },
});

export const { clearDonationError, resetAdminState } = donationSlice.actions;
export default donationSlice.reducer;