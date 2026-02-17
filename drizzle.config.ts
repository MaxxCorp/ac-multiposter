import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

// DATABASE_URL is only needed for drizzle-kit commands (migrate, push, studio)
// Not required during build - Cloudflare Pages only has runtime env vars
const { DATABASE_URL } = process.env;

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema',
	dialect: 'postgresql',
	dbCredentials: { url: DATABASE_URL },
	verbose: true,
	strict: true
});
