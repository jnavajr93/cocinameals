ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS allergies jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS dislikes jsonb DEFAULT '[]'::jsonb;