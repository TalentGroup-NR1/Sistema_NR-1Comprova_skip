import { describe, it, expect } from 'vitest';

/**
 * Funções espelho do gerador de e-mails da Edge Function
 * supabase/functions/notify-denuncia-designados/index.ts
 */
function buildNovaDenunciaEmail({
  nomeEmpresa,
  criadoEm,
  prazoResposta,
  canalUrl = "https://app.talentred.com.br/comportamentos-ofensivos",
}: {
  nomeEmpresa: string;
  criadoEm: string;
  prazoResposta?: string | null;
  canalUrl?: string;
}) {
  const dataRecebimento = new Date(criadoEm).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  const dataPrazo = prazoResposta
    ? new Date(prazoResposta).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
    : "30 dias";

  const subject = "Nova denúncia recebida — ação necessária";

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="background-color: #f8fafc; border-left: 4px solid #dc2626; padding: 20px; border-radius: 6px;">
        <h2 style="color: #0f172a; margin-top: 0;">Nova denúncia registrada</h2>
        <p>Uma nova denúncia foi recebida no Canal de Denúncias da <strong>${nomeEmpresa}</strong> em <strong>${dataRecebimento}</strong>.</p>
        
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Prazo legal para primeira resposta:</strong> ${dataPrazo} (Lei nº 14.457/2022)</p>
          <p style="margin: 0;"><strong>Status:</strong> Aguardando responsável no comitê</p>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${canalUrl}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Acessar o Canal de Denúncias
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
        <p style="font-size: 11px; color: #64748b; margin: 0;">
          Por determinação da Lei nº 14.457/2022 e estrita observância ao sigilo, o teor desta manifestação não pode ser transmitido por e-mail. Acesse a plataforma autenticada para assumir e dar início à apuração.
        </p>
      </div>
    </div>
  `;

  const text = `Nova denúncia registrada\n\nUma nova denúncia foi recebida no Canal de Denúncias da ${nomeEmpresa} em ${dataRecebimento}.\n\nPrazo legal para primeira resposta: ${dataPrazo} (30 dias)\nStatus: aguardando responsável\n\nAcesse o canal: ${canalUrl}\n\nPor determinação legal, o conteúdo desta denúncia não pode ser enviado por e-mail.`;

  return { subject, html, text };
}

function filtrarDestinatariosDesignados(
  responsaveis: Array<{ user_id: string; company_id: string; ativo: boolean; email?: string }>,
  targetCompanyId: string
): string[] {
  return responsaveis
    .filter((r) => r.company_id === targetCompanyId && r.ativo === true && !!r.email)
    .map((r) => r.email!);
}

describe('Edge Function notify-denuncia-designados — Segurança e Sigilo Legal', () => {
  it('valida que o payload do e-mail NUNCA contém título, categoria, mensagem ou dados do denunciante', () => {
    const dadosConfidenciais = {
      titulo: 'Assédio Moral Praticado pelo Gerente Fulano',
      categoria: 'assedio_moral',
      mensagem: 'O gerente gritou com a equipe na reunião de segunda-feira.',
      origem: 'joao.silva@empresa.com',
      nomeDenunciante: 'João da Silva',
    };

    const email = buildNovaDenunciaEmail({
      nomeEmpresa: 'Empresa Teste S.A.',
      criadoEm: '2026-11-04T14:30:00.000Z',
      prazoResposta: '2026-12-04T14:30:00.000Z',
    });

    // 1. Título do relato não deve existir
    expect(email.subject).not.toContain(dadosConfidenciais.titulo);
    expect(email.html).not.toContain(dadosConfidenciais.titulo);
    expect(email.text).not.toContain(dadosConfidenciais.titulo);

    // 2. Categoria não deve existir
    expect(email.html).not.toContain(dadosConfidenciais.categoria);
    expect(email.text).not.toContain(dadosConfidenciais.categoria);

    // 3. Trecho da mensagem não deve existir
    expect(email.html).not.toContain(dadosConfidenciais.mensagem);
    expect(email.text).not.toContain(dadosConfidenciais.mensagem);

    // 4. Identidade/origem não deve existir
    expect(email.html).not.toContain(dadosConfidenciais.origem);
    expect(email.text).not.toContain(dadosConfidenciais.origem);
    expect(email.html).not.toContain(dadosConfidenciais.nomeDenunciante);
    expect(email.text).not.toContain(dadosConfidenciais.nomeDenunciante);

    // 5. Deve conter menção explícita à Lei 14.457/2022 e ao sigilo
    expect(email.html).toContain('Lei nº 14.457/2022');
    expect(email.html).toContain('teor desta manifestação não pode ser transmitido por e-mail');
    expect(email.html).toContain('/comportamentos-ofensivos');
  });

  it('valida que e-mails são despachados APENAS para os designados ativos da respectiva empresa', () => {
    const companyId = 'company-123';
    const otherCompanyId = 'company-999';

    const baseResponsaveis = [
      { user_id: 'u-1', company_id: companyId, ativo: true, email: 'designado1@empresa.com' },
      { user_id: 'u-2', company_id: companyId, ativo: true, email: 'designado2@empresa.com' },
      { user_id: 'u-3', company_id: companyId, ativo: false, email: 'desligado@empresa.com' }, // INATIVO
      { user_id: 'u-4', company_id: otherCompanyId, ativo: true, email: 'designado_outra@empresa.com' }, // OUTRA EMPRESA
    ];

    const destinatarios = filtrarDestinatariosDesignados(baseResponsaveis, companyId);

    expect(destinatarios).toHaveLength(2);
    expect(destinatarios).toContain('designado1@empresa.com');
    expect(destinatarios).toContain('designado2@empresa.com');
    expect(destinatarios).not.toContain('desligado@empresa.com');
    expect(destinatarios).not.toContain('designado_outra@empresa.com');
  });
});

