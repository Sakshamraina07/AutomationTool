// profileService.js — Local profile only (chrome.storage.local). No Supabase.

const USER_PROFILE_KEY = "userProfile";

export function base64ToBlob() {
  return new Blob();
}

const defaultProfile = () => ({ full_name: "", phone: "", email: "" });

export const saveProfile = async (profileData) => {
  try {
    const payload = {
      full_name: (profileData.full_name || "").trim(),
      phone: (profileData.phone || "").trim(),
      email: (profileData.email || "").trim(),
    };
    await chrome.storage.local.set({ [USER_PROFILE_KEY]: payload });
    return { success: true };
  } catch (err) {
    console.error("[Heisenberg.ai] Local profile save failed:", err);
    return { success: false, error: err.message };
  }
};

export const getProfile = async () => {
  try {
    const result = await chrome.storage.local.get([USER_PROFILE_KEY]);
    const profile = result[USER_PROFILE_KEY] || defaultProfile();
    return { profile: { ...defaultProfile(), ...profile }, resume: null };
  } catch (err) {
    console.error("[Heisenberg.ai] Local profile load failed:", err);
    return { profile: defaultProfile(), resume: null };
  }
};

export const clearProfile = async () => {
  await chrome.storage.local.remove([USER_PROFILE_KEY]);
};
