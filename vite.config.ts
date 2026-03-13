import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // IMPORTANT: Replace YOUR_REPO_NAME with your actual GitHub repository name.
  // (If you eventually connect earthsongfestival.com, you can change this back to "/")
  base: process.env.GITHUB_ACTIONS === "true" ? "/YOUR_REPO_NAME/" : "/",
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
