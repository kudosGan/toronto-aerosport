import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When the two settings are missing the site runs in demo mode (sample listings, nothing is saved online).
export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;
