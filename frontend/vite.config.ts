/*
** EPITECH PROJECT, 2026
** EpiSimulated-propagation-impact
** File description:
** vite.config.ts
*/

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, '../src'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});