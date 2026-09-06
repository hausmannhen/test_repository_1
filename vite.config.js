import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const stamp = new Date().toLocaleString("de-CH", { timeZone: "Europe/Zurich", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify(stamp) },
  base: "./",
  server: { port: 5173 },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: { three: ["three"], react: ["react", "react-dom"] },
      },
    },
  },
});
