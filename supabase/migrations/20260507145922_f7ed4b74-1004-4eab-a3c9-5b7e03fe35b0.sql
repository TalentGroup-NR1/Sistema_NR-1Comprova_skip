CREATE TABLE public.birthday_greeting_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  greeting_type TEXT NOT NULL CHECK (greeting_type IN ('birthday','work_anniversary')),
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, greeting_type)
);

ALTER TABLE public.birthday_greeting_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own greeting acks"
ON public.birthday_greeting_acknowledgments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own greeting acks"
ON public.birthday_greeting_acknowledgments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_bday_ack_user_year ON public.birthday_greeting_acknowledgments(user_id, year);