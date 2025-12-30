// src/hooks/useGlobalSpinner.ts 
import { useEffect } from "react";
import { useSpinner } from "../contexts/SpinnerProvider";

/**
 * Custom hook to control the global application spinner.
 * It automatically shows or hides the spinner based on the 'isLoading' boolean passed to it.
 * * @param isLoading A boolean indicating whether a resource is currently loading.
 */
export const useGlobalSpinner = (isLoading: boolean): void => {
    const { show, hide } = useSpinner();

    // Effect to control the global spinner whenever the isLoading state changes
    useEffect(() => {
        if (isLoading) {
            show();
        } else {
            hide();
        }

        // Cleanup function to ensure the spinner is hidden if the component unmounts while loading
        return () => {
            if (isLoading) {
                hide();
            }
        };
    }, [isLoading, show, hide]);
};