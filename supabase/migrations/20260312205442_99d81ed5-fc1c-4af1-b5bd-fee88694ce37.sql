ALTER TABLE public.saved_recipes ADD COLUMN meal_section text DEFAULT null;
ALTER TABLE public.saved_recipes ADD COLUMN tags jsonb DEFAULT '[]'::jsonb;