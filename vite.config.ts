import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: './client',
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@client': path.resolve(__dirname, './client'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    host: process.env.VITE_HOST ?? '127.0.0.1',
    port: Number(process.env.VITE_PORT ?? '3001'),
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://127.0.0.1:3002',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_URL ?? 'http://127.0.0.1:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-hook-form'],
          'vendor-nutui': ['@nutui/nutui-react'],
          'vendor-radix': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-slot', '@radix-ui/react-primitive', '@radix-ui/react-label', '@radix-ui/react-select', '@radix-ui/react-scroll-area'],
          'vendor-zod': ['zod'],
          'vendor-others': ['clsx', 'tailwind-merge', 'date-fns', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/modifiers', 'lucide-react'],
        },
      },
    },
  },
});
