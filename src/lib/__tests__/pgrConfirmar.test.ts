import { describe, it, expect, vi, beforeEach } from "vitest";

// ────────────────────────────────────────────────────────────
// Mock e simulação da lógica transacional (RPC) e Edge Function
// ────────────────────────────────────────────────────────────
class MockSupabaseAdmin {
  public db: Record<string, any[]> = {
    pgr_importacoes: [],
    pgr_documentos: [],
    nr1_ghe: [],
    nr1_ghe_riscos: [],
    pgr_risco_detalhes: [],
    nr1_planos_acao: []
  };

  public async rpc(name: string, args: any) {
    if (name === "pgr_confirmar_parse") {
      const imp = this.db.pgr_importacoes.find(i => i.id === args.p_importacao_id);
      if (!imp || imp.status !== 'aguardando_revisao') {
        return { error: new Error('Importação não encontrada ou status incorreto.') };
      }

      const backup = JSON.parse(JSON.stringify(this.db));

      try {
        const extracao = imp.extracao_raw;
        
        // Simular insert documento
        if (extracao.dados_empresa?.failDocument) throw new Error("Rollback_Simulado_Documento");
        this.db.pgr_documentos.push({ id: 'doc-1', company_id: imp.company_id, titulo: 'Teste' });

        // Simular insert ghe
        if (extracao.ghes?.some((g: any) => g.failGhe)) throw new Error("Rollback_Simulado_GHE");
        this.db.nr1_ghe.push({ id: 'ghe-1', company_id: imp.company_id });

        // Simular insert risco
        if (extracao.ghes?.some((g: any) => g.riscos?.some((r: any) => r.failRisco))) throw new Error("Rollback_Simulado_Risco");
        this.db.nr1_ghe_riscos.push({ id: 'risco-1', ghe_id: 'ghe-1' });

        // Sucesso total
        imp.status = 'confirmado';
        return { data: true, error: null };
      } catch (err) {
        // Rollback total
        this.db = backup;
        return { data: null, error: err };
      }
    }
    return { error: null };
  }
}

describe("pgr-confirmar: Parse Transacional", () => {
  let supabase: MockSupabaseAdmin;

  beforeEach(() => {
    supabase = new MockSupabaseAdmin();
  });

  it("deve fazer o parse com sucesso e alterar status para confirmado", async () => {
    supabase.db.pgr_importacoes.push({
      id: "imp-123",
      company_id: "comp-1",
      status: "aguardando_revisao",
      extracao_raw: { dados_empresa: { nome: "Teste" }, ghes: [{ nome: "GHE 1", riscos: [{ perigo: "Risco 1" }] }] }
    });

    const { error } = await supabase.rpc("pgr_confirmar_parse", { p_importacao_id: "imp-123" });
    expect(error).toBeNull();

    expect(supabase.db.pgr_documentos.length).toBe(1);
    expect(supabase.db.nr1_ghe.length).toBe(1);
    expect(supabase.db.nr1_ghe_riscos.length).toBe(1);
    expect(supabase.db.pgr_importacoes[0].status).toBe("confirmado");
  });

  it("deve fazer ROLLBACK total se falhar no insert de riscos e NÃO virar confirmado", async () => {
    supabase.db.pgr_importacoes.push({
      id: "imp-123",
      company_id: "comp-1",
      status: "aguardando_revisao",
      extracao_raw: { dados_empresa: { nome: "Teste" }, ghes: [{ nome: "GHE 1", riscos: [{ perigo: "Risco 1", failRisco: true }] }] }
    });

    const { error } = await supabase.rpc("pgr_confirmar_parse", { p_importacao_id: "imp-123" });
    expect(error).not.toBeNull();
    expect(error?.message).toBe("Rollback_Simulado_Risco");

    // Verifica rollback (nenhum dado parcial salvo)
    expect(supabase.db.pgr_documentos.length).toBe(0);
    expect(supabase.db.nr1_ghe.length).toBe(0);
    expect(supabase.db.nr1_ghe_riscos.length).toBe(0);
    
    // Status original mantido (Edge Function vai setar 'erro' depois, mas a RPC não seta confirmado)
    expect(supabase.db.pgr_importacoes[0].status).toBe("aguardando_revisao"); 
  });
});
