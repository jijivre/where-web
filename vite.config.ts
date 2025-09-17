import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateRedirects = () => ({
  name: 'generate-redirects',
  writeBundle() {
    const redirectsContent = '/*    /index.html   200\n';
    fs.writeFileSync(path.join(__dirname, 'dist/_redirects'), redirectsContent);
    console.log('✅ Fichier _redirects généré');
  }
});

export default defineConfig({
  plugins: [react(), generateRedirects()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
});