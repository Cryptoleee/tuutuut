import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Safely inject ONLY the API_KEY, preserving the rest of process.env
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});