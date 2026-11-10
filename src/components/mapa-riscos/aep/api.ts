import { supabase } from "@/integrations/supabase/client";

/**
 * Regra de negócio aprovada para classificação de Não-Conformidade (NC):
 * 1. resposta_valor === 'NC'
 * 2. resposta_valor === 'NA' SEM observacao_especifica
 * 3. tipo_resposta === 'TEXTO' E obrigatória SEM observacao_especifica
 */
export function isNaoConforme(
  respostaValor: string | null | undefined, 
  observacaoEspecifica: string | null | undefined, 
  tipoResposta: string, 
  obrigatoria: boolean
): boolean {
  if (respostaValor === 'NC') return true;
  
  const hasObservacao = !!observacaoEspecifica && observacaoEspecifica.trim().length > 0;
  
  if (respostaValor === 'NA' && !hasObservacao) return true;
  
  if (tipoResposta === 'TEXTO' && obrigatoria && !hasObservacao) return true;

  return false;
}

export type ChecklistTemplate = {
  id: string;
  company_id: string | null;
  is_official: boolean;
  nome: string;
  descricao: string | null;
  created_at: string;
  updated_at: string;
  // Extras
  secoes?: { id: string }[];
  perguntas?: { id: string }[];
};

export type ChecklistSecao = {
  id: string;
  company_id: string;
  template_id: string;
  nome: string;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type ChecklistPergunta = {
  id: string;
  company_id: string;
  secao_id: string;
  texto: string;
  texto_pergunta?: string | null;
  codigo_verificacao?: string | null;
  referencia_legal: string | null;
  perigo_associado_id: string | null;
  tipo_resposta?: string;
  permite_foto?: boolean;
  obrigatoria?: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type SecaoComPerguntas = ChecklistSecao & {
  perguntas: (ChecklistPergunta & {
    nr1_riscos_catalogo?: {
      nome: string;
      categoria: string;
    } | null;
  })[];
};

export type TemplateCompleto = ChecklistTemplate & {
  secoes: SecaoComPerguntas[];
};

export const getTemplates = async (companyId: string | null): Promise<ChecklistTemplate[]> => {
  // A listagem de templates filtra por oficial = true OU company_id do usuário.
  // Evitamos sintaxes inválidas de join que possam causar Bad Request.
  let query = supabase
    .from('checklist_templates')
    .select(`
      id, nome, descricao, is_official, company_id, created_at, updated_at,
      secoes:checklist_secoes(
        id,
        perguntas:checklist_perguntas(id)
      )
    `);

  if (companyId && companyId !== 'undefined' && companyId !== 'null') {
    query = query.or(`is_official.eq.true,company_id.eq.${companyId}`);
  } else {
    query = query.eq('is_official', true);
  }

  const url = (query as any).url?.toString() || 'URL indisponível diretamente no objeto query';
  console.log('REQ URL:', url);

  const { data, error } = await query
    .order('is_official', { ascending: false })
    .order('nome', { ascending: true });

  console.log('getTemplates result', data, error);

  if (error) {
    console.error("Erro ao buscar templates:", error);
    return [];
  }

  return data.map(item => {
    let totalPerguntas = 0;
    if (item.secoes) {
       item.secoes.forEach((s: any) => {
         if (s.perguntas) totalPerguntas += s.perguntas.length;
       });
    }
    return {
      ...item,
      total_secoes: item.secoes?.length || 0,
      total_perguntas: totalPerguntas
    };
  }) as any;
};

export const getTemplateCompleto = async (templateId: string): Promise<TemplateCompleto | null> => {
  const { data: template, error: templateError } = await supabase
    .from('checklist_templates')
    .select(`
      id, nome, descricao, is_official, company_id, created_at, updated_at,
      secoes:checklist_secoes(
        id, company_id, template_id, nome, ordem, created_at, updated_at,
        perguntas:checklist_perguntas(
          id, company_id, secao_id, texto, texto_pergunta, codigo_verificacao, referencia_legal, perigo_associado_id, tipo_resposta, permite_foto, obrigatoria, ordem, created_at, updated_at,
          nr1_riscos_catalogo(nome, categoria)
        )
      )
    `)
    .eq('id', templateId)
    .single();

  if (templateError || !template) {
    console.error("Erro ao buscar template:", templateError);
    return null;
  }

  const templateFormatado = template as any;
  templateFormatado.secoes.sort((a: any, b: any) => a.ordem - b.ordem);
  templateFormatado.secoes.forEach((s: any) => {
    if (s.perguntas) {
      s.perguntas.sort((a: any, b: any) => a.ordem - b.ordem);
    }
  });

  return templateFormatado as TemplateCompleto;
};

export const clonarTemplateOficial = async (templateId: string, companyId: string): Promise<boolean> => {
  try {
    if (!companyId) {
      console.error("Usuário sem company_id");
      return false;
    }

    // Busca o original
    const { data: originalData, error: originalError } = await supabase
      .from('checklist_templates')
      .select('nome, descricao, secoes:checklist_secoes(nome, ordem, perguntas:checklist_perguntas(texto, texto_pergunta, codigo_verificacao, referencia_legal, perigo_associado_id, ordem, tipo_resposta, permite_foto, obrigatoria))')
      .eq('id', templateId)
      .single();

    if (originalError || !originalData) {
      console.error("Erro ao buscar original:", originalError);
      return false;
    }

    const { secoes, ...templateCore } = originalData as any;

    // 1. Cria novo template
    const novoTemplate = {
      ...templateCore,
      company_id: companyId,
      is_official: false,
      nome: `${templateCore.nome} (Cópia)`
    };

    const { data: insertedTemplate, error: tError } = await supabase
      .from('checklist_templates')
      .insert(novoTemplate)
      .select('id')
      .single();

    if (tError || !insertedTemplate) {
      console.error("Erro ao inserir template:", tError);
      return false;
    }

    const newTemplateId = insertedTemplate.id;

    // 2. Insere seções
    if (secoes && secoes.length > 0) {
      for (const sec of secoes) {
        const secData = {
          template_id: newTemplateId,
          nome: sec.nome,
          ordem: sec.ordem
        };

        const { data: insertedSec, error: sError } = await supabase
          .from('checklist_secoes')
          .insert(secData)
          .select('id')
          .single();

        if (sError) {
          console.error("Erro ao inserir seção:", sError);
          continue; // tenta as outras
        }

        // 3. Insere perguntas
        const perguntas = sec.perguntas;
        if (perguntas && perguntas.length > 0) {
          const perguntasData = perguntas.map((p: any) => ({
            secao_id: insertedSec.id,
            texto: p.texto,
            texto_pergunta: p.texto_pergunta,
            codigo_verificacao: p.codigo_verificacao,
            referencia_legal: p.referencia_legal,
            perigo_associado_id: p.perigo_associado_id,
            ordem: p.ordem,
            tipo_resposta: p.tipo_resposta,
            permite_foto: p.permite_foto,
            obrigatoria: p.obrigatoria
          }));

          const { error: pError } = await supabase
            .from('checklist_perguntas')
            .insert(perguntasData);

          if (pError) console.error("Erro ao inserir perguntas:", pError);
        }
      }
    }

    return true;
  } catch (err) {
    console.error("Erro inesperado no clone:", err);
    return false;
  }
};

// Funções de Persistência do Editor
export const salvarEdicoesTemplate = async (
  templateId: string, 
  secoesAtualizadas: any[], 
  secoesOriginais: any[],
  companyId: string
): Promise<boolean> => {
  const rollbacks: (() => Promise<void>)[] = [];

  const sanitizeSecao = (s: any) => {
    // Pegar apenas campos do DB
    const { id, template_id, nome, ordem } = s;
    return { id, template_id, nome, ordem, company_id: companyId };
  };

  const sanitizePergunta = (p: any) => {
    // Pegar apenas campos do DB e evitar objetos relacionais
    const { 
      id, secao_id, texto, texto_pergunta, codigo_verificacao, 
      referencia_legal, perigo_associado_id, ordem, 
      tipo_resposta, permite_foto, obrigatoria 
    } = p;
    
    return {
      id, 
      secao_id, 
      texto: texto || texto_pergunta || 'Sem texto', 
      texto_pergunta, 
      codigo_verificacao,
      referencia_legal: referencia_legal || null,
      perigo_associado_id: perigo_associado_id || null,
      ordem,
      tipo_resposta: tipo_resposta || 'SIM_NAO',
      permite_foto,
      obrigatoria,
      company_id: companyId
    };
  };

  try {
    // Organizar as operações
    const secoesParaDeletar = secoesAtualizadas.filter(s => s.isDeleted && !s.isNew);
    const secoesParaInserir = secoesAtualizadas.filter(s => s.isNew && !s.isDeleted);
    const secoesParaAtualizar = secoesAtualizadas.filter(s => s.isDirty && !s.isNew && !s.isDeleted);

    const perguntasArray = secoesAtualizadas.flatMap(s => s.perguntas || []);
    const perguntasParaDeletar = perguntasArray.filter(p => p.isDeleted && !p.isNew);
    const perguntasParaInserir = perguntasArray.filter(p => p.isNew && !p.isDeleted);
    const perguntasParaAtualizar = perguntasArray.filter(p => p.isDirty && !p.isNew && !p.isDeleted);

    console.log("Iniciando transação simulada...");

    // 1. Deletar perguntas
    for (const p of perguntasParaDeletar) {
      console.log("Deletando pergunta:", p.id);
      const { error } = await supabase.from('checklist_perguntas').delete().eq('id', p.id);
      if (error) throw error;
      const originalP = secoesOriginais.flatMap(s => s.perguntas).find(op => op.id === p.id);
      if (originalP) rollbacks.push(async () => { await supabase.from('checklist_perguntas').insert(sanitizePergunta(originalP)); });
    }

    // 2. Deletar seções
    for (const s of secoesParaDeletar) {
      console.log("Deletando seção:", s.id);
      const { error } = await supabase.from('checklist_secoes').delete().eq('id', s.id);
      if (error) throw error;
      const originalS = secoesOriginais.find(os => os.id === s.id);
      if (originalS) rollbacks.push(async () => { await supabase.from('checklist_secoes').insert(sanitizeSecao(originalS)); });
    }

    // 3. Inserir seções
    const idMap: Record<string, string> = {}; // mapeia tempId para realId

    for (const s of secoesParaInserir) {
      const { id: tempId, ...secData } = sanitizeSecao(s);
      
      console.log("Inserindo seção (payload completo):", secData);
      
      const { data: insertedSec, error } = await supabase
        .from('checklist_secoes')
        .insert(secData)
        .select('id')
        .single();
        
      if (error || !insertedSec) throw error;
      
      idMap[tempId] = insertedSec.id;
      
      rollbacks.push(async () => { await supabase.from('checklist_secoes').delete().eq('id', insertedSec.id); });
    }

    // 4. Inserir perguntas
    for (const p of perguntasParaInserir) {
      const { id: tempId, ...pergData } = sanitizePergunta(p);
      
      // Resolve o id da seção se foi inserida nesta mesma transação
      if (idMap[pergData.secao_id]) {
        pergData.secao_id = idMap[pergData.secao_id];
      }

      console.log("Inserindo pergunta (payload completo):", pergData);

      const { data: insertedPerg, error } = await supabase
        .from('checklist_perguntas')
        .insert(pergData)
        .select('id')
        .single();
        
      if (error || !insertedPerg) throw error;
      
      rollbacks.push(async () => { await supabase.from('checklist_perguntas').delete().eq('id', insertedPerg.id); });
    }

    // 5. Atualizar seções
    for (const s of secoesParaAtualizar) {
      console.log("Atualizando seção:", s.id);
      const secData = sanitizeSecao(s);
      const { error } = await supabase.from('checklist_secoes').update(secData).eq('id', s.id);
      if (error) throw error;
      const originalS = secoesOriginais.find(os => os.id === s.id);
      if (originalS) rollbacks.push(async () => { await supabase.from('checklist_secoes').update(sanitizeSecao(originalS)).eq('id', s.id); });
    }

    // 6. Atualizar perguntas
    for (const p of perguntasParaAtualizar) {
      console.log("Atualizando pergunta:", p.id);
      const pergData = sanitizePergunta(p);
      const { error } = await supabase.from('checklist_perguntas').update(pergData).eq('id', p.id);
      if (error) throw error;
      const originalP = secoesOriginais.flatMap(s => s.perguntas).find(op => op.id === p.id);
      if (originalP) rollbacks.push(async () => { await supabase.from('checklist_perguntas').update(sanitizePergunta(originalP)).eq('id', p.id); });
    }

    console.log("Salvamento concluído com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro na persistência, executando ROLLBACK...", error);
    for (const rollbackFn of rollbacks.reverse()) {
      try {
        await rollbackFn();
      } catch (rbError) {
        console.error("Falha no rollback!", rbError);
      }
    }
    return false;
  }
};

/**
 * Retorna os dados de uma aplicação concluída de checklist, navegando de volta
 * até o template original através do relacionamento:
 * checklist_respostas -> checklist_perguntas -> checklist_secoes -> checklist_templates
 */
export async function getAplicacaoConcluida(aplicacaoId: string) {
  const { data, error } = await supabase
    .from('checklist_aplicacoes')
    .select(`
      id,
      status,
      tipo_aplicacao,
      ghe_id,
      posto_trabalho,
      created_at,
      respostas:checklist_respostas (
        id,
        resposta_valor,
        observacao_especifica,
        fotos:checklist_fotos (id, url_foto),
        pergunta:checklist_perguntas (
          id,
          texto,
          texto_pergunta,
          codigo_verificacao,
          referencia_legal,
          tipo_resposta,
          obrigatoria,
          perigo:nr1_riscos_catalogo ( id, nome, categoria ),
          secao:checklist_secoes (
            id,
            nome,
            template:checklist_templates (
              id,
              nome
            )
          )
        )
      )
    `)
    .eq('id', aplicacaoId)
    .single();

  if (error) {
    console.error("Erro ao buscar aplicação concluída:", error);
    return null;
  }
  return data;
}

export async function getAplicacoesConcluidasList(companyId: string) {
  const { data, error } = await supabase
    .from('checklist_aplicacoes')
    .select(`
      id,
      status,
      tipo_aplicacao,
      ghe_id,
      posto_trabalho,
      created_at,
      respostas:checklist_respostas (
        id,
        resposta_valor,
        observacao_especifica,
        pergunta:checklist_perguntas (
          id,
          tipo_resposta,
          obrigatoria
        )
      )
    `)
    .eq('company_id', companyId)
    .eq('status', 'concluido')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar lista de aplicações:", error);
    return [];
  }
  return data || [];
}

/**
 * Persistência atômica da aplicação com suas respostas e fotos
 */
export async function finalizarAplicacao(
  aplicacaoId: string, 
  companyId: string,
  respostas: Record<string, { resposta_valor?: string, observacao_especifica?: string, foto_path?: string }>
) {
  const rollbacks: Array<() => Promise<void>> = [];

  try {
    // Busca dados da aplicação para o gatilho
    const { data: aplicacao, error: appError } = await supabase
      .from('checklist_aplicacoes')
      .select('tipo_aplicacao, ghe_id')
      .eq('id', aplicacaoId)
      .single();
    if (appError) throw appError;

    // Busca dados das perguntas para avaliar regras de NC
    const perguntaIds = Object.keys(respostas);
    const { data: perguntasData, error: pergError } = await supabase
      .from('checklist_perguntas')
      .select('id, perigo_associado_id, tipo_resposta, obrigatoria')
      .in('id', perguntaIds);
    if (pergError) throw pergError;

    const categoriasValidas = ['fisico', 'quimico', 'biologico', 'ergonomico', 'psicossocial', 'acidente'];

    for (const [perguntaId, draft] of Object.entries(respostas)) {
      // Mapping SIM_NAO -> C/NC
      let val = draft.resposta_valor;
      if (val === 'Sim') val = 'C';
      if (val === 'Não') val = 'NC';
      
      const isTexto = !['C', 'NC', 'NA'].includes(val || '');
      const dbVal = isTexto ? null : val;

      console.log(`Inserindo resposta para pergunta ${perguntaId}:`, { resposta_valor: dbVal, observacao_especifica: draft.observacao_especifica });
      const { data: respostaData, error: respostaError } = await supabase
        .from('checklist_respostas')
        .insert({
          aplicacao_id: aplicacaoId,
          pergunta_id: perguntaId,
          resposta_valor: dbVal,
          observacao_especifica: draft.observacao_especifica,
          company_id: companyId
        })
        .select('id')
        .single();
        
      if (respostaError) throw respostaError;
      
      const respostaId = respostaData.id;
      rollbacks.push(async () => {
        await supabase.from('checklist_respostas').delete().eq('id', respostaId);
      });

      // Insert foto se existir
      if (draft.foto_path) {
        console.log(`Inserindo foto para resposta ${respostaId}:`, draft.foto_path);
        const { data: fotoData, error: fotoError } = await supabase
          .from('checklist_fotos')
          .insert({
            resposta_id: respostaId,
            url_foto: draft.foto_path,
            company_id: companyId
          })
          .select('id')
          .single();
          
        if (fotoError) throw fotoError;
        rollbacks.push(async () => {
          await supabase.from('checklist_fotos').delete().eq('id', fotoData.id);
        });
      }

      // -- INÍCIO: GATILHO DA MATRIZ --
      const p = perguntasData?.find(x => x.id === perguntaId);
      if (p && isNaoConforme(dbVal, draft.observacao_especifica, p.tipo_resposta, p.obrigatoria)) {
        if (aplicacao.tipo_aplicacao === 'ghe' && aplicacao.ghe_id && p.perigo_associado_id) {
          
          // Anti-duplicação
          const { data: existe } = await supabase
            .from('nr1_ghe_riscos')
            .select('id')
            .eq('ghe_id', aplicacao.ghe_id)
            .eq('risco_id', p.perigo_associado_id)
            .eq('fonte', 'automatico')
            .maybeSingle();

          if (!existe) {
            // Buscar catálogo
            const { data: catalogo } = await supabase
              .from('nr1_riscos_catalogo')
              .select('id, nome, categoria')
              .eq('id', p.perigo_associado_id)
              .single();

            if (catalogo) {
              const catNorm = catalogo.categoria.toLowerCase().trim();
              if (categoriasValidas.includes(catNorm)) {
                console.log(`Gatilho Matriz: Inserindo NC automático para ${catalogo.nome}...`);
                const { data: matrizData, error: matrizError } = await supabase
                  .from('nr1_ghe_riscos')
                  .insert({
                    company_id: companyId,
                    ghe_id: aplicacao.ghe_id,
                    risco_id: p.perigo_associado_id,
                    nome_risco: catalogo.nome,
                    categoria: catNorm,
                    probabilidade: 1,
                    severidade: 1,
                    fonte: 'automatico',
                    ativo: true
                  })
                  .select('id')
                  .single();

                if (matrizError) throw matrizError;
                
                rollbacks.push(async () => {
                  await supabase.from('nr1_ghe_riscos').delete().eq('id', matrizData.id);
                });
              } else {
                console.warn(`Gatilho abortado: categoria '${catNorm}' inválida no catálogo para risco_id=${p.perigo_associado_id}`);
              }
            }
          } else {
            console.log(`Gatilho Matriz: Risco automático já existe para ghe_id=${aplicacao.ghe_id}, risco_id=${p.perigo_associado_id}. Ignorando.`);
          }
        } else if (aplicacao.tipo_aplicacao === 'posto') {
          console.log(`NC encontrada na pergunta ${perguntaId}, mas aplicação é Posto. Gatilho ignorado.`);
        }
      }
      // -- FIM: GATILHO DA MATRIZ --
    }

    console.log(`Atualizando status da aplicação ${aplicacaoId} para concluido`);
    const { error: aplicacaoError } = await supabase
      .from('checklist_aplicacoes')
      .update({ status: 'concluido' })
      .eq('id', aplicacaoId);
      
    if (aplicacaoError) throw aplicacaoError;
    // Não precisa rollback de aplicacao_id porque é o commit final
    
    return true;
  } catch (error) {
    console.error("Erro ao salvar aplicação, realizando rollback...", error);
    for (const rollback of rollbacks.reverse()) {
      try {
        await rollback();
      } catch (e) {
        console.error("Erro no rollback:", e);
      }
    }
    throw error; // Re-throw para o frontend exibir toast
  }
}
