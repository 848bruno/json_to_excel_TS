import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/json_to_excel_TS/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'esnext',
    modulePreload: true
  }
});