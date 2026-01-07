import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

console.log("Debug script initiated");

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in environment");
    process.exit(1);
}

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

async function debug() {
    try {
        console.log("Checking database...");
        // Check verification table specifically since it failed for the user
        const verificationRecords = await db.select().from(schema.verification).limit(5);
        console.log(`Found ${verificationRecords.length} verification records.`);
        for (const v of verificationRecords) {
            console.log(`  - ID: ${v.id}, Identifier: ${v.identifier}`);
        }

        const contacts = await db.select().from(schema.contact).limit(5);
        console.log(`Found ${contacts.length} contacts.`);

        for (const c of contacts) {
            const emails = await db.select().from(schema.contactEmail).where(eq(schema.contactEmail.contactId, c.id));
            console.log(`Contact ${c.id} (${c.displayName}): ${emails.length} emails`);
            for (const e of emails) {
                console.log(`  - ${e.value} (${e.type})`);
            }
        }
    } catch (e) {
        console.error("Debug failed:", e);
    } finally {
        await client.end();
    }
}

debug();
