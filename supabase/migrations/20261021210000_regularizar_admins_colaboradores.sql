-- ============================================================================
-- MIGRATION: 20261021210000_regularizar_admins_colaboradores.sql
-- Data: 2026-10-21
-- Descrição: 
--   Regularização idempotente de administradores ativos (admin_empresa) que não 
--   possuem ficha funcional na tabela colaboradores na sua respectiva empresa.
--   Insere a ficha com user_id vinculado e concede o papel 'colaborador' em user_roles.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_cpf text;
  v_admission date;
  v_count int := 0;
BEGIN
  FOR r IN (
    SELECT 
      p.user_id,
      p.company_id,
      COALESCE(NULLIF(trim(p.full_name), ''), split_part(u.email, '@', 1)) as full_name,
      lower(trim(u.email)) as email,
      COALESCE(u.created_at::date, CURRENT_DATE) as created_date
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE ur.role = 'admin_empresa'
      AND p.is_active = true
      AND p.company_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.colaboradores c 
        WHERE c.user_id = p.user_id AND c.company_id = p.company_id
      )
  ) LOOP
    -- Gerar CPF provisório 100% numérico, único e determinístico baseado no user_id
    v_cpf := '000.' || 
             lpad(((abs(('x' || substr(md5(r.user_id::text), 1, 6))::bit(24)::int) % 900) + 100)::text, 3, '0') || '.' || 
             lpad(((abs(('x' || substr(md5(r.user_id::text), 7, 6))::bit(24)::int) % 900) + 100)::text, 3, '0') || '-' || 
             lpad(((abs(('x' || substr(md5(r.user_id::text), 13, 4))::bit(16)::int) % 90) + 10)::text, 2, '0');
    
    v_admission := r.created_date;

    -- Inserir ficha na tabela colaboradores com vínculo direto à conta auth do admin
    INSERT INTO public.colaboradores (
      company_id,
      user_id,
      full_name,
      corporate_email,
      email_pessoal,
      cpf,
      birth_date,
      admission_date,
      contract_type,
      job_title,
      department,
      base_salary,
      payment_method,
      status
    ) VALUES (
      r.company_id,
      r.user_id,
      r.full_name,
      r.email,
      r.email,
      v_cpf,
      '1970-01-01',           -- Provisório: nascimento a completar
      v_admission,            -- Data de admissão = data de criação da conta
      'CLT',                  -- Provisório: padrão CLT
      'Administrador',        -- Cargo funcional inicial
      'Administração',        -- Departamento inicial
      0.00,                   -- Provisório: salário a regularizar
      'Mensalista',           -- Forma de pagamento
      'ATIVO'
    );

    -- Conceder o papel 'colaborador' em user_roles (se ainda não tiver)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (r.user_id, 'colaborador')
    ON CONFLICT (user_id, role) DO NOTHING;

    v_count := v_count + 1;
    RAISE NOTICE 'Admin regularizado: user_id %, email %, company_id %', r.user_id, r.email, r.company_id;
  END LOOP;

  RAISE NOTICE 'Total de administradores regularizados: %', v_count;
END $$;
