// Imports a recipe from a TikTok, Instagram, or YouTube link:
// 1. Detects the platform from the URL
// 2. Fetches caption/description text (TikTok oEmbed; YouTube Data API; Instagram og:description)
// 3. Parses that caption into a recipe, cascading through three strategies:
//    a. Local heuristic — looks for "Ingredients:"/"Steps:"-style headers (free, instant)
//    b. Linked recipe website — if the caption links to a non-social blog/site, look for
//       schema.org Recipe structured data on that page (free, often very clean)
//    c. Gemini (free tier) — last resort, asks an LLM to extract the recipe from raw text
//
// Also supports a caption-only "parse" mode (no URL) for:
//   - manual caption paste when the automatic fetch fails
//   - "re-parse with AI" from the review screen (pass forceGemini: true)
//
// Macros (calories/protein/carbs/fat) are resolved similarly:
//   1. Parsed directly if the caption states them ("Macros: 615 cal, 57p, 61c, 4f")
//   2. Otherwise estimated from the parsed ingredient list via USDA FoodData Central,
//      using generic unit-to-gram conversion factors (approximate, not lab-precise)
//
// Deploy: supabase functions deploy import-recipe
// Secrets:
//   supabase secrets set YOUTUBE_API_KEY=your-key   (required for YouTube imports)
//   supabase secrets set GEMINI_API_KEY=your-key    (optional, enables the Gemini fallback)
//   supabase secrets set USDA_API_KEY=your-key      (optional, enables macro estimation; falls back to DEMO_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Platform = 'tiktok' | 'instagram' | 'youtube';
type ParseMethod = 'heuristic' | 'line-heuristic' | 'website' | 'gemini' | 'none';
type ParsedRecipe = { ingredients: string[]; steps: string[] };
type Macros = { calories: number; proteinG: number; carbsG: number; fatG: number };
type MacrosSource = 'caption' | 'estimated' | 'none';

function detectPlatform(rawUrl: string): Platform | null {
  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  if (hostname.endsWith('tiktok.com')) return 'tiktok';
  if (hostname.endsWith('instagram.com')) return 'instagram';
  if (hostname.endsWith('youtube.com') || hostname === 'youtu.be') return 'youtube';
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Instagram's og:title and og:description both wrap the real text in boilerplate:
// og:title   -> `<account name/bio> on Instagram: "<real text>"`
// og:description -> `<N> likes, <M> comments - <username> on <date>: "<real text>"`
// Strip everything up to the first quote (and the trailing one) to get the real text.
function stripInstagramWrapper(text: string): string {
  const quoteStart = text.indexOf('"');
  if (quoteStart === -1 || quoteStart > 200) return text;
  let inner = text.slice(quoteStart + 1);
  if (inner.endsWith('"')) inner = inner.slice(0, -1);
  return inner;
}

// TikTok/Instagram don't give us a real "recipe name" — their title fields are just
// the caption. Derive something short from the first line instead of dumping the
// whole caption as the title (it was rendering as a wall of text in recipe lists).
function deriveShortTitle(text: string, maxLen = 70): string {
  const firstLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean);
  if (!firstLine) return 'Imported Recipe';
  return firstLine.length > maxLen ? `${firstLine.slice(0, maxLen - 1).trimEnd()}…` : firstLine;
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return null;
}

async function fetchTiktokCaption(url: string) {
  const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`TikTok oEmbed request failed (${res.status})`);
  const json = await res.json();
  return {
    title: (json.title as string) ?? null,
    image: (json.thumbnail_url as string) ?? null,
    caption: (json.title as string) ?? null,
  };
}

function extractYoutubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const hostname = u.hostname.replace(/^www\./, '');
  if (hostname === 'youtu.be') return u.pathname.slice(1) || null;
  if (hostname.endsWith('youtube.com')) {
    if (u.searchParams.has('v')) return u.searchParams.get('v');
    const match = u.pathname.match(/^\/(shorts|embed)\/([^/?]+)/);
    if (match) return match[2];
  }
  return null;
}

