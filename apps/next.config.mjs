import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '..', '.env.local');

if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@visionflow/auth', '@visionflow/routes', '@visionflow/shared'],
};

export default nextConfig;
