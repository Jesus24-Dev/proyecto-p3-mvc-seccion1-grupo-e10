import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_PROXY_TARGET || "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
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
        "/orders": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/info": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/packages": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
