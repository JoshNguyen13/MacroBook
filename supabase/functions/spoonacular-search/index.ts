// Proxies Spoonacular so the API key never reaches the Expo client.
// Deploy: supabase functions deploy spoonacular-search
// Secret:  supabase secrets set SPOONACULAR_API_KEY=your-key

const SPOONACULAR_BASE = 'https://api.spoonacular.com/recipes';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  let spoonacularUrl: string;

  if (mode === 'byIngredients') {
    const ingredients = url.searchParams.get('ingredients') ?? '';
    const number = url.searchParams.get('number') ?? '10';
    spoonacularUrl =
      `${SPOONACULAR_BASE}/findByIngredients?ingredients=${encodeURIComponent(ingredients)}` +
      `&number=${number}&ranking=1&ignorePantry=true&apiKey=${apiKey}`;
  } else if (mode === 'detail') {
    const id = url.searchParams.get('id') ?? '';
    spoonacularUrl = `${SPOONACULAR_BASE}/${encodeURIComponent(id)}/information?includeNutrition=true&apiKey=${apiKey}`;
  } else {
    const query = url.searchParams.get('query') ?? '';
    const number = url.searchParams.get('number') ?? '10';
    spoonacularUrl =
      `${SPOONACULAR_BASE}/complexSearch?query=${encodeURIComponent(query)}` +
      `&number=${number}&addRecipeInformation=true&apiKey=${apiKey}`;
  }

  const response = await fetch(spoonacularUrl);
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
