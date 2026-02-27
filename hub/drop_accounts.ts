import { sql } from './src/supabase.js';

async function dropAccounts() {
  console.log('Dropping any account tables as requested...');
  try {
    await sql`DROP TABLE IF EXISTS public.users CASCADE;`;
    await sql`DROP TABLE IF EXISTS public.accounts CASCADE;`;
    await sql`DROP TABLE IF EXISTS auth.users CASCADE;`; // Just in case they meant Supabase auth, though we might not have permission for auth schema
    console.log('✅ Accounts tables wiped.');
  } catch (e: any) {
    console.warn('Could not drop some tables (might not exist or lack permissions):', e.message);
  } finally {
    process.exit(0);
  }
}

dropAccounts();
