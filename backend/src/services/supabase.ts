import { createClient } from '@supabase/supabase-js';

// Pastikan variabel environment ini ditambahkan di backend/.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL atau Key belum dikonfigurasi di backend/.env');
}

export const supabaseAdmin = createClient(supabaseUrl || '', supabaseKey || '');
