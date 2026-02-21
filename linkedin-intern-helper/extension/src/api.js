// api.js
// Central API Config for connecting Extension directly to the Render Database

export const BASE_URL = "https://internhelper-backend.onrender.com";
export const USER_ID = "user_123"; // Static User MVP Identity

/**
 * Enhanced fetch wrapper to catch 500s or Network disconnects
 */
export const fetchApi = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            ...options
        });

        if (!response.ok) {
            console.error(`[InternHelper API] Server Error (${response.status}) on ${endpoint}`);
            throw new Error(`Server returned ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`[InternHelper API] Network/Fetch Error on ${endpoint}:`, error);
        throw error;
    }
};
