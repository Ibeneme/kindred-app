// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slices/authSlice";
import familyReducer from '../slices/familySlice'
import featureSlice from "../slices/featureSlice";
import newsSlice from "../slices/newsSlice";
import taskSlice from "../slices/taskSlice";
import reportSlice from "../slices/reportSlice";
import suggestionSlice from "../slices/suggestionSlice";
import pollSlice from "../slices/pollSlice";
import notificationSlice from "../slices/notificationSlice";
import userSlice from "../slices/userSlice";
import donationSlice from "../slices/donationSlice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        family: familyReducer,
        features: featureSlice,
        news: newsSlice,
        tasks: taskSlice,
        reports: reportSlice,
        suggestions: suggestionSlice,
        polls: pollSlice,
        notifications: notificationSlice,
        user: userSlice,
        donations: donationSlice
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;