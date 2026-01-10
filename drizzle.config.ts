import { defineConfig } from 'drizzle-kit';

// DATABASE_URL is only needed for drizzle-kit commands (migrate, push, studio)
// Not required during build - Cloudflare Pages only has runtime env vars
const databaseUrl = process.env.DATABASE_URL || 'postgresql://ac-multiposter:ac-multiposter@db-dev:5432/ac-multiposter';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: true
});
