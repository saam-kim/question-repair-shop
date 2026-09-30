import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [{
            name(id) {
              const path = id.replaceAll('\\', '/');
              if (/\/node_modules\/(?:@firebase|firebase)\//.test(path)) {
                if (/\/(?:@firebase|firebase)\/firestore\//.test(path)) return 'firebase-firestore';
                if (/\/(?:@firebase|firebase)\/auth\//.test(path)) return 'firebase-auth';
                return 'firebase-core';
              }
              if (/\/node_modules\/(?:react|react-dom|react-router|scheduler)\//.test(path)) return 'react-vendor';
              return null;
            },
          }],
        },
      },
    },
  },
});
