import {createClient} from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://ptkjyfbybycyfpuovwjv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0a2p5ZmJ5YnljeWZwdW92d2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0ODA3MDAsImV4cCI6MjA1NjA1NjcwMH0.dNXEepljobWZzEcPmdHZwRXeH8QEilpRHcrJ_uX1bpE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: {
        schema: 'public',
    },
    auth: {
        persistSession: true,
    },
    storage: {

    }
});

export default supabase;