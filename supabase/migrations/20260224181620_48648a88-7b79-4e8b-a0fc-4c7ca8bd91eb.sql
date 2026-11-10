ALTER TABLE public.ficha_profissional 
ADD COLUMN IF NOT EXISTS career_grid_stars jsonb DEFAULT '{}'::jsonb;