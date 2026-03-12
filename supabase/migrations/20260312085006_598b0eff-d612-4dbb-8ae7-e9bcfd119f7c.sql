
-- Households table
CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Household members table
CREATE TABLE public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Household profile (shared settings)
CREATE TABLE public.household_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE UNIQUE NOT NULL,
  equipment jsonb DEFAULT '[]',
  cuisine_sliders jsonb DEFAULT '{}',
  meal_sections jsonb DEFAULT '[]',
  quick_filters jsonb DEFAULT '[]',
  meal_prep_days jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.household_profile ENABLE ROW LEVEL SECURITY;

-- User preferences (per-user, private)
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  household_id uuid REFERENCES public.households(id),
  skill_level text DEFAULT 'intermediate',
  spice_tolerance text DEFAULT 'medium',
  weeknight_time text DEFAULT '30min',
  diet_restrictions jsonb DEFAULT '[]',
  health_conditions jsonb DEFAULT '[]',
  section_order jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Children table
CREATE TABLE public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  name text,
  date_of_birth date NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Pantry items table
CREATE TABLE public.pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  in_stock boolean DEFAULT false,
  is_custom boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  updated_by text,
  expires_at date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

-- Meal feedback table
CREATE TABLE public.meal_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  meal_name text NOT NULL,
  feedback text NOT NULL CHECK (feedback IN ('liked', 'disliked')),
  tags jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.meal_feedback ENABLE ROW LEVEL SECURITY;

-- Saved recipes table
CREATE TABLE public.saved_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  meal_name text NOT NULL,
  recipe_text text NOT NULL,
  saved_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

-- Saved meals table
CREATE TABLE public.saved_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  meal_name text NOT NULL,
  calories integer,
  protein integer,
  carbs integer,
  fat integer,
  cook_time integer,
  tags jsonb DEFAULT '[]',
  saved_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;

-- Helper function: get user's household_id
CREATE OR REPLACE FUNCTION public.get_user_household_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM public.household_members WHERE user_id = p_user_id LIMIT 1;
$$;

-- RLS Policies for households
CREATE POLICY "Members can view their household" ON public.households
  FOR SELECT USING (id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Authenticated users can create households" ON public.households
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Members can update their household" ON public.households
  FOR UPDATE USING (id = public.get_user_household_id(auth.uid()));
-- Allow anyone to look up by invite_code for joining
CREATE POLICY "Anyone can lookup by invite code" ON public.households
  FOR SELECT USING (true);

-- RLS Policies for household_members
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT USING (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Authenticated users can join households" ON public.household_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own membership" ON public.household_members
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own membership" ON public.household_members
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for household_profile
CREATE POLICY "Members can view household profile" ON public.household_profile
  FOR SELECT USING (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can insert household profile" ON public.household_profile
  FOR INSERT WITH CHECK (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can update household profile" ON public.household_profile
  FOR UPDATE USING (household_id = public.get_user_household_id(auth.uid()));

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for children
CREATE POLICY "Members can view household children" ON public.children
  FOR SELECT USING (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can insert children" ON public.children
  FOR INSERT WITH CHECK (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can update children" ON public.children
  FOR UPDATE USING (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can delete children" ON public.children
  FOR DELETE USING (household_id = public.get_user_household_id(auth.uid()));

-- RLS Policies for pantry_items
CREATE POLICY "Members can view pantry" ON public.pantry_items
  FOR SELECT USING (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can insert pantry items" ON public.pantry_items
  FOR INSERT WITH CHECK (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can update pantry items" ON public.pantry_items
  FOR UPDATE USING (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can delete pantry items" ON public.pantry_items
  FOR DELETE USING (household_id = public.get_user_household_id(auth.uid()));

-- RLS Policies for meal_feedback
CREATE POLICY "Users can view own feedback" ON public.meal_feedback
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert feedback" ON public.meal_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own feedback" ON public.meal_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for saved_recipes
CREATE POLICY "Members can view saved recipes" ON public.saved_recipes
  FOR SELECT USING (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can insert saved recipes" ON public.saved_recipes
  FOR INSERT WITH CHECK (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can delete saved recipes" ON public.saved_recipes
  FOR DELETE USING (household_id = public.get_user_household_id(auth.uid()));

-- RLS Policies for saved_meals
CREATE POLICY "Members can view saved meals" ON public.saved_meals
  FOR SELECT USING (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can insert saved meals" ON public.saved_meals
  FOR INSERT WITH CHECK (household_id = public.get_user_household_id(auth.uid()));
CREATE POLICY "Members can delete saved meals" ON public.saved_meals
  FOR DELETE USING (household_id = public.get_user_household_id(auth.uid()));

-- Enable realtime on pantry_items
ALTER TABLE public.pantry_items REPLICA IDENTITY FULL;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_pantry_items_updated_at
  BEFORE UPDATE ON public.pantry_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_household_profile_updated_at
  BEFORE UPDATE ON public.household_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_household_members_user_id ON public.household_members(user_id);
CREATE INDEX idx_household_members_household_id ON public.household_members(household_id);
CREATE INDEX idx_pantry_items_household_id ON public.pantry_items(household_id);
CREATE INDEX idx_meal_feedback_user_id ON public.meal_feedback(user_id);
CREATE INDEX idx_saved_recipes_household_id ON public.saved_recipes(household_id);
CREATE INDEX idx_saved_meals_household_id ON public.saved_meals(household_id);
CREATE INDEX idx_children_household_id ON public.children(household_id);
