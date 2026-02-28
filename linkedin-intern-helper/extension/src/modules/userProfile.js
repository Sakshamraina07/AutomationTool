// userProfile.js — Static profile data for Ollama prompt

export const userProfile = {
  name: "Saksham Raina",
  linkedin: "https://www.linkedin.com/in/this-is-saksham-raina/",
  github: "https://github.com/Sakshamraina07",
  email: "sakshamraina96@gmail.com",
  location: "Pune, Maharashtra, India",
  city: "Pune",
  education: {
    institute: "Marathwada Mitra Mandal’s Institute of Technology, Pune",
    degree: "BE in Computer Engineering",
    graduation: "July 2027"
  },
  experience: [
    {
      company: "Rezuwizard",
      role: "Backend Engineering Intern",
      duration: "May 2025 - Aug 2025",
      highlights: [
        "Led backend development of resume-generation services; decreased rollout time by 20%",
        "Optimized database workflows; reduced latency by 30%, supporting 500+ users",
        "Implemented secure auth & encryption; GDPR-compliant"
      ]
    },
    {
      company: "Infosys",
      role: "Project Intern",
      duration: "June 2024 - Aug 2024",
      highlights: [
        "Contributed to production-level features; improved system quality",
        "Refined workflows; improved user engagement"
      ]
    }
  ],
  projects: [
    {
      name: "Krishi Sathi",
      tech: ["React.js", "Node.js", "MongoDB", "Kotlin"],
      impact: "500+ farmers; actionable insights +40%"
    },
    {
      name: "Sign Language to Speech Conversion",
      tech: ["Python", "OpenCV", "TensorFlow"],
      impact: "92% gesture recognition accuracy"
    },
    {
      name: "Health Shield",
      tech: ["Python", "Django", "IBM WatsonX"],
      impact: "Predictive model improved diagnostic accuracy by 15%"
    }
  ],
  skills: [
    "Python",
    "C++",
    "JavaScript",
    "Kotlin",
    "React.js",
    "Django",
    "Node.js",
    "MongoDB",
    "MySQL",
    "Tailwind CSS",
    "Android SDK",
    "TensorFlow"
  ],
  preferences: {
    // Compensation & Pay
    acceptsUnpaidInternship: false,              // ALWAYS answer NO to unpaid internship questions
    expectedStipend: "10000-20000 INR per month",// typical fresher stipend expectation in India
    currentCTC: 0,                               // student, no current CTC
    expectedCTC: "As per company norms",

    // Work Authorization
    requiresVisaSponsorship: false, // Indian citizen, works in India — no sponsorship needed
    authorizedToWorkIn: "India",
    nationality: "Indian",

    // Availability & Notice Period
    noticePeriod: "Immediately",    // student, can start immediately or within 1 week
    availableFrom: "Immediately",
    durationPreference: "2-6 months internship",

    // Work Style
    willingToRelocate: true,        // open to relocating within India
    prefersRemote: false,           // prefers in-office / hybrid like most Indian internships
    workMode: "Hybrid or In-office",

    // Application answers for common Yes/No questions
    hasLaptop: true,
    hasStableInternet: true,
    willingToSignNDA: true,
    willingToWorkWeekends: true,    // student, flexible schedule
    hasPriorInternshipExperience: true, // Rezuwizard + Infosys
    isFresher: true,                // currently pursuing degree (grad 2027)
    yearsOfExperience: 0,           // 0 full-time; 2 internship stints (~6 months total)
    hasGap: false,                  // no academic/career gap
    haveBacklog: false              // no backlogs
  }
};

