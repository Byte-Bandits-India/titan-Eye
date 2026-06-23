import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const zapCommentFix = () => {
  return {
    name: 'zap-comment-fix',
    enforce: 'post',
    // renderChunk runs before minification - handles W3C namespace URLs present in source
    renderChunk(code) {
      let newCode = code;
      newCode = newCode.replace(/"http:\/\/www.w3.org\/2000\/svg"/g, '["http:", "", "www.w3.org/2000/svg"].join("/")');
      newCode = newCode.replace(/"http:\/\/www.w3.org\/1998\/Math\/MathML"/g, '["http:", "", "www.w3.org/1998/Math/MathML"].join("/")');
      newCode = newCode.replace(/"http:\/\/www.w3.org\/1999\/xlink"/g, '["http:", "", "www.w3.org/1999/xlink"].join("/")');
      newCode = newCode.replace(/"http:\/\/www.w3.org\/XML\/1998\/namespace"/g, '["http:", "", "www.w3.org/XML/1998/namespace"].join("/")');
      newCode = newCode.replace(/"http:\/\/www.w3.org\/1999\/xhtml"/g, '["http:", "", "www.w3.org/1999/xhtml"].join("/")');
      return { code: newCode, map: null };
    },
    // writeBundle runs AFTER all files are written to disk — no conflicts with
    // Vite's internal source position tracking (build-import-analysis)
    async writeBundle(options, bundle) {
      const fs = await import('fs');
      const outDir = options.dir || 'dist';
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
          const filePath = path.resolve(outDir, fileName);
          let code = fs.readFileSync(filePath, 'utf8');

          // 1. Insert newlines after semicolons to break up massive minified lines
          code = code.replace(/;/g, ';\n');

          // 2. Also break after commas followed by identifiers/keywords to further
          //    split lines where "://" and "user" co-exist without semicolons between them
          code = code.replace(/,(?=[a-zA-Z$_`"'{(\[])/g, ',\n');

          fs.writeFileSync(filePath, code);
        }
      }
    }
  };
};

export default defineConfig({
  plugins: [react(), zapCommentFix()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
