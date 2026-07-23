-- Adds 'instagram' as a valid saved_recipes.source_type, for the link-based recipe importer.
alter type recipe_source_type add value if not exists 'instagram';
