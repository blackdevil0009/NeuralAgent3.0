/**
 * Centralized error handling utility for the VaidyaMed-X frontend.
 */

let showToastFn = null;

export const initErrorHandler = (showToast) => {
    showToastFn = showToast;
};

export const handleError = (error, customMessage = null) => {
    console.error('VaidyaMed-X Error Caught:', error);

    let message = customMessage;

    if (!message) {
        if (typeof error === 'string') {
            message = error;
        } else if (error instanceof Error) {
            message = error.message;
        } else if (error && typeof error === 'object') {
            message = error.message || error.error || 'An unexpected error occurred.';
        } else {
            message = 'An unexpected error occurred.';
        }
    }

    if (showToastFn) {
        showToastFn(message, 'error');
    } else {
        alert(message); // Fallback if toast system isn't ready
    }
};

export const handleSuccess = (message) => {
    if (showToastFn) {
        showToastFn(message, 'success');
    }
};
