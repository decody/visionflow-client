import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const rootEnvFiles = isVercel
  ? []
  : [
      '.env',
      process.env.NODE_ENV === 'production' ? '.env.production' : null,
      '.env.local',
    ].filter(Boolean);
const initialEnvKeys = new Set(Object.keys(process.env));

const parseRootEnvFile = (filePath) => {
  const entries = {};

  readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) return;

      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

      if (!match) return;

      const [, key, rawValue] = match;
      let value = rawValue.trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      entries[key] = value;
    });

  return entries;
};

rootEnvFiles.forEach((fileName) => {
  const filePath = path.join(rootDir, fileName);

  if (!existsSync(filePath)) return;

  const entries = parseRootEnvFile(filePath);

  Object.entries(entries).forEach(([key, value]) => {
    if (!initialEnvKeys.has(key)) {
      process.env[key] = value;
    }
  });
});

const publicSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_REST_URL: process.env.NEXT_PUBLIC_SUPABASE_REST_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
};

const nextConfig = {
  env: Object.fromEntries(
    Object.entries(publicSupabaseEnv).filter(([, value]) => Boolean(value)),
  ),
  reactStrictMode: true,
  transpilePackages: ['@visionflow/auth', '@visionflow/routes', '@visionflow/shared'],
};

export default nextConfig;
