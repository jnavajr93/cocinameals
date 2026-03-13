
CREATE TABLE public.shared_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_name text NOT NULL,
  recipe_text text NOT NULL,
  tags jsonb DEFAULT '[]',
  shared_by_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_recipes ENABLE ROW LEVEL SECURITY;

-- Anyone can read shared recipes (public links)
CREATE POLICY "Anyone can read shared recipes"
  ON public.shared_recipes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can share recipes"
  ON public.shared_recipes FOR INSERT
  TO authenticated
  WITH CHECK (true);
