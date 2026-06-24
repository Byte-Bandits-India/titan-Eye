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
      
      const safeSplitLines = (code) => {
        let result = '';
        let i = 0;
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let inTemplate = false;
        let inRegex = false;
        let inRegexCharacterClass = false;
        
        while (i < code.length) {
          const char = code[i];
          const prevChar = i > 0 ? code[i - 1] : '';
          const nextChar = i < code.length - 1 ? code[i + 1] : '';
          
          if (char === '\\' && (inSingleQuote || inDoubleQuote || inTemplate || inRegex)) {
            result += char + (nextChar ? nextChar : '');
            i += 2;
            continue;
          }
          
          if (inSingleQuote) {
            if (char === "'") inSingleQuote = false;
          } else if (inDoubleQuote) {
            if (char === '"') inDoubleQuote = false;
          } else if (inTemplate) {
            if (char === '`') inTemplate = false;
          } else if (inRegex) {
            if (inRegexCharacterClass) {
              if (char === ']') inRegexCharacterClass = false;
            } else {
              if (char === '[') inRegexCharacterClass = true;
              else if (char === '/') inRegex = false;
            }
          } else {
            if (char === "'") {
              inSingleQuote = true;
            } else if (char === '"') {
              inDoubleQuote = true;
            } else if (char === '`') {
              inTemplate = true;
            } else if (char === '/') {
              let lastNonWs = '';
              let j = i - 1;
              while (j >= 0) {
                if (!/\s/.test(code[j])) {
                  lastNonWs = code[j];
                  break;
                }
                j--;
              }
              
              let isRegex = false;
              if (!lastNonWs) {
                isRegex = true;
              } else if ('(=[{:;?&|!+-*/%<>^~,'.includes(lastNonWs)) {
                isRegex = true;
              } else {
                let word = '';
                let k = j;
                while (k >= 0 && /[a-zA-Z0-9_$]/.test(code[k])) {
                  word = code[k] + word;
                  k--;
                }
                const keywords = ['return', 'throw', 'yield', 'typeof', 'delete', 'void', 'instanceof', 'in', 'case', 'new'];
                if (keywords.includes(word)) {
                  isRegex = true;
                }
              }
              
              if (isRegex) {
                inRegex = true;
                inRegexCharacterClass = false;
              }
            }
          }
          
          result += char;
          
          const inStringOrRegex = inSingleQuote || inDoubleQuote || inTemplate || inRegex;
          if (char === ';' && !inStringOrRegex) {
            result += '\n';
          } else if (char === ',' && !inStringOrRegex) {
            if (/[a-zA-Z$_`"'{(\[]/.test(nextChar)) {
              result += '\n';
            }
          }
          
          i++;
        }
        return result;
      };

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
          const filePath = path.resolve(outDir, fileName);
          let code = fs.readFileSync(filePath, 'utf8');
          code = safeSplitLines(code);
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
