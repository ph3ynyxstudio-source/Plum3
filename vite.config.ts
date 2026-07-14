import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  publicDir: "assets",
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
