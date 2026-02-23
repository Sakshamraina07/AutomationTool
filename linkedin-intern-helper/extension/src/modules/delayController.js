// delayController.js
// Human-like delays

export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const randomDelay = async (min = 1000, max = 3000) => {
    const ms = Math.floor(Math.random() * (max - min + 1) + min);
    await wait(ms);
};

export const humanScroll = async () => {
    // Smoother scroll
    window.scrollTo({ top: 300, behavior: 'smooth' });
    await randomDelay(500, 1000);
    window.scrollTo({ top: 600, behavior: 'smooth' });
    await randomDelay(500, 1000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
