const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('Error: SUPABASE_DB_URL or DATABASE_URL not found in environment.');
    process.exit(1);
}

async function forceReload() {
    const client = new Client({
        connectionString: dbUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });
    try {
        await client.connect();
        console.log('Connected to Postgres directly.');

        console.log('Checking columns in artists table...');
        const colRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'artists' AND table_schema = 'public'");
        const cols = colRes.rows.map(r => r.column_name);
        console.log('Columns found:', cols);

        if (cols.includes('name_ko') && cols.includes('history')) {
            console.log('Database schema IS CORRECT.');
            console.log('Sending PostgREST reload notification...');
            await client.query("NOTIFY pgrst, 'reload'");
            console.log('Notification sent.');
        } else {
            console.error('Database schema is WRONG. Required columns missing.');
        }
    } catch (err) {
        console.error('Direct PG Connection failed:', err.message);
    } finally {
        await client.end();
    }
}
forceReload();
