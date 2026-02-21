// profileService.js
// Handles network fetching and updating of Intern Profile and Resume via Supabase Render Backend

import { fetchApi, USER_ID } from '../api.js';

export const saveProfile = async (profileData, resumeFile) => {
    try {
        let resumePayload = null;

        // Process File handling safely for localStorage since DB only holds text
        if (resumeFile) {
            const base64Resume = await fileToBase64(resumeFile);
            resumePayload = {
                name: resumeFile.name,
                type: resumeFile.type,
                data: base64Resume,
                lastUpdated: new Date().toISOString()
            };
            // Resume specifically stays in local Chrome storage for now
            await chrome.storage.local.set({ userResume: resumePayload });
        }

        // Post Profile Data to backend
        const response = await fetchApi('/profile', {
            method: 'POST',
            body: JSON.stringify({
                user_id: USER_ID,
                ...profileData
            })
        });

        if (response.success) {
            console.log("[InternHelper] Profile Successfully Pushed to Backend Database.");
            return { success: true };
        } else {
            throw new Error("Backend explicitly returned failure");
        }

    } catch (err) {
        console.error("[InternHelper] Database Save Failed:", err);
        return { success: false, error: err.message };
    }
};

export const getProfile = async () => {
    try {
        // Fetch Profile from DB
        console.log("[InternHelper] Fetching profile from Render API...");
        const profileResponse = await fetchApi(`/profile?user_id=${USER_ID}`);
        console.log("[InternHelper] API returned:", profileResponse);

        // Fetch Resume from Local Chrome (DB only holds text schema right now)
        const localData = await chrome.storage.local.get(['userResume']);

        // Safely map Postgres columns (first_name, last_name, city) back to expected UI names (full_name, location)
        const mappedProfile = profileResponse ? {
            full_name: profileResponse.first_name ? `${profileResponse.first_name} ${profileResponse.last_name || ''}`.trim() : '',
            phone: profileResponse.phone || '',
            location: profileResponse.city || '',
            linkedin_url: profileResponse.linkedin_url || '',
            portfolio_url: profileResponse.portfolio_url || '',
            experience: profileResponse.experience || '',
            yoe: profileResponse.experience || ''
        } : {};

        return {
            profile: mappedProfile,
            resume: localData.userResume || null
        };
    } catch (err) {
        console.error("[InternHelper] Database Fetch Failed, returning empty profile fallback.", err);
        return { profile: {}, resume: null };
    }
};

export const clearProfile = async () => {
    // We only clear the local resume payload here; to clear DB requires a DELETE endpoint
    await chrome.storage.local.remove(['userResume']);
};

// Helper: Convert File to Base64
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result); // Contains "data:application/pdf;base64,..."
        reader.onerror = (error) => reject(error);
    });
};

// Helper: Convert Base64 to Blob (for Autofill)
export const base64ToBlob = (base64, type = 'application/pdf') => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1] || type;
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};
