// vite.config.js
import { defineConfig } from "file:///D:/AutomationTool/linkedin-intern-helper/extension/node_modules/vite/dist/node/index.js";
import react from "file:///D:/AutomationTool/linkedin-intern-helper/extension/node_modules/@vitejs/plugin-react/dist/index.js";
import { crx } from "file:///D:/AutomationTool/linkedin-intern-helper/extension/node_modules/@crxjs/vite-plugin/dist/index.mjs";

// manifest.json
var manifest_default = {
  manifest_version: 3,
  name: "LinkedIn Internship Helper",
  version: "1.0.0",
  description: "Safe, user-initiated helper for LinkedIn internships.",
  permissions: [
    "storage",
    "tabs"
  ],
  host_permissions: [
    "https://www.linkedin.com/*",
    "http://127.0.0.1:3005/*"
  ],
  action: {
    default_popup: "index.html"
  },
  background: {
    service_worker: "src/background.js",
    type: "module"
  },
  content_scripts: [
    {
      matches: [
        "https://www.linkedin.com/jobs/*"
      ],
      js: [
        "src/content.js",
        "src/guided_apply.js"
      ],
      run_at: "document_idle"
    },
    {
      matches: [
        "https://www.linkedin.com/*"
      ],
      js: [
        "src/main_panel.jsx"
      ],
      run_at: "document_idle"
    }
  ],
  web_accessible_resources: [
    {
      resources: [
        "assets/*"
      ],
      matches: [
        "https://www.linkedin.com/*"
      ]
    }
  ]
};

