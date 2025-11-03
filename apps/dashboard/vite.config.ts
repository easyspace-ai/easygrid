import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 4111,
    proxy: {
      '/socket': {
        target: process.env.VITE_API_URL || process.env.VITE_LUCKDB_SERVER_URL || 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@easygrid/grid": path.resolve(__dirname, "../../packages/grid/src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
   
      "@easygrid/sdk",
    ],
    force: true, // 强制重新构建依赖
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
}));
