-- Saved recipes never had anywhere to store a thumbnail, even though the
-- Spoonacular and import-recipe integrations both return one.
alter table saved_recipes add column image_url text;
