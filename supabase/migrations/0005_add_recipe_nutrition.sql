-- Lets a saved recipe carry per-serving nutrition, so a serving of it can be
-- logged straight into the calorie tracker.
alter table saved_recipes add column servings integer;
alter table saved_recipes add column calories_per_serving numeric;
alter table saved_recipes add column protein_per_serving_g numeric;
alter table saved_recipes add column carbs_per_serving_g numeric;
alter table saved_recipes add column fat_per_serving_g numeric;

-- food_logs entries created from a recipe serving are distinct from a raw USDA lookup.
alter type food_source add value if not exists 'recipe';
