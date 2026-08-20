import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serve project sites em /<repo>/. O base vale para dev, preview e
// build — assim o caminho é idêntico nos três e bug de asset aparece localmente.
export default defineConfig({
  base: '/track-viewer/',
  plugins: [react()],
  server: { port: 5183 },
})
