// Proxies Spoonacular so the API key never reaches the Expo client.
// Deploy: supabase functions deploy spoonacular-search
// Secret:  supabase secrets set SPOONACULAR_API_KEY=your-key

const SPOONACULAR_BASE = 'https://api.spoonacular.com/recipes';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchComplexSearch(query: string, number: string, apiKey: string) {
  const url =
    `${SPOONACULAR_BASE}/complexSearch?query=${encodeURIComponent(query)}` +
    `&number=${number}&addRecipeInformation=true&apiKey=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

// Spoonacular's search matches fairly literally against recipe titles — "popcorn
// chicken" can return zero results even though "chicken" alone returns plenty.
// If the exact query comes back empty, retry with words dropped from each end
// before giving up, and report back which query actually produced the results.
async function searchWithRelaxation(query: string, number: string, apiKey: string) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const attempts = [query];
  if (words.length > 1) {
    const withoutFirst = words.slice(1).join(' ');
    attempts.push(withoutFirst);
    const withoutLast = words.slice(0, -1).join(' ');
    if (withoutLast !== withoutFirst) attempts.push(withoutLast);
  }

  let last = await fetchComplexSearch(query, number, apiKey);
  if (!last.ok || !last.json?.results?.length) {
    for (const attempt of attempts.slice(1)) {
      const result = await fetchComplexSearch(attempt, number, apiKey);
      if (result.ok && result.json?.results?.length) {
        return { ...result, matchedQuery: attempt, originalQuery: query };
      }
      last = result;
    }
  }

  return { ...last, matchedQuery: query, originalQuery: query };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('SPOONACULAR_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'SPOONACULAR_API_KEY is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'search';

  if (mode === 'search') {
    const query = url.searchParams.get('query') ?? '';
    const number = url.searchParams.get('number') ?? '10';
    const result = await searchWithRelaxation(query, number, apiKey);
    return new Response(
      JSON.stringify({ ...result.json, matchedQuery: result.matchedQuery, originalQuery: result.originalQuery }),
      { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let spoonacularUrl: string;

  if (mode === 'byIngredients') {
    const ingredients = url.searchParams.get('ingredients') ?? '';
    const number = url.searchParams.get('number') ?? '10';
    spoonacularUrl =
      `${SPOONACULAR_BASE}/findByIngredients?ingredients=${encodeURIComponent(ingredients)}` +
      `&number=${number}&ranking=1&ignorePantry=true&apiKey=${apiKey}`;
  } else {
    const id = url.searchParams.get('id') ?? '';
    spoonacularUrl = `${SPOONACULAR_BASE}/${encodeURIComponent(id)}/information?includeNutrition=true&apiKey=${apiKey}`;
  }

  const response = await fetch(spoonacularUrl);
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
