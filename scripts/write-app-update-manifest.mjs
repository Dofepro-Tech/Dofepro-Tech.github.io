import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

for (const envFile of ['.env', '.env.production', '.env.local', '.env.production.local']) {
  const envPath = path.resolve(rootDir, envFile);
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false });
  }
}

const packageJson = JSON.parse(readFileSync(path.resolve(rootDir, 'package.json'), 'utf8'));
const version = typeof packageJson.version === 'string' && packageJson.version.trim().length > 0
  ? packageJson.version.trim()
  : '0.0.0';
const downloadUrl = (
  process.env.VITE_APP_DOWNLOAD_URL
  || process.env.VITE_PLAY_STORE_URL
  || process.env.VITE_APP_SHARE_URL
  || ''
).trim();
const explicitUpdateUrl = (process.env.VITE_APP_UPDATE_URL || '').trim();

const updateUrl = explicitUpdateUrl || (downloadUrl ? new URL('app-update.json', downloadUrl).toString() : '');
const apkUrl = downloadUrl ? new URL('biblia-dj-android.apk', downloadUrl).toString() : '';

const manifest = {
  version,
  channel: 'stable',
  publishedAt: new Date().toISOString(),
  downloadUrl,
  apkUrl,
  updateUrl,
  notes: [],
};

const publicDir = path.resolve(rootDir, 'public');
mkdirSync(publicDir, { recursive: true });
writeFileSync(path.resolve(publicDir, 'app-update.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Wrote app-update.json for version ${version}`);