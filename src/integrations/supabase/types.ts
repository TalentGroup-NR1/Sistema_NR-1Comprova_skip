export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      acesso_colaborador_audit: {
        Row: {
          colaborador_id: string
          company_id: string | null
          created_at: string
          disparado_por: string
          email_destino: string
          email_enviado: boolean
          erro_envio: string | null
          id: string
          reenvio: boolean
          user_id: string | null
        }
        Insert: {
          colaborador_id: string
          company_id?: string | null
          created_at?: string
          disparado_por: string
          email_destino: string
          email_enviado?: boolean
          erro_envio?: string | null
          id?: string
          reenvio?: boolean
          user_id?: string | null
        }
        Update: {
          colaborador_id?: string
          company_id?: string | null
          created_at?: string
          disparado_por?: string
          email_destino?: string
          email_enviado?: boolean
          erro_envio?: string | null
          id?: string
          reenvio?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acesso_colaborador_audit_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acesso_colaborador_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      analises_perfil: {
        Row: {
          candidato_nome: string
          colaborador_admission_date: string | null
          colaborador_id: string | null
          company_id: string
          created_at: string
          created_by: string
          doc_alinhamento_path: string | null
          doc_anuncio_path: string | null
          doc_curriculo_path: string | null
          doc_entrevista_path: string | null
          id: string
          resultado: Json | null
          status: string
          updated_at: string
          vaga: string
        }
        Insert: {
          candidato_nome: string
          colaborador_admission_date?: string | null
          colaborador_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          doc_alinhamento_path?: string | null
          doc_anuncio_path?: string | null
          doc_curriculo_path?: string | null
          doc_entrevista_path?: string | null
          id?: string
          resultado?: Json | null
          status?: string
          updated_at?: string
          vaga: string
        }
        Update: {
          candidato_nome?: string
          colaborador_admission_date?: string | null
          colaborador_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          doc_alinhamento_path?: string | null
          doc_anuncio_path?: string | null
          doc_curriculo_path?: string | null
          doc_entrevista_path?: string | null
          id?: string
          resultado?: Json | null
          status?: string
          updated_at?: string
          vaga?: string
        }
        Relationships: [
          {
            foreignKeyName: "analises_perfil_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analises_perfil_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_links: {
        Row: {
          avaliacao_id: string
          created_at: string
          expires_at: string | null
          id: string
          tipo: Database["public"]["Enums"]["avaliacao_link_tipo"]
          token: string
          used_at: string | null
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          tipo: Database["public"]["Enums"]["avaliacao_link_tipo"]
          token?: string
          used_at?: string | null
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["avaliacao_link_tipo"]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_links_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_respostas_competencias: {
        Row: {
          avaliacao_id: string
          comentario: string | null
          competencia_id: string
          created_at: string
          id: string
          nota_valor: string
          respondente_tipo: Database["public"]["Enums"]["respondente_avaliacao_tipo"]
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          comentario?: string | null
          competencia_id: string
          created_at?: string
          id?: string
          nota_valor: string
          respondente_tipo: Database["public"]["Enums"]["respondente_avaliacao_tipo"]
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          comentario?: string | null
          competencia_id?: string
          created_at?: string
          id?: string
          nota_valor?: string
          respondente_tipo?: Database["public"]["Enums"]["respondente_avaliacao_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_respostas_competencias_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_respostas_competencias_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias_ciclo"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacao_respostas_objetivos: {
        Row: {
          avaliacao_id: string
          comentario: string | null
          created_at: string
          id: string
          nota_valor: string
          objetivo_id: string
          respondente_tipo: Database["public"]["Enums"]["respondente_avaliacao_tipo"]
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota_valor: string
          objetivo_id: string
          respondente_tipo: Database["public"]["Enums"]["respondente_avaliacao_tipo"]
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota_valor?: string
          objetivo_id?: string
          respondente_tipo?: Database["public"]["Enums"]["respondente_avaliacao_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_respostas_objetivos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_respostas_objetivos_objetivo_id_fkey"
            columns: ["objetivo_id"]
            isOneToOne: false
            referencedRelation: "objetivos_ciclo"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          ciclo_id: string
          colaborador_id: string
          created_at: string
          gestor_id: string
          id: string
          prazo_autoavaliacao: string | null
          prazo_avaliacao_gestor: string | null
          status_autoavaliacao: Database["public"]["Enums"]["avaliacao_status"]
          status_avaliacao_gestor: Database["public"]["Enums"]["avaliacao_status"]
          updated_at: string
        }
        Insert: {
          ciclo_id: string
          colaborador_id: string
          created_at?: string
          gestor_id: string
          id?: string
          prazo_autoavaliacao?: string | null
          prazo_avaliacao_gestor?: string | null
          status_autoavaliacao?: Database["public"]["Enums"]["avaliacao_status"]
          status_avaliacao_gestor?: Database["public"]["Enums"]["avaliacao_status"]
          updated_at?: string
        }
        Update: {
          ciclo_id?: string
          colaborador_id?: string
          created_at?: string
          gestor_id?: string
          id?: string
          prazo_autoavaliacao?: string | null
          prazo_avaliacao_gestor?: string | null
          status_autoavaliacao?: Database["public"]["Enums"]["avaliacao_status"]
          status_avaliacao_gestor?: Database["public"]["Enums"]["avaliacao_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_fechamentos: {
        Row: {
          assinatura_em: string | null
          assinatura_hash: string | null
          assinatura_por: string | null
          colaborador_id: string
          company_id: string
          created_at: string | null
          csv_url: string | null
          dias_abonados: number
          dias_falta: number
          fechado_em: string | null
          fechado_por: string | null
          hash_assinatura: string | null
          horas_abonadas_minutos: number
          horas_extras_minutos: number
          horas_noturnas_minutos: number
          horas_trabalhadas_minutos: number
          id: string
          motivo_reabertura: string | null
          observacao: string | null
          pdf_url: string | null
          periodo_fim: string
          periodo_inicio: string
          reaberto_em: string | null
          reaberto_por: string | null
          saldo_minutos: number
          snapshot_jsonb: Json | null
          status: string
          tratativa_acao:
            | Database["public"]["Enums"]["tratativa_saldo_acao"]
            | null
          tratativa_observacao: string | null
          updated_at: string
          versao: number
        }
        Insert: {
          assinatura_em?: string | null
          assinatura_hash?: string | null
          assinatura_por?: string | null
          colaborador_id: string
          company_id: string
          created_at?: string | null
          csv_url?: string | null
          dias_abonados?: number
          dias_falta?: number
          fechado_em?: string | null
          fechado_por?: string | null
          hash_assinatura?: string | null
          horas_abonadas_minutos?: number
          horas_extras_minutos?: number
          horas_noturnas_minutos?: number
          horas_trabalhadas_minutos?: number
          id?: string
          motivo_reabertura?: string | null
          observacao?: string | null
          pdf_url?: string | null
          periodo_fim: string
          periodo_inicio: string
          reaberto_em?: string | null
          reaberto_por?: string | null
          saldo_minutos?: number
          snapshot_jsonb?: Json | null
          status?: string
          tratativa_acao?:
            | Database["public"]["Enums"]["tratativa_saldo_acao"]
            | null
          tratativa_observacao?: string | null
          updated_at?: string
          versao?: number
        }
        Update: {
          assinatura_em?: string | null
          assinatura_hash?: string | null
          assinatura_por?: string | null
          colaborador_id?: string
          company_id?: string
          created_at?: string | null
          csv_url?: string | null
          dias_abonados?: number
          dias_falta?: number
          fechado_em?: string | null
          fechado_por?: string | null
          hash_assinatura?: string | null
          horas_abonadas_minutos?: number
          horas_extras_minutos?: number
          horas_noturnas_minutos?: number
          horas_trabalhadas_minutos?: number
          id?: string
          motivo_reabertura?: string | null
          observacao?: string | null
          pdf_url?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          reaberto_em?: string | null
          reaberto_por?: string | null
          saldo_minutos?: number
          snapshot_jsonb?: Json | null
          status?: string
          tratativa_acao?:
            | Database["public"]["Enums"]["tratativa_saldo_acao"]
            | null
          tratativa_observacao?: string | null
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_fechamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_fechamentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_fechamentos_auditoria: {
        Row: {
          acao: string
          created_at: string
          fechamento_id: string
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          fechamento_id: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          fechamento_id?: string
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_fechamentos_auditoria_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_perfis: {
        Row: {
          ativo: boolean
          banco_horas_inicio: string | null
          company_id: string
          created_at: string
          id: string
          is_padrao: boolean
          nome: string
          periodo_fechamento_banco: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          banco_horas_inicio?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_padrao?: boolean
          nome: string
          periodo_fechamento_banco?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          banco_horas_inicio?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_padrao?: boolean
          nome?: string
          periodo_fechamento_banco?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_perfis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios: {
        Row: {
          ativo: boolean
          categoria: string | null
          company_id: string
          created_at: string
          descricao: string | null
          empresa: string | null
          id: string
          imagem_capa: string | null
          importancia: string | null
          instrucoes: string | null
          link_externo: string | null
          nome: string
          operadora_fornecedor: string | null
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          company_id: string
          created_at?: string
          descricao?: string | null
          empresa?: string | null
          id?: string
          imagem_capa?: string | null
          importancia?: string | null
          instrucoes?: string | null
          link_externo?: string | null
          nome: string
          operadora_fornecedor?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          company_id?: string
          created_at?: string
          descricao?: string | null
          empresa?: string | null
          id?: string
          imagem_capa?: string | null
          importancia?: string | null
          instrucoes?: string | null
          link_externo?: string | null
          nome?: string
          operadora_fornecedor?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios_departamento: {
        Row: {
          beneficio_id: string
          company_id: string
          created_at: string
          data_inicio: string | null
          departamento: string
          id: string
          valor: number | null
        }
        Insert: {
          beneficio_id: string
          company_id: string
          created_at?: string
          data_inicio?: string | null
          departamento: string
          id?: string
          valor?: number | null
        }
        Update: {
          beneficio_id?: string
          company_id?: string
          created_at?: string
          data_inicio?: string | null
          departamento?: string
          id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_departamento_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_departamento_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios_empresa_cliente: {
        Row: {
          beneficio_id: string
          company_id: string
          created_at: string
          data_inicio: string | null
          empresa_cliente: string
          id: string
          valor: number | null
        }
        Insert: {
          beneficio_id: string
          company_id: string
          created_at?: string
          data_inicio?: string | null
          empresa_cliente: string
          id?: string
          valor?: number | null
        }
        Update: {
          beneficio_id?: string
          company_id?: string
          created_at?: string
          data_inicio?: string | null
          empresa_cliente?: string
          id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_empresa_cliente_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_empresa_cliente_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios_materiais: {
        Row: {
          arquivo_url: string | null
          beneficio_id: string
          created_at: string
          descricao: string | null
          id: string
          link_externo: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          arquivo_url?: string | null
          beneficio_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          link_externo?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          arquivo_url?: string | null
          beneficio_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          link_externo?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_materiais_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios_tipo_contrato: {
        Row: {
          beneficio_id: string
          company_id: string
          created_at: string | null
          data_inicio: string | null
          id: string
          tipo_contrato: string
          valor: number | null
        }
        Insert: {
          beneficio_id: string
          company_id: string
          created_at?: string | null
          data_inicio?: string | null
          id?: string
          tipo_contrato: string
          valor?: number | null
        }
        Update: {
          beneficio_id?: string
          company_id?: string
          created_at?: string | null
          data_inicio?: string | null
          id?: string
          tipo_contrato?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_tipo_contrato_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_tipo_contrato_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_greeting_acknowledgments: {
        Row: {
          acknowledged_at: string
          greeting_type: string
          id: string
          user_id: string
          year: number
        }
        Insert: {
          acknowledged_at?: string
          greeting_type: string
          id?: string
          user_id: string
          year: number
        }
        Update: {
          acknowledged_at?: string
          greeting_type?: string
          id?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string
          id: string
          meta_description: string | null
          meta_keywords: string | null
          pdf_url: string | null
          published_at: string | null
          reading_time_min: number | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          pdf_url?: string | null
          published_at?: string | null
          reading_time_min?: number | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          pdf_url?: string | null
          published_at?: string | null
          reading_time_min?: number | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      campanha_leituras: {
        Row: {
          campanha_id: string
          company_id: string
          created_at: string
          id: string
          lido_em: string
          user_id: string
        }
        Insert: {
          campanha_id: string
          company_id: string
          created_at?: string
          id?: string
          lido_em?: string
          user_id: string
        }
        Update: {
          campanha_id?: string
          company_id?: string
          created_at?: string
          id?: string
          lido_em?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanha_leituras_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas_comunicados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_leituras_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas_comunicados: {
        Row: {
          company_id: string
          created_at: string
          criado_por: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          exige_leitura: boolean
          id: string
          imagem_url: string | null
          materiais: Json
          titulo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          criado_por?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          exige_leitura?: boolean
          id?: string
          imagem_url?: string | null
          materiais?: Json
          titulo: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          criado_por?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          exige_leitura?: boolean
          id?: string
          imagem_url?: string | null
          materiais?: Json
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_comunicados_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          ativo: boolean
          carga_horaria_semanal: number | null
          cbo_codigo: string | null
          cbo_descricao: string | null
          company_id: string
          created_at: string
          descricao_atividades: string | null
          ghe_id: string | null
          id: string
          nome: string
          risco_exposicao: boolean
          tarefa_prescrita: string | null
          tarefa_real: string | null
          tempo_exposicao_horas_dia: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          carga_horaria_semanal?: number | null
          cbo_codigo?: string | null
          cbo_descricao?: string | null
          company_id: string
          created_at?: string
          descricao_atividades?: string | null
          ghe_id?: string | null
          id?: string
          nome: string
          risco_exposicao?: boolean
          tarefa_prescrita?: string | null
          tarefa_real?: string | null
          tempo_exposicao_horas_dia?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          carga_horaria_semanal?: number | null
          cbo_codigo?: string | null
          cbo_descricao?: string | null
          company_id?: string
          created_at?: string
          descricao_atividades?: string | null
          ghe_id?: string | null
          id?: string
          nome?: string
          risco_exposicao?: boolean
          tarefa_prescrita?: string | null
          tarefa_real?: string | null
          tempo_exposicao_horas_dia?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_ghe_id_fkey"
            columns: ["ghe_id"]
            isOneToOne: false
            referencedRelation: "ghes"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_treinamento: {
        Row: {
          company_id: string
          cor: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_treinamento_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cbo_ocupacoes: {
        Row: {
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          carga_horaria: number
          certificate_code: string
          colaborador_id: string
          colaborador_nome: string
          company_id: string
          created_at: string
          data_conclusao: string
          file_path: string | null
          id: string
          issue_date: string
          issued_by: string | null
          issued_by_type: string
          progresso_id: string
          revogado_em: string | null
          revogado_motivo: string | null
          revogado_por: string | null
          status: string
          treinamento_id: string
          treinamento_titulo: string
          updated_at: string
        }
        Insert: {
          carga_horaria?: number
          certificate_code: string
          colaborador_id: string
          colaborador_nome: string
          company_id: string
          created_at?: string
          data_conclusao: string
          file_path?: string | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          issued_by_type?: string
          progresso_id: string
          revogado_em?: string | null
          revogado_motivo?: string | null
          revogado_por?: string | null
          status?: string
          treinamento_id: string
          treinamento_titulo: string
          updated_at?: string
        }
        Update: {
          carga_horaria?: number
          certificate_code?: string
          colaborador_id?: string
          colaborador_nome?: string
          company_id?: string
          created_at?: string
          data_conclusao?: string
          file_path?: string | null
          id?: string
          issue_date?: string
          issued_by?: string | null
          issued_by_type?: string
          progresso_id?: string
          revogado_em?: string | null
          revogado_motivo?: string | null
          revogado_por?: string | null
          status?: string
          treinamento_id?: string
          treinamento_titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_progresso_id_fkey"
            columns: ["progresso_id"]
            isOneToOne: false
            referencedRelation: "treinamento_progresso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates_audit_logs: {
        Row: {
          action: string
          certificate_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          certificate_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          certificate_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_audit_logs_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclos_avaliacao: {
        Row: {
          company_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          nome_ciclo: string
          status: Database["public"]["Enums"]["ciclo_avaliacao_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          nome_ciclo: string
          status?: Database["public"]["Enums"]["ciclo_avaliacao_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          nome_ciclo?: string
          status?: Database["public"]["Enums"]["ciclo_avaliacao_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_avaliacao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_beneficios: {
        Row: {
          beneficio_id: string
          colaborador_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          numero_cartao: string | null
          observacoes: string | null
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          beneficio_id: string
          colaborador_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          numero_cartao?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          beneficio_id?: string
          colaborador_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          numero_cartao?: string | null
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_beneficios_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_beneficios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_country: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          admission_date: string
          alinhamento_notas: string | null
          avatar_url: string | null
          banco_horas_perfil_id: string | null
          base_salary: number
          birth_date: string
          cargo_id: string | null
          cnpj: string | null
          company_id: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          corporate_email: string
          cpf: string
          created_at: string
          ctps_numero: string | null
          ctps_serie: string | null
          curriculo_path: string | null
          cursos_realizados: string | null
          data_corte_ferias: string | null
          data_pagamento: string | null
          department: string
          desligado_em: string | null
          desligado_por_user_id: string | null
          education_level: Database["public"]["Enums"]["education_level"] | null
          email_pessoal: string | null
          empresa_cliente: string | null
          ethnicity: Database["public"]["Enums"]["ethnicity_type"] | null
          full_name: string
          gestao_tecnica: string | null
          gestor_id: string | null
          humanguide_notas: string | null
          humanguide_path: string | null
          id: string
          is_banco_horas: boolean
          is_substituicao: boolean
          job_level: string | null
          job_title: string
          jornada_diaria_minutos: number | null
          manager_name: string | null
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          matricula: string | null
          motivo_desligamento: string | null
          motivo_detalhado: string | null
          nacionalidade: string | null
          naturalidade: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone: string | null
          pis: string | null
          razao_social: string | null
          rg: string | null
          sex: Database["public"]["Enums"]["sex_type"] | null
          social_name: string | null
          status: Database["public"]["Enums"]["colaborador_status"]
          substituicao_colaborador_id: string | null
          telefone_secundario: string | null
          termination_date: string | null
          tipo_desligamento: string | null
          ultima_ferias_fim: string | null
          ultima_ferias_inicio: string | null
          updated_at: string
          user_id: string | null
          work_schedule: string | null
          work_schedule_id: string | null
          work_shift_type: Database["public"]["Enums"]["work_shift_type"] | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          admission_date: string
          alinhamento_notas?: string | null
          avatar_url?: string | null
          banco_horas_perfil_id?: string | null
          base_salary: number
          birth_date: string
          cargo_id?: string | null
          cnpj?: string | null
          company_id: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          corporate_email: string
          cpf: string
          created_at?: string
          ctps_numero?: string | null
          ctps_serie?: string | null
          curriculo_path?: string | null
          cursos_realizados?: string | null
          data_corte_ferias?: string | null
          data_pagamento?: string | null
          department: string
          desligado_em?: string | null
          desligado_por_user_id?: string | null
          education_level?:
            | Database["public"]["Enums"]["education_level"]
            | null
          email_pessoal?: string | null
          empresa_cliente?: string | null
          ethnicity?: Database["public"]["Enums"]["ethnicity_type"] | null
          full_name: string
          gestao_tecnica?: string | null
          gestor_id?: string | null
          humanguide_notas?: string | null
          humanguide_path?: string | null
          id?: string
          is_banco_horas?: boolean
          is_substituicao?: boolean
          job_level?: string | null
          job_title: string
          jornada_diaria_minutos?: number | null
          manager_name?: string | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          matricula?: string | null
          motivo_desligamento?: string | null
          motivo_detalhado?: string | null
          nacionalidade?: string | null
          naturalidade?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone?: string | null
          pis?: string | null
          razao_social?: string | null
          rg?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          social_name?: string | null
          status?: Database["public"]["Enums"]["colaborador_status"]
          substituicao_colaborador_id?: string | null
          telefone_secundario?: string | null
          termination_date?: string | null
          tipo_desligamento?: string | null
          ultima_ferias_fim?: string | null
          ultima_ferias_inicio?: string | null
          updated_at?: string
          user_id?: string | null
          work_schedule?: string | null
          work_schedule_id?: string | null
          work_shift_type?:
            | Database["public"]["Enums"]["work_shift_type"]
            | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          admission_date?: string
          alinhamento_notas?: string | null
          avatar_url?: string | null
          banco_horas_perfil_id?: string | null
          base_salary?: number
          birth_date?: string
          cargo_id?: string | null
          cnpj?: string | null
          company_id?: string
          contract_type?: Database["public"]["Enums"]["contract_type"]
          corporate_email?: string
          cpf?: string
          created_at?: string
          ctps_numero?: string | null
          ctps_serie?: string | null
          curriculo_path?: string | null
          cursos_realizados?: string | null
          data_corte_ferias?: string | null
          data_pagamento?: string | null
          department?: string
          desligado_em?: string | null
          desligado_por_user_id?: string | null
          education_level?:
            | Database["public"]["Enums"]["education_level"]
            | null
          email_pessoal?: string | null
          empresa_cliente?: string | null
          ethnicity?: Database["public"]["Enums"]["ethnicity_type"] | null
          full_name?: string
          gestao_tecnica?: string | null
          gestor_id?: string | null
          humanguide_notas?: string | null
          humanguide_path?: string | null
          id?: string
          is_banco_horas?: boolean
          is_substituicao?: boolean
          job_level?: string | null
          job_title?: string
          jornada_diaria_minutos?: number | null
          manager_name?: string | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          matricula?: string | null
          motivo_desligamento?: string | null
          motivo_detalhado?: string | null
          nacionalidade?: string | null
          naturalidade?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          phone?: string | null
          pis?: string | null
          razao_social?: string | null
          rg?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          social_name?: string | null
          status?: Database["public"]["Enums"]["colaborador_status"]
          substituicao_colaborador_id?: string | null
          telefone_secundario?: string | null
          termination_date?: string | null
          tipo_desligamento?: string | null
          ultima_ferias_fim?: string | null
          ultima_ferias_inicio?: string | null
          updated_at?: string
          user_id?: string | null
          work_schedule?: string | null
          work_schedule_id?: string | null
          work_shift_type?:
            | Database["public"]["Enums"]["work_shift_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_banco_horas_perfil_id_fkey"
            columns: ["banco_horas_perfil_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_substituicao_colaborador_id_fkey"
            columns: ["substituicao_colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_consents: {
        Row: {
          collaborator_id: string
          company_id: string
          consent_date: string
          consent_given: boolean
          consent_type: string
          created_at: string
          id: string
          revoked_by: string | null
          revoked_date: string | null
          updated_at: string
        }
        Insert: {
          collaborator_id: string
          company_id: string
          consent_date?: string
          consent_given?: boolean
          consent_type: string
          created_at?: string
          id?: string
          revoked_by?: string | null
          revoked_date?: string | null
          updated_at?: string
        }
        Update: {
          collaborator_id?: string
          company_id?: string
          consent_date?: string
          consent_given?: boolean
          consent_type?: string
          created_at?: string
          id?: string
          revoked_by?: string | null
          revoked_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_consents_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_consents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          accent_color: string | null
          bairro: string | null
          brand_favicon_url: string | null
          brand_logo_url: string | null
          brand_name: string | null
          brand_primary_color: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          estado: string | null
          id: string
          is_internal: boolean | null
          logo_upload_date: string | null
          logo_url: string | null
          logradouro: string | null
          name: string
          numero: string | null
          primary_color: string | null
          secondary_color: string | null
          segmento: string | null
          status: string | null
          telefone: string | null
          terms_accepted_at: string | null
          terms_accepted_ip: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          bairro?: string | null
          brand_favicon_url?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          is_internal?: boolean | null
          logo_upload_date?: string | null
          logo_url?: string | null
          logradouro?: string | null
          name: string
          numero?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          segmento?: string | null
          status?: string | null
          telefone?: string | null
          terms_accepted_at?: string | null
          terms_accepted_ip?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          bairro?: string | null
          brand_favicon_url?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          is_internal?: boolean | null
          logo_upload_date?: string | null
          logo_url?: string | null
          logradouro?: string | null
          name?: string
          numero?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          segmento?: string | null
          status?: string | null
          telefone?: string | null
          terms_accepted_at?: string | null
          terms_accepted_ip?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      competencias_ciclo: {
        Row: {
          ciclo_id: string
          conceito_competencia: string | null
          created_at: string
          id: string
          metrica_id: string | null
          nome_competencia: string
          ordem: number
          texto_pergunta_autoavaliacao: string
          texto_pergunta_gestor: string
          updated_at: string
        }
        Insert: {
          ciclo_id: string
          conceito_competencia?: string | null
          created_at?: string
          id?: string
          metrica_id?: string | null
          nome_competencia: string
          ordem?: number
          texto_pergunta_autoavaliacao: string
          texto_pergunta_gestor: string
          updated_at?: string
        }
        Update: {
          ciclo_id?: string
          conceito_competencia?: string | null
          created_at?: string
          id?: string
          metrica_id?: string | null
          nome_competencia?: string
          ordem?: number
          texto_pergunta_autoavaliacao?: string
          texto_pergunta_gestor?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencias_ciclo_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competencias_ciclo_metrica_id_fkey"
            columns: ["metrica_id"]
            isOneToOne: false
            referencedRelation: "metricas_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicado_leituras: {
        Row: {
          company_id: string
          comunicado_id: string
          created_at: string | null
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          comunicado_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          comunicado_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicado_leituras_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicado_leituras_comunicado_id_fkey"
            columns: ["comunicado_id"]
            isOneToOne: false
            referencedRelation: "comunicados"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados: {
        Row: {
          autor_id: string
          autor_nome: string
          company_id: string
          conteudo: string
          created_at: string
          data_publicacao: string | null
          exige_leitura: boolean
          id: string
          image_url: string | null
          is_pinned: boolean
          publico_alvo_tipo: Database["public"]["Enums"]["publico_alvo_tipo"]
          publico_alvo_valor: string | null
          status: Database["public"]["Enums"]["comunicado_status"]
          titulo: string
          updated_at: string
          views_count: number
        }
        Insert: {
          autor_id: string
          autor_nome: string
          company_id: string
          conteudo: string
          created_at?: string
          data_publicacao?: string | null
          exige_leitura?: boolean
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          publico_alvo_tipo?: Database["public"]["Enums"]["publico_alvo_tipo"]
          publico_alvo_valor?: string | null
          status?: Database["public"]["Enums"]["comunicado_status"]
          titulo: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          autor_id?: string
          autor_nome?: string
          company_id?: string
          conteudo?: string
          created_at?: string
          data_publicacao?: string | null
          exige_leitura?: boolean
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          publico_alvo_tipo?: Database["public"]["Enums"]["publico_alvo_tipo"]
          publico_alvo_valor?: string | null
          status?: Database["public"]["Enums"]["comunicado_status"]
          titulo?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      comunicados_anexos: {
        Row: {
          comunicado_id: string
          created_at: string
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_arquivo: string | null
          url_arquivo: string
        }
        Insert: {
          comunicado_id: string
          created_at?: string
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          url_arquivo: string
        }
        Update: {
          comunicado_id?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_anexos_comunicado_id_fkey"
            columns: ["comunicado_id"]
            isOneToOne: false
            referencedRelation: "comunicados"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados_visualizacoes: {
        Row: {
          colaborador_id: string
          comunicado_id: string
          id: string
          visualizado_em: string
        }
        Insert: {
          colaborador_id: string
          comunicado_id: string
          id?: string
          visualizado_em?: string
        }
        Update: {
          colaborador_id?: string
          comunicado_id?: string
          id?: string
          visualizado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_visualizacoes_comunicado_id_fkey"
            columns: ["comunicado_id"]
            isOneToOne: false
            referencedRelation: "comunicados"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          status: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          status?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      cuidar_alertas: {
        Row: {
          acao_em: string | null
          acao_por: string | null
          acao_registrada: string | null
          ano: number | null
          company_id: string | null
          created_at: string
          departamento: string | null
          gatilho: string
          id: string
          mensagem: string
          semana_iso: number | null
          severidade: string
          status: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          acao_em?: string | null
          acao_por?: string | null
          acao_registrada?: string | null
          ano?: number | null
          company_id?: string | null
          created_at?: string
          departamento?: string | null
          gatilho: string
          id?: string
          mensagem: string
          semana_iso?: number | null
          severidade: string
          status?: string
          tipo: string
          user_id?: string | null
        }
        Update: {
          acao_em?: string | null
          acao_por?: string | null
          acao_registrada?: string | null
          ano?: number | null
          company_id?: string | null
          created_at?: string
          departamento?: string | null
          gatilho?: string
          id?: string
          mensagem?: string
          semana_iso?: number | null
          severidade?: string
          status?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuidar_alertas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cuidar_badges: {
        Row: {
          ano: number | null
          badge_descricao: string
          badge_label: string
          badge_tipo: string
          campanha_id: string | null
          company_id: string | null
          created_at: string
          id: string
          score: number | null
          semana_iso: number | null
          user_id: string
        }
        Insert: {
          ano?: number | null
          badge_descricao: string
          badge_label: string
          badge_tipo: string
          campanha_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          score?: number | null
          semana_iso?: number | null
          user_id: string
        }
        Update: {
          ano?: number | null
          badge_descricao?: string
          badge_label?: string
          badge_tipo?: string
          campanha_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          score?: number | null
          semana_iso?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuidar_badges_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "pulse_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuidar_badges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cuidar_conteudos: {
        Row: {
          capa_path: string | null
          categoria: string
          company_id: string | null
          conteudo_detalhado: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          destaque: boolean
          duracao_min: number | null
          id: string
          mime_type: string | null
          origem: string
          parceiro_cta: string | null
          parceiro_nome: string | null
          parceiro_url: string | null
          permite_download: boolean
          status: string
          storage_path: string | null
          tamanho_bytes: number | null
          tipo: string
          titulo: string
          updated_at: string
          url: string | null
        }
        Insert: {
          capa_path?: string | null
          categoria: string
          company_id?: string | null
          conteudo_detalhado?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          destaque?: boolean
          duracao_min?: number | null
          id?: string
          mime_type?: string | null
          origem?: string
          parceiro_cta?: string | null
          parceiro_nome?: string | null
          parceiro_url?: string | null
          permite_download?: boolean
          status?: string
          storage_path?: string | null
          tamanho_bytes?: number | null
          tipo: string
          titulo: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          capa_path?: string | null
          categoria?: string
          company_id?: string | null
          conteudo_detalhado?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          destaque?: boolean
          duracao_min?: number | null
          id?: string
          mime_type?: string | null
          origem?: string
          parceiro_cta?: string | null
          parceiro_nome?: string | null
          parceiro_url?: string | null
          permite_download?: boolean
          status?: string
          storage_path?: string | null
          tamanho_bytes?: number | null
          tipo?: string
          titulo?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuidar_conteudos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cuidar_insights: {
        Row: {
          alertas_json: Json
          ano: number
          calculado_em: string
          company_id: string
          escopo: string
          humor_medio: number | null
          id: string
          mes: number | null
          semana_iso: number | null
          tendencia: number | null
          total_respostas: number
        }
        Insert: {
          alertas_json?: Json
          ano: number
          calculado_em?: string
          company_id: string
          escopo: string
          humor_medio?: number | null
          id?: string
          mes?: number | null
          semana_iso?: number | null
          tendencia?: number | null
          total_respostas?: number
        }
        Update: {
          alertas_json?: Json
          ano?: number
          calculado_em?: string
          company_id?: string
          escopo?: string
          humor_medio?: number | null
          id?: string
          mes?: number | null
          semana_iso?: number | null
          tendencia?: number | null
          total_respostas?: number
        }
        Relationships: [
          {
            foreignKeyName: "cuidar_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cuidar_progressao: {
        Row: {
          best_streak: number
          company_id: string | null
          created_at: string
          streak_semanal: number
          ultima_semana_respondida: number | null
          ultimo_ano_respondido: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          company_id?: string | null
          created_at?: string
          streak_semanal?: number
          ultima_semana_respondida?: number | null
          ultimo_ano_respondido?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          company_id?: string | null
          created_at?: string
          streak_semanal?: number
          ultima_semana_respondida?: number | null
          ultimo_ano_respondido?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuidar_progressao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cuidar_recomendacoes: {
        Row: {
          ano: number | null
          campanha_id: string | null
          company_id: string | null
          contexto: string
          created_at: string
          departamento: string | null
          id: string
          recomendacao: string
          score: number | null
          semana_iso: number | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          ano?: number | null
          campanha_id?: string | null
          company_id?: string | null
          contexto: string
          created_at?: string
          departamento?: string | null
          id?: string
          recomendacao: string
          score?: number | null
          semana_iso?: number | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          ano?: number | null
          campanha_id?: string | null
          company_id?: string | null
          contexto?: string
          created_at?: string
          departamento?: string | null
          id?: string
          recomendacao?: string
          score?: number | null
          semana_iso?: number | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuidar_recomendacoes_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "pulse_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuidar_recomendacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cuidar_templates_fixos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          perguntas_json: Json
          template_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          perguntas_json: Json
          template_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          perguntas_json?: Json
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      denuncias: {
        Row: {
          anonimo: boolean
          categoria_comportamento: string | null
          company_id: string | null
          criado_em: string
          id: string
          mensagem: string
          origem_ofensa: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anonimo?: boolean
          categoria_comportamento?: string | null
          company_id?: string | null
          criado_em?: string
          id?: string
          mensagem: string
          origem_ofensa?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anonimo?: boolean
          categoria_comportamento?: string | null
          company_id?: string | null
          criado_em?: string
          id?: string
          mensagem?: string
          origem_ofensa?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "denuncias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          ativo: boolean
          codigo: string | null
          company_id: string
          created_at: string
          id: string
          nome: string
          responsavel_id: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          company_id: string
          created_at?: string
          id?: string
          nome: string
          responsavel_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          company_id?: string
          created_at?: string
          id?: string
          nome?: string
          responsavel_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_organizacionais"
            referencedColumns: ["id"]
          },
        ]
      }
      dependentes: {
        Row: {
          birth_date: string
          colaborador_id: string
          created_at: string
          id: string
          name: string
          relationship: Database["public"]["Enums"]["relationship_type"]
        }
        Insert: {
          birth_date: string
          colaborador_id: string
          created_at?: string
          id?: string
          name: string
          relationship: Database["public"]["Enums"]["relationship_type"]
        }
        Update: {
          birth_date?: string
          colaborador_id?: string
          created_at?: string
          id?: string
          name?: string
          relationship?: Database["public"]["Enums"]["relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "dependentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      descricao_modelos: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          descricao: string | null
          estrutura: Json
          id: string
          nome: string
          padrao: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          descricao?: string | null
          estrutura?: Json
          id?: string
          nome: string
          padrao?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          descricao?: string | null
          estrutura?: Json
          id?: string
          nome?: string
          padrao?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "descricao_modelos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      descricao_questionario: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          customizacao: Json
          descricao_cargo_id: string
          id: string
          instrucoes: string | null
          modelo_base_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          customizacao?: Json
          descricao_cargo_id: string
          id?: string
          instrucoes?: string | null
          modelo_base_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          customizacao?: Json
          descricao_cargo_id?: string
          id?: string
          instrucoes?: string | null
          modelo_base_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "descricao_questionario_descricao_cargo_id_fkey"
            columns: ["descricao_cargo_id"]
            isOneToOne: true
            referencedRelation: "descricoes_cargo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descricao_questionario_modelo_base_id_fkey"
            columns: ["modelo_base_id"]
            isOneToOne: false
            referencedRelation: "questionario_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      descricoes_cargo: {
        Row: {
          alocacao: string | null
          ativo: boolean
          cargo_id: string | null
          cbo_codigo: string | null
          cbo_descricao: string | null
          company_id: string
          created_at: string
          cursos_desejaveis: string | null
          cursos_necessarios: string | null
          departamento_id: string | null
          descricao_sumaria: string | null
          fator_complexidade: string | null
          fator_experiencia: string | null
          fator_responsabilidade_erros: string | null
          fator_responsabilidade_sigilo: string | null
          formacao_academica: string | null
          ghe_id: string | null
          grupo_organizacional: string | null
          habilidades_comportamentais: string | null
          id: string
          maturidade: string | null
          modelo_id: string | null
          nivel_maturidade: string | null
          reporte: string | null
          responsabilidades: Json
          titulo: string
          updated_at: string
          valores: Json
        }
        Insert: {
          alocacao?: string | null
          ativo?: boolean
          cargo_id?: string | null
          cbo_codigo?: string | null
          cbo_descricao?: string | null
          company_id: string
          created_at?: string
          cursos_desejaveis?: string | null
          cursos_necessarios?: string | null
          departamento_id?: string | null
          descricao_sumaria?: string | null
          fator_complexidade?: string | null
          fator_experiencia?: string | null
          fator_responsabilidade_erros?: string | null
          fator_responsabilidade_sigilo?: string | null
          formacao_academica?: string | null
          ghe_id?: string | null
          grupo_organizacional?: string | null
          habilidades_comportamentais?: string | null
          id?: string
          maturidade?: string | null
          modelo_id?: string | null
          nivel_maturidade?: string | null
          reporte?: string | null
          responsabilidades?: Json
          titulo: string
          updated_at?: string
          valores?: Json
        }
        Update: {
          alocacao?: string | null
          ativo?: boolean
          cargo_id?: string | null
          cbo_codigo?: string | null
          cbo_descricao?: string | null
          company_id?: string
          created_at?: string
          cursos_desejaveis?: string | null
          cursos_necessarios?: string | null
          departamento_id?: string | null
          descricao_sumaria?: string | null
          fator_complexidade?: string | null
          fator_experiencia?: string | null
          fator_responsabilidade_erros?: string | null
          fator_responsabilidade_sigilo?: string | null
          formacao_academica?: string | null
          ghe_id?: string | null
          grupo_organizacional?: string | null
          habilidades_comportamentais?: string | null
          id?: string
          maturidade?: string | null
          modelo_id?: string | null
          nivel_maturidade?: string | null
          reporte?: string | null
          responsabilidades?: Json
          titulo?: string
          updated_at?: string
          valores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "descricoes_cargo_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descricoes_cargo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descricoes_cargo_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descricoes_cargo_ghe_id_fkey"
            columns: ["ghe_id"]
            isOneToOne: false
            referencedRelation: "ghes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "descricoes_cargo_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "descricao_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      desligamentos_colaborador: {
        Row: {
          acao: string
          colaborador_id: string
          criado_em: string | null
          criado_por_user_id: string | null
          data_desligamento: string | null
          id: string
          motivo: string | null
          observacao: string | null
          tipo_desligamento: string | null
        }
        Insert: {
          acao: string
          colaborador_id: string
          criado_em?: string | null
          criado_por_user_id?: string | null
          data_desligamento?: string | null
          id?: string
          motivo?: string | null
          observacao?: string | null
          tipo_desligamento?: string | null
        }
        Update: {
          acao?: string
          colaborador_id?: string
          criado_em?: string | null
          criado_por_user_id?: string | null
          data_desligamento?: string | null
          id?: string
          motivo?: string | null
          observacao?: string | null
          tipo_desligamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desligamentos_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensoes_questionario_cuidar_plus: {
        Row: {
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          order_index: number
          questionario_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          order_index?: number
          questionario_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          order_index?: number
          questionario_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimensoes_questionario_cuidar_plus_questionario_id_fkey"
            columns: ["questionario_id"]
            isOneToOne: false
            referencedRelation: "questionarios_cuidar_plus"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      empresas_clientes: {
        Row: {
          ativo: boolean
          codigo: string | null
          company_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          company_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          company_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_clientes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      envios_cuidar_plus: {
        Row: {
          colaborador_id: string
          created_at: string
          id: string
          questionario_id: string
          responded_at: string | null
          status: string
          token: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          id?: string
          questionario_id: string
          responded_at?: string | null
          status?: string
          token?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          id?: string
          questionario_id?: string
          responded_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "envios_cuidar_plus_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_cuidar_plus_questionario_id_fkey"
            columns: ["questionario_id"]
            isOneToOne: false
            referencedRelation: "questionarios_cuidar_plus"
            referencedColumns: ["id"]
          },
        ]
      }
      espelhos_ponto_mensais: {
        Row: {
          ano: number
          assinatura_em: string | null
          assinatura_hash: string | null
          assinatura_ip: string | null
          assinatura_por: string | null
          colaborador_id: string
          company_id: string
          created_at: string
          dias_abonados: number
          dias_falta: number
          fechado_em: string | null
          fechado_por: string | null
          horas_abonadas_minutos: number
          horas_extras_minutos: number
          horas_noturnas_minutos: number
          horas_trabalhadas_minutos: number
          id: string
          mes: number
          motivo_reabertura: string | null
          pdf_url: string | null
          periodo_fim: string
          periodo_inicio: string
          reaberto_em: string | null
          reaberto_por: string | null
          saldo_minutos: number
          snapshot_jsonb: Json | null
          status: string
          updated_at: string
          versao: number
        }
        Insert: {
          ano: number
          assinatura_em?: string | null
          assinatura_hash?: string | null
          assinatura_ip?: string | null
          assinatura_por?: string | null
          colaborador_id: string
          company_id: string
          created_at?: string
          dias_abonados?: number
          dias_falta?: number
          fechado_em?: string | null
          fechado_por?: string | null
          horas_abonadas_minutos?: number
          horas_extras_minutos?: number
          horas_noturnas_minutos?: number
          horas_trabalhadas_minutos?: number
          id?: string
          mes: number
          motivo_reabertura?: string | null
          pdf_url?: string | null
          periodo_fim: string
          periodo_inicio: string
          reaberto_em?: string | null
          reaberto_por?: string | null
          saldo_minutos?: number
          snapshot_jsonb?: Json | null
          status?: string
          updated_at?: string
          versao?: number
        }
        Update: {
          ano?: number
          assinatura_em?: string | null
          assinatura_hash?: string | null
          assinatura_ip?: string | null
          assinatura_por?: string | null
          colaborador_id?: string
          company_id?: string
          created_at?: string
          dias_abonados?: number
          dias_falta?: number
          fechado_em?: string | null
          fechado_por?: string | null
          horas_abonadas_minutos?: number
          horas_extras_minutos?: number
          horas_noturnas_minutos?: number
          horas_trabalhadas_minutos?: number
          id?: string
          mes?: number
          motivo_reabertura?: string | null
          pdf_url?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          reaberto_em?: string | null
          reaberto_por?: string | null
          saldo_minutos?: number
          snapshot_jsonb?: Json | null
          status?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "espelhos_ponto_mensais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "espelhos_ponto_mensais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_reports: {
        Row: {
          colaborador_id: string
          company_id: string
          created_at: string
          created_by_user_id: string | null
          id: string
          period_end: string | null
          period_start: string | null
          report_text: string | null
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          company_id: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_text?: string | null
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          company_id?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_reports_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_cycles: {
        Row: {
          colaborador_id: string
          collaborator_questionnaire_template_id: string | null
          collaborator_token: string
          company_id: string
          created_at: string
          created_by_user_id: string | null
          due_date: string
          gestor_email: string | null
          gestor_name: string | null
          gestor_questionnaire_template_id: string | null
          gestor_token: string
          id: string
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          questionnaire_template_id: string | null
          status: Database["public"]["Enums"]["feedback_cycle_status"]
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          collaborator_questionnaire_template_id?: string | null
          collaborator_token?: string
          company_id: string
          created_at?: string
          created_by_user_id?: string | null
          due_date: string
          gestor_email?: string | null
          gestor_name?: string | null
          gestor_questionnaire_template_id?: string | null
          gestor_token?: string
          id?: string
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          questionnaire_template_id?: string | null
          status?: Database["public"]["Enums"]["feedback_cycle_status"]
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          collaborator_questionnaire_template_id?: string | null
          collaborator_token?: string
          company_id?: string
          created_at?: string
          created_by_user_id?: string | null
          due_date?: string
          gestor_email?: string | null
          gestor_name?: string | null
          gestor_questionnaire_template_id?: string | null
          gestor_token?: string
          id?: string
          milestone_type?: Database["public"]["Enums"]["milestone_type"]
          questionnaire_template_id?: string | null
          status?: Database["public"]["Enums"]["feedback_cycle_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_cycles_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_cycles_collaborator_questionnaire_template_id_fkey"
            columns: ["collaborator_questionnaire_template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_cycles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_cycles_gestor_questionnaire_template_id_fkey"
            columns: ["gestor_questionnaire_template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_cycles_questionnaire_template_id_fkey"
            columns: ["questionnaire_template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          answer_value_numeric: number | null
          answer_value_text: string | null
          feedback_cycle_id: string
          id: string
          question_id: string
          respondent_type: Database["public"]["Enums"]["respondent_type"]
          submitted_at: string
        }
        Insert: {
          answer_value_numeric?: number | null
          answer_value_text?: string | null
          feedback_cycle_id: string
          id?: string
          question_id: string
          respondent_type: Database["public"]["Enums"]["respondent_type"]
          submitted_at?: string
        }
        Update: {
          answer_value_numeric?: number | null
          answer_value_text?: string | null
          feedback_cycle_id?: string
          id?: string
          question_id?: string
          respondent_type?: Database["public"]["Enums"]["respondent_type"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_feedback_cycle_id_fkey"
            columns: ["feedback_cycle_id"]
            isOneToOne: false
            referencedRelation: "feedback_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks_colaboradores: {
        Row: {
          alerta: boolean
          assunto: string
          colaborador_id: string
          company_id: string
          created_at: string
          data_feedback: string
          detalhes_conversa: string
          id: string
          prazo_retorno: string | null
          registrado_por_nome: string
          registrado_por_user_id: string
          updated_at: string
        }
        Insert: {
          alerta?: boolean
          assunto: string
          colaborador_id: string
          company_id: string
          created_at?: string
          data_feedback?: string
          detalhes_conversa: string
          id?: string
          prazo_retorno?: string | null
          registrado_por_nome: string
          registrado_por_user_id: string
          updated_at?: string
        }
        Update: {
          alerta?: boolean
          assunto?: string
          colaborador_id?: string
          company_id?: string
          created_at?: string
          data_feedback?: string
          detalhes_conversa?: string
          id?: string
          prazo_retorno?: string | null
          registrado_por_nome?: string
          registrado_por_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      feriados: {
        Row: {
          company_id: string | null
          created_at: string
          data: string
          id: string
          nome: string
          recorrente: boolean
          tipo: string
          uf: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          data: string
          id?: string
          nome: string
          recorrente?: boolean
          tipo: string
          uf?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          data?: string
          id?: string
          nome?: string
          recorrente?: boolean
          tipo?: string
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feriados_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_gozo: {
        Row: {
          abono_pecuniario_dias: number
          aprovado_em: string | null
          aprovado_por: string | null
          colaborador_id: string
          company_id: string
          created_at: string
          data_fim_gozo: string
          data_inicio_gozo: string
          data_pagamento: string
          dias_gozados: number
          id: string
          observacoes: string | null
          periodo_aquisitivo_id: string
          solicitado_por: string | null
          status: Database["public"]["Enums"]["ferias_gozo_status"]
          updated_at: string
        }
        Insert: {
          abono_pecuniario_dias?: number
          aprovado_em?: string | null
          aprovado_por?: string | null
          colaborador_id: string
          company_id: string
          created_at?: string
          data_fim_gozo: string
          data_inicio_gozo: string
          data_pagamento: string
          dias_gozados: number
          id?: string
          observacoes?: string | null
          periodo_aquisitivo_id: string
          solicitado_por?: string | null
          status?: Database["public"]["Enums"]["ferias_gozo_status"]
          updated_at?: string
        }
        Update: {
          abono_pecuniario_dias?: number
          aprovado_em?: string | null
          aprovado_por?: string | null
          colaborador_id?: string
          company_id?: string
          created_at?: string
          data_fim_gozo?: string
          data_inicio_gozo?: string
          data_pagamento?: string
          dias_gozados?: number
          id?: string
          observacoes?: string | null
          periodo_aquisitivo_id?: string
          solicitado_por?: string | null
          status?: Database["public"]["Enums"]["ferias_gozo_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_gozo_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_gozo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_gozo_periodo_aquisitivo_id_fkey"
            columns: ["periodo_aquisitivo_id"]
            isOneToOne: false
            referencedRelation: "ferias_periodos_aquisitivos"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_periodos_aquisitivos: {
        Row: {
          colaborador_id: string
          company_id: string
          created_at: string
          data_fim_aquisitivo: string
          data_inicio_aquisitivo: string
          data_limite_gozo: string
          dias_adquiridos: number
          id: string
          status: Database["public"]["Enums"]["periodo_aquisitivo_status"]
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          company_id: string
          created_at?: string
          data_fim_aquisitivo: string
          data_inicio_aquisitivo: string
          data_limite_gozo: string
          dias_adquiridos?: number
          id?: string
          status?: Database["public"]["Enums"]["periodo_aquisitivo_status"]
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          company_id?: string
          created_at?: string
          data_fim_aquisitivo?: string
          data_inicio_aquisitivo?: string
          data_limite_gozo?: string
          dias_adquiridos?: number
          id?: string
          status?: Database["public"]["Enums"]["periodo_aquisitivo_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_periodos_aquisitivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_periodos_aquisitivos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_profissional: {
        Row: {
          breve_resumo: string | null
          career_grid_stars: Json | null
          colaborador_id: string
          company_id: string
          created_at: string
          cursos_realizados: string | null
          formacao_academica: string | null
          id: string
          updated_at: string
        }
        Insert: {
          breve_resumo?: string | null
          career_grid_stars?: Json | null
          colaborador_id: string
          company_id: string
          created_at?: string
          cursos_realizados?: string | null
          formacao_academica?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          breve_resumo?: string | null
          career_grid_stars?: Json | null
          colaborador_id?: string
          company_id?: string
          created_at?: string
          cursos_realizados?: string | null
          formacao_academica?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_profissional_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: true
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_profissional_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ghe_epis: {
        Row: {
          ativo: boolean
          ca_numero: string | null
          company_id: string
          created_at: string
          descricao: string | null
          ghe_id: string
          id: string
          nome_epi: string
          obrigatorio: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          ca_numero?: string | null
          company_id: string
          created_at?: string
          descricao?: string | null
          ghe_id: string
          id?: string
          nome_epi: string
          obrigatorio?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          ca_numero?: string | null
          company_id?: string
          created_at?: string
          descricao?: string | null
          ghe_id?: string
          id?: string
          nome_epi?: string
          obrigatorio?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghe_epis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghe_epis_ghe_id_fkey"
            columns: ["ghe_id"]
            isOneToOne: false
            referencedRelation: "ghes"
            referencedColumns: ["id"]
          },
        ]
      }
      ghes: {
        Row: {
          ativo: boolean
          codigo: string | null
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          setor_id: string | null
          tipo_exposicao: Database["public"]["Enums"]["tipo_exposicao"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          setor_id?: string | null
          tipo_exposicao?: Database["public"]["Enums"]["tipo_exposicao"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          setor_id?: string | null
          tipo_exposicao?: Database["public"]["Enums"]["tipo_exposicao"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_audit_logs: {
        Row: {
          action: string
          collaborator_id: string | null
          collaborator_name: string | null
          company_id: string | null
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          requested_by: string | null
          requested_by_email: string | null
        }
        Insert: {
          action: string
          collaborator_id?: string | null
          collaborator_name?: string | null
          company_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          requested_by?: string | null
          requested_by_email?: string | null
        }
        Update: {
          action?: string
          collaborator_id?: string | null
          collaborator_name?: string | null
          company_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          requested_by?: string | null
          requested_by_email?: string | null
        }
        Relationships: []
      }
      metricas_avaliacao: {
        Row: {
          ciclo_id: string
          created_at: string
          id: string
          nome_metrica: string
          tipo_metrica: Database["public"]["Enums"]["tipo_metrica"]
          updated_at: string
          valores_escala: Json
        }
        Insert: {
          ciclo_id: string
          created_at?: string
          id?: string
          nome_metrica: string
          tipo_metrica: Database["public"]["Enums"]["tipo_metrica"]
          updated_at?: string
          valores_escala?: Json
        }
        Update: {
          ciclo_id?: string
          created_at?: string
          id?: string
          nome_metrica?: string
          tipo_metrica?: Database["public"]["Enums"]["tipo_metrica"]
          updated_at?: string
          valores_escala?: Json
        }
        Relationships: [
          {
            foreignKeyName: "metricas_avaliacao_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas_valores: {
        Row: {
          created_at: string
          id: string
          metrica_id: string
          ordem: number
          peso: number
          valor_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrica_id: string
          ordem?: number
          peso?: number
          valor_label: string
        }
        Update: {
          created_at?: string
          id?: string
          metrica_id?: string
          ordem?: number
          peso?: number
          valor_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "metricas_valores_metrica_id_fkey"
            columns: ["metrica_id"]
            isOneToOne: false
            referencedRelation: "metricas_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      niveis_maturidade: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niveis_maturidade_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          company_id: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          priority: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          company_id: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          priority?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          company_id?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          priority?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_ghe_riscos: {
        Row: {
          ativo: boolean
          categoria: string
          company_id: string
          controles_existentes: string | null
          created_at: string
          descricao: string | null
          fonte: string
          ghe_id: string
          id: string
          nivel_risco: number | null
          nome_risco: string
          origem_dados: string | null
          probabilidade: number
          risco_id: string | null
          severidade: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          company_id: string
          controles_existentes?: string | null
          created_at?: string
          descricao?: string | null
          fonte?: string
          ghe_id: string
          id?: string
          nivel_risco?: number | null
          nome_risco: string
          origem_dados?: string | null
          probabilidade: number
          risco_id?: string | null
          severidade: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          company_id?: string
          controles_existentes?: string | null
          created_at?: string
          descricao?: string | null
          fonte?: string
          ghe_id?: string
          id?: string
          nivel_risco?: number | null
          nome_risco?: string
          origem_dados?: string | null
          probabilidade?: number
          risco_id?: string | null
          severidade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_ghe_riscos_ghe_id_fkey"
            columns: ["ghe_id"]
            isOneToOne: false
            referencedRelation: "ghes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_ghe_riscos_risco_id_fkey"
            columns: ["risco_id"]
            isOneToOne: false
            referencedRelation: "nr1_riscos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_matriz_config: {
        Row: {
          company_id: string
          corte_amarelo: number
          corte_laranja: number
          corte_verde: number
          corte_vermelho: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          corte_amarelo?: number
          corte_laranja?: number
          corte_verde?: number
          corte_vermelho?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          corte_amarelo?: number
          corte_laranja?: number
          corte_verde?: number
          corte_vermelho?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      nr1_planos_acao: {
        Row: {
          ativacao_id: string | null
          avaliacao_id: string | null
          company_id: string
          concluido_em: string | null
          created_at: string
          criado_por: string
          departamento: string | null
          descricao: string | null
          dimensao_id: string | null
          dimensao_nome: string | null
          escala: number | null
          grupo_id: string | null
          grupo_nome: string | null
          grupo_tipo: string | null
          id: string
          indice: number | null
          media: number | null
          nivel_intervencao: string | null
          nivel_risco: string
          origem: string
          participacao_trabalhadores: boolean
          prazo: string | null
          responsavel_id: string | null
          status: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          ativacao_id?: string | null
          avaliacao_id?: string | null
          company_id: string
          concluido_em?: string | null
          created_at?: string
          criado_por: string
          departamento?: string | null
          descricao?: string | null
          dimensao_id?: string | null
          dimensao_nome?: string | null
          escala?: number | null
          grupo_id?: string | null
          grupo_nome?: string | null
          grupo_tipo?: string | null
          id?: string
          indice?: number | null
          media?: number | null
          nivel_intervencao?: string | null
          nivel_risco: string
          origem: string
          participacao_trabalhadores?: boolean
          prazo?: string | null
          responsavel_id?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          ativacao_id?: string | null
          avaliacao_id?: string | null
          company_id?: string
          concluido_em?: string | null
          created_at?: string
          criado_por?: string
          departamento?: string | null
          descricao?: string | null
          dimensao_id?: string | null
          dimensao_nome?: string | null
          escala?: number | null
          grupo_id?: string | null
          grupo_nome?: string | null
          grupo_tipo?: string | null
          id?: string
          indice?: number | null
          media?: number | null
          nivel_intervencao?: string | null
          nivel_risco?: string
          origem?: string
          participacao_trabalhadores?: boolean
          prazo?: string | null
          responsavel_id?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_planos_acao_ativacao_id_fkey"
            columns: ["ativacao_id"]
            isOneToOne: false
            referencedRelation: "nr1_proart_ativacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_planos_acao_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "psico_avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_planos_acao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_planos_acao_dimensao_id_fkey"
            columns: ["dimensao_id"]
            isOneToOne: false
            referencedRelation: "psico_dimensoes"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_proart_ativacoes: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          criado_por: string
          data_fim: string
          data_inicio: string
          id: string
          tamanho_censo: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          criado_por: string
          data_fim: string
          data_inicio: string
          id?: string
          tamanho_censo?: number
          titulo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          criado_por?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          tamanho_censo?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      nr1_proart_perguntas: {
        Row: {
          created_at: string
          escala: number
          id: string
          numero: number
          texto: string
        }
        Insert: {
          created_at?: string
          escala: number
          id?: string
          numero: number
          texto: string
        }
        Update: {
          created_at?: string
          escala?: number
          id?: string
          numero?: number
          texto?: string
        }
        Relationships: []
      }
      nr1_proart_respostas: {
        Row: {
          cargo: string | null
          colaborador_id: string
          company_id: string
          created_at: string
          departamento: string | null
          dificuldades: string | null
          escala_1_media: number | null
          escala_2_media: number | null
          escala_3_media: number | null
          escala_4_media: number | null
          id: string
          idade: number | null
          lidar_com_dificuldades: string | null
          modalidade_trabalho: string | null
          pcd: boolean | null
          sexo: string | null
          submitted_at: string
        }
        Insert: {
          cargo?: string | null
          colaborador_id: string
          company_id: string
          created_at?: string
          departamento?: string | null
          dificuldades?: string | null
          escala_1_media?: number | null
          escala_2_media?: number | null
          escala_3_media?: number | null
          escala_4_media?: number | null
          id?: string
          idade?: number | null
          lidar_com_dificuldades?: string | null
          modalidade_trabalho?: string | null
          pcd?: boolean | null
          sexo?: string | null
          submitted_at?: string
        }
        Update: {
          cargo?: string | null
          colaborador_id?: string
          company_id?: string
          created_at?: string
          departamento?: string | null
          dificuldades?: string | null
          escala_1_media?: number | null
          escala_2_media?: number | null
          escala_3_media?: number | null
          escala_4_media?: number | null
          id?: string
          idade?: number | null
          lidar_com_dificuldades?: string | null
          modalidade_trabalho?: string | null
          pcd?: boolean | null
          sexo?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_proart_respostas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nr1_proart_respostas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_regras_sugestao: {
        Row: {
          ativo: boolean
          campo_busca: string | null
          created_at: string
          id: string
          palavras_chave: string | null
          probabilidade_sugerida: number
          risco_catalogo_id: string | null
          severidade_sugerida: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          campo_busca?: string | null
          created_at?: string
          id?: string
          palavras_chave?: string | null
          probabilidade_sugerida?: number
          risco_catalogo_id?: string | null
          severidade_sugerida?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          campo_busca?: string | null
          created_at?: string
          id?: string
          palavras_chave?: string | null
          probabilidade_sugerida?: number
          risco_catalogo_id?: string | null
          severidade_sugerida?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nr1_regras_sugestao_risco_catalogo_id_fkey"
            columns: ["risco_catalogo_id"]
            isOneToOne: false
            referencedRelation: "nr1_riscos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      nr1_riscos_catalogo: {
        Row: {
          ativo: boolean
          categoria: string
          company_id: string | null
          created_at: string
          descricao: string | null
          editavel: boolean
          fatores_risco: string | null
          id: string
          medidas_controle: string | null
          nome: string
          palavras_chave: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          editavel?: boolean
          fatores_risco?: string | null
          id?: string
          medidas_controle?: string | null
          nome: string
          palavras_chave?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          editavel?: boolean
          fatores_risco?: string | null
          id?: string
          medidas_controle?: string | null
          nome?: string
          palavras_chave?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      objetivos_ciclo: {
        Row: {
          ciclo_id: string
          created_at: string
          descricao_objetivo: string | null
          id: string
          metrica_id: string | null
          nome_objetivo: string
          ordem: number
          texto_pergunta_autoavaliacao: string
          texto_pergunta_gestor: string
          updated_at: string
        }
        Insert: {
          ciclo_id: string
          created_at?: string
          descricao_objetivo?: string | null
          id?: string
          metrica_id?: string | null
          nome_objetivo: string
          ordem?: number
          texto_pergunta_autoavaliacao: string
          texto_pergunta_gestor: string
          updated_at?: string
        }
        Update: {
          ciclo_id?: string
          created_at?: string
          descricao_objetivo?: string | null
          id?: string
          metrica_id?: string | null
          nome_objetivo?: string
          ordem?: number
          texto_pergunta_autoavaliacao?: string
          texto_pergunta_gestor?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objetivos_ciclo_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objetivos_ciclo_metrica_id_fkey"
            columns: ["metrica_id"]
            isOneToOne: false
            referencedRelation: "metricas_avaliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_steps: string[]
          created_at: string
          current_step: number
          dismissed: boolean
          id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_steps?: string[]
          created_at?: string
          current_step?: number
          dismissed?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_steps?: string[]
          created_at?: string
          current_step?: number
          dismissed?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pdi_checkins: {
        Row: {
          autor_id: string
          comentario: string
          created_at: string
          id: string
          pdi_item_id: string
          progresso_percentual: number | null
        }
        Insert: {
          autor_id: string
          comentario: string
          created_at?: string
          id?: string
          pdi_item_id: string
          progresso_percentual?: number | null
        }
        Update: {
          autor_id?: string
          comentario?: string
          created_at?: string
          id?: string
          pdi_item_id?: string
          progresso_percentual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pdi_checkins_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_checkins_pdi_item_id_fkey"
            columns: ["pdi_item_id"]
            isOneToOne: false
            referencedRelation: "pdi_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      pdi_itens: {
        Row: {
          competencia_id: string | null
          created_at: string
          descricao: string | null
          evidencias: string | null
          id: string
          objetivo_id: string | null
          pdi_id: string
          prazo: string | null
          progresso_percentual: number
          responsavel: Database["public"]["Enums"]["pdi_item_responsavel"]
          status: Database["public"]["Enums"]["pdi_item_status"]
          tipo_acao: Database["public"]["Enums"]["pdi_item_tipo_acao"]
          tipo_alvo: Database["public"]["Enums"]["pdi_item_tipo_alvo"]
          titulo: string
          treinamento_id: string | null
          updated_at: string
        }
        Insert: {
          competencia_id?: string | null
          created_at?: string
          descricao?: string | null
          evidencias?: string | null
          id?: string
          objetivo_id?: string | null
          pdi_id: string
          prazo?: string | null
          progresso_percentual?: number
          responsavel?: Database["public"]["Enums"]["pdi_item_responsavel"]
          status?: Database["public"]["Enums"]["pdi_item_status"]
          tipo_acao?: Database["public"]["Enums"]["pdi_item_tipo_acao"]
          tipo_alvo?: Database["public"]["Enums"]["pdi_item_tipo_alvo"]
          titulo: string
          treinamento_id?: string | null
          updated_at?: string
        }
        Update: {
          competencia_id?: string | null
          created_at?: string
          descricao?: string | null
          evidencias?: string | null
          id?: string
          objetivo_id?: string | null
          pdi_id?: string
          prazo?: string | null
          progresso_percentual?: number
          responsavel?: Database["public"]["Enums"]["pdi_item_responsavel"]
          status?: Database["public"]["Enums"]["pdi_item_status"]
          tipo_acao?: Database["public"]["Enums"]["pdi_item_tipo_acao"]
          tipo_alvo?: Database["public"]["Enums"]["pdi_item_tipo_alvo"]
          titulo?: string
          treinamento_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdi_itens_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias_ciclo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_itens_objetivo_id_fkey"
            columns: ["objetivo_id"]
            isOneToOne: false
            referencedRelation: "objetivos_ciclo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_itens_pdi_id_fkey"
            columns: ["pdi_id"]
            isOneToOne: false
            referencedRelation: "pdis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdi_itens_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pdis: {
        Row: {
          avaliacao_id: string
          ciclo_id: string
          colaborador_id: string
          created_at: string
          created_by_colaborador: boolean
          data_fim_prevista: string | null
          data_inicio: string
          gestor_id: string | null
          id: string
          observacoes_gerais: string | null
          status: Database["public"]["Enums"]["pdi_status"]
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          ciclo_id: string
          colaborador_id: string
          created_at?: string
          created_by_colaborador?: boolean
          data_fim_prevista?: string | null
          data_inicio?: string
          gestor_id?: string | null
          id?: string
          observacoes_gerais?: string | null
          status?: Database["public"]["Enums"]["pdi_status"]
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          ciclo_id?: string
          colaborador_id?: string
          created_at?: string
          created_by_colaborador?: boolean
          data_fim_prevista?: string | null
          data_inicio?: string
          gestor_id?: string | null
          id?: string
          observacoes_gerais?: string | null
          status?: Database["public"]["Enums"]["pdi_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdis_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: true
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdis_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_avaliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdis_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdis_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas_cuidar_plus: {
        Row: {
          bloco: string | null
          created_at: string
          dimensao: string | null
          dimensao_questionario_id: string | null
          escala_config: Json | null
          id: string
          is_invertida: boolean
          order_index: number
          pergunta_texto: string
          peso: number
          questionario_id: string
          tipo_pergunta: string
          updated_at: string
        }
        Insert: {
          bloco?: string | null
          created_at?: string
          dimensao?: string | null
          dimensao_questionario_id?: string | null
          escala_config?: Json | null
          id?: string
          is_invertida?: boolean
          order_index?: number
          pergunta_texto: string
          peso?: number
          questionario_id: string
          tipo_pergunta: string
          updated_at?: string
        }
        Update: {
          bloco?: string | null
          created_at?: string
          dimensao?: string | null
          dimensao_questionario_id?: string | null
          escala_config?: Json | null
          id?: string
          is_invertida?: boolean
          order_index?: number
          pergunta_texto?: string
          peso?: number
          questionario_id?: string
          tipo_pergunta?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_cuidar_plus_dimensao_questionario_id_fkey"
            columns: ["dimensao_questionario_id"]
            isOneToOne: false
            referencedRelation: "dimensoes_questionario_cuidar_plus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perguntas_cuidar_plus_questionario_id_fkey"
            columns: ["questionario_id"]
            isOneToOne: false
            referencedRelation: "questionarios_cuidar_plus"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_alteracoes: {
        Row: {
          created_at: string
          data: string
          documento_id: string
          historico: string
          id: string
          numero: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          documento_id: string
          historico?: string
          id?: string
          numero?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          documento_id?: string
          historico?: string
          id?: string
          numero?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pgr_alteracoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "pgr_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_documentos: {
        Row: {
          anexo_art_path: string | null
          cnae: string | null
          company_id: string
          created_at: string
          endereco: string | null
          grau_risco: string | null
          id: string
          responsavel_tecnico: Json
          status: string
          titulo: string
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          anexo_art_path?: string | null
          cnae?: string | null
          company_id: string
          created_at?: string
          endereco?: string | null
          grau_risco?: string | null
          id?: string
          responsavel_tecnico?: Json
          status?: string
          titulo?: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          anexo_art_path?: string | null
          cnae?: string | null
          company_id?: string
          created_at?: string
          endereco?: string | null
          grau_risco?: string | null
          id?: string
          responsavel_tecnico?: Json
          status?: string
          titulo?: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pgr_documentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_psicossocial_dominios: {
        Row: {
          classificacao: string | null
          created_at: string
          documento_id: string
          grupo: string
          id: string
          mediana: number | null
          nome_dominio: string
          ordem: number
          peso: number
          polaridade: string
          updated_at: string
        }
        Insert: {
          classificacao?: string | null
          created_at?: string
          documento_id: string
          grupo?: string
          id?: string
          mediana?: number | null
          nome_dominio: string
          ordem?: number
          peso?: number
          polaridade?: string
          updated_at?: string
        }
        Update: {
          classificacao?: string | null
          created_at?: string
          documento_id?: string
          grupo?: string
          id?: string
          mediana?: number | null
          nome_dominio?: string
          ordem?: number
          peso?: number
          polaridade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pgr_psicossocial_dominios_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "pgr_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_risco_detalhes: {
        Row: {
          acoes_necessarias: string | null
          created_at: string
          fontes_circunstancias: string | null
          fundamentacao_legal: string | null
          id: string
          lesoes_agravos: string | null
          meio_propagacao: string | null
          observacao: string | null
          risco_ghe_id: string
          updated_at: string
        }
        Insert: {
          acoes_necessarias?: string | null
          created_at?: string
          fontes_circunstancias?: string | null
          fundamentacao_legal?: string | null
          id?: string
          lesoes_agravos?: string | null
          meio_propagacao?: string | null
          observacao?: string | null
          risco_ghe_id: string
          updated_at?: string
        }
        Update: {
          acoes_necessarias?: string | null
          created_at?: string
          fontes_circunstancias?: string | null
          fundamentacao_legal?: string | null
          id?: string
          lesoes_agravos?: string | null
          meio_propagacao?: string | null
          observacao?: string | null
          risco_ghe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pgr_risco_detalhes_risco_ghe_id_fkey"
            columns: ["risco_ghe_id"]
            isOneToOne: true
            referencedRelation: "nr1_ghe_riscos"
            referencedColumns: ["id"]
          },
        ]
      }
      pgr_secoes: {
        Row: {
          ativo: boolean
          chave_automatica: string | null
          conteudo: string | null
          created_at: string
          documento_id: string
          id: string
          numero: string | null
          ordem: number
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave_automatica?: string | null
          conteudo?: string | null
          created_at?: string
          documento_id: string
          id?: string
          numero?: string | null
          ordem?: number
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave_automatica?: string | null
          conteudo?: string | null
          created_at?: string
          documento_id?: string
          id?: string
          numero?: string | null
          ordem?: number
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pgr_secoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "pgr_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          target_company_id: string | null
          target_company_name: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_company_id?: string | null
          target_company_name?: string | null
          user_email?: string | null
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_company_id?: string | null
          target_company_name?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ponto_abonos: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          colaborador_id: string
          company_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          justificativa: string
          lancado_em: string
          lancado_por: string | null
          minutos_abonados: number | null
          modalidade: string
          motivo_cancelamento: string | null
          status: string
          tipo_abono_id: string
          updated_at: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          colaborador_id: string
          company_id: string
          created_at?: string
          data_fim: string
          data_inicio: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          justificativa: string
          lancado_em?: string
          lancado_por?: string | null
          minutos_abonados?: number | null
          modalidade?: string
          motivo_cancelamento?: string | null
          status?: string
          tipo_abono_id: string
          updated_at?: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          colaborador_id?: string
          company_id?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          justificativa?: string
          lancado_em?: string
          lancado_por?: string | null
          minutos_abonados?: number | null
          modalidade?: string
          motivo_cancelamento?: string | null
          status?: string
          tipo_abono_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_abonos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_abonos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_abonos_tipo_abono_id_fkey"
            columns: ["tipo_abono_id"]
            isOneToOne: false
            referencedRelation: "ponto_tipos_abono"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_compensacoes: {
        Row: {
          ativo: boolean | null
          company_id: string
          created_at: string | null
          data_fim: string
          data_inicio: string
          descricao: string
          dias_compensacao: number
          id: string
          minutos_extras_dia: number | null
          total_horas_compensar: number
        }
        Insert: {
          ativo?: boolean | null
          company_id: string
          created_at?: string | null
          data_fim: string
          data_inicio: string
          descricao: string
          dias_compensacao: number
          id?: string
          minutos_extras_dia?: number | null
          total_horas_compensar: number
        }
        Update: {
          ativo?: boolean | null
          company_id?: string
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string
          dias_compensacao?: number
          id?: string
          minutos_extras_dia?: number | null
          total_horas_compensar?: number
        }
        Relationships: [
          {
            foreignKeyName: "ponto_compensacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_configuracoes: {
        Row: {
          adicional_hora_extra_domingo_pct: number
          adicional_hora_extra_pct: number
          adicional_noturno_pct: number
          banco_horas_ativo: boolean
          banco_horas_fim: string | null
          banco_horas_inicio: string | null
          bonus_domingo_pct: number
          bonus_feriado_pct: number
          bonus_fora_escala_ativo: boolean
          bonus_sabado_pct: number
          company_id: string
          created_at: string
          faixas_hora_extra: Json | null
          fim_noturno: string
          geolocation_required: boolean
          id: string
          inicio_noturno: string
          intervalo_minutos: number
          jornada_diaria_minutos: number
          periodo_fechamento_banco: string
          tolerancia_minutos: number
          updated_at: string
        }
        Insert: {
          adicional_hora_extra_domingo_pct?: number
          adicional_hora_extra_pct?: number
          adicional_noturno_pct?: number
          banco_horas_ativo?: boolean
          banco_horas_fim?: string | null
          banco_horas_inicio?: string | null
          bonus_domingo_pct?: number
          bonus_feriado_pct?: number
          bonus_fora_escala_ativo?: boolean
          bonus_sabado_pct?: number
          company_id: string
          created_at?: string
          faixas_hora_extra?: Json | null
          fim_noturno?: string
          geolocation_required?: boolean
          id?: string
          inicio_noturno?: string
          intervalo_minutos?: number
          jornada_diaria_minutos?: number
          periodo_fechamento_banco?: string
          tolerancia_minutos?: number
          updated_at?: string
        }
        Update: {
          adicional_hora_extra_domingo_pct?: number
          adicional_hora_extra_pct?: number
          adicional_noturno_pct?: number
          banco_horas_ativo?: boolean
          banco_horas_fim?: string | null
          banco_horas_inicio?: string | null
          bonus_domingo_pct?: number
          bonus_feriado_pct?: number
          bonus_fora_escala_ativo?: boolean
          bonus_sabado_pct?: number
          company_id?: string
          created_at?: string
          faixas_hora_extra?: Json | null
          fim_noturno?: string
          geolocation_required?: boolean
          id?: string
          inicio_noturno?: string
          intervalo_minutos?: number
          jornada_diaria_minutos?: number
          periodo_fechamento_banco?: string
          tolerancia_minutos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_configuracoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_fechamento_tratativas: {
        Row: {
          acao: Database["public"]["Enums"]["tratativa_saldo_acao"]
          ajuste_resumo_data: string | null
          colaborador_id: string
          company_id: string
          created_at: string
          decidido_em: string
          decidido_por: string
          id: string
          observacao: string | null
          periodo_fim: string
          periodo_inicio: string
          saldo_minutos: number
          updated_at: string
        }
        Insert: {
          acao: Database["public"]["Enums"]["tratativa_saldo_acao"]
          ajuste_resumo_data?: string | null
          colaborador_id: string
          company_id: string
          created_at?: string
          decidido_em?: string
          decidido_por: string
          id?: string
          observacao?: string | null
          periodo_fim: string
          periodo_inicio: string
          saldo_minutos: number
          updated_at?: string
        }
        Update: {
          acao?: Database["public"]["Enums"]["tratativa_saldo_acao"]
          ajuste_resumo_data?: string | null
          colaborador_id?: string
          company_id?: string
          created_at?: string
          decidido_em?: string
          decidido_por?: string
          id?: string
          observacao?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          saldo_minutos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_fechamento_tratativas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_registros: {
        Row: {
          ajustado_por: string | null
          ajuste_manual: boolean
          ajuste_motivo: string | null
          aprovado_em: string | null
          aprovado_por: string | null
          auto_reason: string | null
          colaborador_id: string
          company_id: string
          created_at: string
          data_hora: string
          exclusao_motivo: string | null
          exclusao_pendente: boolean
          exclusao_solicitada_em: string | null
          id: string
          is_auto: boolean
          justificativa: string | null
          latitude: number | null
          longitude: number | null
          observacao: string | null
          status_aprovacao: string
          tipo: Database["public"]["Enums"]["ponto_registro_tipo"]
        }
        Insert: {
          ajustado_por?: string | null
          ajuste_manual?: boolean
          ajuste_motivo?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          auto_reason?: string | null
          colaborador_id: string
          company_id: string
          created_at?: string
          data_hora?: string
          exclusao_motivo?: string | null
          exclusao_pendente?: boolean
          exclusao_solicitada_em?: string | null
          id?: string
          is_auto?: boolean
          justificativa?: string | null
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          status_aprovacao?: string
          tipo: Database["public"]["Enums"]["ponto_registro_tipo"]
        }
        Update: {
          ajustado_por?: string | null
          ajuste_manual?: boolean
          ajuste_motivo?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          auto_reason?: string | null
          colaborador_id?: string
          company_id?: string
          created_at?: string
          data_hora?: string
          exclusao_motivo?: string | null
          exclusao_pendente?: boolean
          exclusao_solicitada_em?: string | null
          id?: string
          is_auto?: boolean
          justificativa?: string | null
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          status_aprovacao?: string
          tipo?: Database["public"]["Enums"]["ponto_registro_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "ponto_registros_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_registros_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_resumo_diario: {
        Row: {
          colaborador_id: string
          company_id: string
          created_at: string
          data: string
          horas_extras_minutos: number
          horas_intervalo_minutos: number
          horas_noturnas_minutos: number
          horas_previstas_minutos: number
          horas_trabalhadas_minutos: number
          id: string
          observacoes: string | null
          saldo_minutos: number
          status: Database["public"]["Enums"]["ponto_resumo_status"]
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          company_id: string
          created_at?: string
          data: string
          horas_extras_minutos?: number
          horas_intervalo_minutos?: number
          horas_noturnas_minutos?: number
          horas_previstas_minutos?: number
          horas_trabalhadas_minutos?: number
          id?: string
          observacoes?: string | null
          saldo_minutos?: number
          status?: Database["public"]["Enums"]["ponto_resumo_status"]
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          company_id?: string
          created_at?: string
          data?: string
          horas_extras_minutos?: number
          horas_intervalo_minutos?: number
          horas_noturnas_minutos?: number
          horas_previstas_minutos?: number
          horas_trabalhadas_minutos?: number
          id?: string
          observacoes?: string | null
          saldo_minutos?: number
          status?: Database["public"]["Enums"]["ponto_resumo_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_resumo_diario_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_resumo_diario_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_tipos_abono: {
        Row: {
          abona_horas: boolean
          ativo: boolean
          base_legal: string | null
          categoria: string
          codigo: string
          company_id: string
          created_at: string
          dias_maximos_sugeridos: number | null
          exige_anexo: boolean
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          abona_horas?: boolean
          ativo?: boolean
          base_legal?: string | null
          categoria?: string
          codigo: string
          company_id: string
          created_at?: string
          dias_maximos_sugeridos?: number | null
          exige_anexo?: boolean
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          abona_horas?: boolean
          ativo?: boolean
          base_legal?: string | null
          categoria?: string
          codigo?: string
          company_id?: string
          created_at?: string
          dias_maximos_sugeridos?: number | null
          exige_anexo?: boolean
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_tipos_abono_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      promocoes_colaborador: {
        Row: {
          aprovado_por: string
          cargo_anterior: string
          cargo_novo: string
          colaborador_id: string
          company_id: string
          created_at: string | null
          created_by_user_id: string | null
          data_promocao: string
          departamento_anterior: string | null
          departamento_novo: string | null
          id: string
          motivo: string | null
          nivel_anterior: string | null
          nivel_novo: string | null
          observacoes: string | null
          salario_anterior: number
          salario_novo: number
        }
        Insert: {
          aprovado_por: string
          cargo_anterior: string
          cargo_novo: string
          colaborador_id: string
          company_id: string
          created_at?: string | null
          created_by_user_id?: string | null
          data_promocao: string
          departamento_anterior?: string | null
          departamento_novo?: string | null
          id?: string
          motivo?: string | null
          nivel_anterior?: string | null
          nivel_novo?: string | null
          observacoes?: string | null
          salario_anterior: number
          salario_novo: number
        }
        Update: {
          aprovado_por?: string
          cargo_anterior?: string
          cargo_novo?: string
          colaborador_id?: string
          company_id?: string
          created_at?: string | null
          created_by_user_id?: string | null
          data_promocao?: string
          departamento_anterior?: string | null
          departamento_novo?: string | null
          id?: string
          motivo?: string | null
          nivel_anterior?: string | null
          nivel_novo?: string | null
          observacoes?: string | null
          salario_anterior?: number
          salario_novo?: number
        }
        Relationships: [
          {
            foreignKeyName: "promocoes_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocoes_colaborador_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      psico_atribuicoes: {
        Row: {
          avaliacao_id: string
          colaborador_id: string
          created_at: string
          data_atribuicao: string
          data_resposta: string | null
          ghe_id: string
          id: string
          rascunho: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          colaborador_id: string
          created_at?: string
          data_atribuicao?: string
          data_resposta?: string | null
          ghe_id: string
          id?: string
          rascunho?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          colaborador_id?: string
          created_at?: string
          data_atribuicao?: string
          data_resposta?: string | null
          ghe_id?: string
          id?: string
          rascunho?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psico_atribuicoes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "psico_avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psico_atribuicoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psico_atribuicoes_ghe_id_fkey"
            columns: ["ghe_id"]
            isOneToOne: false
            referencedRelation: "ghes"
            referencedColumns: ["id"]
          },
        ]
      }
      psico_avaliacao_ghes: {
        Row: {
          avaliacao_id: string
          ghe_id: string
        }
        Insert: {
          avaliacao_id: string
          ghe_id: string
        }
        Update: {
          avaliacao_id?: string
          ghe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psico_avaliacao_ghes_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "psico_avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psico_avaliacao_ghes_ghe_id_fkey"
            columns: ["ghe_id"]
            isOneToOne: false
            referencedRelation: "ghes"
            referencedColumns: ["id"]
          },
        ]
      }
      psico_avaliacoes: {
        Row: {
          company_id: string
          created_at: string
          criado_por: string | null
          data_fim: string
          data_inicio: string
          id: string
          instrumento_id: string
          modo_anonimato: boolean
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          criado_por?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          instrumento_id: string
          modo_anonimato?: boolean
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          criado_por?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          instrumento_id?: string
          modo_anonimato?: boolean
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psico_avaliacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psico_avaliacoes_instrumento_id_fkey"
            columns: ["instrumento_id"]
            isOneToOne: false
            referencedRelation: "psico_instrumentos"
            referencedColumns: ["id"]
          },
        ]
      }
      psico_dimensoes: {
        Row: {
          corte_alto: number
          corte_medio: number
          created_at: string
          descricao: string | null
          id: string
          instrumento_id: string
          nome: string
          ordem: number
          tipo_dimensao: string
          updated_at: string
        }
        Insert: {
          corte_alto?: number
          corte_medio?: number
          created_at?: string
          descricao?: string | null
          id?: string
          instrumento_id: string
          nome: string
          ordem?: number
          tipo_dimensao?: string
          updated_at?: string
        }
        Update: {
          corte_alto?: number
          corte_medio?: number
          created_at?: string
          descricao?: string | null
          id?: string
          instrumento_id?: string
          nome?: string
          ordem?: number
          tipo_dimensao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psico_dimensoes_instrumento_id_fkey"
            columns: ["instrumento_id"]
            isOneToOne: false
            referencedRelation: "psico_instrumentos"
            referencedColumns: ["id"]
          },
        ]
      }
      psico_instrumentos: {
        Row: {
          ativo: boolean
          company_id: string | null
          created_at: string
          descricao: string | null
          editavel: boolean
          id: string
          nome: string
          referencia_cientifica: string | null
          updated_at: string
          versao: string
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          editavel?: boolean
          id?: string
          nome: string
          referencia_cientifica?: string | null
          updated_at?: string
          versao?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          editavel?: boolean
          id?: string
          nome?: string
          referencia_cientifica?: string | null
          updated_at?: string
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "psico_instrumentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      psico_perguntas: {
        Row: {
          ativa: boolean
          created_at: string
          dimensao_id: string | null
          id: string
          instrumento_id: string
          inverter_pontuacao: boolean
          ordem: number
          texto_pergunta: string
          tipo_escala: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          dimensao_id?: string | null
          id?: string
          instrumento_id: string
          inverter_pontuacao?: boolean
          ordem?: number
          texto_pergunta: string
          tipo_escala?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          dimensao_id?: string | null
          id?: string
          instrumento_id?: string
          inverter_pontuacao?: boolean
          ordem?: number
          texto_pergunta?: string
          tipo_escala?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psico_perguntas_dimensao_id_fkey"
            columns: ["dimensao_id"]
            isOneToOne: false
            referencedRelation: "psico_dimensoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psico_perguntas_instrumento_id_fkey"
            columns: ["instrumento_id"]
            isOneToOne: false
            referencedRelation: "psico_instrumentos"
            referencedColumns: ["id"]
          },
        ]
      }
      psico_respostas: {
        Row: {
          avaliacao_id: string
          created_at: string
          ghe_id: string
          id: string
          pergunta_id: string
          valor_resposta: number
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          ghe_id: string
          id?: string
          pergunta_id: string
          valor_resposta: number
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          ghe_id?: string
          id?: string
          pergunta_id?: string
          valor_resposta?: number
        }
        Relationships: [
          {
            foreignKeyName: "psico_respostas_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "psico_avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psico_respostas_ghe_id_fkey"
            columns: ["ghe_id"]
            isOneToOne: false
            referencedRelation: "ghes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psico_respostas_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "psico_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_access_logs: {
        Row: {
          acao: string
          admin_id: string
          campaign_id: string | null
          created_at: string | null
          detalhes: Json | null
          id: string
          response_id: string | null
        }
        Insert: {
          acao: string
          admin_id: string
          campaign_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          response_id?: string | null
        }
        Update: {
          acao?: string
          admin_id?: string
          campaign_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          response_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_access_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pulse_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_access_logs_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "pulse_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_campaigns: {
        Row: {
          ano: number | null
          ativo: boolean | null
          company_id: string
          created_at: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          mes: number | null
          origem: string
          semana_iso: number | null
          template_key: string | null
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ano?: number | null
          ativo?: boolean | null
          company_id: string
          created_at?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          mes?: number | null
          origem?: string
          semana_iso?: number | null
          template_key?: string | null
          tipo?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ano?: number | null
          ativo?: boolean | null
          company_id?: string
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          mes?: number | null
          origem?: string
          semana_iso?: number | null
          template_key?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_questions: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          obrigatoria: boolean | null
          ordem: number
          pergunta: string
          tipo: Database["public"]["Enums"]["pulse_question_type"]
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          obrigatoria?: boolean | null
          ordem?: number
          pergunta: string
          tipo?: Database["public"]["Enums"]["pulse_question_type"]
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          obrigatoria?: boolean | null
          ordem?: number
          pergunta?: string
          tipo?: Database["public"]["Enums"]["pulse_question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pulse_questions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pulse_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_responses: {
        Row: {
          campaign_id: string
          comentario: string | null
          created_at: string | null
          employee_id: string
          id: string
          question_id: string
          resposta: string
          score_numeric: number | null
        }
        Insert: {
          campaign_id: string
          comentario?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          question_id: string
          resposta: string
          score_numeric?: number | null
        }
        Update: {
          campaign_id?: string
          comentario?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          question_id?: string
          resposta?: string
          score_numeric?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pulse_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pulse_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_surveys: {
        Row: {
          comment: string | null
          company_id: string
          created_at: string
          employee_id: string
          id: string
          score: number
          week_number: number
          year: number
        }
        Insert: {
          comment?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          score: number
          week_number: number
          year: number
        }
        Update: {
          comment?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          score?: number
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_surveys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_surveys_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      questionario_atribuicoes: {
        Row: {
          colaborador_id: string
          created_at: string
          data_atribuicao: string
          data_resposta: string | null
          descricao_questionario_id: string
          id: string
          status: Database["public"]["Enums"]["questionario_atribuicao_status"]
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_atribuicao?: string
          data_resposta?: string | null
          descricao_questionario_id: string
          id?: string
          status?: Database["public"]["Enums"]["questionario_atribuicao_status"]
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_atribuicao?: string
          data_resposta?: string | null
          descricao_questionario_id?: string
          id?: string
          status?: Database["public"]["Enums"]["questionario_atribuicao_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionario_atribuicoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionario_atribuicoes_descricao_questionario_id_fkey"
            columns: ["descricao_questionario_id"]
            isOneToOne: false
            referencedRelation: "descricao_questionario"
            referencedColumns: ["id"]
          },
        ]
      }
      questionario_modelos: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          instrucoes: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          instrucoes?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          instrucoes?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionario_modelos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      questionario_opcoes: {
        Row: {
          created_at: string
          id: string
          ordem: number
          pergunta_id: string
          valor: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          pergunta_id: string
          valor: string
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          pergunta_id?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionario_opcoes_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "questionario_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      questionario_perguntas: {
        Row: {
          created_at: string
          id: string
          obrigatorio: boolean
          ordem: number
          secao_id: string
          texto_ajuda: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          obrigatorio?: boolean
          ordem?: number
          secao_id: string
          texto_ajuda?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          obrigatorio?: boolean
          ordem?: number
          secao_id?: string
          texto_ajuda?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionario_perguntas_secao_id_fkey"
            columns: ["secao_id"]
            isOneToOne: false
            referencedRelation: "questionario_secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      questionario_respostas: {
        Row: {
          atribuicao_id: string
          created_at: string
          id: string
          pergunta_id: string
          updated_at: string
          valor: Json | null
        }
        Insert: {
          atribuicao_id: string
          created_at?: string
          id?: string
          pergunta_id: string
          updated_at?: string
          valor?: Json | null
        }
        Update: {
          atribuicao_id?: string
          created_at?: string
          id?: string
          pergunta_id?: string
          updated_at?: string
          valor?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "questionario_respostas_atribuicao_id_fkey"
            columns: ["atribuicao_id"]
            isOneToOne: false
            referencedRelation: "questionario_atribuicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      questionario_secoes: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          modelo_id: string
          ordem: number
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          modelo_id: string
          ordem?: number
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          modelo_id?: string
          ordem?: number
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionario_secoes_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "questionario_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      questionarios_cuidar_plus: {
        Row: {
          company_id: string
          config_calculo: Json | null
          created_at: string
          created_by_user_id: string | null
          data_ativacao: string | null
          data_desativacao: string | null
          descricao: string | null
          escala_config: Json | null
          id: string
          is_active: boolean
          modelo_analise: string
          titulo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          config_calculo?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          data_ativacao?: string | null
          data_desativacao?: string | null
          descricao?: string | null
          escala_config?: Json | null
          id?: string
          is_active?: boolean
          modelo_analise?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          config_calculo?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          data_ativacao?: string | null
          data_desativacao?: string | null
          descricao?: string | null
          escala_config?: Json | null
          id?: string
          is_active?: boolean
          modelo_analise?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionarios_cuidar_plus_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_templates: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          milestone_type: Database["public"]["Enums"]["milestone_type"] | null
          target_audience: Database["public"]["Enums"]["target_audience_type"]
          template_name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          milestone_type?: Database["public"]["Enums"]["milestone_type"] | null
          target_audience?: Database["public"]["Enums"]["target_audience_type"]
          template_name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          milestone_type?: Database["public"]["Enums"]["milestone_type"] | null
          target_audience?: Database["public"]["Enums"]["target_audience_type"]
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          id: string
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          questionnaire_template_id: string
          respondent_type: Database["public"]["Enums"]["respondent_type"]
          scale_max: number | null
          scale_min: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          questionnaire_template_id: string
          respondent_type: Database["public"]["Enums"]["respondent_type"]
          scale_max?: number | null
          scale_min?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          questionnaire_template_id?: string
          respondent_type?: Database["public"]["Enums"]["respondent_type"]
          scale_max?: number | null
          scale_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_questionnaire_template_id_fkey"
            columns: ["questionnaire_template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          bucket: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          bucket?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      relatorios_executivos_salvos: {
        Row: {
          ano: number
          company_id: string
          created_at: string
          criado_por_user_id: string
          id: string
          parecer_html: string
          updated_at: string
        }
        Insert: {
          ano: number
          company_id: string
          created_at?: string
          criado_por_user_id: string
          id?: string
          parecer_html?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          company_id?: string
          created_at?: string
          criado_por_user_id?: string
          id?: string
          parecer_html?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_executivos_salvos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      replication_logs: {
        Row: {
          admin_user_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          record_type: string
          source_company_id: string | null
          source_record_id: string
          success: boolean
          target_company_id: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          record_type: string
          source_company_id?: string | null
          source_record_id: string
          success: boolean
          target_company_id?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          record_type?: string
          source_company_id?: string | null
          source_record_id?: string
          success?: boolean
          target_company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replication_logs_source_company_id_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replication_logs_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_cuidar_plus: {
        Row: {
          colaborador_id_identificado: string | null
          deseja_contato: boolean
          id: string
          pergunta_id: string
          questionario_id: string
          resposta_valor: string
          session_id: string
          submitted_at: string
        }
        Insert: {
          colaborador_id_identificado?: string | null
          deseja_contato?: boolean
          id?: string
          pergunta_id: string
          questionario_id: string
          resposta_valor: string
          session_id: string
          submitted_at?: string
        }
        Update: {
          colaborador_id_identificado?: string | null
          deseja_contato?: boolean
          id?: string
          pergunta_id?: string
          questionario_id?: string
          resposta_valor?: string
          session_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_cuidar_plus_colaborador_id_identificado_fkey"
            columns: ["colaborador_id_identificado"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_cuidar_plus_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas_cuidar_plus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_cuidar_plus_questionario_id_fkey"
            columns: ["questionario_id"]
            isOneToOne: false
            referencedRelation: "questionarios_cuidar_plus"
            referencedColumns: ["id"]
          },
        ]
      }
      security_rate_limit_logs: {
        Row: {
          bucket: string
          id: string
          max_req: number
          occurred_at: string
          request_count: number
          user_id: string | null
          window_secs: number
        }
        Insert: {
          bucket: string
          id?: string
          max_req: number
          occurred_at?: string
          request_count: number
          user_id?: string | null
          window_secs: number
        }
        Update: {
          bucket?: string
          id?: string
          max_req?: number
          occurred_at?: string
          request_count?: number
          user_id?: string | null
          window_secs?: number
        }
        Relationships: []
      }
      setores: {
        Row: {
          ambiente_fisico: string | null
          andar: string | null
          ativo: boolean
          company_id: string
          created_at: string
          departamento_id: string
          id: string
          localizacao: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ambiente_fisico?: string | null
          andar?: string | null
          ativo?: boolean
          company_id: string
          created_at?: string
          departamento_id: string
          id?: string
          localizacao?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ambiente_fisico?: string | null
          andar?: string | null
          ativo?: boolean
          company_id?: string
          created_at?: string
          departamento_id?: string
          id?: string
          localizacao?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setores_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks_reminders: {
        Row: {
          created_at: string
          id: string
          notified_at: string | null
          remind_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notified_at?: string | null
          remind_at: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notified_at?: string | null
          remind_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptance: {
        Row: {
          accepted_at: string
          acceptor_email: string
          acceptor_name: string
          company_id: string
          id: string
          ip_address: string | null
          privacy_version: string
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          acceptor_email: string
          acceptor_name: string
          company_id: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          acceptor_email?: string
          acceptor_name?: string
          company_id?: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias_colaborador: {
        Row: {
          colaborador_id: string
          created_at: string
          empresa_destino_id: string
          empresa_origem_id: string
          id: string
          motivo: string
          transferido_por: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          empresa_destino_id: string
          empresa_origem_id: string
          id?: string
          motivo?: string
          transferido_por: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          empresa_destino_id?: string
          empresa_origem_id?: string
          id?: string
          motivo?: string
          transferido_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_colaborador_empresa_destino_id_fkey"
            columns: ["empresa_destino_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_colaborador_empresa_origem_id_fkey"
            columns: ["empresa_origem_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_aula_progresso: {
        Row: {
          aula_id: string
          colaborador_id: string
          concluida: boolean
          concluida_em: string | null
          created_at: string
          id: string
          tempo_assistido_segundos: number
          treinamento_id: string
          updated_at: string
        }
        Insert: {
          aula_id: string
          colaborador_id: string
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          id?: string
          tempo_assistido_segundos?: number
          treinamento_id: string
          updated_at?: string
        }
        Update: {
          aula_id?: string
          colaborador_id?: string
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          id?: string
          tempo_assistido_segundos?: number
          treinamento_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_aula_progresso_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "treinamento_aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_aula_progresso_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_aula_progresso_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_aulas: {
        Row: {
          company_id: string
          created_at: string
          duracao_estimada_minutos: number | null
          id: string
          modulo_id: string
          nome_arquivo: string | null
          ordem: number
          resumo: string | null
          tempo_minimo_minutos: number
          tipo: string
          titulo: string
          treinamento_id: string
          updated_at: string
          url_conteudo: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          duracao_estimada_minutos?: number | null
          id?: string
          modulo_id: string
          nome_arquivo?: string | null
          ordem?: number
          resumo?: string | null
          tempo_minimo_minutos?: number
          tipo?: string
          titulo: string
          treinamento_id: string
          updated_at?: string
          url_conteudo?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          duracao_estimada_minutos?: number | null
          id?: string
          modulo_id?: string
          nome_arquivo?: string | null
          ordem?: number
          resumo?: string | null
          tempo_minimo_minutos?: number
          tipo?: string
          titulo?: string
          treinamento_id?: string
          updated_at?: string
          url_conteudo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_aulas_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "treinamento_modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_aulas_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_logs_acesso: {
        Row: {
          colaborador_id: string
          created_at: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          session_id: string
          tempo_acumulado_segundos: number | null
          treinamento_id: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          session_id?: string
          tempo_acumulado_segundos?: number | null
          treinamento_id: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          session_id?: string
          tempo_acumulado_segundos?: number | null
          treinamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_logs_acesso_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_logs_acesso_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_modulos: {
        Row: {
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          titulo: string
          treinamento_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          titulo: string
          treinamento_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          titulo?: string
          treinamento_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_modulos_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_progresso: {
        Row: {
          colaborador_id: string
          concluido_em: string | null
          created_at: string | null
          id: string
          quiz_aprovado: boolean | null
          quiz_data_aprovacao: string | null
          quiz_melhor_nota: number | null
          quiz_tentativas: number | null
          status: Database["public"]["Enums"]["conclusao_status"] | null
          tempo_total_minutos: number | null
          termo_aceito: boolean | null
          termo_aceito_em: string | null
          termo_ip: string | null
          treinamento_id: string
          updated_at: string | null
        }
        Insert: {
          colaborador_id: string
          concluido_em?: string | null
          created_at?: string | null
          id?: string
          quiz_aprovado?: boolean | null
          quiz_data_aprovacao?: string | null
          quiz_melhor_nota?: number | null
          quiz_tentativas?: number | null
          status?: Database["public"]["Enums"]["conclusao_status"] | null
          tempo_total_minutos?: number | null
          termo_aceito?: boolean | null
          termo_aceito_em?: string | null
          termo_ip?: string | null
          treinamento_id: string
          updated_at?: string | null
        }
        Update: {
          colaborador_id?: string
          concluido_em?: string | null
          created_at?: string | null
          id?: string
          quiz_aprovado?: boolean | null
          quiz_data_aprovacao?: string | null
          quiz_melhor_nota?: number | null
          quiz_tentativas?: number | null
          status?: Database["public"]["Enums"]["conclusao_status"] | null
          tempo_total_minutos?: number | null
          termo_aceito?: boolean | null
          termo_aceito_em?: string | null
          termo_ip?: string | null
          treinamento_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_progresso_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_progresso_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_quiz_alternativas: {
        Row: {
          id: string
          is_correta: boolean | null
          ordem: number | null
          pergunta_id: string
          texto_alternativa: string
        }
        Insert: {
          id?: string
          is_correta?: boolean | null
          ordem?: number | null
          pergunta_id: string
          texto_alternativa: string
        }
        Update: {
          id?: string
          is_correta?: boolean | null
          ordem?: number | null
          pergunta_id?: string
          texto_alternativa?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_quiz_alternativas_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "treinamento_quiz_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_quiz_config: {
        Row: {
          created_at: string | null
          id: string
          nota_minima: number | null
          tentativas_maximas: number | null
          treinamento_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nota_minima?: number | null
          tentativas_maximas?: number | null
          treinamento_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nota_minima?: number | null
          tentativas_maximas?: number | null
          treinamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_quiz_config_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: true
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_quiz_perguntas: {
        Row: {
          created_at: string | null
          id: string
          ordem: number | null
          pergunta_texto: string
          treinamento_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ordem?: number | null
          pergunta_texto: string
          treinamento_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ordem?: number | null
          pergunta_texto?: string
          treinamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_quiz_perguntas_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamento_quiz_tentativas: {
        Row: {
          acertos: number
          aprovado: boolean
          colaborador_id: string
          created_at: string | null
          id: string
          nota_obtida: number
          respostas: Json
          total_perguntas: number
          treinamento_id: string
        }
        Insert: {
          acertos: number
          aprovado: boolean
          colaborador_id: string
          created_at?: string | null
          id?: string
          nota_obtida: number
          respostas: Json
          total_perguntas: number
          treinamento_id: string
        }
        Update: {
          acertos?: number
          aprovado?: boolean
          colaborador_id?: string
          created_at?: string | null
          id?: string
          nota_obtida?: number
          respostas?: Json
          total_perguntas?: number
          treinamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamento_quiz_tentativas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamento_quiz_tentativas_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos: {
        Row: {
          capa_path: string | null
          categoria_id: string | null
          company_id: string
          created_at: string | null
          descricao: string | null
          destaque: boolean
          duracao_estimada_minutos: number | null
          id: string
          idioma: string | null
          nivel: string | null
          nome_arquivo: string | null
          obrigatorio: boolean
          publicado_em: string | null
          publicado_por_user_id: string | null
          quiz_obrigatorio: boolean | null
          status: Database["public"]["Enums"]["treinamento_status"] | null
          tags: string[] | null
          target_company_ids: string[] | null
          target_contract_types: string[] | null
          tempo_minimo_minutos: number | null
          termo_ciencia_obrigatorio: boolean | null
          texto_termo_ciencia: string | null
          tipo: Database["public"]["Enums"]["treinamento_tipo"]
          titulo: string
          updated_at: string | null
          url_conteudo: string | null
        }
        Insert: {
          capa_path?: string | null
          categoria_id?: string | null
          company_id: string
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean
          duracao_estimada_minutos?: number | null
          id?: string
          idioma?: string | null
          nivel?: string | null
          nome_arquivo?: string | null
          obrigatorio?: boolean
          publicado_em?: string | null
          publicado_por_user_id?: string | null
          quiz_obrigatorio?: boolean | null
          status?: Database["public"]["Enums"]["treinamento_status"] | null
          tags?: string[] | null
          target_company_ids?: string[] | null
          target_contract_types?: string[] | null
          tempo_minimo_minutos?: number | null
          termo_ciencia_obrigatorio?: boolean | null
          texto_termo_ciencia?: string | null
          tipo: Database["public"]["Enums"]["treinamento_tipo"]
          titulo: string
          updated_at?: string | null
          url_conteudo?: string | null
        }
        Update: {
          capa_path?: string | null
          categoria_id?: string | null
          company_id?: string
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean
          duracao_estimada_minutos?: number | null
          id?: string
          idioma?: string | null
          nivel?: string | null
          nome_arquivo?: string | null
          obrigatorio?: boolean
          publicado_em?: string | null
          publicado_por_user_id?: string | null
          quiz_obrigatorio?: boolean | null
          status?: Database["public"]["Enums"]["treinamento_status"] | null
          tags?: string[] | null
          target_company_ids?: string[] | null
          target_contract_types?: string[] | null
          tempo_minimo_minutos?: number | null
          termo_ciencia_obrigatorio?: boolean | null
          texto_termo_ciencia?: string | null
          tipo?: Database["public"]["Enums"]["treinamento_tipo"]
          titulo?: string
          updated_at?: string | null
          url_conteudo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_treinamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_organizacionais: {
        Row: {
          ativa: boolean
          cep: string | null
          cidade: string | null
          company_id: string
          created_at: string
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["unidade_tipo"]
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cep?: string | null
          cidade?: string | null
          company_id: string
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["unidade_tipo"]
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cep?: string | null
          cidade?: string | null
          company_id?: string
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["unidade_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_organizacionais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          theme_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          theme_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          theme_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          ativo: boolean
          carga_diaria_minutos: number
          company_id: string
          created_at: string
          dias_semana: number[]
          entrada_manha: string | null
          entrada_tarde: string | null
          horarios_por_dia: Json | null
          id: string
          nome: string
          saida_manha: string | null
          saida_tarde: string | null
          tolerancia_minutos: number
          trabalha_feriados: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          carga_diaria_minutos?: number
          company_id: string
          created_at?: string
          dias_semana?: number[]
          entrada_manha?: string | null
          entrada_tarde?: string | null
          horarios_por_dia?: Json | null
          id?: string
          nome: string
          saida_manha?: string | null
          saida_tarde?: string | null
          tolerancia_minutos?: number
          trabalha_feriados?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          carga_diaria_minutos?: number
          company_id?: string
          created_at?: string
          dias_semana?: number[]
          entrada_manha?: string | null
          entrada_tarde?: string | null
          horarios_por_dia?: Json | null
          id?: string
          nome?: string
          saida_manha?: string | null
          saida_tarde?: string | null
          tolerancia_minutos?: number
          trabalha_feriados?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _relatorios_ponto_scope: {
        Args: never
        Returns: {
          is_admin: boolean
          my_colab_id: string
          my_company_id: string
        }[]
      }
      admin_master_scope: { Args: { _company_id: string }; Returns: boolean }
      agregar_badges_semana: {
        Args: { p_ano: number; p_company_id: string; p_semana: number }
        Returns: {
          badge_label: string
          badge_tipo: string
          departamento: string
          total: number
          total_por_depto: number
        }[]
      }
      agregar_recomendacoes_rh: {
        Args: { p_ano: number; p_company_id: string; p_semana: number }
        Returns: {
          departamento: string
          metric: number
          recomendacao: string
          tipo: string
          total_respondentes: number
        }[]
      }
      aprovar_ferias_gozo: { Args: { p_gozo_id: string }; Returns: undefined }
      assinar_espelho_mensal: { Args: { p_espelho_id: string }; Returns: Json }
      assinar_periodo_ponto: {
        Args: { p_fechamento_id: string }
        Returns: Json
      }
      atualizar_branding_empresa: {
        Args: {
          _brand_logo_url?: string
          _brand_name?: string
          _brand_primary_color?: string
        }
        Returns: undefined
      }
      atualizar_status_denuncia: {
        Args: { p_id: string; p_novo_status: string }
        Returns: undefined
      }
      atualizar_streak_cuidar: {
        Args: {
          p_company_id: string
          p_data_campanha: string
          p_user_id: string
        }
        Returns: undefined
      }
      buscar_campanhas_pendentes: {
        Args: { p_user_id: string }
        Returns: {
          company_id: string
          data_fim: string
          data_inicio: string
          descricao: string
          id: string
          imagem_url: string
          materiais: Json
          titulo: string
        }[]
      }
      buscar_comunicados_pendentes: {
        Args: { p_user_id: string }
        Returns: {
          autor_nome: string
          company_id: string
          conteudo: string
          data_publicacao: string
          id: string
          image_url: string
          is_pinned: boolean
          titulo: string
        }[]
      }
      calc_horas_mensais_colab: { Args: { p_colab: string }; Returns: number }
      calc_minutos_noturnos_br: {
        Args: { p_fim: string; p_inicio: string }
        Returns: number
      }
      calc_trabalhadores_ghe: { Args: { p_ghe_id: string }; Returns: number }
      calcular_status_campanha: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          p_bucket: string
          p_max_req: number
          p_user_id: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      colaborador_has_avaliacao_in_ciclo: {
        Args: { _ciclo_id: string }
        Returns: boolean
      }
      count_replication_targets: {
        Args: { p_source_company_id: string }
        Returns: number
      }
      criar_denuncia: {
        Args: {
          p_anonimo: boolean
          p_categoria?: string
          p_mensagem: string
          p_origem?: string
          p_tipo?: string
          p_titulo: string
        }
        Returns: string
      }
      delete_collaborator_data: {
        Args: { p_collaborator_id: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      editar_batida_ponto: {
        Args: { p_batida_id: string; p_novo_horario: string }
        Returns: undefined
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_meus_periodos_aquisitivos: { Args: never; Returns: undefined }
      ensure_periodos_aquisitivos_company: {
        Args: { p_company_id?: string }
        Returns: undefined
      }
      estrut_can_read: { Args: { _company_id: string }; Returns: boolean }
      excluir_batida_ponto: {
        Args: { p_batida_id: string }
        Returns: undefined
      }
      export_collaborator_data: {
        Args: { p_collaborator_id: string }
        Returns: Json
      }
      fechar_espelho_mensal: {
        Args: {
          p_ano: number
          p_colaboradores_ids?: string[]
          p_company_id: string
          p_mes: number
        }
        Returns: Json
      }
      fechar_periodo_ponto: {
        Args: {
          p_colaboradores_ids?: string[]
          p_company_id: string
          p_periodo_fim: string
          p_periodo_inicio: string
        }
        Returns: Json
      }
      gerar_alertas_coletivos_cuidar: {
        Args: { p_ano: number; p_company_id: string; p_semana: number }
        Returns: undefined
      }
      gerar_alertas_individuais_cuidar: {
        Args: {
          p_campanha_id: string
          p_company_id: string
          p_score_atual: number
          p_user_id: string
        }
        Returns: undefined
      }
      gerar_badges_cuidar: {
        Args: {
          p_campanha_id: string
          p_company_id: string
          p_score_atual: number
          p_user_id: string
        }
        Returns: undefined
      }
      gerar_campanhas_cuidar_ano: {
        Args: { p_ano: number; p_company_id: string }
        Returns: {
          criadas_mensal: number
          criadas_semanal: number
        }[]
      }
      gerar_planos_acao_proart: {
        Args: { p_ativacao_id: string }
        Returns: Json
      }
      gerar_recomendacoes_cuidar: {
        Args: {
          p_campanha_id: string
          p_company_id: string
          p_score_atual: number
          p_user_id: string
        }
        Returns: undefined
      }
      get_active_pulse_campaign: {
        Args: { p_company_id: string }
        Returns: {
          campaign_id: string
          data_fim: string
          data_inicio: string
          descricao: string
          has_responded: boolean
          questions: Json
          titulo: string
        }[]
      }
      get_admin_notifications: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          data: Json
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
        }[]
      }
      get_alertas_nr1_v1: {
        Args: {
          p_company_id: string
          p_data_fim: string
          p_data_inicio: string
        }
        Returns: Json
      }
      get_aniversariantes_globais_mes: {
        Args: never
        Returns: {
          anos_empresa: number
          avatar_url: string
          cliente_alocado: string
          dia: number
          id: string
          nome: string
          tipo: string
        }[]
      }
      get_avaliacao_by_token: {
        Args: { p_token: string }
        Returns: {
          already_completed: boolean
          avaliacao_id: string
          ciclo_id: string
          ciclo_nome: string
          colaborador_id: string
          colaborador_nome: string
          competencias: Json
          expired: boolean
          gestor_nome: string
          link_tipo: Database["public"]["Enums"]["avaliacao_link_tipo"]
          metricas: Json
          objetivos: Json
          respostas_competencias: Json
          respostas_objetivos: Json
          status: Database["public"]["Enums"]["avaliacao_status"]
        }[]
      }
      get_cargos_by_ghe: {
        Args: { p_ghe_id: string }
        Returns: {
          ativo: boolean
          carga_horaria_semanal: number | null
          cbo_codigo: string | null
          cbo_descricao: string | null
          company_id: string
          created_at: string
          descricao_atividades: string | null
          ghe_id: string | null
          id: string
          nome: string
          risco_exposicao: boolean
          tarefa_prescrita: string | null
          tarefa_real: string | null
          tempo_exposicao_horas_dia: number | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "cargos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_colaboradores_by_cargo: {
        Args: { p_cargo_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          matricula: string
          status: string
        }[]
      }
      get_colaboradores_seguro: {
        Args: { p_company_id?: string; p_gestor_id?: string }
        Returns: {
          address_city: string | null
          address_complement: string | null
          address_country: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          admission_date: string
          alinhamento_notas: string | null
          avatar_url: string | null
          banco_horas_perfil_id: string | null
          base_salary: number
          birth_date: string
          cargo_id: string | null
          cnpj: string | null
          company_id: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          corporate_email: string
          cpf: string
          created_at: string
          ctps_numero: string | null
          ctps_serie: string | null
          curriculo_path: string | null
          cursos_realizados: string | null
          data_corte_ferias: string | null
          data_pagamento: string | null
          department: string
          desligado_em: string | null
          desligado_por_user_id: string | null
          education_level: Database["public"]["Enums"]["education_level"] | null
          email_pessoal: string | null
          empresa_cliente: string | null
          ethnicity: Database["public"]["Enums"]["ethnicity_type"] | null
          full_name: string
          gestao_tecnica: string | null
          gestor_id: string | null
          humanguide_notas: string | null
          humanguide_path: string | null
          id: string
          is_banco_horas: boolean
          is_substituicao: boolean
          job_level: string | null
          job_title: string
          jornada_diaria_minutos: number | null
          manager_name: string | null
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          matricula: string | null
          motivo_desligamento: string | null
          motivo_detalhado: string | null
          nacionalidade: string | null
          naturalidade: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone: string | null
          pis: string | null
          razao_social: string | null
          rg: string | null
          sex: Database["public"]["Enums"]["sex_type"] | null
          social_name: string | null
          status: Database["public"]["Enums"]["colaborador_status"]
          substituicao_colaborador_id: string | null
          telefone_secundario: string | null
          termination_date: string | null
          tipo_desligamento: string | null
          ultima_ferias_fim: string | null
          ultima_ferias_inicio: string | null
          updated_at: string
          user_id: string | null
          work_schedule: string | null
          work_schedule_id: string | null
          work_shift_type: Database["public"]["Enums"]["work_shift_type"] | null
        }[]
        SetofOptions: {
          from: "*"
          to: "colaboradores"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_cuidar_plus_by_token: {
        Args: { p_token: string }
        Returns: {
          already_submitted: boolean
          colaborador_name: string
          descricao: string
          perguntas: Json
          questionario_id: string
          titulo: string
        }[]
      }
      get_cuidar_plus_resultados_agregados: {
        Args: { p_dimensao?: string; p_months?: number }
        Returns: Json
      }
      get_dashboard_comunicados: {
        Args: { p_limit?: number }
        Returns: {
          autor_nome: string
          company_id: string
          data_publicacao: string
          id: string
          is_pinned: boolean
          is_read: boolean
          resumo: string
          titulo: string
        }[]
      }
      get_employee_pulse_history: {
        Args: { p_employee_id: string; p_limit?: number }
        Returns: {
          campaign_date: string
          campaign_id: string
          campaign_title: string
          comentario: string
          created_at: string
          pergunta: string
          question_id: string
          resposta: string
          resposta_numerica: number
          tipo: string
        }[]
      }
      get_espelho_responsavel: {
        Args: { p_espelho_id: string }
        Returns: {
          cargo: string
          fechado_em: string
          nome: string
        }[]
      }
      get_estrutura_organizacional: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_executive_report_data: {
        Args: {
          p_company_id: string
          p_empresa_cliente?: string
          p_gestao_tecnica?: string
          p_year: number
        }
        Returns: Json
      }
      get_feedback_cycle_by_token: {
        Args: { p_token: string }
        Returns: {
          already_submitted: boolean
          colaborador_name: string
          cycle_id: string
          milestone_type: Database["public"]["Enums"]["milestone_type"]
          questionnaire_auto_resolved: boolean
          questionnaire_configured: boolean
          questions: Json
          respondent_type: Database["public"]["Enums"]["respondent_type"]
          template_id: string
        }[]
      }
      get_ghe_epis: {
        Args: { p_ghe_id: string }
        Returns: {
          ativo: boolean
          ca_numero: string | null
          company_id: string
          created_at: string
          descricao: string | null
          ghe_id: string
          id: string
          nome_epi: string
          obrigatorio: boolean
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "ghe_epis"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_meus_espelhos_mensais: {
        Args: never
        Returns: {
          ano: number
          assinatura_em: string | null
          assinatura_hash: string | null
          assinatura_ip: string | null
          assinatura_por: string | null
          colaborador_id: string
          company_id: string
          created_at: string
          dias_abonados: number
          dias_falta: number
          fechado_em: string | null
          fechado_por: string | null
          horas_abonadas_minutos: number
          horas_extras_minutos: number
          horas_noturnas_minutos: number
          horas_trabalhadas_minutos: number
          id: string
          mes: number
          motivo_reabertura: string | null
          pdf_url: string | null
          periodo_fim: string
          periodo_inicio: string
          reaberto_em: string | null
          reaberto_por: string | null
          saldo_minutos: number
          snapshot_jsonb: Json | null
          status: string
          updated_at: string
          versao: number
        }[]
        SetofOptions: {
          from: "*"
          to: "espelhos_ponto_mensais"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_meus_fechamentos_mensais: {
        Args: { p_colaborador_id: string }
        Returns: {
          assinatura_em: string | null
          assinatura_hash: string | null
          assinatura_por: string | null
          colaborador_id: string
          company_id: string
          created_at: string | null
          csv_url: string | null
          dias_abonados: number
          dias_falta: number
          fechado_em: string | null
          fechado_por: string | null
          hash_assinatura: string | null
          horas_abonadas_minutos: number
          horas_extras_minutos: number
          horas_noturnas_minutos: number
          horas_trabalhadas_minutos: number
          id: string
          motivo_reabertura: string | null
          observacao: string | null
          pdf_url: string | null
          periodo_fim: string
          periodo_inicio: string
          reaberto_em: string | null
          reaberto_por: string | null
          saldo_minutos: number
          snapshot_jsonb: Json | null
          status: string
          tratativa_acao:
            | Database["public"]["Enums"]["tratativa_saldo_acao"]
            | null
          tratativa_observacao: string | null
          updated_at: string
          versao: number
        }[]
        SetofOptions: {
          from: "*"
          to: "banco_horas_fechamentos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_colaborador_id: { Args: never; Returns: string }
      get_my_company_id: { Args: never; Returns: string }
      get_my_pulse_campaign_history: {
        Args: never
        Returns: {
          campaign_id: string
          data_fim: string
          data_inicio: string
          responded_at: string
          responses: Json
          titulo: string
        }[]
      }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_pending_pulse_respondents: {
        Args: { p_company_id: string }
        Returns: {
          colaborador_id: string
          corporate_email: string
          full_name: string
        }[]
      }
      get_plataforma_empresas: {
        Args: never
        Returns: {
          brand_name: string
          cnpj: string
          created_at: string
          id: string
          is_internal: boolean
          name: string
          status: string
          total_colaboradores: number
        }[]
      }
      get_plataforma_metrics: { Args: never; Returns: Json }
      get_proart_ativacao_vigente: {
        Args: never
        Returns: {
          company_id: string
          data_fim: string
          data_inicio: string
          id: string
          titulo: string
        }[]
      }
      get_pulse_campaign_results: {
        Args: {
          p_campaign_id: string
          p_department?: string
          p_limit?: number
          p_max_score?: number
          p_min_score?: number
          p_offset?: number
        }
        Returns: {
          colaborador_nome: string
          comentario: string
          created_at: string
          departamento: string
          employee_id: string
          pergunta: string
          question_id: string
          response_id: string
          resposta: string
          resposta_numerica: number
          tipo: string
        }[]
      }
      get_pulse_campaign_stats: {
        Args: { p_campaign_id: string }
        Returns: {
          avg_score: number
          department_breakdown: Json
          participation_rate: number
          score_distribution: Json
          total_responses: number
        }[]
      }
      get_pulse_colaboradores_list: {
        Args: { p_company_id: string; p_department?: string }
        Returns: {
          cargo: string
          departamento: string
          employee_id: string
          foto_url: string
          media_geral: number
          nome: string
          total_respostas: number
          ultima_resposta: string
        }[]
      }
      get_pulse_comments: {
        Args: { p_company_id: string; p_week_number?: number; p_year?: number }
        Returns: {
          comment: string
          created_at: string
          score: number
        }[]
      }
      get_pulse_dashboard: {
        Args: { p_company_id: string; p_weeks_back?: number; p_year?: number }
        Returns: {
          avg_score: number
          comments_count: number
          score_0: number
          score_1: number
          score_2: number
          score_3: number
          score_4: number
          score_5: number
          total_responses: number
          week_number: number
          year: number
        }[]
      }
      get_pulse_trend_data: {
        Args: { p_company_id: string; p_months_back?: number }
        Returns: {
          avg_score: number
          campaign_date: string
          campaign_id: string
          campaign_title: string
          total_responses: number
        }[]
      }
      get_questionario_para_colaborador: {
        Args: { p_atribuicao_id: string }
        Returns: Json
      }
      get_relatorio_absenteismo_v1: {
        Args: {
          p_company_id: string
          p_data_fim: string
          p_data_inicio: string
          p_departamento?: string
          p_empresa_cliente?: string
        }
        Returns: Json
      }
      get_relatorio_jornada_v1: {
        Args: {
          p_company_id: string
          p_data_fim: string
          p_data_inicio: string
          p_departamento?: string
          p_empresa_cliente?: string
        }
        Returns: Json
      }
      get_saldos_para_fechamento: {
        Args: {
          p_company_id: string
          p_periodo_fim: string
          p_periodo_inicio: string
        }
        Returns: {
          colaborador_id: string
          decidido_em: string
          department: string
          full_name: string
          matricula: string
          saldo_minutos: number
          tratativa_acao: Database["public"]["Enums"]["tratativa_saldo_acao"]
          tratativa_id: string
          tratativa_observacao: string
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_notifications: {
        Args: { p_limit?: number }
        Returns: {
          action_url: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          priority: string
          title: string
          type: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_master: { Args: { _user_id: string }; Returns: boolean }
      is_dia_previsto: {
        Args: { p_colaborador_id: string; p_data: string }
        Returns: boolean
      }
      is_periodo_fechado: {
        Args: { p_colaborador_id: string; p_data: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
      lgpd_can_manage: {
        Args: { _company_id: string; _require_admin_empresa?: boolean }
        Returns: boolean
      }
      listar_campanhas_ativas: {
        Args: never
        Returns: {
          company_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string
          id: string
          imagem_url: string
          materiais: Json
          status: string
          titulo: string
        }[]
      }
      listar_denuncias_admin: {
        Args: never
        Returns: {
          anonimo: boolean
          autor_nome: string
          categoria_comportamento: string
          criado_em: string
          id: string
          mensagem: string
          origem_ofensa: string
          status: string
          tipo: string
          titulo: string
          user_id: string
        }[]
      }
      marcar_ferias_gozadas: { Args: { p_gozo_id: string }; Returns: undefined }
      mark_admin_notification_read: {
        Args: { p_id: string }
        Returns: undefined
      }
      mark_all_admin_notifications_read: { Args: never; Returns: undefined }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      minuto_epoch: { Args: { ts: string }; Returns: number }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_company_status: { Args: never; Returns: string }
      nr1_assert_ghe_company: { Args: { p_ghe_id: string }; Returns: string }
      nr1_delete_risco_ghe: { Args: { p_risco_id: string }; Returns: undefined }
      nr1_get_matriz: { Args: { p_company_id?: string }; Returns: Json }
      nr1_get_matriz_config: { Args: { p_company_id?: string }; Returns: Json }
      nr1_get_matriz_por_ghe: { Args: { p_ghe_id: string }; Returns: Json }
      nr1_save_matriz_config: {
        Args: { p_company_id: string; p_config: Json }
        Returns: Json
      }
      nr1_save_risco_ghe: {
        Args: { p_ghe_id: string; p_risco_data: Json }
        Returns: string
      }
      nr1_sugerir_riscos: { Args: { p_ghe_id: string }; Returns: Json }
      nr1_sync_psicossociais: {
        Args: { p_avaliacao_id: string }
        Returns: Json
      }
      pgr_assert_documento_acesso: {
        Args: { p_documento_id: string }
        Returns: string
      }
      pgr_criar_documento: {
        Args: { p_company_id: string }
        Returns: {
          anexo_art_path: string | null
          cnae: string | null
          company_id: string
          created_at: string
          endereco: string | null
          grau_risco: string | null
          id: string
          responsavel_tecnico: Json
          status: string
          titulo: string
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "pgr_documentos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pgr_get_dados_automaticos: {
        Args: { p_documento_id: string }
        Returns: Json
      }
      pgr_get_dados_psicossociais: {
        Args: { p_documento_id: string }
        Returns: Json
      }
      pgr_get_documento: { Args: { p_documento_id: string }; Returns: Json }
      pgr_save_documento: {
        Args: {
          p_anexo_art_path: string
          p_cnae: string
          p_documento_id: string
          p_endereco: string
          p_grau_risco: string
          p_responsavel_tecnico: Json
          p_titulo: string
          p_updated_at?: string
          p_vigencia_fim: string
          p_vigencia_inicio: string
        }
        Returns: Json
      }
      pgr_save_risco_detalhe: {
        Args: { p_detalhes: Json; p_risco_ghe_id: string }
        Returns: {
          acoes_necessarias: string | null
          created_at: string
          fontes_circunstancias: string | null
          fundamentacao_legal: string | null
          id: string
          lesoes_agravos: string | null
          meio_propagacao: string | null
          observacao: string | null
          risco_ghe_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pgr_risco_detalhes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pgr_save_secoes: {
        Args: { p_documento_id: string; p_secoes: Json }
        Returns: Json
      }
      pick_periodo_aquisitivo_for_gozo: {
        Args: { p_colaborador_id: string; p_data_inicio_gozo: string }
        Returns: string
      }
      pode_acessar_modulo_ponto: { Args: never; Returns: boolean }
      psico_assert_editavel: {
        Args: { p_instrumento_id: string }
        Returns: undefined
      }
      psico_atribuir_colaboradores: {
        Args: { p_avaliacao_id: string; p_colaborador_ids: string[] }
        Returns: number
      }
      psico_criar_avaliacao: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_ghe_ids: string[]
          p_instrumento_id: string
          p_modo_anonimato?: boolean
          p_titulo: string
        }
        Returns: string
      }
      psico_delete_dimensao: { Args: { p_id: string }; Returns: undefined }
      psico_delete_pergunta: { Args: { p_id: string }; Returns: undefined }
      psico_duplicar_instrumento: {
        Args: { p_instrumento_id: string; p_novo_nome?: string }
        Returns: string
      }
      psico_gerar_planos: {
        Args: { p_agrupamento?: string; p_avaliacao_id: string }
        Returns: Json
      }
      psico_get_acompanhamento: {
        Args: { p_avaliacao_id: string }
        Returns: {
          atribuicao_id: string
          colaborador_id: string
          colaborador_nome: string
          data_atribuicao: string
          data_resposta: string
          ghe_id: string
          ghe_nome: string
          status: string
        }[]
      }
      psico_get_avaliacoes: {
        Args: never
        Returns: {
          created_at: string
          data_fim: string
          data_inicio: string
          ghe_ids: string[]
          id: string
          instrumento_id: string
          instrumento_nome: string
          modo_anonimato: boolean
          status: string
          titulo: string
          total_atribuidos: number
          total_respondidos: number
        }[]
      }
      psico_get_heatmap: {
        Args: { p_agrupamento?: string; p_avaliacao_id: string }
        Returns: Json
      }
      psico_get_instrumento_completo: {
        Args: { p_instrumento_id: string }
        Returns: Json
      }
      psico_get_instrumentos: {
        Args: never
        Returns: {
          ativo: boolean
          company_id: string
          created_at: string
          descricao: string
          editavel: boolean
          em_uso: boolean
          id: string
          nome: string
          referencia_cientifica: string
          total_dimensoes: number
          total_perguntas: number
          versao: string
        }[]
      }
      psico_get_questionario: {
        Args: { p_atribuicao_id: string }
        Returns: Json
      }
      psico_get_resultados_gerais: {
        Args: { p_avaliacao_id: string }
        Returns: Json
      }
      psico_instrumento_em_uso: {
        Args: { _instrumento_id: string }
        Returns: boolean
      }
      psico_is_rh: { Args: never; Returns: boolean }
      psico_minhas_avaliacoes: {
        Args: never
        Returns: {
          atribuicao_id: string
          avaliacao_id: string
          data_atribuicao: string
          data_fim: string
          data_inicio: string
          data_resposta: string
          instrumento_nome: string
          status: string
          titulo: string
          total_perguntas: number
        }[]
      }
      psico_reabrir_questionario: {
        Args: { p_atribuicao_id: string }
        Returns: undefined
      }
      psico_reordenar_perguntas: {
        Args: { p_ids: string[]; p_instrumento_id: string }
        Returns: undefined
      }
      psico_save_dimensao:
        | {
            Args: {
              p_descricao: string
              p_id: string
              p_instrumento_id: string
              p_nome: string
              p_ordem: number
              p_tipo: string
            }
            Returns: string
          }
        | {
            Args: {
              p_corte_alto?: number
              p_corte_medio?: number
              p_descricao: string
              p_id: string
              p_instrumento_id: string
              p_nome: string
              p_ordem: number
              p_tipo: string
            }
            Returns: string
          }
      psico_save_instrumento: {
        Args: {
          p_ativo?: boolean
          p_descricao: string
          p_id: string
          p_nome: string
          p_referencia: string
          p_versao: string
        }
        Returns: string
      }
      psico_save_pergunta: {
        Args: {
          p_dimensao_id: string
          p_id: string
          p_instrumento_id: string
          p_inverter: boolean
          p_ordem: number
          p_texto: string
          p_tipo_escala: string
        }
        Returns: string
      }
      psico_save_rascunho: {
        Args: { p_atribuicao_id: string; p_rascunho: Json }
        Returns: undefined
      }
      psico_save_respostas: {
        Args: { p_atribuicao_id: string; p_respostas: Json }
        Returns: undefined
      }
      reabrir_espelho_mensal: {
        Args: { p_espelho_id: string; p_motivo: string }
        Returns: Json
      }
      reabrir_periodo_ponto: {
        Args: { p_fechamento_id: string; p_motivo: string }
        Returns: Json
      }
      reabrir_periodo_ponto_massa: {
        Args: {
          p_company_id: string
          p_motivo: string
          p_periodo_fim: string
          p_periodo_inicio: string
        }
        Returns: Json
      }
      reabrir_questionario: {
        Args: { p_atribuicao_id: string }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reaplicar_abonos_dia: {
        Args: { p_colab: string; p_data: string }
        Returns: undefined
      }
      recalcular_insights_cuidar: {
        Args: {
          p_ano: number
          p_company_id: string
          p_escopo: string
          p_mes?: number
          p_semana?: number
        }
        Returns: string
      }
      recalcular_resumo_diario: {
        Args: { p_colaborador_id: string; p_data: string }
        Returns: undefined
      }
      recalcular_vinculacao_gozos: {
        Args: { p_colaborador_id: string }
        Returns: {
          atualizado: boolean
          gozo_id: string
          periodo_antigo: string
          periodo_novo: string
        }[]
      }
      recusar_ferias_gozo: {
        Args: { p_gozo_id: string; p_motivo: string }
        Returns: undefined
      }
      registrar_acao_alerta: {
        Args: { p_acao: string; p_alerta_id: string; p_novo_status?: string }
        Returns: undefined
      }
      registrar_leitura_campanha: {
        Args: { p_campanha_id: string; p_user_id: string }
        Returns: undefined
      }
      registrar_leitura_comunicado: {
        Args: { p_comunicado_id: string; p_user_id: string }
        Returns: undefined
      }
      registrar_promocao: {
        Args: {
          p_aprovado_por?: string
          p_cargo_novo: string
          p_colaborador_id: string
          p_company_id: string
          p_data_promocao: string
          p_departamento_novo?: string
          p_motivo?: string
          p_nivel_novo?: string
          p_observacoes?: string
          p_salario_novo: number
        }
        Returns: Json
      }
      registrar_promocao_retroativa: {
        Args: {
          p_aprovado_por?: string
          p_cargo_anterior: string
          p_cargo_novo: string
          p_colaborador_id: string
          p_company_id: string
          p_data_promocao: string
          p_departamento_anterior?: string
          p_departamento_novo?: string
          p_motivo?: string
          p_nivel_anterior?: string
          p_nivel_novo?: string
          p_observacoes?: string
          p_salario_anterior: number
          p_salario_novo: number
        }
        Returns: Json
      }
      registrar_tratativa_fechamento: {
        Args: {
          p_acao: Database["public"]["Enums"]["tratativa_saldo_acao"]
          p_colaborador_id: string
          p_company_id: string
          p_observacao?: string
          p_periodo_fim: string
          p_periodo_inicio: string
        }
        Returns: string
      }
      relatorio_leituras_campanha: {
        Args: { p_campanha_id: string }
        Returns: {
          cargo: string
          cpf: string
          departamento: string
          email_pessoal: string
          lido: boolean
          lido_em: string
          matricula: string
          nome: string
          user_id: string
        }[]
      }
      relatorio_leituras_comunicado: {
        Args: { p_comunicado_id: string }
        Returns: {
          cargo: string
          cpf: string
          departamento: string
          email_pessoal: string
          lido: boolean
          lido_em: string
          matricula: string
          nome: string
          user_id: string
        }[]
      }
      replicate_beneficios_to_all_companies: {
        Args: { p_source_company_id: string }
        Returns: Json
      }
      replicate_ciclo_avaliacao: {
        Args: { p_ciclo_id: string; p_source_company_id: string }
        Returns: {
          company_name: string
          error_message: string
          success: boolean
        }[]
      }
      replicate_comunicado: {
        Args: { p_comunicado_id: string; p_source_company_id: string }
        Returns: {
          company_name: string
          error_message: string
          success: boolean
        }[]
      }
      replicate_cuidar_conteudo_to_all: {
        Args: { p_id: string }
        Returns: {
          out_company_id: string
          out_id: string
          out_origem: string
          out_storage_path: string
        }[]
      }
      replicate_pulse_campaign: {
        Args: { p_campaign_id: string; p_source_company_id: string }
        Returns: {
          company_name: string
          error_message: string
          success: boolean
        }[]
      }
      replicate_questionario_cuidar_plus: {
        Args: { p_questionario_id: string; p_source_company_id: string }
        Returns: {
          company_name: string
          error_message: string
          success: boolean
        }[]
      }
      replicate_questionnaire_template: {
        Args: { p_source_company_id: string; p_template_id: string }
        Returns: {
          company_name: string
          error_message: string
          success: boolean
        }[]
      }
      require_admin_role: { Args: never; Returns: undefined }
      resolve_feedback_template: {
        Args: {
          p_company_id: string
          p_milestone: Database["public"]["Enums"]["milestone_type"]
          p_respondent: Database["public"]["Enums"]["respondent_type"]
        }
        Returns: string
      }
      revoke_consent: {
        Args: {
          p_collaborator_id: string
          p_consent_type: string
          p_grant?: boolean
        }
        Returns: Json
      }
      search_cbo: {
        Args: { p_termo: string }
        Returns: {
          codigo: string
          descricao: string
          titulo: string
        }[]
      }
      submit_avaliacao_responses: {
        Args: {
          p_finalizar?: boolean
          p_respostas_competencias: Json
          p_respostas_objetivos: Json
          p_token: string
        }
        Returns: boolean
      }
      submit_cuidar_plus_responses: {
        Args: { p_deseja_contato: boolean; p_respostas: Json; p_token: string }
        Returns: boolean
      }
      submit_feedback_responses: {
        Args: { p_responses: Json; p_token: string }
        Returns: boolean
      }
      submit_pulse_campaign_response: {
        Args: {
          p_campaign_id: string
          p_comentario?: string
          p_responses: Json
        }
        Returns: boolean
      }
      suspender_empresa: {
        Args: { _ativar: boolean; _company_id: string; _ip?: string }
        Returns: Json
      }
      transferir_colaborador: {
        Args: {
          p_colaborador_id: string
          p_empresa_destino_id: string
          p_motivo?: string
        }
        Returns: Json
      }
      validate_certificate: {
        Args: { p_code: string }
        Returns: {
          carga_horaria: number
          colaborador_nome: string
          data_conclusao: string
          is_valid: boolean
          issue_date: string
          status: string
          treinamento_titulo: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "user"
        | "admin_master"
        | "admin_empresa"
        | "analista_rh"
        | "gestor_departamento"
        | "colaborador"
        | "super_admin"
      avaliacao_link_tipo: "autoavaliacao" | "gestor"
      avaliacao_status: "nao_iniciada" | "em_andamento" | "concluida"
      ciclo_avaliacao_status: "configuracao" | "ativo" | "finalizado"
      colaborador_status: "ATIVO" | "FERIAS" | "DESLIGADO" | "LICENCA"
      comunicado_status: "rascunho" | "publicado" | "agendado"
      conclusao_status:
        | "nao_iniciado"
        | "em_andamento"
        | "apto_concluir"
        | "concluido"
      contract_type:
        | "CLT"
        | "Estágio"
        | "Aprendiz"
        | "PJ"
        | "Temporário"
        | "Voluntário"
        | "Outros"
      education_level:
        | "Fundamental Incompleto"
        | "Fundamental Completo"
        | "Médio Incompleto"
        | "Médio Completo"
        | "Superior Incompleto"
        | "Superior Completo"
        | "Pós-graduação"
        | "Mestrado"
        | "Doutorado"
      ethnicity_type:
        | "Branca"
        | "Preta"
        | "Parda"
        | "Amarela"
        | "Indígena"
        | "Não informar"
      feedback_cycle_status:
        | "NAO_INICIADO"
        | "LINKS_GERADOS"
        | "COLAB_RESPONDIDO"
        | "GESTOR_RESPONDIDO"
        | "CONCLUIDO"
        | "ATRASADO"
      ferias_gozo_status: "planejado" | "aprovado" | "gozado" | "cancelado"
      job_level:
        | "Júnior I"
        | "Júnior II"
        | "Júnior III"
        | "Pleno I"
        | "Pleno II"
        | "Pleno III"
        | "Sênior I"
        | "Sênior II"
        | "Sênior III"
        | "Especialista"
        | "Júnior"
        | "Pleno"
        | "Sênior"
        | "Especialista I"
        | "Especialista II"
        | "Especialista III"
      marital_status:
        | "Solteiro(a)"
        | "Casado(a)"
        | "Separado(a)"
        | "Divorciado(a)"
        | "Viúvo(a)"
        | "União Estável"
      milestone_type: "30_DIAS" | "80_DIAS" | "120_DIAS" | "GERAL"
      payment_method: "Mensalista" | "Horista" | "Comissionista"
      pdi_item_responsavel: "colaborador" | "gestor" | "rh"
      pdi_item_status:
        | "nao_iniciado"
        | "em_andamento"
        | "concluido"
        | "bloqueado"
      pdi_item_tipo_acao:
        | "treinamento"
        | "mentoria"
        | "projeto_pratico"
        | "leitura"
        | "coaching"
        | "feedbacks_periodicos"
        | "outro"
      pdi_item_tipo_alvo: "competencia" | "objetivo" | "geral"
      pdi_status: "rascunho" | "em_andamento" | "concluido" | "cancelado"
      periodo_aquisitivo_status: "aberto" | "fechado" | "vencido"
      ponto_registro_tipo:
        | "ENTRADA"
        | "SAIDA"
        | "INTERVALO_SAIDA"
        | "INTERVALO_RETORNO"
      ponto_resumo_status:
        | "REGULAR"
        | "INCONSISTENTE"
        | "FALTA"
        | "FERIADO"
        | "ABONADO"
        | "AJUSTE"
      publico_alvo_tipo: "todos" | "departamento" | "cargo"
      pulse_ambiente: "empresa" | "cliente"
      pulse_question_type: "escala_0_5" | "sim_nao" | "texto_livre"
      question_type: "ESCALA_NUMERICA" | "TEXTO_LIVRE" | "SIM_NAO"
      questionario_atribuicao_status: "pendente" | "em_andamento" | "preenchido"
      relationship_type: "Filho(a)" | "Cônjuge" | "Pai/Mãe" | "Outro"
      respondent_type: "COLABORADOR" | "GESTOR" | "AMBOS"
      respondente_avaliacao_tipo: "colaborador" | "gestor"
      sex_type: "Feminino" | "Masculino" | "Outro" | "Não informar"
      target_audience_type:
        | "COLABORADOR"
        | "GESTOR"
        | "AMBOS"
        | "NAO_ESPECIFICADO"
      tipo_exposicao: "continua" | "intermitente" | "eventual"
      tipo_metrica: "numerica" | "descritiva"
      tratativa_saldo_acao: "pagar" | "descontar" | "transferir" | "perdoar"
      treinamento_status: "rascunho" | "publicado" | "arquivado"
      treinamento_tipo: "arquivo" | "link" | "video" | "pdf" | "ppt"
      unidade_tipo: "matriz" | "filial" | "centro_distribuicao" | "escritorio"
      work_shift_type:
        | "Integral"
        | "Parcial"
        | "Aprendiz"
        | "Estagiário"
        | "Flexível"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "user",
        "admin_master",
        "admin_empresa",
        "analista_rh",
        "gestor_departamento",
        "colaborador",
        "super_admin",
      ],
      avaliacao_link_tipo: ["autoavaliacao", "gestor"],
      avaliacao_status: ["nao_iniciada", "em_andamento", "concluida"],
      ciclo_avaliacao_status: ["configuracao", "ativo", "finalizado"],
      colaborador_status: ["ATIVO", "FERIAS", "DESLIGADO", "LICENCA"],
      comunicado_status: ["rascunho", "publicado", "agendado"],
      conclusao_status: [
        "nao_iniciado",
        "em_andamento",
        "apto_concluir",
        "concluido",
      ],
      contract_type: [
        "CLT",
        "Estágio",
        "Aprendiz",
        "PJ",
        "Temporário",
        "Voluntário",
        "Outros",
      ],
      education_level: [
        "Fundamental Incompleto",
        "Fundamental Completo",
        "Médio Incompleto",
        "Médio Completo",
        "Superior Incompleto",
        "Superior Completo",
        "Pós-graduação",
        "Mestrado",
        "Doutorado",
      ],
      ethnicity_type: [
        "Branca",
        "Preta",
        "Parda",
        "Amarela",
        "Indígena",
        "Não informar",
      ],
      feedback_cycle_status: [
        "NAO_INICIADO",
        "LINKS_GERADOS",
        "COLAB_RESPONDIDO",
        "GESTOR_RESPONDIDO",
        "CONCLUIDO",
        "ATRASADO",
      ],
      ferias_gozo_status: ["planejado", "aprovado", "gozado", "cancelado"],
      job_level: [
        "Júnior I",
        "Júnior II",
        "Júnior III",
        "Pleno I",
        "Pleno II",
        "Pleno III",
        "Sênior I",
        "Sênior II",
        "Sênior III",
        "Especialista",
        "Júnior",
        "Pleno",
        "Sênior",
        "Especialista I",
        "Especialista II",
        "Especialista III",
      ],
      marital_status: [
        "Solteiro(a)",
        "Casado(a)",
        "Separado(a)",
        "Divorciado(a)",
        "Viúvo(a)",
        "União Estável",
      ],
      milestone_type: ["30_DIAS", "80_DIAS", "120_DIAS", "GERAL"],
      payment_method: ["Mensalista", "Horista", "Comissionista"],
      pdi_item_responsavel: ["colaborador", "gestor", "rh"],
      pdi_item_status: [
        "nao_iniciado",
        "em_andamento",
        "concluido",
        "bloqueado",
      ],
      pdi_item_tipo_acao: [
        "treinamento",
        "mentoria",
        "projeto_pratico",
        "leitura",
        "coaching",
        "feedbacks_periodicos",
        "outro",
      ],
      pdi_item_tipo_alvo: ["competencia", "objetivo", "geral"],
      pdi_status: ["rascunho", "em_andamento", "concluido", "cancelado"],
      periodo_aquisitivo_status: ["aberto", "fechado", "vencido"],
      ponto_registro_tipo: [
        "ENTRADA",
        "SAIDA",
        "INTERVALO_SAIDA",
        "INTERVALO_RETORNO",
      ],
      ponto_resumo_status: [
        "REGULAR",
        "INCONSISTENTE",
        "FALTA",
        "FERIADO",
        "ABONADO",
        "AJUSTE",
      ],
      publico_alvo_tipo: ["todos", "departamento", "cargo"],
      pulse_ambiente: ["empresa", "cliente"],
      pulse_question_type: ["escala_0_5", "sim_nao", "texto_livre"],
      question_type: ["ESCALA_NUMERICA", "TEXTO_LIVRE", "SIM_NAO"],
      questionario_atribuicao_status: [
        "pendente",
        "em_andamento",
        "preenchido",
      ],
      relationship_type: ["Filho(a)", "Cônjuge", "Pai/Mãe", "Outro"],
      respondent_type: ["COLABORADOR", "GESTOR", "AMBOS"],
      respondente_avaliacao_tipo: ["colaborador", "gestor"],
      sex_type: ["Feminino", "Masculino", "Outro", "Não informar"],
      target_audience_type: [
        "COLABORADOR",
        "GESTOR",
        "AMBOS",
        "NAO_ESPECIFICADO",
      ],
      tipo_exposicao: ["continua", "intermitente", "eventual"],
      tipo_metrica: ["numerica", "descritiva"],
      tratativa_saldo_acao: ["pagar", "descontar", "transferir", "perdoar"],
      treinamento_status: ["rascunho", "publicado", "arquivado"],
      treinamento_tipo: ["arquivo", "link", "video", "pdf", "ppt"],
      unidade_tipo: ["matriz", "filial", "centro_distribuicao", "escritorio"],
      work_shift_type: [
        "Integral",
        "Parcial",
        "Aprendiz",
        "Estagiário",
        "Flexível",
      ],
    },
  },
} as const
