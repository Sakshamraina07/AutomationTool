// ollamaClient.js — Local LLM helper for answering additional questions

import { userProfile } from "./userProfile.js";

export async function askOllama(questionText, jobDescription = "General Internship", options = null) {
  const safeQuestion = questionText || "";
  const p = userProfile.preferences || {};
  const opts = Array.isArray(options) ? options.filter(Boolean) : null;
  const optionsSection = opts && opts.length
    ? `
Options (choose EXACTLY one, answer with the option text only):
${opts.join("\n")}
`
    : "";

  const prompt = `
We are using Ollama 3 (local LLM) to help Saksham Raina apply for internships on LinkedIn in India.

Candidate Profile:
${JSON.stringify(userProfile)}

Job Description:
${jobDescription}

Question:
${safeQuestion}
${optionsSection}

HARD RULES (these override everything, always apply them):
- Unpaid / stipend-less internship → answer NO / not interested. Saksham only accepts paid internships.
- Expected stipend → "${p.expectedStipend || "As per company norms"}".
- Current CTC / current salary → "0" (student, no current income).
- Expected CTC → "${p.expectedCTC || "As per company norms"}".
- Visa / work permit required → NO. Saksham is an Indian citizen authorized to work in India.
- Notice period / joining date → "${p.noticePeriod || "Immediately"}".
- Willing to relocate → YES.
- Work mode preference → "${p.workMode || "Hybrid or In-office"}".
- Years of experience → 0 (student with 2 internships; do NOT round up).
- Academic backlog / arrears → NO.
- Academic gap / career gap → NO.
- Has a laptop and stable internet → YES.
- Willing to sign NDA → YES.
- Requires sponsorship → NO.

General Instructions:
1. Always use Saksham Raina's profile to answer.
2. Yes/No questions → answer YES or NO only.
3. Numeric questions → answer number only (e.g. "0" for experience, "0" for notice period days).
4. Multiple choice → if options are provided, pick EXACTLY one option from the list (copy the text exactly). Otherwise, pick from skills, experience, or projects.
5. Open-text → professional, concise (≤50 words) using profile highlights.
6. Never invent experience. Never leave any field blank.
7. The HARD RULES above override everything — follow them first.
8. Keep a professional, friendly tone for Indian internship applications.

Output:
- Plain text only.
- Always provide an answer. No explanations, no preamble.
`;

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt,
      stream: false
    })
  });

  const data = await res.json();
  const raw = (data.response || "").trim();

  // Hard cap ~50 words in case the model overruns
  const words = raw.split(/\s+/).slice(0, 50);
  return words.join(" ");
}

