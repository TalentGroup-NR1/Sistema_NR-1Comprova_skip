
-- 1. Add column to identify PDIs created by the collaborator
ALTER TABLE public.pdis ADD COLUMN created_by_colaborador BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Make gestor_id nullable so collaborator can create PDI without a gestor
ALTER TABLE public.pdis ALTER COLUMN gestor_id DROP NOT NULL;

-- 3. RLS: Allow collaborator to INSERT their own PDI
CREATE POLICY pdis_colaborador_insert ON public.pdis
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = pdis.colaborador_id
      AND c.user_id = auth.uid()
  )
  AND created_by_colaborador = true
);

-- 4. RLS: Allow collaborator to UPDATE PDIs they created
CREATE POLICY pdis_colaborador_update ON public.pdis
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = pdis.colaborador_id
      AND c.user_id = auth.uid()
  )
  AND created_by_colaborador = true
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = pdis.colaborador_id
      AND c.user_id = auth.uid()
  )
  AND created_by_colaborador = true
);

-- 5. RLS: Allow collaborator to INSERT items into PDIs they created
CREATE POLICY pdi_itens_colaborador_insert ON public.pdi_itens
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pdis pdi
    JOIN public.colaboradores c ON c.id = pdi.colaborador_id
    WHERE pdi.id = pdi_itens.pdi_id
      AND c.user_id = auth.uid()
      AND pdi.created_by_colaborador = true
  )
);

-- 6. Trigger: Notify collaborator when self-evaluation is completed, suggesting PDI creation
CREATE OR REPLACE FUNCTION public.notify_autoavaliacao_concluida_pdi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_ciclo_nome TEXT;
BEGIN
  IF NEW.status_autoavaliacao = 'concluida' AND OLD.status_autoavaliacao != 'concluida' THEN
    IF NOT EXISTS (SELECT 1 FROM pdis WHERE avaliacao_id = NEW.id) THEN
      SELECT c.user_id, c.company_id INTO v_user_id, v_company_id
      FROM colaboradores c WHERE c.id = NEW.colaborador_id;

      SELECT nome_ciclo INTO v_ciclo_nome
      FROM ciclos_avaliacao WHERE id = NEW.ciclo_id;

      IF v_user_id IS NOT NULL THEN
        INSERT INTO notifications (company_id, user_id, type, title, message, action_url, entity_type, entity_id, priority)
        VALUES (
          v_company_id, v_user_id, 'pdi', 'Crie seu PDI',
          'Sua autoavaliação do ciclo "' || COALESCE(v_ciclo_nome, 'Avaliação') || '" foi concluída. Crie seu Plano de Desenvolvimento Individual.',
          '/avaliacoes', 'pdi', NEW.id, 'normal'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_autoavaliacao_concluida_pdi
AFTER UPDATE ON public.avaliacoes
FOR EACH ROW
EXECUTE FUNCTION public.notify_autoavaliacao_concluida_pdi();