async function fetchYoutubeCaption(url: string, apiKey: string) {
  const videoId = extractYoutubeId(url);
  if (!videoId) throw new Error('Could not find a video ID in that YouTube URL');

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
  );
  if (!res.ok) throw new Error(`YouTube API request failed (${res.status})`);
  const json = await res.json();
  const snippet = json.items?.[0]?.snippet;
  if (!snippet) throw new Error('Video not found or is private');

  return {
    title: (snippet.title as string) ?? null,
    image: (snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? null) as string | null,
    caption: (snippet.description as string) ?? null,
  };
}

async function fetchOgMetadata(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch page (${res.status})`);
  const html = await res.text();
  return {
    title: extractMeta(html, 'og:title'),
    image: extractMeta(html, 'og:image'),
    caption: extractMeta(html, 'og:description'),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Instagram intermittently serves a stripped-down page with no og:description —
// confirmed the same exact URL succeeds and fails back-to-back on repeat requests.
// There's no way to detect this ahead of time, so just keep retrying for up to
// maxDurationMs rather than a fixed attempt count.
async function fetchOgMetadataWithRetry(url: string, maxDurationMs = 30_000, delayMs = 700) {
  const deadline = Date.now() + maxDurationMs;
  let lastResult: Awaited<ReturnType<typeof fetchOgMetadata>> | null = null;
  let lastError: unknown = null;

  while (true) {
    try {
      const result = await fetchOgMetadata(url);
      lastResult = result;
      if (result.caption) return result;
    } catch (e) {
      lastError = e;
    }
    if (Date.now() >= deadline) break;
    await sleep(Math.min(delayMs, Math.max(deadline - Date.now(), 0)));
  }

  if (lastResult) return lastResult;
  throw lastError instanceof Error ? lastError : new Error('Failed to fetch page after retries');
}

function splitCaptionHeuristically(caption: string): ParsedRecipe | null {
  const lines = caption.split(/\r?\n/);
  // "Starts with" rather than "the whole line is exactly this word" — real captions
  // write "INGREDIENTS 🍝" or "Ingredients you'll need:", not just "Ingredients:".
  const ingredientHeaderRe = /^\s*[^\w]{0,3}\s*ingredients?\b/i;
  const stepsHeaderRe = /^\s*[^\w]{0,3}\s*(steps?|instructions?|directions?|method)\b/i;

  let ingredientsStart = -1;
  let stepsStart = -1;
  lines.forEach((line, i) => {
    if (ingredientsStart === -1 && ingredientHeaderRe.test(line)) ingredientsStart = i;
    else if (stepsStart === -1 && stepsHeaderRe.test(line)) stepsStart = i;
  });

  if (ingredientsStart === -1) return null;

  // Strip leading bullets, then a leading list number like "1." or "2)" — but NOT a bare
  // leading digit followed by a space/unit, since that's a quantity ("3 large eggs",
  // "240mL Water"), not list numbering. The two used to be conflated, eating quantities.
  const clean = (line: string) =>
    line
      .replace(/^[\s•\-*✔️✅🔸🔹▪️◦]+/, '')
      .replace(/^\d+[.)]\s*/, '')
      .trim();

  if (stepsStart !== -1 && stepsStart > ingredientsStart) {
    const ingredients = lines.slice(ingredientsStart + 1, stepsStart).map(clean).filter(Boolean);
    const steps = lines.slice(stepsStart + 1).map(clean).filter(Boolean);
    if (ingredients.length === 0 || steps.length === 0) return null;
    return { ingredients, steps };
  }

  // No distinct steps header — many captions (e.g. "full recipe on our website") only
  // list ingredients in the caption itself. Salvage the ingredients rather than
  // discarding a perfectly good partial match; steps stay empty for Gemini/the user
  // to fill in. Stop at the first blank line so we don't sweep up the rest of the caption.
  const ingredients: string[] = [];
  for (let i = ingredientsStart + 1; i < lines.length; i++) {
    if (lines[i].trim() === '' && ingredients.length > 0) break;
    const cleaned = clean(lines[i]);
    if (cleaned) ingredients.push(cleaned);
  }

  if (ingredients.length === 0) return null;
  return { ingredients, steps: [] };
}

const LINE_BULLET_RE = /^\s*[•\-*✔️✅🔸🔹▪️◦]\s*/;
const QUANTITY_HINT_RE =
  /\d|½|¼|¾|⅓|⅔|⅛|\b(cups?|tsp|tbsp|teaspoons?|tablespoons?|oz|ounces?|grams?|kg|ml|lbs?|pounds?|cloves?|pinch(?:es)?|scoops?|cans?|slices?|pieces?|packets?|sticks?|large|small|medium|whole)\b/i;
const STEP_VERB_RE =
  /^(mix|combine|whisk|stir|add|pour|spread|bake|cook|preheat|heat|top|sprinkle|season|chop|cut|slice|dice|mince|fold|beat|blend|pur[ée]e|simmer|boil|fry|saut[ée]|sear|grill|roast|steam|marinate|chill|freeze|refrigerate|let|remove|drain|rinse|wash|peel|grease|line|arrange|layer|garnish|serve|assemble|place|set|transfer|flip|turn|reduce|whip|knead|roll|shape|form|coat|dip|brush|drizzle|squeeze|mash|crush|grate|shred|zest|toast|melt|dissolve|cool|rest|cover|uncover|once|when|repeat|continue)\b/i;
const DISCARD_LINE_RE = /^(#|macros?[:.]|nutrition[:.]|calories?[:.])/i;

// Second-tier fallback for captions with no "Ingredients"/"Steps" headers at all —
// classifies each line independently instead of looking for two contiguous blocks.
// Catches the common "bulleted ingredients + imperative-verb directions, interleaved,
// no headers" style, without needing an LLM call. Requires at least 2 ingredient-like
// bullets before trusting the result, to avoid false positives on unrelated bulleted
// content (e.g. "- 50% off" has a digit but isn't a recipe).
function classifyLinesHeuristically(caption: string): ParsedRecipe | null {
  const ingredients: string[] = [];
  const steps: string[] = [];

  for (const rawLine of caption.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || DISCARD_LINE_RE.test(line)) continue;

    if (LINE_BULLET_RE.test(line)) {
      const withoutBullet = line.replace(LINE_BULLET_RE, '').trim();
      if (withoutBullet && QUANTITY_HINT_RE.test(withoutBullet)) {
        ingredients.push(withoutBullet);
      }
      continue;
    }

    if (STEP_VERB_RE.test(line)) {
      steps.push(line);
    }
  }

  if (ingredients.length < 2) return null;
  return { ingredients, steps };
}

const SOCIAL_HOSTS = [
  'tiktok.com',
  'instagram.com',
  'youtube.com',
  'youtu.be',
  'facebook.com',
  'twitter.com',
  'x.com',
  'linktr.ee',
];

function extractCandidateUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)]+/g) ?? [];
  const cleaned = matches.map((u) => u.replace(/[.,;:!?]+$/, ''));
  return cleaned.filter((u) => {
    try {
      const hostname = new URL(u).hostname.replace(/^www\./, '');
      return !SOCIAL_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
    } catch {
      return false;
    }
  });
}

function extractRecipeJsonLd(html: string): ParsedRecipe | null {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptRe)) {
    let json: unknown;
    try {
      json = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const candidates = Array.isArray(json)
      ? json
      : (json as Record<string, unknown>)?.['@graph']
        ? ((json as Record<string, unknown>)['@graph'] as unknown[])
        : [json];

    for (const item of candidates as Record<string, unknown>[]) {
      const type = item?.['@type'];
      const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
      if (!isRecipe) continue;

      const ingredients = Array.isArray(item.recipeIngredient) ? (item.recipeIngredient as string[]) : [];

      let steps: string[] = [];
      const instructions = item.recipeInstructions;
      if (typeof instructions === 'string') {
        steps = instructions.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      } else if (Array.isArray(instructions)) {
        steps = (instructions as Record<string, unknown>[])
          .map((s) => (typeof s === 'string' ? s : (s?.text as string) || ''))
          .filter(Boolean);
      }

      if (ingredients.length > 0 && steps.length > 0) {
        return { ingredients, steps };
      }
    }
  }
  return null;
}

async function fetchRecipeFromLinkedSite(caption: string): Promise<ParsedRecipe | null> {
  const urls = extractCandidateUrls(caption).slice(0, 2);
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MacroBookBot/1.0)' },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const recipe = extractRecipeJsonLd(html);
      if (recipe) return recipe;
    } catch {
      continue;
    }
  }
  return null;
}

async function parseWithGemini(caption: string, apiKey: string): Promise<ParsedRecipe | null> {
  const prompt =
    'Extract the recipe from this social media caption. Return ONLY JSON matching ' +
    '{"ingredients": string[], "steps": string[]}. If there is no recipe here, return ' +
    `{"ingredients": [], "steps": []}.\n\nCaption:\n${caption}`;

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (!res.ok) return null;
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.ingredients) && Array.isArray(parsed.steps)) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function parseCaption(
  caption: string,
  forceGemini: boolean
): Promise<{ ingredients: string[]; steps: string[]; parseMethod: ParseMethod }> {
  let parsed: ParsedRecipe | null = null;
  let parseMethod: ParseMethod = 'none';

  if (!forceGemini) {
    parsed = splitCaptionHeuristically(caption);
    if (parsed) parseMethod = 'heuristic';

    if (!parsed) {
      parsed = classifyLinesHeuristically(caption);
      if (parsed) parseMethod = 'line-heuristic';
    }

    if (!parsed) {
      const websiteResult = await fetchRecipeFromLinkedSite(caption);
      if (websiteResult) {
        parsed = websiteResult;
        parseMethod = 'website';
      }
    }
  }

  // Try Gemini whenever we don't yet have a *complete* result — including when the
  // heuristic only salvaged ingredients with no steps (e.g. "full recipe on our
  // website" captions that list ingredients but not directions).
  const isComplete = !!parsed && parsed.ingredients.length > 0 && parsed.steps.length > 0;
  if (!isComplete) {
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (geminiKey) {
      const geminiResult = await parseWithGemini(caption, geminiKey);
      if (geminiResult && (geminiResult.ingredients.length > 0 || geminiResult.steps.length > 0)) {
        const geminiComplete = geminiResult.ingredients.length > 0 && geminiResult.steps.length > 0;
        if (!parsed || geminiComplete) {
          parsed = geminiResult;
          parseMethod = 'gemini';
        }
      }
    }
  }

  return { ingredients: parsed?.ingredients ?? [], steps: parsed?.steps ?? [], parseMethod };
}

// --- Macros: parse an explicit macros line, or estimate from ingredients via USDA ---

function extractExplicitMacros(caption: string): Macros | null {
  // Shorthand: "Macros: ~615 cal, 57p, 61c, 4f" — calories then protein/carbs/fat
  // as single-letter suffixes, in that order, within the same line.
  const shorthand = caption.match(
    /~?(\d+(?:\.\d+)?)\s*(?:kcal|cal|calories)\b[^\n]{0,40}?(\d+(?:\.\d+)?)\s*p\b[^\n]{0,40}?(\d+(?:\.\d+)?)\s*c\b[^\n]{0,40}?(\d+(?:\.\d+)?)\s*f\b/i
  );
  if (shorthand) {
    return {
      calories: Number(shorthand[1]),
      proteinG: Number(shorthand[2]),
      carbsG: Number(shorthand[3]),
      fatG: Number(shorthand[4]),
    };
  }

  // Explicit labeled lines, any order: "2g Fat" / "5g Carbs" / "3g Protein".
  const fat = caption.match(/(\d+(?:\.\d+)?)\s*g\s*fat\b/i);
  const carbs = caption.match(/(\d+(?:\.\d+)?)\s*g\s*carbs?\b/i);
  const protein = caption.match(/(\d+(?:\.\d+)?)\s*g\s*protein\b/i);
  if (!fat && !carbs && !protein) return null;

  const proteinG = protein ? Number(protein[1]) : 0;
  const carbsG = carbs ? Number(carbs[1]) : 0;
  const fatG = fat ? Number(fat[1]) : 0;

  const explicitCal = caption.match(/~?(\d+(?:\.\d+)?)\s*(?:kcal|cal|calories)\b/i);
  // Atwater factors — standard calorie-per-gram estimates when calories aren't stated.
  const calories = explicitCal ? Number(explicitCal[1]) : Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);

  return { calories, proteinG, carbsG, fatG };
}

const UNIT_TO_GRAMS: Record<string, number> = {
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  oz: 28,
  ounce: 28,
  ounces: 28,
  lb: 454,
  lbs: 454,
  pound: 454,
  pounds: 454,
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  clove: 5,
  cloves: 5,
  pinch: 0.5,
  pinches: 0.5,
  scoop: 30,
  scoops: 30,
  stick: 113,
  sticks: 113,
  slice: 25,
  slices: 25,
  can: 400,
  cans: 400,
  packet: 10,
  packets: 10,
};

// Approximate per-item weights for common count-based ingredients with no stated unit
// ("3 large eggs", "2 eggs"). Anything not listed here falls back to a conservative
// generic guess rather than compounding a wild estimate.
const COUNT_ITEM_GRAMS: Record<string, number> = {
  egg: 50,
  eggs: 50,
  yolk: 18,
  yolks: 18,
  white: 33,
  whites: 33,
};

function parseLeadingQuantity(text: string): { quantity: number; rest: string } | null {
  const trimmed = text.trim().replace(/^~/, '');
  // Mixed number: "1 1/2 cups flour"
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (mixed) {
    return { quantity: Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]), rest: mixed[4] };
  }
  // Simple fraction: "1/2 cup cottage cheese"
  const fraction = trimmed.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (fraction) {
    return { quantity: Number(fraction[1]) / Number(fraction[2]), rest: fraction[3] };
  }
  // Plain number (int or decimal): "240 ml water", "2 eggs"
  const plain = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (plain) {
    return { quantity: Number(plain[1]), rest: plain[2] };
  }
  return null;
}

function estimateIngredientGrams(ingredientLine: string): { grams: number; foodName: string } | null {
  const leading = parseLeadingQuantity(ingredientLine);
  if (!leading) return null;

  const { quantity, rest } = leading;
  const wordMatch = rest.match(/^([a-zA-Z]+)\s+(.+)$/);
  const unitWord = wordMatch ? wordMatch[1].toLowerCase() : '';
  const afterUnit = wordMatch ? wordMatch[2] : rest;

  const gramsPerUnit = UNIT_TO_GRAMS[unitWord];
  if (gramsPerUnit) {
    return { grams: quantity * gramsPerUnit, foodName: afterUnit.trim() };
  }

  // No recognized measurement unit — likely a count of discrete items, e.g. "3 large eggs".
  const foodName = rest.trim();
  const lastWord = foodName.toLowerCase().split(/\s+/).pop() ?? '';
  const perItemGrams = COUNT_ITEM_GRAMS[lastWord] ?? 40;
  return { grams: quantity * perItemGrams, foodName };
}

async function lookupUsdaPer100g(
  foodName: string,
  apiKey: string
): Promise<{ calories: number; proteinG: number; carbsG: number; fatG: number } | null> {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&dataType=Foundation,SR%20Legacy&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const food = json.foods?.[0];
  if (!food) return null;

  const nutrients: { nutrientId: number; value: number }[] = food.foodNutrients ?? [];
  const find = (id: number) => nutrients.find((n) => n.nutrientId === id)?.value ?? 0;

  return {
    calories: find(1008),
    proteinG: find(1003),
    carbsG: find(1005),
    fatG: find(1004),
  };
}

async function estimateMacrosFromIngredients(ingredients: string[]): Promise<Macros | null> {
  const apiKey = Deno.env.get('USDA_API_KEY') || 'DEMO_KEY';

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let matchedAny = false;

  for (const ingredient of ingredients) {
    const estimate = estimateIngredientGrams(ingredient);
    if (!estimate || !estimate.foodName) continue;

    try {
      const per100g = await lookupUsdaPer100g(estimate.foodName, apiKey);
      if (!per100g) continue;
      const factor = estimate.grams / 100;
      totalCalories += per100g.calories * factor;
      totalProtein += per100g.proteinG * factor;
      totalCarbs += per100g.carbsG * factor;
      totalFat += per100g.fatG * factor;
      matchedAny = true;
    } catch {
      continue;
    }
  }

  if (!matchedAny) return null;

  return {
    calories: Math.round(totalCalories),
    proteinG: Math.round(totalProtein * 10) / 10,
    carbsG: Math.round(totalCarbs * 10) / 10,
    fatG: Math.round(totalFat * 10) / 10,
  };
}

async function resolveMacros(
  caption: string,
  ingredients: string[]
): Promise<{ macros: Macros | null; macrosSource: MacrosSource }> {
  const explicit = extractExplicitMacros(caption);
  if (explicit) return { macros: explicit, macrosSource: 'caption' };

  if (ingredients.length > 0) {
    const estimated = await estimateMacrosFromIngredients(ingredients);
    if (estimated) return { macros: estimated, macrosSource: 'estimated' };
  }

  return { macros: null, macrosSource: 'none' };
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let body: { url?: string; caption?: string; forceGemini?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid request body', 400);
  }

  // Caption-only mode: manual paste fallback, or "re-parse with AI" from the review screen.
  if (body.caption) {
    const caption = body.caption.trim();
    if (!caption) return jsonError('Missing caption', 400);
    const result = await parseCaption(caption, !!body.forceGemini);
    const { macros, macrosSource } = await resolveMacros(caption, result.ingredients);
    return new Response(
      JSON.stringify({
        platform: 'manual',
        title: 'Imported Recipe',
        image: null,
        caption,
        ...result,
        macros,
        macrosSource,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = body.url?.trim();
  if (!url) return jsonError('Missing url or caption', 400);

  const platform = detectPlatform(url);
  if (!platform) {
    return jsonError('Unsupported link. Paste a TikTok, Instagram, or YouTube URL.', 400);
  }

  const youtubeKey = Deno.env.get('YOUTUBE_API_KEY');
  if (platform === 'youtube' && !youtubeKey) {
    return jsonError('YouTube import is not configured yet (missing YOUTUBE_API_KEY).', 500);
  }

  let title: string | null;
  let image: string | null;
  let caption: string | null;

  try {
    const result =
      platform === 'tiktok'
        ? await fetchTiktokCaption(url)
        : platform === 'youtube'
          ? await fetchYoutubeCaption(url, youtubeKey!)
          : await fetchOgMetadataWithRetry(url);
    title = result.title;
    image = result.image;
    caption = result.caption;
  } catch (e) {
    return jsonError(
      `Could not fetch content from that link: ${e instanceof Error ? e.message : 'unknown error'}`,
      502
    );
  }

  if (!caption) {
    return jsonError('Could not find a caption/description on that post to parse.', 422);
  }

  const cleanCaption = platform === 'instagram' ? stripInstagramWrapper(caption) : caption;
  const displayTitle = platform === 'youtube' ? title?.trim() || 'Imported Recipe' : deriveShortTitle(cleanCaption);

  const result = await parseCaption(cleanCaption, false);
  const { macros, macrosSource } = await resolveMacros(cleanCaption, result.ingredients);

  return new Response(
    JSON.stringify({
      platform,
      title: displayTitle,
      image,
      caption: cleanCaption,
      ...result,
      macros,
      macrosSource,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
