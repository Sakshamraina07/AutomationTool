// delayController.js
// Advanced Human Behavior Simulation Engine

let sessionFatigue = 0;
let actionCount = 0;

/* ---------------- BASE WAIT ---------------- */

export const wait = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

/* ---------------- SMART RANDOM DELAY ---------------- */

export const randomDelay = async (min = 800, max = 2500) => {

    actionCount++;

    // Gaussian-like randomness (non-recursive safe version)
    const baseDelay = gaussian(min, max);

    // Gradual fatigue increase
    sessionFatigue += 0.02 + Math.random() * 0.03;

    // Cap fatigue to avoid runaway delay
    if (sessionFatigue > 0.6) sessionFatigue = 0.6;

    const fatigueMultiplier = 1 + sessionFatigue;

    // Occasional "thinking spike"
    const spike = Math.random() < 0.08
        ? randomInt(600, 2000)
        : 0;

    const finalDelay = Math.floor(baseDelay * fatigueMultiplier + spike);

    await wait(finalDelay);
};

/* ---------------- HUMAN THINKING DELAY ---------------- */

export const thinkingDelay = async () => {

    const hesitation = Math.random() < 0.3
        ? randomInt(1000, 2500)
        : 0;

    await randomDelay(1200 + hesitation, 3000 + hesitation);
};

/* ---------------- HUMAN SCROLL ---------------- */

export const humanScroll = async () => {

    const totalScrolls = randomInt(2, 4);

    for (let i = 0; i < totalScrolls; i++) {

        const distance = randomInt(200, 700);
        const direction = Math.random() > 0.25 ? 1 : -1;

        window.scrollBy({
            top: distance * direction,
            behavior: "smooth"
        });

        await randomDelay(500, 1400);
    }
};

/* ---------------- MICRO MOUSE MOVE ---------------- */

export const microMouseMove = async () => {

    const steps = randomInt(4, 10);

    let currentX = randomInt(0, window.innerWidth);
    let currentY = randomInt(0, window.innerHeight);

    for (let i = 0; i < steps; i++) {

        currentX += randomInt(-40, 40);
        currentY += randomInt(-40, 40);

        const event = new MouseEvent('mousemove', {
            bubbles: true,
            clientX: clamp(currentX, 0, window.innerWidth),
            clientY: clamp(currentY, 0, window.innerHeight)
        });

        document.dispatchEvent(event);

        await wait(randomInt(30, 90));
    }
};

/* ---------------- SESSION RESET (OPTIONAL) ---------------- */

export const resetSessionFatigue = () => {
    sessionFatigue = 0;
    actionCount = 0;
};

/* ---------------- UTILITIES ---------------- */

function gaussian(min, max) {

    let u = Math.random();
    let v = Math.random();

    // Box-Muller transform
    let num = Math.sqrt(-2.0 * Math.log(u)) *
              Math.cos(2.0 * Math.PI * v);

    // Normalize to 0-1 range
    num = (num / 6) + 0.5;

    // Clamp instead of recursion
    num = clamp(num, 0, 1);

    return min + num * (max - min);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}