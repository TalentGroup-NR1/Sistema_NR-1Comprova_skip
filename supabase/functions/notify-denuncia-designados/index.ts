import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_APP_ORIGINS = [
  "https://nr1pronto.com.br",
  "https://www.nr1pronto.com.br",
  "https://app.talentred.com.br",
  "http://localhost:5173",
  "http://localhost:8080",
];
const DEFAULT_APP_ORIGIN =
  Deno.env.get("APP_ORIGIN") && ALLOWED_APP_ORIGINS.includes(Deno.env.get("APP_ORIGIN")!)
    ? Deno.env.get("APP_ORIGIN")!
    : ALLOWED_APP_ORIGINS[0];

interface RequestPayload {
  denuncia_id?: string;
  mode?: "nova_denuncia" | "check_prazos";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let payload: RequestPayload = {};
    if (req.method === "POST") {
      try {
        payload = await req.json();
      } catch {
        payload = {};
      }
    }

    const mode = payload.mode || (payload.denuncia_id ? "nova_denuncia" : "check_prazos");

    // ========================================================
    // MODO 1: NOTIFICAR NOVA DENÚNCIA
    // ========================================================
    if (mode === "nova_denuncia") {
      let query = adminClient
        .from("denuncias")
        .select("id, company_id, criado_em, prazo_primeira_resposta, alerta_email_enviado_em")
        .is("alerta_email_enviado_em", null);

      if (payload.denuncia_id) {
        query = query.eq("id", payload.denuncia_id);
      } else {
        query = query.order("criado_em", { ascending: false }).limit(10);
      }

      const { data: denunciasPendentes, error: errDenuncias } = await query;
      if (errDenuncias) throw errDenuncias;

      const resultados: any[] = [];

      for (const denuncia of denunciasPendentes ?? []) {
        // Idempotência
        if (denuncia.alerta_email_enviado_em) continue;

        // Busca nome da empresa
        const { data: company } = await adminClient
          .from("companies")
          .select("name")
          .eq("id", denuncia.company_id)
          .single();

        const nomeEmpresa = company?.name || "Sua Empresa";

        // Busca designados ativos da empresa
        const { data: responsaveis, error: errResp } = await adminClient
          .from("denuncias_responsaveis")
          .select("user_id")
          .eq("company_id", denuncia.company_id)
          .eq("ativo", true);

        if (errResp) {
          console.error(`Erro ao buscar responsáveis da empresa ${denuncia.company_id}:`, errResp);
          continue;
        }

        const userIds = (responsaveis ?? []).map((r) => r.user_id);
        if (userIds.length === 0) {
          console.warn(`Empresa ${denuncia.company_id} não possui responsáveis ativos designados.`);
          continue;
        }

        // Obtém e-mails dos usuários designados
        const emails: string[] = [];
        for (const uid of userIds) {
          const { data: userData } = await adminClient.auth.admin.getUserById(uid);
          if (userData?.user?.email) {
            emails.push(userData.user.email);
          }
        }

        if (emails.length === 0) continue;

        const dataRecebimento = new Date(denuncia.criado_em).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        });
        const dataPrazo = denuncia.prazo_primeira_resposta
          ? new Date(denuncia.prazo_primeira_resposta).toLocaleDateString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })
          : "30 dias";

        const subject = "Nova denúncia recebida — ação necessária";
        const canalUrl = `${DEFAULT_APP_ORIGIN}/comportamentos-ofensivos`;

        // CORPO SEGURO: NENHUM DADO SENSÍVEL DA DENÚNCIA
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

        try {
          await sendEmail({
            to: emails,
            subject,
            html,
            text,
          });

          await adminClient
            .from("denuncias")
            .update({ alerta_email_enviado_em: new Date().toISOString() })
            .eq("id", denuncia.id);

          resultados.push({ denuncia_id: denuncia.id, sent_to: emails });
        } catch (err: any) {
          console.error(`Falha no envio de e-mail para denúncia ${denuncia.id}:`, err);
          resultados.push({ denuncia_id: denuncia.id, error: err?.message });
        }
      }

      return new Response(JSON.stringify({ success: true, processed: resultados }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // MODO 2: VERIFICAÇÃO DE PRAZOS (7 DIAS ANTES)
    // ========================================================
    if (mode === "check_prazos") {
      const em7dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: denunciasPrazo, error: errPrazo } = await adminClient
        .from("denuncias")
        .select("id, company_id, prazo_primeira_resposta, prazo_conclusao, alerta_prazo_enviado_em")
        .neq("status", "concluido")
        .is("alerta_prazo_enviado_em", null)
        .or(`prazo_primeira_resposta.lte.${em7dias},prazo_conclusao.lte.${em7dias}`);

      if (errPrazo) throw errPrazo;

      const resultadosPrazo: any[] = [];

      for (const denuncia of denunciasPrazo ?? []) {
        const { data: company } = await adminClient
          .from("companies")
          .select("name")
          .eq("id", denuncia.company_id)
          .single();

        const nomeEmpresa = company?.name || "Sua Empresa";

        const { data: responsaveis } = await adminClient
          .from("denuncias_responsaveis")
          .select("user_id")
          .eq("company_id", denuncia.company_id)
          .eq("ativo", true);

        const userIds = (responsaveis ?? []).map((r) => r.user_id);
        const emails: string[] = [];
        for (const uid of userIds) {
          const { data: userData } = await adminClient.auth.admin.getUserById(uid);
          if (userData?.user?.email) {
            emails.push(userData.user.email);
          }
        }

        if (emails.length === 0) continue;

        const subject = "Prazo se aproximando — denúncia em apuração";
        const canalUrl = `${DEFAULT_APP_ORIGIN}/comportamentos-ofensivos`;

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px;">
              <h2 style="color: #92400e; margin-top: 0;">Prazo legal se aproximando</h2>
              <p>Há denúncia em tramitação na <strong>${nomeEmpresa}</strong> com prazo legal de resposta ou conclusão nos próximos 7 dias.</p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${canalUrl}" style="background-color: #d97706; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Verificar Prazos no Canal de Denúncias
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #fef3c7; margin: 25px 0;" />
              <p style="font-size: 11px; color: #78350f; margin: 0;">
                A apuração tempestiva cumpre a Lei nº 14.457/2022 e assegura a integridade do canal.
              </p>
            </div>
          </div>
        `;

        try {
          await sendEmail({
            to: emails,
            subject,
            html,
            text: `Prazo legal se aproximando na ${nomeEmpresa}.\n\nAcesse o canal: ${canalUrl}`,
          });

          await adminClient
            .from("denuncias")
            .update({ alerta_prazo_enviado_em: new Date().toISOString() })
            .eq("id", denuncia.id);

          resultadosPrazo.push({ denuncia_id: denuncia.id, sent_to: emails });
        } catch (err: any) {
          console.error(`Falha no envio de alerta de prazo para denúncia ${denuncia.id}:`, err);
        }
      }

      return new Response(JSON.stringify({ success: true, processed: resultadosPrazo }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

