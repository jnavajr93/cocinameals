-- Clear all generic recipe_text so AI generates specific recipes on demand
UPDATE public.recipes SET recipe_text = NULL;

-- Remove "protein of choice" and similar generic ingredients from all recipes  
UPDATE public.recipes 
SET ingredients = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(ingredients) AS elem
  WHERE lower(elem #>> '{}') NOT LIKE '%choice of protein%'
    AND lower(elem #>> '{}') NOT LIKE '%protein of choice%'
)
WHERE ingredients::text ILIKE '%choice%protein%' 
   OR ingredients::text ILIKE '%protein%choice%';