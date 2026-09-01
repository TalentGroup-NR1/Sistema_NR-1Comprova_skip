-- Add color customization columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1E5A99',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#333333',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#FFFFFF';