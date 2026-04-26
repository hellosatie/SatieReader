import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const buildStamp = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  define: {
    __SATIE_BUILD_STAMP__: JSON.stringify(buildStamp),
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
});
