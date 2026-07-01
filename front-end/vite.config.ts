import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '88.200.63.148',
    port: 30043,
    strictPort: true,
  },
})