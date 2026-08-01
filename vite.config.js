import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: env.VITE_BASE_PATH || "/",
    build: {
      outDir: env.VITE_OUT_DIR || "dist"
    },
    server: {
      host: "127.0.0.1",
      port: Number(env.VITE_DEV_PORT || 18731),
      strictPort: true,
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "http://127.0.0.1:18732",
          changeOrigin: true
        }
      }
    }
  };
});
