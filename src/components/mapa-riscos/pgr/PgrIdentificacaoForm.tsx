import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PgrGheSetorMappingSection } from "./PgrGheSetorMappingSection";
import type { PgrDocumento, PgrResponsavelTecnico } from "@/hooks/usePgrDocumento";

interface Props {
  documento: PgrDocumento;
  onSave: (payload: {
    titulo: string;
    vigencia_inicio: string | null;
    vigencia_fim: string | null;
    cnae: string | null;
    grau_risco: string | null;
    endereco: string | null;
    responsavel_tecnico: PgrResponsavelTecnico;
    anexo_art_path: string | null;
  }) => void;
  saving?: boolean;
}

export function PgrIdentificacaoForm({ documento, onSave, saving }: Props) {
  const [form, setForm] = useState({
    titulo: documento.titulo ?? "",
    vigencia_inicio: documento.vigencia_inicio ?? "",
    vigencia_fim: documento.vigencia_fim ?? "",
    cnae: documento.cnae ?? "",
    grau_risco: documento.grau_risco ?? "",
    endereco: documento.endereco ?? "",
    anexo_art_path: documento.anexo_art_path ?? "",
  });
  const rt = (documento.responsavel_tecnico ?? {}) as PgrResponsavelTecnico;
  const [resp, setResp] = useState<PgrResponsavelTecnico>({
    nome: rt.nome ?? "",
    cpf: rt.cpf ?? "",
    nit: rt.nit ?? "",
    conselho: rt.conselho ?? "",
    uf: rt.uf ?? "",
    especialidade: rt.especialidade ?? "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm({
      titulo: documento.titulo ?? "",
      vigencia_inicio: documento.vigencia_inicio ?? "",
      vigencia_fim: documento.vigencia_fim ?? "",
      cnae: documento.cnae ?? "",
      grau_risco: documento.grau_risco ?? "",
      endereco: documento.endereco ?? "",
      anexo_art_path: documento.anexo_art_path ?? "",
    });
    const r = (documento.responsavel_tecnico ?? {}) as PgrResponsavelTecnico;
    setResp({
      nome: r.nome ?? "",
      cpf: r.cpf ?? "",
      nit: r.nit ?? "",
      conselho: r.conselho ?? "",
      uf: r.uf ?? "",
      especialidade: r.especialidade ?? "",
    });
  }, [documento.id, documento.updated_at]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${documento.company_id}/${documento.id}/${Date.now()}_${safe}`;
      const { error } = await supabase.storage.from("treinamentos").upload(path, file, { upsert: true });
      if (error) throw error;
      setForm((f) => ({ ...f, anexo_art_path: path }));
      toast.success("Anexo enviado. Clique em Salvar para confirmar.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar anexo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>Título do documento</Label>
          <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Vigência — início</Label>
          <Input type="date" value={form.vigencia_inicio} onChange={(e) => setForm({ ...form, vigencia_inicio: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Vigência — fim</Label>
          <Input type="date" value={form.vigencia_fim} onChange={(e) => setForm({ ...form, vigencia_fim: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>CNAE</Label>
          <Input value={form.cnae} onChange={(e) => setForm({ ...form, cnae: e.target.value })} placeholder="00.00-0-00" />
        </div>
        <div className="space-y-1">
          <Label>Grau de risco</Label>
          <Input value={form.grau_risco} onChange={(e) => setForm({ ...form, grau_risco: e.target.value })} placeholder="1 a 4" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Endereço</Label>
          <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Responsável técnico</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={resp.nome} onChange={(e) => setResp({ ...resp, nome: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>CPF</Label>
            <Input value={resp.cpf} onChange={(e) => setResp({ ...resp, cpf: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>NIT</Label>
            <Input value={resp.nit} onChange={(e) => setResp({ ...resp, nit: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Conselho / registro</Label>
            <Input value={resp.conselho} onChange={(e) => setResp({ ...resp, conselho: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>UF</Label>
            <Input maxLength={2} value={resp.uf} onChange={(e) => setResp({ ...resp, uf: e.target.value.toUpperCase() })} />
          </div>
          <div className="space-y-1">
            <Label>Especialidade</Label>
            <Input value={resp.especialidade} onChange={(e) => setResp({ ...resp, especialidade: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1">
        <Label>Anexo da ART</Label>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="application/pdf,image/*"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
        </div>
        {form.anexo_art_path && <p className="text-xs text-muted-foreground truncate">Arquivo: {form.anexo_art_path}</p>}
      </div>

      <Button
        onClick={() =>
          onSave({
            titulo: form.titulo,
            vigencia_inicio: form.vigencia_inicio || null,
            vigencia_fim: form.vigencia_fim || null,
            cnae: form.cnae || null,
            grau_risco: form.grau_risco || null,
            endereco: form.endereco || null,
            responsavel_tecnico: resp,
            anexo_art_path: form.anexo_art_path || null,
          })
        }
        disabled={saving}
      >
        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
        Salvar identificação
      </Button>

      {/* Seção Nova: Sincronização GHE x Setores RH */}
      <PgrGheSetorMappingSection />
    </div>
  );
}
