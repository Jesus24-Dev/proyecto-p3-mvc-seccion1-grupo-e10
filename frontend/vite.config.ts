import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/users": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/agencies": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});
