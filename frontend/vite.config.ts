import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_PROXY_TARGET || "http://localhost:3000";

  return {
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
  };
});
