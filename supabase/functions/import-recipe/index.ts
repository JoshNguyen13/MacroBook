// Imports a recipe from a TikTok, Instagram, or YouTube link:
// 1. Detects the platform from the URL
// 2. Fetches caption/description text (TikTok oEmbed; YouTube Data API; Instagram og:description)
// 3. Tries a free, local heuristic to split it into ingredients/steps
// 4. Falls back to Gemini (free tier) if the heuristic can't confidently parse it
//
// Deploy: supabase functions deploy import-recipe
// Secrets:
//   supabase secrets set YOUTUBE_API_KEY=your-key   (required for YouTube imports)
//   supabase secrets set GEMINI_API_KEY=your-key    (optional, enables the Gemini fallback)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Platform = 'tiktok' | 'instagram' | 'youtube';

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
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
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

function splitCaptionHeuristically(caption: string): { ingredients: string[]; steps: string[] } | null {
  const lines = caption.split(/\r?\n/);
  const ingredientHeaderRe = /^\s*[^\w]{0,3}\s*ingredients?\s*[:\-]?\s*$/i;
  const stepsHeaderRe = /^\s*[^\w]{0,3}\s*(steps?|instructions?|directions?|method)\s*[:\-]?\s*$/i;

  let ingredientsStart = -1;
  let stepsStart = -1;
  lines.forEach((line, i) => {
    if (ingredientsStart === -1 && ingredientHeaderRe.test(line)) ingredientsStart = i;
    else if (stepsStart === -1 && stepsHeaderRe.test(line)) stepsStart = i;
  });

  if (ingredientsStart === -1 || stepsStart === -1 || stepsStart <= ingredientsStart) {
    return null;
  }

  const clean = (line: string) => line.replace(/^[\s•\-*✔️✅🔸🔹▪️◦\d.)]+/, '').trim();

  const ingredients = lines.slice(ingredientsStart + 1, stepsStart).map(clean).filter(Boolean);
  const steps = lines.slice(stepsStart + 1).map(clean).filter(Boolean);

  if (ingredients.length === 0 || steps.length === 0) return null;

  return { ingredients, steps };
}

async function parseWithGemini(
  caption: string,
  apiKey: string
): Promise<{ ingredients: string[]; steps: string[] } | null> {
  const prompt =
    'Extract the recipe from this social media caption. Return ONLY JSON matching ' +
    '{"ingredients": string[], "steps": string[]}. If there is no recipe here, return ' +
    `{"ingredients": [], "steps": []}.\n\nCaption:\n${caption}`;

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
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

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid request body', 400);
  }

  const url = body.url?.trim();
  if (!url) return jsonError('Missing url', 400);

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
          : await fetchOgMetadata(url);
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

  let parsed = splitCaptionHeuristically(caption);
  let parseMethod: 'heuristic' | 'gemini' | 'none' = parsed ? 'heuristic' : 'none';

  if (!parsed) {
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (geminiKey) {
      const geminiResult = await parseWithGemini(caption, geminiKey);
      if (geminiResult && (geminiResult.ingredients.length > 0 || geminiResult.steps.length > 0)) {
        parsed = geminiResult;
        parseMethod = 'gemini';
      }
    }
  }

  return new Response(
    JSON.stringify({
      platform,
      title: title ?? 'Imported Recipe',
      image,
      caption,
      ingredients: parsed?.ingredients ?? [],
      steps: parsed?.steps ?? [],
      parseMethod,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
