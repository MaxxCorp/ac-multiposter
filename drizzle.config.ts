import { defineConfig } from 'drizzle-kit';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd());

// DATABASE_URL is only needed for drizzle-kit commands (migrate, push, studio)
// Not required during build - Cloudflare Pages only has runtime env vars
const databaseUrl = env.DATABASE_URL || 'postgresql://placeholder';

export default defineConfig({
	schema: './src/lib/server/db/schema',
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: true
});
