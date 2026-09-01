// Consolidação das respostas do questionário do colaborador na descrição de cargo.

import {
  atividadesToResponsabilidades,
  respostaToTexto,
  type QSecao,
} from './questionarioCargo';
import type { DCampo } from './descricaoModelo';

export interface ImportPatch {
  descricao_sumaria?: string;
  responsabilidades?: string[];
  formacao_academica?: string;
  cursos_necessarios?: string;
  cursos_desejaveis?: string;
  fator_experiencia?: string;
  fator_responsabilidade_sigilo?: string;
  fator_responsabilidade_erros?: string;
  habilidades_comportamentais?: string;
  /** Valores de campos personalizados do modelo, indexados por id do campo. */
  valores?: Record<string, unknown>;
}

/** Monta o patch da descrição a partir de um conjunto de respostas (pergunta_id -> valor). */
export function construirPatch(
  secoes: QSecao[],
  campos: Record<string, DCampo>,
  respostas: Record<string, unknown>,
): ImportPatch {
  const patch: ImportPatch = {};
  const valores: Record<string, unknown> = {};

  secoes
    .flatMap((s) => s.perguntas)
    .forEach((p) => {
      const valor = respostas[p.id];
      if (valor == null || valor === '') return;

      // Quando o questionário espelha o modelo da descrição, a pergunta tem o
      // mesmo id do campo — o destino vem do próprio campo.
      const campo = campos[p.id];
      const destino = p.mapeamento ?? campo?.campo_fixo ?? null;

      if (!destino) {
        if (campo) {
          valores[campo.id] =
            campo.tipo === 'lista' || campo.tipo === 'atividades'
              ? p.tipo === 'atividades'
                ? atividadesToResponsabilidades(valor)
                : String(valor)
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean)
              : respostaToTexto(p, valor);
        }
        return;
      }

      if (destino === 'responsabilidades') {
        const itens =
          p.tipo === 'atividades'
            ? atividadesToResponsabilidades(valor)
            : String(valor)
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
        if (itens.length > 0) patch.responsabilidades = itens;
        return;
      }
      const texto = respostaToTexto(p, valor);
      if (texto) (patch as Record<string, unknown>)[destino] = texto;
    });

  if (Object.keys(valores).length > 0) patch.valores = valores;
  return patch;
}

/**
 * Mescla os valores escolhidos de vários colaboradores para uma mesma pergunta.
 * Blocos de atividades são concatenados; textos são unidos em linhas separadas.
 */
export function mesclarValores(tipo: string, valores: unknown[]): unknown {
  const limpos = valores.filter((v) => v != null && v !== '');
  if (limpos.length === 0) return null;
  if (limpos.length === 1) return limpos[0];
  if (tipo === 'atividades') {
    return limpos.flatMap((v) => (Array.isArray(v) ? v : []));
  }
  return limpos
    .map((v) => (Array.isArray(v) ? v.join(', ') : String(v)))
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
}
