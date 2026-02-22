// profileService.js
// Handles network fetching and updating of Intern Profile and Resume directly via Supabase

import { supabase, USER_ID } from '../api.js';

export const saveProfile = async (profileData, resumeFile) => {
    try {
        let resumePayload = null;

        // 1. Process File for local Chrome Storage (used by content script autofiller)
        if (resumeFile) {
            const base64Resume = await fileToBase64(resumeFile);
            resumePayload = {
                name: resumeFile.name,
                type: resumeFile.type,
                data: base64Resume,
                lastUpdated: new Date().toISOString()
            };
            await chrome.storage.local.set({ userResume: resumePayload });
        }

        // 2. Upload to Supabase Storage Bucket
        let final_resume_url = profileData.resume_url || null;
        let final_resume_name = profileData.resume_filename || null;

        if (resumeFile) {
            const safeName = (resumeFile.name || 'resume.pdf').replace(/[^a-zA-Z0-9.-]/g, '_');
            const bucketPath = `${USER_ID}/${Date.now()}_${safeName}`;

            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(bucketPath, resumeFile, {
                    upsert: true
                });

            if (uploadError) {
                console.error("[InternHelper] Supabase Storage Upload Error:", uploadError);
                throw uploadError;
            } else {
                const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(bucketPath);
                final_resume_url = publicUrlData.publicUrl;
                final_resume_name = safeName;
                console.log(`[InternHelper] Resume successfully uploaded to Supabase: ${final_resume_url}`);
            }
        }

        // 3. Upsert Profile Data to Supabase strictly conforming to schema
        const cleanPayload = {
            user_id: USER_ID,
            first_name: profileData.full_name ? profileData.full_name.split(' ')[0] : (profileData.first_name || ''),
            last_name: profileData.full_name ? profileData.full_name.split(' ').slice(1).join(' ') : (profileData.last_name || ''),
            phone: profileData.phone || '',
            city: profileData.city || profileData.location || '',
            linkedin_url: profileData.linkedin_url || '',
            portfolio_url: profileData.portfolio_url || '',
            experience: profileData.experience || '',
            degree: profileData.degree || '',
            major: profileData.major || '',
            university: profileData.university || '',
            graduation_year: profileData.graduation_year || '',
            current_year: profileData.current_year || '',
            gpa: profileData.gpa || '',
            work_authorized: profileData.authorized_to_work !== undefined ? !!profileData.authorized_to_work : true,
            relocation: profileData.open_to_relocation !== undefined ? !!profileData.open_to_relocation : false,
            expected_stipend: String(profileData.expected_stipend || ''),
            availability_type: profileData.availability_type || '',
            available_from: profileData.available_from || '',
            notice_period: profileData.notice_period || '',
            skills: profileData.skills || '',
            experience_summary: profileData.experience_summary || '',
            projects: profileData.projects || [],
            resume_filename: final_resume_name || '',
            metadata: profileData.metadata || {},
            year_of_study: profileData.year_of_study || '',
            authorized_to_work: profileData.authorized_to_work !== undefined ? !!profileData.authorized_to_work : true,
            open_to_relocation: profileData.open_to_relocation !== undefined ? !!profileData.open_to_relocation : false,
            stipend: String(profileData.stipend || ''),
            full_name: profileData.full_name || '',
            email: profileData.email || '',
            preferred_domain: profileData.preferred_domain || '',
            internship_count: parseInt(profileData.internship_count, 10) || null,
            availability_weeks: parseInt(profileData.availability_weeks, 10) || null,
            resume_url: final_resume_url || '',
            updated_at: new Date().toISOString()
        };

        console.log("[InternHelper] Upserting strict payload:", cleanPayload);

        const { error } = await supabase
            .from('profiles')
            .upsert([cleanPayload], { onConflict: 'user_id' });
        if (error) {
            console.error("[InternHelper] SUPABASE UPSERT ERROR:", error);
            throw new Error(`Supabase Upsert Failed: ${error.message} - ${error.details}`);
        }

        console.log("[InternHelper] Profile Successfully Pushed directly to Supabase DB.");
        return { success: true };

    } catch (err) {
        console.error("[InternHelper] Database Save Failed:", err);
        return { success: false, error: err.message };
    }
};

export const getProfile = async () => {
    try {
        console.log("[InternHelper] Fetching profile securely from Supabase API...");

        const { data: profileResponse, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', USER_ID)
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore no rows returned
            console.error("[InternHelper] SUPABASE FETCH ERROR:", error);
            throw error;
        }

        console.log("[InternHelper] API returned:", profileResponse);

        // Fetch Resume from Local Chrome Storage for content script availability
        const localData = await chrome.storage.local.get(['userResume']);

        // Safely map Postgres columns (first_name, last_name, city) back to expected UI names (full_name, location)
        const mappedProfile = profileResponse ? {
            full_name: profileResponse.first_name ? `${profileResponse.first_name} ${profileResponse.last_name || ''}`.trim() : (profileResponse.full_name || ''),
            email: profileResponse.email || '',
            phone: profileResponse.phone || '',
            city: profileResponse.city || '',
            linkedin_url: profileResponse.linkedin_url || '',
            portfolio_url: profileResponse.portfolio_url || '',
            experience: profileResponse.experience || '',
            yoe: profileResponse.experience || '',
            degree: profileResponse.degree || '',
            major: profileResponse.major || '',
            university: profileResponse.university || '',
            graduation_year: profileResponse.graduation_year || '',
            current_year: profileResponse.current_year || profileResponse.year_of_study || '',
            gpa: profileResponse.gpa || '',
            authorized_to_work: profileResponse.authorized_to_work ?? profileResponse.work_authorized ?? true,
            open_to_relocation: profileResponse.open_to_relocation ?? profileResponse.relocation ?? false,
            expected_stipend: profileResponse.expected_stipend || profileResponse.stipend || '',
            availability_type: profileResponse.availability_type || '',
            available_from: profileResponse.available_from || '',
            notice_period: profileResponse.notice_period || '',
            internship_count: profileResponse.internship_count || '',
            preferred_domain: profileResponse.preferred_domain || '',
            availability_weeks: profileResponse.availability_weeks || '',
            skills: profileResponse.skills || '',
            experience_summary: profileResponse.experience_summary || '',
            projects: profileResponse.projects || [],
            resume_filename: profileResponse.resume_filename || '',
            resume_url: profileResponse.resume_url || '',
            metadata: profileResponse.metadata || {}
        } : {};

        let fallbackResume = null;
        if (profileResponse?.resume_url) {
            fallbackResume = { name: profileResponse.resume_filename || 'Uploaded Resume' };
        }

        return {
            profile: mappedProfile,
            resume: localData.userResume || fallbackResume
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

// Helper: Convert File to Base64 (still needed for local Chrome Storage autofill)
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
