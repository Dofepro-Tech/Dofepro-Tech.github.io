import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version?: string };
const appVersion = packageJson.version?.trim() || '0.0.0';

function normalizeBasePath(value?: string) {
  if (!value) {
    return '/';
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue === '/') {
    return '/';
  }

  const prefixedValue = trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`;
  return prefixedValue.endsWith('/') ? prefixedValue : `${prefixedValue}/`;
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const apiProxyTarget = env.API_PROXY_TARGET || 'http://localhost:3001';
  const publicBasePath = normalizeBasePath(env.VITE_PUBLIC_BASE_PATH);

  return {
    plugins: [react(), tailwindcss()],
    base: publicBasePath,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    server: {
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return;
            }

            if (id.includes('react-dom') || id.includes(`${path.sep}react${path.sep}`)) {
              return 'react-vendor';
            }

            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-vendor';
            }

            if (id.includes(`${path.sep}motion${path.sep}`)) {
              return 'motion-vendor';
            }

            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }

            if (id.includes('react-markdown')) {
              return 'markdown-vendor';
            }

            return 'vendor';
          },
        },
      },
    },
  };
});
