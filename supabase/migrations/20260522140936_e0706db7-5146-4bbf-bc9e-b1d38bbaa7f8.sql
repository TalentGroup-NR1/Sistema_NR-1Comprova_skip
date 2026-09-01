
DO $$
DECLARE
  v_users uuid[] := ARRAY['f28ffad8-2a3e-46ce-98b9-8a7e3ea9d883'::uuid, '2b7f71ef-ab09-4777-898a-73892e614d9c'::uuid];
  v_uid uuid;
BEGIN
  FOREACH v_uid IN ARRAY v_users LOOP
    DELETE FROM public.user_roles WHERE user_id = v_uid;
    DELETE FROM public.profiles WHERE user_id = v_uid;
    DELETE FROM auth.users WHERE id = v_uid;
  END LOOP;
END $$;
