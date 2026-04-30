import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://bdkaqgvzjkixwakzploq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJka2FxZ3Z6amtpeHdha3pwbG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjY1NTUsImV4cCI6MjA5MzE0MjU1NX0.2S3xPfiHgYGZNA3MF63eJYnSLYA-XKTVx4De4_miw6s';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
