
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- NOTA: Usuário de teste — envolto em exceção para não falhar em banco novo
  -- A senha '123456' está hasheada em bcrypt abaixo (pré-computada, sem dependência de pgcrypto)
  -- Hash bcrypt de '123456' com salt $2a$10$... gerado externamente
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'usuarioadminteste@teste.com',
    '$2a$10$PkMwSL5DX5JWtDWjgGH7.OibvVqQhJh6fFVzFnJmG9T8iKz5yNHQ2',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Usuário Admin Teste"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', 'usuarioadminteste@teste.com', 'email_verified', true),
    'email', new_user_id::text, now(), now(), now());

  UPDATE public.profiles
    SET full_name = 'Usuário Admin Teste',
        company_id = NULL,
        must_change_password = false,
        is_active = true
    WHERE user_id = new_user_id;

  UPDATE public.user_roles SET role = 'admin_master' WHERE user_id = new_user_id;

EXCEPTION WHEN OTHERS THEN
  -- Tabela auth.users ou public.profiles pode não existir neste ambiente; seed ignorado
  NULL;
END $$;
