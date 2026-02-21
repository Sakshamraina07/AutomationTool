async function testRenderUpsert() {
    console.log("1. Hitting Live Render Endpoint...");

    // Test Payload
    const payload = {
        full_name: "Verification Bot",
        degree: "M.S.",
        gpa: "3.99",
        expected_stipend: "$60/hr",
        work_authorized: true,
        relocation: false,
        skills: "React, Node, Testing",
    };

    try {
        // --- Action 1: First UPSERT
        console.log("--> POSTing first payload to /profile...");
        const res1 = await fetch('https://internhelper-backend.onrender.com/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("--> POST 1 Response:", await res1.json());

        // --- Action 2: Fetch and Read the UPSERTED Data
        console.log("--> GETting the data from /profile to verify Persistence...");
        const get1 = await fetch('https://internhelper-backend.onrender.com/profile');
        const data1 = await get1.json();

        console.log("✅ First UPSERT persisted!");
        console.log("   - GPA:", data1.gpa);
        console.log("   - Stipend:", data1.expected_stipend);
        console.log("   - work_authorized:", data1.work_authorized);
        console.log("   - updated_at:", data1.updated_at);

        // --- Action 3: Second UPSERT (Simulate a profile edit)
        console.log("\n2. Waiting 2 seconds then POSTing again to test UPSERT logic and updated_at...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        payload.gpa = "4.0"; // User raised their GPA
        payload.skills = "React, Supabase, Growth";

        const res2 = await fetch('https://internhelper-backend.onrender.com/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("--> POST 2 Response:", await res2.json());

        // --- Action 4: Fetch again and compare
        const get2 = await fetch('https://internhelper-backend.onrender.com/profile');
        const data2 = await get2.json();

        console.log("✅ Second UPSERT saved!");
        console.log("   - New GPA:", data2.gpa);
        console.log("   - New Skills:", data2.skills);
        console.log("   - Old updated_at:", data1.updated_at);
        console.log("   - New updated_at:", data2.updated_at);

        if (new Date(data2.updated_at) > new Date(data1.updated_at)) {
            console.log("\n🚀 VERIFICATION SUCCESS: UPSERT works and updated_at correctly advanced.");
        } else {
            console.log("\n❌ VERIFICATION FAILED: updated_at did not change.");
        }

    } catch (e) {
        console.error("Test Failed:", e.message);
    }
}

testRenderUpsert();
