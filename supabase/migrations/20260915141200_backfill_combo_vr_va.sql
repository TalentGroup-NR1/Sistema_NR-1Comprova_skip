BEGIN;
  SET LOCAL ROLE postgres;
  
  -- Backfill para todos os Departamentos distintos da Horizonte Contabilidade
  INSERT INTO public.beneficios_departamento (beneficio_id, departamento, company_id)
  SELECT DISTINCT 
    'd38d9c92-92a3-40c0-a0e9-47e6b4c0f7d7'::uuid, 
    department, 
    '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4'::uuid
  FROM public.colaboradores
  WHERE company_id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4' 
    AND department IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.beneficios_departamento bd
      WHERE bd.beneficio_id = 'd38d9c92-92a3-40c0-a0e9-47e6b4c0f7d7'::uuid
        AND bd.departamento = public.colaboradores.department
        AND bd.company_id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4'::uuid
    );
  
  -- Backfill para todos os Tipos de Contrato distintos
  INSERT INTO public.beneficios_tipo_contrato (beneficio_id, tipo_contrato, company_id)
  SELECT DISTINCT 
    'd38d9c92-92a3-40c0-a0e9-47e6b4c0f7d7'::uuid, 
    contract_type, 
    '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4'::uuid
  FROM public.colaboradores
  WHERE company_id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4' 
    AND contract_type IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.beneficios_tipo_contrato btc
      WHERE btc.beneficio_id = 'd38d9c92-92a3-40c0-a0e9-47e6b4c0f7d7'::uuid
        AND btc.tipo_contrato = public.colaboradores.contract_type
        AND btc.company_id = '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4'::uuid
    );

COMMIT;
