// Deployed via the Supabase dashboard's Edge Function editor (Deploy a new function -> Via Editor).
// Proxies Finnhub quote lookups behind auth + a shared price_cache, so the API key never
// reaches the client and the free-tier rate limit is pooled across every Yachty user.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY')

const CACHE_TTL_MS = 60 * 1000

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

  let tickers
  try {
    const body = await req.json()
    tickers = body.tickers
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!Array.isArray(tickers) || tickers.length === 0) {
    return json({ error: 'tickers must be a non-empty array' }, 400)
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const results = {}

  for (const raw of tickers) {
    const symbol = String(raw).toUpperCase()
    const { data: cached } = await serviceClient
      .from('price_cache')
      .select('*')
      .eq('ticker', symbol)
      .maybeSingle()

    const isFresh = cached && (Date.now() - new Date(cached.fetched_at).getTime()) < CACHE_TTL_MS
    if (isFresh) {
      results[symbol] = { price: Number(cached.price), prevClose: Number(cached.prev_close), fetchedAt: cached.fetched_at, stale: false }
      continue
    }

    try {
      const resp = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`)
      if (!resp.ok) throw new Error(`Finnhub HTTP ${resp.status}`)
      const quote = await resp.json()
      if (quote.c == null || quote.c === 0) throw new Error('No price data for ticker')

      const row = { ticker: symbol, price: quote.c, prev_close: quote.pc, fetched_at: new Date().toISOString() }
      await serviceClient.from('price_cache').upsert(row)
      results[symbol] = { price: Number(row.price), prevClose: Number(row.prev_close), fetchedAt: row.fetched_at, stale: false }
    } catch (fetchErr) {
      if (cached) {
        results[symbol] = { price: Number(cached.price), prevClose: Number(cached.prev_close), fetchedAt: cached.fetched_at, stale: true }
      } else {
        results[symbol] = { error: true, message: String(fetchErr?.message ?? fetchErr) }
      }
    }
  }

  return json(results, 200)
})
