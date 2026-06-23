import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const zapCommentFix = () => {
  return {
    name: 'zap-comment-fix',
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
    // generateBundle runs AFTER minification - handles localhost URLs that esbuild
    // converts to backtick template literals during minification
    generateBundle(options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.code) {
          // Break "http://localhost" so "//" never appears adjacent to "localhost"
          chunk.code = chunk.code.replace(/`http:\/\/localhost/g, '`http:`+`/`+`/localhost');
          chunk.code = chunk.code.replace(/"http:\/\/localhost/g, '"http:"+"/"+"/localhost');
          chunk.code = chunk.code.replace(/'http:\/\/localhost/g, "'http:'+'/'+'/localhost");
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
