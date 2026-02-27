// ============================================================
// KAIROS PRO v4.0 — Postgres Direct Connection (Supabase)
// ============================================================

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Pr0Ka1roSv3.0@db.rgdueeffrpvglppmlcpv.supabase.co:5432/postgres';

export const sql = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS public.signals (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid,
        asset_symbol text NOT NULL,
        timeframe text NOT NULL,
        long_prob numeric(5,2) NOT NULL,
        short_prob numeric(5,2) NOT NULL,
        risk_level text NOT NULL,
        verdict text NOT NULL,
        entry_price numeric,
        tp numeric,
        sl numeric,
        created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL
      )
    `;
    console.log('✅ Institutional Ledger (Supabase PostgreSQL) connected and verified.');
  } catch (err: any) {
    console.error('❌ Failed to connect to Institutional Ledger:', err.message);
  }
}

// Automatically init the DB on spin up
initDb();
