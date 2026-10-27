import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import * as fs from "fs";

const admin = createClient(
  process.env.VITE_SUPABASE_URL || "https://alneozvrsuwszlkisbyo.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TG_MAIS = "4553d74e-90d6-4988-b529-853b8b8db993";
const TG_UNITI = "a60af886-0218-4ae5-818d-e9bd8ed7d607";
const GABRIELA_ID = "814e2f42-9b43-4734-ab14-0d2849a85cb5";
const DANIELA_ID = "70b5d861-0e86-4c8c-b056-7229f8222ef1";

const NR1_ID = "540d02bd-8d5d-429b-b695-8a66f46c499d";
const HORIZONTE_ID = "8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4";

async function executarReset() {
  console.log("==================================================================");
  console.log("       ETAPA 2 — SCRIPT DE RESET TRANSACIONAL TG MAIS & UNITI     ");
  console.log("==================================================================\n");

  // 1. CHECAGEM OBRIGATÓRIA DO SNAPSHOT DA ETAPA 1
  if (!fs.existsSync("scratch/snapshot_pre_reset_tg.json")) {
    throw new Error("ABORTANDO: Snapshot da Etapa 1 não encontrado! O snapshot é obrigatório.");
  }
  const snapRaw = fs.readFileSync("scratch/snapshot_pre_reset_tg.json", "utf8");
  const snap = JSON.parse(snapRaw);
  console.log(`1. [SNAPSHOT VERIFICADO] Snapshot gerado em ${snap.timestamp} presente.`);

  // 2. EXECUTAR SQL TRANSACIONAL NO BANCO
  console.log("\n2. [BANCO DE DADOS] Executando deleção transacional das tabelas públicas...");

  const resetSql = `
  DO $$
  DECLARE
    v_del_audit integer;
    v_del_feedback integer;
    v_del_colabs integer;
    v_del_cargos integer;
    v_del_depts integer;
    v_del_onboarding integer;
    v_del_modvis integer;
    v_del_abonos integer;
    v_del_terms integer;
    v_del_modules integer;
    v_del_uc integer;
    v_del_roles integer;
    v_del_profiles integer;
    v_del_companies integer;
  BEGIN
    -- a) acesso_colaborador_audit, feedback_cycles
    DELETE FROM public.acesso_colaborador_audit 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_audit = ROW_COUNT;

    DELETE FROM public.feedback_cycles 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_feedback = ROW_COUNT;

    -- b) UPDATE colaboradores SET user_id = NULL para desativar trigger trg_prevent_delete_colaborador_with_user
    UPDATE public.colaboradores 
    SET user_id = NULL 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');

    -- c) DELETE colaboradores
    DELETE FROM public.colaboradores 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_colabs = ROW_COUNT;

    -- d) DELETE cargos, departamentos
    DELETE FROM public.cargos 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_cargos = ROW_COUNT;

    DELETE FROM public.departamentos 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_depts = ROW_COUNT;

    -- e) DELETE onboarding_progress, module_visibility, ponto_tipos_abono, terms_acceptance, company_modules
    DELETE FROM public.onboarding_progress 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_onboarding = ROW_COUNT;

    DELETE FROM public.module_visibility 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_modvis = ROW_COUNT;

    DELETE FROM public.ponto_tipos_abono 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_abonos = ROW_COUNT;

    DELETE FROM public.terms_acceptance 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_terms = ROW_COUNT;

    DELETE FROM public.company_modules 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_modules = ROW_COUNT;

    -- f) DELETE user_companies (Gabriela e Daniela)
    DELETE FROM public.user_companies 
    WHERE company_id IN ('${TG_MAIS}', '${TG_UNITI}')
       OR user_id IN ('${GABRIELA_ID}', '${DANIELA_ID}');
    GET DIAGNOSTICS v_del_uc = ROW_COUNT;

    -- g) DELETE user_roles e profiles (Gabriela e Daniela)
    DELETE FROM public.user_roles 
    WHERE user_id IN ('${GABRIELA_ID}', '${DANIELA_ID}');
    GET DIAGNOSTICS v_del_roles = ROW_COUNT;

    DELETE FROM public.profiles 
    WHERE user_id IN ('${GABRIELA_ID}', '${DANIELA_ID}');
    GET DIAGNOSTICS v_del_profiles = ROW_COUNT;

    -- i) DELETE companies
    DELETE FROM public.companies 
    WHERE id IN ('${TG_MAIS}', '${TG_UNITI}');
    GET DIAGNOSTICS v_del_companies = ROW_COUNT;

    RAISE NOTICE 'RESET EXECUTADO: audit=%, feedback=%, colabs=%, cargos=%, depts=%, onboarding=%, modvis=%, abonos=%, terms=%, modules=%, uc=%, roles=%, profiles=%, companies=%',
      v_del_audit, v_del_feedback, v_del_colabs, v_del_cargos, v_del_depts, v_del_onboarding, v_del_modvis, v_del_abonos, v_del_terms, v_del_modules, v_del_uc, v_del_roles, v_del_profiles, v_del_companies;
  END;
  $$;
  `;

  fs.writeFileSync("scratch/run_reset_db.sql", resetSql);
  console.log("   -> Script SQL gerado em scratch/run_reset_db.sql");

  // O script SQL será executado via npx supabase db query --linked
}

executarReset().catch(console.error);
