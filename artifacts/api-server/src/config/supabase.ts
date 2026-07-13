import { createClient } from "@supabase/supabase-js";
import { Agent, setGlobalDispatcher } from "undici";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
if (!supabaseServiceKey) throw new Error("SUPABASE_SERVICE_KEY is required");

// Configure global HTTP dispatcher: keepAlive connections, max 10 per origin.
// This governs all fetch() calls in the process, including @supabase/supabase-js.
setGlobalDispatcher(
  new Agent({
    connections: 10,
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 60_000,
  })
);

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
