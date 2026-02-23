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
    "activeTab",
    "scripting"
  ],
  host_permissions: [
    "https://www.linkedin.com/*",
    "http://localhost:3005/*",
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
        "assets/*",
        "*.png",
        "*.svg"
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAibWFuaWZlc3QuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXEF1dG9tYXRpb25Ub29sXFxcXGxpbmtlZGluLWludGVybi1oZWxwZXJcXFxcZXh0ZW5zaW9uXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxBdXRvbWF0aW9uVG9vbFxcXFxsaW5rZWRpbi1pbnRlcm4taGVscGVyXFxcXGV4dGVuc2lvblxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovQXV0b21hdGlvblRvb2wvbGlua2VkaW4taW50ZXJuLWhlbHBlci9leHRlbnNpb24vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXHJcbmltcG9ydCB7IGNyeCB9IGZyb20gJ0Bjcnhqcy92aXRlLXBsdWdpbidcclxuaW1wb3J0IG1hbmlmZXN0IGZyb20gJy4vbWFuaWZlc3QuanNvbidcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgICAgcmVhY3QoKSxcclxuICAgICAgICBjcngoeyBtYW5pZmVzdCB9KSxcclxuICAgIF0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcclxuICAgICAgICBtaW5pZnk6IGZhbHNlIC8vIERpc2FibGUgbWluaWZpY2F0aW9uIGZvciBlYXNpZXIgZGVidWdnaW5nXHJcbiAgICB9XHJcbn0pXHJcbiIsICJ7XHJcbiAgICBcIm1hbmlmZXN0X3ZlcnNpb25cIjogMyxcclxuICAgIFwibmFtZVwiOiBcIkxpbmtlZEluIEludGVybnNoaXAgSGVscGVyXCIsXHJcbiAgICBcInZlcnNpb25cIjogXCIxLjAuMFwiLFxyXG4gICAgXCJkZXNjcmlwdGlvblwiOiBcIlNhZmUsIHVzZXItaW5pdGlhdGVkIGhlbHBlciBmb3IgTGlua2VkSW4gaW50ZXJuc2hpcHMuXCIsXHJcbiAgICBcInBlcm1pc3Npb25zXCI6IFtcclxuICAgICAgICBcInN0b3JhZ2VcIixcclxuICAgICAgICBcImFjdGl2ZVRhYlwiLFxyXG4gICAgICAgIFwic2NyaXB0aW5nXCJcclxuICAgIF0sXHJcbiAgICBcImhvc3RfcGVybWlzc2lvbnNcIjogW1xyXG4gICAgICAgIFwiaHR0cHM6Ly93d3cubGlua2VkaW4uY29tLypcIixcclxuICAgICAgICBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwNS8qXCIsXHJcbiAgICAgICAgXCJodHRwOi8vMTI3LjAuMC4xOjMwMDUvKlwiXHJcbiAgICBdLFxyXG4gICAgXCJhY3Rpb25cIjoge1xyXG4gICAgICAgIFwiZGVmYXVsdF9wb3B1cFwiOiBcImluZGV4Lmh0bWxcIlxyXG4gICAgfSxcclxuICAgIFwiYmFja2dyb3VuZFwiOiB7XHJcbiAgICAgICAgXCJzZXJ2aWNlX3dvcmtlclwiOiBcInNyYy9iYWNrZ3JvdW5kLmpzXCIsXHJcbiAgICAgICAgXCJ0eXBlXCI6IFwibW9kdWxlXCJcclxuICAgIH0sXHJcbiAgICBcImNvbnRlbnRfc2NyaXB0c1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcIm1hdGNoZXNcIjogW1xyXG4gICAgICAgICAgICAgICAgXCJodHRwczovL3d3dy5saW5rZWRpbi5jb20vam9icy8qXCJcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgXCJqc1wiOiBbXHJcbiAgICAgICAgICAgICAgICBcInNyYy9jb250ZW50LmpzXCIsXHJcbiAgICAgICAgICAgICAgICBcInNyYy9ndWlkZWRfYXBwbHkuanNcIlxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBcInJ1bl9hdFwiOiBcImRvY3VtZW50X2lkbGVcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcIm1hdGNoZXNcIjogW1xyXG4gICAgICAgICAgICAgICAgXCJodHRwczovL3d3dy5saW5rZWRpbi5jb20vKlwiXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIFwianNcIjogW1xyXG4gICAgICAgICAgICAgICAgXCJzcmMvbWFpbl9wYW5lbC5qc3hcIlxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBcInJ1bl9hdFwiOiBcImRvY3VtZW50X2lkbGVcIlxyXG4gICAgICAgIH1cclxuICAgIF0sXHJcbiAgICBcIndlYl9hY2Nlc3NpYmxlX3Jlc291cmNlc1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBcInJlc291cmNlc1wiOiBbXHJcbiAgICAgICAgICAgICAgICBcImFzc2V0cy8qXCIsXHJcbiAgICAgICAgICAgICAgICBcIioucG5nXCIsXHJcbiAgICAgICAgICAgICAgICBcIiouc3ZnXCJcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgXCJtYXRjaGVzXCI6IFtcclxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly93d3cubGlua2VkaW4uY29tLypcIlxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfVxyXG4gICAgXVxyXG59Il0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVixTQUFTLG9CQUFvQjtBQUM3VyxPQUFPLFdBQVc7QUFDbEIsU0FBUyxXQUFXOzs7QUNGcEI7QUFBQSxFQUNJLGtCQUFvQjtBQUFBLEVBQ3BCLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxFQUNYLGFBQWU7QUFBQSxFQUNmLGFBQWU7QUFBQSxJQUNYO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxFQUNKO0FBQUEsRUFDQSxrQkFBb0I7QUFBQSxJQUNoQjtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDSjtBQUFBLEVBQ0EsUUFBVTtBQUFBLElBQ04sZUFBaUI7QUFBQSxFQUNyQjtBQUFBLEVBQ0EsWUFBYztBQUFBLElBQ1YsZ0JBQWtCO0FBQUEsSUFDbEIsTUFBUTtBQUFBLEVBQ1o7QUFBQSxFQUNBLGlCQUFtQjtBQUFBLElBQ2Y7QUFBQSxNQUNJLFNBQVc7QUFBQSxRQUNQO0FBQUEsTUFDSjtBQUFBLE1BQ0EsSUFBTTtBQUFBLFFBQ0Y7QUFBQSxRQUNBO0FBQUEsTUFDSjtBQUFBLE1BQ0EsUUFBVTtBQUFBLElBQ2Q7QUFBQSxJQUNBO0FBQUEsTUFDSSxTQUFXO0FBQUEsUUFDUDtBQUFBLE1BQ0o7QUFBQSxNQUNBLElBQU07QUFBQSxRQUNGO0FBQUEsTUFDSjtBQUFBLE1BQ0EsUUFBVTtBQUFBLElBQ2Q7QUFBQSxFQUNKO0FBQUEsRUFDQSwwQkFBNEI7QUFBQSxJQUN4QjtBQUFBLE1BQ0ksV0FBYTtBQUFBLFFBQ1Q7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0o7QUFBQSxNQUNBLFNBQVc7QUFBQSxRQUNQO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0o7OztBRGxEQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixTQUFTO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixJQUFJLEVBQUUsMkJBQVMsQ0FBQztBQUFBLEVBQ3BCO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDSCxXQUFXO0FBQUEsSUFDWCxRQUFRO0FBQUE7QUFBQSxFQUNaO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
