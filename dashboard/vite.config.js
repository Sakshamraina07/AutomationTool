import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies API calls to the Fastify backend so there are no CORS
// concerns locally. Set VITE_API_BASE to hit a deployed backend instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/outreach': 'http://localhost:3000',
      '/track': 'http://localhost:3000',
    },
  },
});
