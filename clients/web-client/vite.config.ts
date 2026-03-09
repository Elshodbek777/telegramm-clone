import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    host: '0.0.0.0', // Network uchun ochiq
    strictPort: true, // Agar 3003 band bo'lsa, xato bersin (boshqa portga o'tmasin)
  },
});
