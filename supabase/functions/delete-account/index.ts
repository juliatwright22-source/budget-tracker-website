// Deployed via the Supabase dashboard's Edge Function editor (Deploy a new function -> Via Editor).
// Deletes the CALLING user's own account (never an arbitrary user ID passed in the
// request). auth.admin.deleteUser requires the service-role key, which must never
// reach the client, so this has to run server-side. Every table across the app was
// created with `references auth.users (id) on delete cascade`, so removing the auth
// user cascades through the entire schema automatically.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Best-effort: clean up receipt photos. Not fatal if this fails.
  try {
    const { data: files } = await serviceClient.storage.from('receipts').list(user.id)
    if (files && files.length > 0) {
      await serviceClient.storage.from('receipts').remove(files.map(f => `${user.id}/${f.name}`))
    }
  } catch {
    // ignore — storage cleanup is a nicety, not a requirement for account deletion
  }

  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id)
  if (deleteError) return json({ error: deleteError.message }, 500)

  return json({ success: true })
})
