import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import { comlink } from "vite-plugin-comlink";

const port = 3000;

export default defineConfig({
  plugins: [react(), tsconfigPaths(), comlink()],
  worker: {
    plugins: [comlink()],
  },
  build: {
    outDir: "build",
    target: "esnext",
  },
  optimizeDeps: {
    exclude: ["jeep-sqlite"],
  },
  server: {
    port,
    open: `http://localhost:${port}`,
  },
});
