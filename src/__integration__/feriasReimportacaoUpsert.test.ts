import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Prefixo identificável único para rastreamento e limpeza garantida
const TEST_PREFIX = `TESTE_INTEGRACAO_${Date.now()}`;

describe("Integração: Reimportação e Idempotência de Férias Passadas", () => {
  let testCompanyId: string;
  let testColaboradorId: string;
  let testPeriodoId: string;
  let createdGozoId: string;

  // Arrays de rastreamento de IDs criados durante a execução dos testes
  const createdCompanyIds: string[] = [];
  const createdColabIds: string[] = [];
  const createdPeriodoIds: string[] = [];
  const createdGozoIds: string[] = [];

  beforeAll(async () => {
    // 1. Obter empresa ativa existente para o teste do cenário 1
    const { data: comp } = await supabaseAdmin
      .from("companies")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (!comp) {
      console.warn("Ambiente sem conexão com Supabase. Pulando teste de integração.");
      return;
    }
    testCompanyId = comp.id;

    // 2. Criar colaborador temporário para o teste do cenário 1 com prefixo seguro
    const uniqueSuffix = Date.now();
    const { data: colab, error: errColab } = await supabaseAdmin
      .from("colaboradores")
      .insert({
        company_id: testCompanyId,
        full_name: `${TEST_PREFIX}_Colab_${uniqueSuffix}`,
        cpf: `999${String(uniqueSuffix).slice(-8)}`,
        birth_date: "1990-01-01",
        admission_date: "2023-01-01",
        contract_type: "CLT",
        job_title: "Analista de Testes",
        department: "Qualidade",
        base_salary: 3000,
        payment_method: "Mensalista",
        status: "ATIVO",
      })
      .select("id")
      .single();

    expect(errColab).toBeNull();
    testColaboradorId = colab!.id;
    createdColabIds.push(testColaboradorId);

    // 3. Criar período aquisitivo de teste
    const { data: periodo, error: errPer } = await supabaseAdmin
      .from("ferias_periodos_aquisitivos")
      .insert({
        company_id: testCompanyId,
        colaborador_id: testColaboradorId,
        data_inicio_aquisitivo: "2023-01-01",
        data_fim_aquisitivo: "2023-12-31",
        data_limite_gozo: "2024-11-30",
        dias_adquiridos: 30,
        status: "aberto",
      })
      .select("id")
      .single();

    expect(errPer).toBeNull();
    testPeriodoId = periodo!.id;
    createdPeriodoIds.push(testPeriodoId);
  });

  afterAll(async () => {
    try {
      // Limpeza em ordem reversa estrita (filhos primeiro)
      // 1. ferias_gozo
      if (createdGozoIds.length > 0) {
        await supabaseAdmin.from("ferias_gozo").delete().in("id", createdGozoIds);
      }
      if (createdGozoId) {
        await supabaseAdmin.from("ferias_gozo").delete().eq("id", createdGozoId);
      }

      // 2. ferias_periodos_aquisitivos
      if (createdPeriodoIds.length > 0) {
        await supabaseAdmin.from("ferias_periodos_aquisitivos").delete().in("id", createdPeriodoIds);
      }

      // 3. colaboradores
      if (createdColabIds.length > 0) {
        await supabaseAdmin.from("colaboradores").delete().in("id", createdColabIds);
      }

      // 4. Filhos criados automaticamente por trigger na empresa (ex: ponto_tipos_abono)
      for (const compId of createdCompanyIds) {
        await supabaseAdmin.from("ponto_tipos_abono").delete().eq("company_id", compId);
      }

      // 5. companies
      if (createdCompanyIds.length > 0) {
        await supabaseAdmin.from("companies").delete().in("id", createdCompanyIds);
      }

      // 6. Varredura adicional por prefixo para garantir tolerância a falhas
      const { data: lingeringComps } = await supabaseAdmin
        .from("companies")
        .select("id")
        .like("name", `${TEST_PREFIX}%`);

      for (const lc of lingeringComps || []) {
        await supabaseAdmin.from("ponto_tipos_abono").delete().eq("company_id", lc.id);
        await supabaseAdmin.from("ferias_gozo").delete().eq("company_id", lc.id);
        await supabaseAdmin.from("ferias_periodos_aquisitivos").delete().eq("company_id", lc.id);
        await supabaseAdmin.from("colaboradores").delete().eq("company_id", lc.id);
        await supabaseAdmin.from("companies").delete().eq("id", lc.id);
      }

      const { data: lingeringColabs } = await supabaseAdmin
        .from("colaboradores")
        .select("id")
        .like("full_name", `${TEST_PREFIX}%`);

      if (lingeringColabs && lingeringColabs.length > 0) {
        await supabaseAdmin.from("colaboradores").delete().in("id", lingeringColabs.map((c) => c.id));
      }
    } catch (err) {
      // Guard de segurança: se o cleanup falhar, loga os IDs criados para remoção manual
      console.error("[SEGURANÇA] Falha no afterAll do teste de integração. IDs criados para limpeza manual:", {
        companies: createdCompanyIds,
        colaboradores: createdColabIds,
        periodos: createdPeriodoIds,
        gozos: createdGozoIds,
        prefixo: TEST_PREFIX,
        error: err,
      });
    }
  });

  it("cenário real: insere lançamento com abono=0, reimporta mesma chave com abono=10 e atualiza in-place sem duplicar", async () => {
    if (!testCompanyId) {
      console.warn("Pulando teste: sem testCompanyId (sem conexão com banco remoto)");
      return;
    }

    const dataInicioGozo = "2024-05-02";
    const dataFimGozo = "2024-05-21";
    const diasDescanso = 20;

    // 1. Inserir 1 lançamento original com abono = 0 e observacoes = 'Importado (CSV)'
    const { data: initialGozo, error: errInitial } = await supabaseAdmin
      .from("ferias_gozo")
      .insert({
        colaborador_id: testColaboradorId,
        company_id: testCompanyId,
        periodo_aquisitivo_id: testPeriodoId,
        data_inicio_gozo: dataInicioGozo,
        data_fim_gozo: dataFimGozo,
        dias_gozados: diasDescanso,
        data_pagamento: dataInicioGozo,
        abono_pecuniario_dias: 0,
        status: "gozado",
        observacoes: "Importado (CSV)",
      })
      .select("id, abono_pecuniario_dias, observacoes")
      .single();

    expect(errInitial).toBeNull();
    expect(initialGozo).toBeDefined();
    expect(initialGozo!.abono_pecuniario_dias).toBe(0);
    expect(initialGozo!.observacoes).toBe("Importado (CSV)");
    createdGozoId = initialGozo!.id;
    createdGozoIds.push(createdGozoId);

    // 2. Simular a reimportação do CSV com a mesma chave natural e abono = 10
    const abonoCorrigido = 10;
    const obsAtualizada = `Importado (CSV) – Abono pecuniário: ${abonoCorrigido} dia(s)`;

    // Busca pela chave natural
    const { data: existingGozo } = await supabaseAdmin
      .from("ferias_gozo")
      .select("id")
      .eq("colaborador_id", testColaboradorId)
      .eq("periodo_aquisitivo_id", testPeriodoId)
      .eq("data_inicio_gozo", dataInicioGozo)
      .eq("data_fim_gozo", dataFimGozo)
      .maybeSingle();

    expect(existingGozo).toBeDefined();
    expect(existingGozo!.id).toBe(createdGozoId);

    // Como já existe, executa UPDATE in-place
    const { error: errUpdate } = await supabaseAdmin
      .from("ferias_gozo")
      .update({
        dias_gozados: diasDescanso,
        data_pagamento: dataInicioGozo,
        abono_pecuniario_dias: abonoCorrigido,
        status: "gozado",
        observacoes: obsAtualizada,
      })
      .eq("id", existingGozo!.id);

    expect(errUpdate).toBeNull();

    // 3. Verificar no banco: exatamente 1 registro, abono = 10, 0 novos INSERTs
    const { data: allGozos, error: errQuery } = await supabaseAdmin
      .from("ferias_gozo")
      .select("id, abono_pecuniario_dias, dias_gozados, observacoes")
      .eq("colaborador_id", testColaboradorId)
      .eq("periodo_aquisitivo_id", testPeriodoId);

    expect(errQuery).toBeNull();
    expect(allGozos).toHaveLength(1);
    expect(allGozos![0].id).toBe(createdGozoId);
    expect(allGozos![0].abono_pecuniario_dias).toBe(10);
    expect(allGozos![0].dias_gozados).toBe(20);
    expect(allGozos![0].observacoes).toBe(obsAtualizada);

    // 4. Testar a proteção da constraint no banco: tentativa de INSERT duplicado deve falhar
    const { error: errDuplicateInsert } = await supabaseAdmin
      .from("ferias_gozo")
      .insert({
        colaborador_id: testColaboradorId,
        company_id: testCompanyId,
        periodo_aquisitivo_id: testPeriodoId,
        data_inicio_gozo: dataInicioGozo,
        data_fim_gozo: dataFimGozo,
        dias_gozados: diasDescanso,
        data_pagamento: dataInicioGozo,
        abono_pecuniario_dias: 0,
        status: "gozado",
        observacoes: "Tentativa Duplicada",
      });

    expect(errDuplicateInsert).toBeDefined();
    expect(errDuplicateInsert?.code).toBe("23505"); // Código Postgres para unique_violation
  });

  it("cenário cliente novo: empresa com 0 lançamentos, importa 3 colaboradores com 20d descanso + 10d abono, fecha período e reimporta com 0 duplicatas", async () => {
    if (!testCompanyId) return;

    const uniqueId = Date.now();

    // 1. Criar empresa nova com prefixo identificável de teste
    const { data: newComp, error: errNewComp } = await supabaseAdmin
      .from("companies")
      .insert({
        name: `${TEST_PREFIX}_Empresa_${uniqueId}`,
        cnpj: `00${String(uniqueId).slice(-12)}`,
        status: "ativa",
      })
      .select("id")
      .single();
    expect(errNewComp).toBeNull();
    const clienteNovoId = newComp!.id;
    createdCompanyIds.push(clienteNovoId);

    // Verificar que a empresa possui 0 lançamentos em ferias_gozo
    const { count: initialCount } = await supabaseAdmin
      .from("ferias_gozo")
      .select("*", { count: "exact", head: true })
      .eq("company_id", clienteNovoId);
    expect(initialCount).toBe(0);

    // 2. Criar 3 colaboradores com prefixo identificável de teste
    const colabNames = ["Alfa", "Beta", "Gama"];
    const createdColabs: { id: string; cpf: string; name: string }[] = [];

    for (let i = 0; i < 3; i++) {
      const cpf = `888${String(uniqueId + i).slice(-8)}`;
      const { data: colab, error: errC } = await supabaseAdmin
        .from("colaboradores")
        .insert({
          company_id: clienteNovoId,
          full_name: `${TEST_PREFIX}_Colab_${colabNames[i]}_${uniqueId}`,
          cpf,
          birth_date: "1992-05-10",
          admission_date: "2023-01-01",
          contract_type: "CLT",
          job_title: "Assistente Administrativo",
          department: "Operações",
          base_salary: 2800,
          payment_method: "Mensalista",
          status: "ATIVO",
        })
        .select("id, cpf, full_name")
        .single();
      expect(errC).toBeNull();
      createdColabs.push({ id: colab!.id, cpf, name: colab!.full_name });
      createdColabIds.push(colab!.id);
    }

    // 3. Simular 1ª Importação (CSV de 3 colaboradores: 20 dias descanso + 10 dias abono)
    const csvRows = createdColabs.map((c) => ({
      cpf: c.cpf,
      colaboradorId: c.id,
      perIni: "2023-01-01",
      perFim: "2023-12-31",
      iniGozo: "2024-05-02",
      fimGozo: "2024-05-21",
      diasDescanso: 20,
      diasAbono: 10,
    }));

    let criados1 = 0;
    let atualizados1 = 0;

    for (const r of csvRows) {
      // Cria período fechado (total 30 dias com término passado)
      const { data: periodo, error: errPer } = await supabaseAdmin
        .from("ferias_periodos_aquisitivos")
        .insert({
          company_id: clienteNovoId,
          colaborador_id: r.colaboradorId,
          data_inicio_aquisitivo: r.perIni,
          data_fim_aquisitivo: r.perFim,
          data_limite_gozo: "2024-11-30",
          dias_adquiridos: 30,
          status: "fechado",
        })
        .select("id")
        .single();
      expect(errPer).toBeNull();
      createdPeriodoIds.push(periodo!.id);

      // Upsert: checar se já existe pela chave natural
      const { data: existing } = await supabaseAdmin
        .from("ferias_gozo")
        .select("id")
        .eq("colaborador_id", r.colaboradorId)
        .eq("periodo_aquisitivo_id", periodo!.id)
        .eq("data_inicio_gozo", r.iniGozo)
        .eq("data_fim_gozo", r.fimGozo)
        .maybeSingle();

      if (existing) {
        atualizados1++;
      } else {
        const { data: insGozo, error: errInsert } = await supabaseAdmin
          .from("ferias_gozo")
          .insert({
            company_id: clienteNovoId,
            colaborador_id: r.colaboradorId,
            periodo_aquisitivo_id: periodo!.id,
            data_inicio_gozo: r.iniGozo,
            data_fim_gozo: r.fimGozo,
            dias_gozados: r.diasDescanso,
            abono_pecuniario_dias: r.diasAbono,
            data_pagamento: r.iniGozo,
            status: "gozado",
            observacoes: `Importado (CSV) – Abono pecuniário: ${r.diasAbono} dia(s)`,
          })
          .select("id")
          .single();
        expect(errInsert).toBeNull();
        createdGozoIds.push(insGozo!.id);
        criados1++;
      }
    }

    // Validações da 1ª importação
    expect(criados1).toBe(3);
    expect(atualizados1).toBe(0);

    const { data: gozosCliente, error: errGozos } = await supabaseAdmin
      .from("ferias_gozo")
      .select("id, colaborador_id, dias_gozados, abono_pecuniario_dias, status, observacoes")
      .eq("company_id", clienteNovoId);

    expect(errGozos).toBeNull();
    expect(gozosCliente).toHaveLength(3);
    gozosCliente!.forEach((g) => {
      expect(g.dias_gozados).toBe(20);
      expect(g.abono_pecuniario_dias).toBe(10);
      expect(g.status).toBe("gozado");
      expect(g.observacoes).toContain("Abono pecuniário: 10 dia(s)");
    });

    const { data: periodosCliente } = await supabaseAdmin
      .from("ferias_periodos_aquisitivos")
      .select("id, dias_adquiridos, status")
      .eq("company_id", clienteNovoId);

    expect(periodosCliente).toHaveLength(3);
    periodosCliente!.forEach((p) => {
      expect(p.status).toBe("fechado");
      expect(p.dias_adquiridos).toBe(30);
    });

    // 4. Simular Reimportação do mesmo CSV
    let criados2 = 0;
    let atualizados2 = 0;

    for (const r of csvRows) {
      const { data: periodo } = await supabaseAdmin
        .from("ferias_periodos_aquisitivos")
        .select("id")
        .eq("colaborador_id", r.colaboradorId)
        .eq("data_inicio_aquisitivo", r.perIni)
        .single();

      const { data: existing } = await supabaseAdmin
        .from("ferias_gozo")
        .select("id")
        .eq("colaborador_id", r.colaboradorId)
        .eq("periodo_aquisitivo_id", periodo!.id)
        .eq("data_inicio_gozo", r.iniGozo)
        .eq("data_fim_gozo", r.fimGozo)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from("ferias_gozo")
          .update({
            dias_gozados: r.diasDescanso,
            abono_pecuniario_dias: r.diasAbono,
            data_pagamento: r.iniGozo,
            status: "gozado",
            observacoes: `Importado (CSV) – Abono pecuniário: ${r.diasAbono} dia(s)`,
          })
          .eq("id", existing.id);
        atualizados2++;
      } else {
        criados2++;
      }
    }

    // Validações da reimportação
    expect(criados2).toBe(0);
    expect(atualizados2).toBe(3);

    // Contagem final no banco: CONTINUA EXATAMENTE 3 (0 duplicatas!)
    const { count: finalCount } = await supabaseAdmin
      .from("ferias_gozo")
      .select("*", { count: "exact", head: true })
      .eq("company_id", clienteNovoId);
    expect(finalCount).toBe(3);
  });
});
