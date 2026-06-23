import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const zapCommentFix = () => {
  return {
    name: 'zap-comment-fix',
    renderChunk(code) {
      let newCode = code.replace(/"http:\/\/www.w3.org\/2000\/svg"/g, '["http:", "", "www.w3.org/2000/svg"].join("/")');
      newCode = newCode.replace(/"http:\/\/www.w3.org\/1998\/Math\/MathML"/g, '["http:", "", "www.w3.org/1998/Math/MathML"].join("/")');
      return { code: newCode, map: null };
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
