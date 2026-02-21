// internshipFilter.js
// Strict filter to ensure we only apply to internship roles

const VALID_KEYWORDS = [
    'intern',
    'internship',
    'trainee',
    'graduate',
    'entry level',
    'fresher',
    'apprentice'
];

export function isInternshipRole(title) {
    if (!title) return false;
    const lowerTitle = title.toLowerCase();
    return VALID_KEYWORDS.some(keyword => lowerTitle.includes(keyword));
}

export function validateJobPage() {
    // 1. Check Title
    const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .t-24');
    const title = titleEl?.textContent.trim();

    if (!title) return { valid: false, reason: "Title not found (DOM Change)" };

    if (!isInternshipRole(title)) {
        return { valid: false, reason: "Not an internship role" };
    }

    // 2. Check Easy Apply in Job Details (Ignore Top Filter)
    const detailsContainer = document.querySelector('.jobs-search__job-details--container, .job-view-layout, .jobs-search-two-pane__details, .jobs-details__main-content');

    // Find button specifically within details
    const easyApplyBtn = Array.from(detailsContainer?.querySelectorAll('button') || [])
        .find(b => {
            const text = b.textContent.trim().toLowerCase();
            return text === 'easy apply' || b.getAttribute('aria-label')?.toLowerCase().includes('easy apply');
        });

    if (!easyApplyBtn) {
        return { valid: false, reason: "Easy Apply not available (or already applied)" };
    }

    return { valid: true, easyApplyBtn };
}
