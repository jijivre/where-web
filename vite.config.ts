import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateRedirects = () => ({
  name: 'generate-redirects',
  writeBundle(options: any) {
    const outDir = options.dir || 'dist';
    const redirectsPath = path.join(outDir, '_redirects');
    const redirectsContent = '/*    /index.html   200\n';

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(redirectsPath, redirectsContent);
    console.log(`✅ Fichier _redirects généré dans ${redirectsPath}`);

    const indexPath = path.join(outDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log('✅ index.html trouvé');
    } else {
      console.error('❌ index.html manquant !');
    }

    console.log('📁 Fichiers dans dist:', fs.readdirSync(outDir));
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
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: true,
  },
});