// vite.config.js
var vite_config_default = defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest_default })
  ],
  build: {
    sourcemap: true,
    minify: false
    // Disable minification for easier debugging
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAibWFuaWZlc3QuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXEF1dG9tYXRpb25Ub29sXFxcXGxpbmtlZGluLWludGVybi1oZWxwZXJcXFxcZXh0ZW5zaW9uXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxBdXRvbWF0aW9uVG9vbFxcXFxsaW5rZWRpbi1pbnRlcm4taGVscGVyXFxcXGV4dGVuc2lvblxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovQXV0b21hdGlvblRvb2wvbGlua2VkaW4taW50ZXJuLWhlbHBlci9leHRlbnNpb24vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXHJcbmltcG9ydCB7IGNyeCB9IGZyb20gJ0Bjcnhqcy92aXRlLXBsdWdpbidcclxuaW1wb3J0IG1hbmlmZXN0IGZyb20gJy4vbWFuaWZlc3QuanNvbidcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgICAgcmVhY3QoKSxcclxuICAgICAgICBjcngoeyBtYW5pZmVzdCB9KSxcclxuICAgIF0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcclxuICAgICAgICBtaW5pZnk6IGZhbHNlIC8vIERpc2FibGUgbWluaWZpY2F0aW9uIGZvciBlYXNpZXIgZGVidWdnaW5nXHJcbiAgICB9XHJcbn0pXHJcbiIsICJ7XHJcbiAgXCJtYW5pZmVzdF92ZXJzaW9uXCI6IDMsXHJcbiAgXCJuYW1lXCI6IFwiTGlua2VkSW4gSW50ZXJuc2hpcCBIZWxwZXJcIixcclxuICBcInZlcnNpb25cIjogXCIxLjAuMFwiLFxyXG4gIFwiZGVzY3JpcHRpb25cIjogXCJTYWZlLCB1c2VyLWluaXRpYXRlZCBoZWxwZXIgZm9yIExpbmtlZEluIGludGVybnNoaXBzLlwiLFxyXG4gIFwicGVybWlzc2lvbnNcIjogW1xyXG4gICAgXCJzdG9yYWdlXCIsXHJcbiAgICBcInRhYnNcIlxyXG4gIF0sXHJcbiAgXCJob3N0X3Blcm1pc3Npb25zXCI6IFtcclxuICAgIFwiaHR0cHM6Ly93d3cubGlua2VkaW4uY29tLypcIixcclxuICAgIFwiaHR0cDovLzEyNy4wLjAuMTozMDA1LypcIlxyXG4gIF0sXHJcbiAgXCJhY3Rpb25cIjoge1xyXG4gICAgXCJkZWZhdWx0X3BvcHVwXCI6IFwiaW5kZXguaHRtbFwiXHJcbiAgfSxcclxuICBcImJhY2tncm91bmRcIjoge1xyXG4gICAgXCJzZXJ2aWNlX3dvcmtlclwiOiBcInNyYy9iYWNrZ3JvdW5kLmpzXCIsXHJcbiAgICBcInR5cGVcIjogXCJtb2R1bGVcIlxyXG4gIH0sXHJcbiAgXCJjb250ZW50X3NjcmlwdHNcIjogW1xyXG4gICAge1xyXG4gICAgICBcIm1hdGNoZXNcIjogW1xyXG4gICAgICAgIFwiaHR0cHM6Ly93d3cubGlua2VkaW4uY29tL2pvYnMvKlwiXHJcbiAgICAgIF0sXHJcbiAgICAgIFwianNcIjogW1xyXG4gICAgICAgIFwic3JjL2NvbnRlbnQuanNcIixcclxuICAgICAgICBcInNyYy9ndWlkZWRfYXBwbHkuanNcIlxyXG4gICAgICBdLFxyXG4gICAgICBcInJ1bl9hdFwiOiBcImRvY3VtZW50X2lkbGVcIlxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgXCJtYXRjaGVzXCI6IFtcclxuICAgICAgICBcImh0dHBzOi8vd3d3LmxpbmtlZGluLmNvbS8qXCJcclxuICAgICAgXSxcclxuICAgICAgXCJqc1wiOiBbXHJcbiAgICAgICAgXCJzcmMvbWFpbl9wYW5lbC5qc3hcIlxyXG4gICAgICBdLFxyXG4gICAgICBcInJ1bl9hdFwiOiBcImRvY3VtZW50X2lkbGVcIlxyXG4gICAgfVxyXG4gIF0sXHJcbiAgXCJ3ZWJfYWNjZXNzaWJsZV9yZXNvdXJjZXNcIjogW1xyXG4gICAge1xyXG4gICAgICBcInJlc291cmNlc1wiOiBbXHJcbiAgICAgICAgXCJhc3NldHMvKlwiXHJcbiAgICAgIF0sXHJcbiAgICAgIFwibWF0Y2hlc1wiOiBbXHJcbiAgICAgICAgXCJodHRwczovL3d3dy5saW5rZWRpbi5jb20vKlwiXHJcbiAgICAgIF1cclxuICAgIH1cclxuICBdXHJcbn0iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdWLFNBQVMsb0JBQW9CO0FBQzdXLE9BQU8sV0FBVztBQUNsQixTQUFTLFdBQVc7OztBQ0ZwQjtBQUFBLEVBQ0Usa0JBQW9CO0FBQUEsRUFDcEIsTUFBUTtBQUFBLEVBQ1IsU0FBVztBQUFBLEVBQ1gsYUFBZTtBQUFBLEVBQ2YsYUFBZTtBQUFBLElBQ2I7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUFBLEVBQ0Esa0JBQW9CO0FBQUEsSUFDbEI7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBVTtBQUFBLElBQ1IsZUFBaUI7QUFBQSxFQUNuQjtBQUFBLEVBQ0EsWUFBYztBQUFBLElBQ1osZ0JBQWtCO0FBQUEsSUFDbEIsTUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLGlCQUFtQjtBQUFBLElBQ2pCO0FBQUEsTUFDRSxTQUFXO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxNQUNBLElBQU07QUFBQSxRQUNKO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFFBQVU7QUFBQSxJQUNaO0FBQUEsSUFDQTtBQUFBLE1BQ0UsU0FBVztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsTUFDQSxJQUFNO0FBQUEsUUFDSjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFFBQVU7QUFBQSxJQUNaO0FBQUEsRUFDRjtBQUFBLEVBQ0EsMEJBQTRCO0FBQUEsSUFDMUI7QUFBQSxNQUNFLFdBQWE7QUFBQSxRQUNYO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBVztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjs7O0FEOUNBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFNBQVM7QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLElBQUksRUFBRSwyQkFBUyxDQUFDO0FBQUEsRUFDcEI7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNILFdBQVc7QUFBQSxJQUNYLFFBQVE7QUFBQTtBQUFBLEVBQ1o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
