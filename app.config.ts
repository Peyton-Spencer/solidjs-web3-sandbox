import { defineConfig } from '@solidjs/start/config';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  ssr: true,
  vite: {
    plugins: [UnoCSS()],
  },
});
