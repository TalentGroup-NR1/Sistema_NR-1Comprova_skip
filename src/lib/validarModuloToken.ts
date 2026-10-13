import { supabase } from '@/integrations/supabase/client';

interface ValidarModuloTokenParams {
  token?: string;
  companyId?: string | null;
  slug?: string;
  tabelaOrigem?: 'cuidar_mais' | 'feedback' | 'avaliacao';
}

/**
 * Valida se o módulo correspondente da empresa emissora do token está habilitado.
 * Retorna true se estiver habilitado, ou false se o módulo estiver explicitamente desligado.
 */
export async function verificarModuloTokenAtivo(
  moduleKey: string,
  params: ValidarModuloTokenParams
): Promise<boolean> {
  try {
    let companyId = params.companyId;

    // 1. Se slug foi fornecido, busca o id da empresa correspondente
    if (!companyId && params.slug) {
      const { data } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', params.slug)
        .maybeSingle();
      if (data?.id) {
        companyId = data.id;
      }
    }

    // 2. Se temos token e tabela de origem, tenta resolver company_id
    if (!companyId && params.token && params.tabelaOrigem) {
      try {
        if (params.tabelaOrigem === 'cuidar_mais') {
          const { data } = await supabase
            .from('envios_cuidar_plus')
            .select('questionarios_cuidar_plus(company_id)')
            .eq('token', params.token)
            .maybeSingle();
          const raw = data as any;
          if (raw?.questionarios_cuidar_plus?.company_id) {
            companyId = raw.questionarios_cuidar_plus.company_id;
          }
        } else if (params.tabelaOrigem === 'feedback') {
          const { data } = await supabase
            .from('feedback_cycles')
            .select('company_id')
            .or(`collaborator_token.eq.${params.token},gestor_token.eq.${params.token}`)
            .maybeSingle();
          if (data?.company_id) {
            companyId = data.company_id;
          }
        } else if (params.tabelaOrigem === 'avaliacao') {
          const { data } = await supabase
            .from('avaliacao_links')
            .select('avaliacoes(ciclos_avaliacao(company_id))')
            .eq('token', params.token)
            .maybeSingle();
          const raw = data as any;
          if (raw?.avaliacoes?.ciclos_avaliacao?.company_id) {
            companyId = raw.avaliacoes.ciclos_avaliacao.company_id;
          }
        }
      } catch {
        // Ignora erros de permissão de RLS na resolução de company_id
      }
    }

    // 3. Se identificou a empresa, invoca a RPC is_module_enabled criada no banco
    if (companyId) {
      const { data: isEnabled, error } = await supabase.rpc('is_module_enabled', {
        p_company_id: companyId,
        p_module_key: moduleKey,
      });

      if (!error && typeof isEnabled === 'boolean') {
        return isEnabled;
      }
    }

    // Fallback: se não tiver empresa identificada, não bloqueia preventivamente
    return true;
  } catch (error) {
    console.warn('[verificarModuloTokenAtivo] Falha ao consultar módulo:', error);
    return true;
  }
}

/**
 * Verifica se um erro do banco foi causado pelo guard trigger de módulo desativado
 */
export function isErroModuloDesativado(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.details || '').toLowerCase();
  return (
    msg.includes('não está contratado') ||
    msg.includes('modulo bloqueado') ||
    msg.includes('módulo desativado') ||
    err.code === 'P0001'
  );
}
