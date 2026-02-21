import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
    plugins: [
        react(),
        crx({ manifest }),
    ],
    build: {
        sourcemap: true,
        minify: false // Disable minification for easier debugging
    }
})
