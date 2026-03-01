import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  AnyAction,
} from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";

// --- Interfaces ---

export interface SafetyNet {
  _id: string;
  family: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  title: string;
  description?: string;
  imageUrls: string[];
  audioUrls: string[];
  videoUrls: string[];
  assignedUsers: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  }[];
  triggerDate: string;
  status: "PENDING" | "RELEASED" | "CANCELLED";
  isLocked?: boolean;
  createdAt: string;
}

interface SafetyNetState {
  safetyNets: SafetyNet[];
  assignedNets: SafetyNet[];
  selectedNet: SafetyNet | null;
  loading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: SafetyNetState = {
  safetyNets: [],
  assignedNets: [],
  selectedNet: null,
  loading: false,
  isSubmitting: false,
  error: null,
};

// --- Async Thunks ---

// 1. Create Safety Net
export const createSafetyNet = createAsyncThunk(
  "safetyNet/create",
  async (
    { familyId, formData }: { familyId: string; formData: FormData },
    { rejectWithValue }
  ) => {
    try {
      console.log(formData, 'formData')
      const response = await axiosInstance.post(
        `/safety-net/${familyId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return response.data.safetyNet;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create"
      );
    }
  }
);

// 2. Get All Family Safety Nets
export const getFamilySafetyNets = createAsyncThunk(
  "safetyNet/getFamily",
  async (familyId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/safety-net/family/${familyId}`
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch"
      );
    }
  }
);

// 3. Get Vaults Assigned to Current User
export const getAssignedSafetyNets = createAsyncThunk(
  "safetyNet/getAssigned",
  async (familyId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/safety-net/assigned/${familyId}`
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch shared vaults"
      );
    }
  }
);

// --- 4. NEW: Get Safety Net By ID ---
export const getSafetyNetById = createAsyncThunk(
  "safetyNet/getById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/safety-net/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load vault"
      );
    }
  }
);

// 5. Update Safety Net
export const updateSafetyNet = createAsyncThunk(
  "safetyNet/update",
  async (
    { id, data }: { id: string; data: Partial<SafetyNet> },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.put(`/safety-net/${id}`, data);
      return response.data.safetyNet;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Update failed");
    }
  }
);

// 6. Delete Safety Net
export const deleteSafetyNet = createAsyncThunk(
  "safetyNet/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/safety-net/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Delete failed");
    }
  }
);

// --- Slice ---

const safetyNetSlice = createSlice({
  name: "safetyNet",
  initialState,
  reducers: {
    clearSafetyNetError: (state) => {
      state.error = null;
    },
    clearSelectedNet: (state) => {
      state.selectedNet = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getFamilySafetyNets.fulfilled, (state, action) => {
        state.loading = false;
        state.safetyNets = action.payload;
      })
      .addCase(getAssignedSafetyNets.fulfilled, (state, action) => {
        state.loading = false;
        state.assignedNets = action.payload;
      })
      // Handle the new Get By ID thunk
      .addCase(getSafetyNetById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedNet = action.payload;
      })
      .addCase(createSafetyNet.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.safetyNets.unshift(action.payload);
      })
      .addCase(updateSafetyNet.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.safetyNets.findIndex(
          (n) => n._id === action.payload._id
        );
        if (index !== -1) state.safetyNets[index] = action.payload;
        if (state.selectedNet?._id === action.payload._id)
          state.selectedNet = action.payload;
      })
      .addCase(deleteSafetyNet.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.safetyNets = state.safetyNets.filter(
          (n) => n._id !== action.payload
        );
        state.assignedNets = state.assignedNets.filter(
          (n) => n._id !== action.payload
        );
        if (state.selectedNet?._id === action.payload) state.selectedNet = null;
      })

      // Standard Matchers
      .addMatcher(
        (action): action is AnyAction => action.type.endsWith("/pending"),
        (state, action) => {
          if (
            ["create", "update", "delete"].some((key) =>
              action.type.includes(key)
            )
          ) {
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
          state.error =
            (action.payload as string) || "An unexpected error occurred";
        }
      );
  },
});

export const { clearSafetyNetError, clearSelectedNet } = safetyNetSlice.actions;
export default safetyNetSlice.reducer;
