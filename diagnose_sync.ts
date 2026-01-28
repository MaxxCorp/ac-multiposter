
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/lib/server/db/schema/index';
// @ts-ignore
import { eq, desc, and } from 'drizzle-orm';
// @ts-ignore
import { account, event as eventTable, syncMapping as syncMappingTable } from './src/lib/server/db/schema/index';

// Load .env manually
try {
    const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error('Failed to load .env file', e);
}

// Initialize DB directly
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env');
}
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function diagnose() {
    console.log('--- Diagnosis Start ---');

    console.log('\n1. Checking Google Account Tokens:');
    const accounts = await db.select().from(account).where(eq(account.providerId, 'google'));

    if (accounts.length === 0) {
        console.log('No Google account found!');
    } else {
        for (const acc of accounts) {
            console.log(`User: ${acc.userId}`);
            console.log(`Provider: ${acc.providerId}`);
            console.log(`Updated At: ${acc.updatedAt}`);
            // Check if expired
            if (acc.accessTokenExpiresAt && acc.accessTokenExpiresAt < new Date()) {
                console.log('STATUS: EXPIRED!');
            } else {
                console.log('STATUS: Valid');
            }
            console.log(`Expires At: ${acc.accessTokenExpiresAt}`);
            console.log(`Refresh Token: ${acc.refreshToken ? 'PRESENT' : 'MISSING'}`);
        }
    }

    console.log('\n2. Checking Recent Events (Last 5):');
    const events = await db.select().from(eventTable).orderBy(desc(eventTable.createdAt)).limit(5);

    for (const ev of events) {
        console.log(`Event: ${ev.id} | Summary: ${ev.summary} | Created: ${ev.createdAt}`);
        // Check mapping
        const mappings = await db.select().from(syncMappingTable).where(eq(syncMappingTable.eventId, ev.id));
        if (mappings.length > 0) {
            for (const m of mappings) {
                console.log(`   -> Mapping: External ${m.externalId} (Provider: ${m.providerId}) | Last Synced: ${m.lastSyncedAt}`);
            }
        } else {
            console.log(`   -> NO MAPPING found!`);
        }
    }

    console.log('\n3. Checking specific duplicated summary (e.g. "Sonntagskonzert im Schloss Biesdorf")');
    const specificEvents = await db.select().from(eventTable).where(eq(eventTable.summary, "Sonntagskonzert im Schloss Biesdorf"));
    if (specificEvents.length > 0) {
        console.log(`Found ${specificEvents.length} events with this summary:`);
        for (const ev of specificEvents) {
            console.log(`   ID: ${ev.id} | Created: ${ev.createdAt} | Start: ${ev.startDateTime}`);
            const mappings = await db.select().from(syncMappingTable).where(eq(syncMappingTable.eventId, ev.id));
            console.log(`   Mappings: ${mappings.length}`);
        }
    }

    console.log('--- Diagnosis End ---');
    process.exit(0);
}

diagnose().catch((err) => {
    console.error(err);
    process.exit(1);
});
