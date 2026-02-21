// profileService.js
// Handles persistent storage of Intern Profile and Resume

export const saveProfile = async (profileData, resumeFile) => {
    try {
        const storageData = { userProfile: profileData };

        if (resumeFile) {
            const base64Resume = await fileToBase64(resumeFile);
            storageData.userResume = {
                name: resumeFile.name,
                type: resumeFile.type,
                data: base64Resume,
                lastUpdated: new Date().toISOString()
            };
        }

        await chrome.storage.local.set(storageData);
        console.log("[InternHelper] Profile Saved:", profileData);
        return { success: true };
    } catch (err) {
        console.error("[InternHelper] Save Failed:", err);
        return { success: false, error: err.message };
    }
};

export const getProfile = async () => {
    const res = await chrome.storage.local.get(['userProfile', 'userResume']);
    return {
        profile: res.userProfile || {},
        resume: res.userResume || null
    };
};

export const clearProfile = async () => {
    await chrome.storage.local.remove(['userProfile', 'userResume']);
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
