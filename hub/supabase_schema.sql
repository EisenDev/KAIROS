-- Run this in the Supabase SQL Editor to initialize KAIROS PRO v4.0 Schema

CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
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
);

-- RLS Policies (Optional but recommended)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can read own signals" ON public.signals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own signals" ON public.signals FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optional trigger to auto-create public.users record on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
