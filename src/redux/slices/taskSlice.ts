import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../services/axiosInstance";


export const createTask = createAsyncThunk(
    "task/create",
    async (
        {
            familyId,
            title,
            details,
            deadline,
            assignedTo,
        }: {
            familyId: string;
            title: string;
            details?: string;
            deadline?: string;
            assignedTo?: string;
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(`/tasks/family/${familyId}`, {
                title,
                details,
                deadline,
                assignedTo,
            });
            return response.data.task;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to create task");
        }
    }
);

// GET TASKS BY FAMILY
export const fetchTasksByFamily = createAsyncThunk(
    "task/fetchByFamily",
    async (familyId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/tasks/family/${familyId}`);
            return response.data.tasks;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch tasks");
        }
    }
);

// UPDATE TASK
export const updateTask = createAsyncThunk(
    "task/update",
    async (
        {
            taskId,
            title,
            details,
            deadline,
            assignedTo,
            status,
        }: {
            taskId: string;
            title?: string;
            details?: string;
            deadline?: string;
            assignedTo?: string;
            status?: "pending" | "in-progress" | "completed";
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.put(`/tasks/${taskId}`, {
                title,
                details,
                deadline,
                assignedTo,
                status,
            });
            return response.data.task;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to update task");
        }
    }
);

// DELETE TASK
export const deleteTask = createAsyncThunk(
    "task/delete",
    async (taskId: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/tasks/${taskId}`);
            return taskId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to delete task");
        }
    }
);

// GET SINGLE TASK
export const fetchTask = createAsyncThunk(
    "task/fetchSingle",
    async (taskId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/tasks/${taskId}`);
            return response.data.task;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch task");
        }
    }
);

// =======================
// Slice
// =======================

interface TaskState {
    tasks: any[];
    currentTask: any | null;
    loading: boolean;
    error: string | null;
}

const initialState: TaskState = {
    tasks: [],
    currentTask: null,
    loading: false,
    error: null,
};

const taskSlice = createSlice({
    name: "task",
    initialState,
    reducers: {
        clearCurrentTask: (state) => {
            state.currentTask = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // CREATE TASK
        builder.addCase(createTask.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(createTask.fulfilled, (state, action) => {
            state.loading = false;
            state.tasks.unshift(action.payload);
        });
        builder.addCase(createTask.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });

        // FETCH TASKS BY FAMILY
        builder.addCase(fetchTasksByFamily.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchTasksByFamily.fulfilled, (state, action) => {
            state.loading = false;
            state.tasks = action.payload;
        });
        builder.addCase(fetchTasksByFamily.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });

        // UPDATE TASK
        builder.addCase(updateTask.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(updateTask.fulfilled, (state, action) => {
            state.loading = false;
            const index = state.tasks.findIndex((t) => t._id === action.payload._id);
            if (index !== -1) {
                state.tasks[index] = action.payload;
            }
            if (state.currentTask?._id === action.payload._id) {
                state.currentTask = action.payload;
            }
        });
        builder.addCase(updateTask.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });

        // DELETE TASK
        builder.addCase(deleteTask.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(deleteTask.fulfilled, (state, action) => {
            state.loading = false;
            state.tasks = state.tasks.filter((t) => t._id !== action.payload);
        });
        builder.addCase(deleteTask.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });

        // FETCH SINGLE TASK
        builder.addCase(fetchTask.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchTask.fulfilled, (state, action) => {
            state.loading = false;
            state.currentTask = action.payload;
        });
        builder.addCase(fetchTask.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });
    },
});

export const { clearCurrentTask, clearError } = taskSlice.actions;
export default taskSlice.reducer;