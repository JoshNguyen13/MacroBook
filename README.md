# MacroBook

A calorie tracker, recipe finder, and recipe importer — built as a solo side
project, for iOS/Android/web from one codebase, at $0 cost using free tiers
throughout.

## What it does

- **Calorie tracker**: search USDA FoodData Central, log food by serving
  quantity, edit/delete entries, daily macro progress bars against goals you
  set, a barcode scanner (Open Food Facts) for packaged foods, and a weekly
  summary view with a calorie trend chart.
- **Recipe search**: search Spoonacular's recipe database, view full
  ingredients/steps/nutrition, save recipes, and log a serving of any saved
  recipe straight to your diary. Includes a "What can I make?" mode that
  matches recipes against ingredients you already have.
- **Recipe import from TikTok / Instagram / YouTube**: paste a link, and it
  fetches the caption/description, parses it into ingredients and steps
  through a three-tier cascade (free regex heuristics → a linked-website
  `schema.org/Recipe` scraper → Gemini as a last resort), extracts or
  estimates macros, and saves it straight to your recipe box — no manual
  data entry required, though everything stays editable afterward.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Expo (React Native) — iOS, Android, and web from one codebase |
| Backend | Supabase — Postgres, auth, and Edge Functions |
| Calorie data | USDA FoodData Central |
| Recipe search | Spoonacular |
| Barcode lookup | Open Food Facts |
| Recipe import parsing | Local heuristics + Gemini (free tier) as fallback |

## Project structure

```
src/
  lib/            Supabase client, auth context, and API clients
                   (USDA, Spoonacular, Open Food Facts, recipe import)
  navigation/      Auth stack, tab navigator, and per-tab stacks
  screens/
    auth/          Sign in / sign up
    diary/         Diary, add/edit food, barcode scan, weekly summary
    recipes/       Search, detail, saved recipes, import, edit, ingredient search
    profile/       Calorie/macro goals, sign out
  types/           Database row types (mirrors the Postgres schema)

supabase/
  migrations/      Schema history, applied in order (0001 → 0006)
  functions/
    spoonacular-search/   Proxies Spoonacular so its API key stays server-side
    import-recipe/        Fetches + parses recipes from social links
```
