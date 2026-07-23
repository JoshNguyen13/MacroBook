-- Barcode-scanned entries (via Open Food Facts) are distinct from a USDA search result.
alter type food_source add value if not exists 'barcode';
