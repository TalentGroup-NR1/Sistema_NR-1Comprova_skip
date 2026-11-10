import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCargos, useDepartamentos } from '@/hooks/useEstruturaConfig';
import type { DescricaoCargo } from '@/hooks/useDescricoesCargo';
import { generateDescricaoCargoPDF, loadImageAsDataUrl } from '@/lib/descricaoCargoPDF';
import { useDescricaoModelos } from '@/hooks/useDescricaoModelos';

/** Monta os dados e gera o PDF da descrição de cargo no layout institucional. */
export function useDescricaoCargoPdf(companyId: string | null) {
  const { data: cargos = [] } = useCargos(companyId);
  const { data: departamentos = [] } = useDepartamentos(companyId);
  const { data: modelos = [] } = useDescricaoModelos(companyId);
  const [gerando, setGerando] = useState(false);

  const gerar = useCallback(
    async (d: Partial<DescricaoCargo> & { responsabilidades?: string[] }) => {
      setGerando(true);
      try {
        let empresaNome: string | null = null;
        let logoDataUrl: string | null = null;

        if (companyId) {
          const { data: empresa } = await supabase
            .from('companies')
            .select('name, logo_url')
            .eq('id', companyId)
            .maybeSingle();
          empresaNome = empresa?.name ?? null;
          if (empresa?.logo_url) logoDataUrl = await loadImageAsDataUrl(empresa.logo_url);
        }

        const cargoNome = cargos.find((c) => c.id === d.cargo_id)?.nome ?? d.titulo ?? '';
        const areaNome = departamentos.find((x) => x.id === d.departamento_id)?.nome ?? null;
        const cbo = [d.cbo_codigo, d.cbo_descricao].filter(Boolean).join(' — ') || null;

        generateDescricaoCargoPDF({
          empresaNome,
          logoDataUrl,
          data: {
            funcao: cargoNome,
            area: areaNome,
            cbo,
            maturidade: d.maturidade ?? null,
            reporte: d.reporte ?? null,
            alocacao: d.alocacao ?? null,
            descricao_sumaria: d.descricao_sumaria ?? null,
            grupo_organizacional: d.grupo_organizacional ?? null,
            nivel_maturidade: d.nivel_maturidade ?? null,
            responsabilidades: d.responsabilidades ?? [],
            formacao_academica: d.formacao_academica ?? null,
            cursos_necessarios: d.cursos_necessarios ?? null,
            cursos_desejaveis: d.cursos_desejaveis ?? null,
            habilidades_comportamentais: d.habilidades_comportamentais ?? null,
            fator_experiencia: d.fator_experiencia ?? null,
            fator_complexidade: d.fator_complexidade ?? null,
            fator_responsabilidade_erros: d.fator_responsabilidade_erros ?? null,
            fator_responsabilidade_sigilo: d.fator_responsabilidade_sigilo ?? null,
            blocos: modelos.find((m) => m.id === d.modelo_id)?.blocos,
            valores: d.valores ?? {},
          },

        });
      } catch (e) {
        toast({
          title: 'Erro ao gerar PDF',
          description: e instanceof Error ? e.message : 'Tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setGerando(false);
      }
    },
    [companyId, cargos, departamentos, modelos],
  );

  return { gerar, gerando };
}
