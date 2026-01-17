import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

interface Comment {
    _id: string;
    user: {
        _id: string;
        name: string;
        profilePicture?: string;
    };
    message: string;
    createdAt: string;
}


interface Report {
    _id: string;
    familyId: string;
    sender: {
        _id: string;
        name: string;
        profilePicture?: string;
    };
    reportName: string;
    expectations?: string;
    workDone: string;
    status: "In Progress" | "Review" | "Completed";
    completionPercentage: number;
    proofLinks: string[];
    sharedWith: any[];
    comments?: Comment[]; // ✅ ADD THIS
    isOwner: boolean;
    createdAt: string;
}

interface ReportState {
    reports: Report[];
    loading: boolean;
    error: string | null;
}

const initialState: ReportState = {
    reports: [],
    loading: false,
    error: null,
};

// --- Async Thunks ---

// CREATE
export const createReport = createAsyncThunk(
    "reports/create",
    async (reportData: Partial<Report>, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post("/reports", reportData);
            return response.data.report;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to create report");
        }
    }
);

// GET BY FAMILY ID
export const fetchReportsByFamily = createAsyncThunk(
    "reports/fetchByFamily",
    async (familyId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/reports/family/${familyId}`);
            return response.data.reports;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch reports");
        }
    }
);

// UPDATE
export const updateReport = createAsyncThunk(
    "reports/update",
    async ({ id, data }: { id: string; data: Partial<Report> }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.put(`/reports/${id}`, data);
            return response.data.report;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to update report");
        }
    }
);

// DELETE
export const deleteReport = createAsyncThunk(
    "reports/delete",
    async (reportId: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/reports/${reportId}`);
            return reportId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to delete report");
        }
    }
);

export const addReportComment = createAsyncThunk(
    "reports/addComment",
    async (
        { reportId, message }: { reportId: string; message: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.put(
                `/reports/reports-comments`,
                { message, reportId }
            );

            return {
                reportId,
                comment: response.data.comment,
            };
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message || "Failed to add comment"
            );
        }
    }
);

// --- Slice ---

const reportSlice = createSlice({
    name: "reports",
    initialState,
    reducers: {
        clearReportError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Reports
            .addCase(fetchReportsByFamily.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchReportsByFamily.fulfilled, (state, action: PayloadAction<Report[]>) => {
                state.loading = false;
                state.reports = action.payload;
            })
            .addCase(fetchReportsByFamily.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Create Report
            .addCase(createReport.fulfilled, (state, action: PayloadAction<Report>) => {
                // Since the creator is the current user, we can manually set isOwner to true
                const newReport = { ...action.payload, isOwner: true };
                state.reports.unshift(newReport);
            })

            // Update Report
            .addCase(updateReport.fulfilled, (state, action: PayloadAction<Report>) => {
                const index = state.reports.findIndex((r) => r._id === action.payload._id);
                if (index !== -1) {
                    // Keep the existing isOwner flag since updates don't change ownership
                    state.reports[index] = { ...action.payload, isOwner: state.reports[index].isOwner };
                }
            })

            // Delete Report
            .addCase(deleteReport.fulfilled, (state, action: PayloadAction<string>) => {
                state.reports = state.reports.filter((r) => r._id !== action.payload);
            })
            // Add Comment
            .addCase(addReportComment.fulfilled, (state, action) => {
                const { reportId, comment } = action.payload;

                const report = state.reports.find((r) => r._id === reportId);
                if (report) {
                    if (!report.comments) {
                        report.comments = [];
                    }
                    report.comments.push(comment);
                }
            })
            .addCase(addReportComment.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const { clearReportError } = reportSlice.actions;
export default reportSlice.reducer;