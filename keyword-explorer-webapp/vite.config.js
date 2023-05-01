import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from 'vite-tsconfig-paths';

const port = 3000;

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  build: {
    outDir: 'build',
    target: 'esnext',
  },
  server: {
    port,
    open: `http://localhost:${port}`,
  },
});
