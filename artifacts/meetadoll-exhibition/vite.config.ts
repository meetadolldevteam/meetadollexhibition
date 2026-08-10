import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;
const basePath = process.env.BASE_PATH ?? "/";
const verificationEnv = {
  VITE_GSC_VERIFICATION: process.env.VITE_GSC_VERIFICATION ?? "",
  VITE_BING_VERIFICATION: process.env.VITE_BING_VERIFICATION ?? "",
};

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    runtimeErrorOverlay(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  define: {
    "import.meta.env.VITE_GSC_VERIFICATION": JSON.stringify(verificationEnv.VITE_GSC_VERIFICATION),
    "import.meta.env.VITE_BING_VERIFICATION": JSON.stringify(verificationEnv.VITE_BING_VERIFICATION),
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
