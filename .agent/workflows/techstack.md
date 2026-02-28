---
description: techstack workflow for running and building the application
---

# Developer Workflow: Heisenberg.ai

Follow these steps to run the full application environment locally.

## 🚀 1. Backend Setup
1. Navigate to `backend/`
2. Install dependencies: `npm install`
3. Configure `.env` with Supabase credentials.
4. Start the server:
// turbo
```powershell
npm run dev
```

## 🧩 2. Extension Setup
1. Navigate to `extension/`
2. Install dependencies: `npm install`
3. Build the extension:
// turbo
```powershell
npm run build
```
4. In Chrome, go to `chrome://extensions`, enable **Developer Mode**, and load the `extension/dist` folder.

## 🌐 3. Landing Page Setup
1. Navigate to `landing-page/`
2. Install dependencies: `npm install`
3. Start the dev server:
// turbo
```powershell
npm run dev
```

## 📦 4. Deployment
- **Backend**: Deploy to Render or similar (handles the `server.js` entry point).
- **Landing Page**: Deploy to Vercel (standard Next.js deployment).
- **Extension**: Build and zip the `dist` folder for distribution.
