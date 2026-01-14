import { defineConfig } from 'drizzle-kit';

// DATABASE_URL is only needed for drizzle-kit commands (migrate, push, studio)
// Not required during build - Cloudflare Pages only has runtime env vars
const databaseUrl = process.env.DATABASE_URL || 'postgresql://placeholder';

export default defineConfig({
	schema: './src/lib/server/db/schema',
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: true
});
