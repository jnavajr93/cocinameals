
-- Create recipes table
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  cuisine text NOT NULL,
  primary_protein text,
  cook_time integer,
  calories integer,
  protein integer,
  carbs integer,
  fat integer,
  spice_level text DEFAULT 'mild',
  skill_level text DEFAULT 'intermediate',
  tags jsonb DEFAULT '[]'::jsonb,
  equipment jsonb DEFAULT '[]'::jsonb,
  ingredients jsonb DEFAULT '[]'::jsonb,
  recipe_text text,
  is_baby boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX recipes_category_idx ON public.recipes(category);
CREATE INDEX recipes_cuisine_idx ON public.recipes(cuisine);
CREATE INDEX recipes_primary_protein_idx ON public.recipes(primary_protein);
CREATE INDEX recipes_is_baby_idx ON public.recipes(is_baby);
CREATE INDEX recipes_cook_time_idx ON public.recipes(cook_time);
CREATE INDEX recipes_calories_idx ON public.recipes(calories);
CREATE INDEX recipes_spice_level_idx ON public.recipes(spice_level);
CREATE INDEX recipes_skill_level_idx ON public.recipes(skill_level);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Read-only access for authenticated users
CREATE POLICY "Authenticated users can read recipes"
  ON public.recipes FOR SELECT
  TO authenticated
  USING (true);
