import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldAlert, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

type EnrollState = {
  factorId: string;
  qr: string; // svg data url
  secret: string;
  uri: string;
} | null;

export function MfaSection() {
  const [loading, setLoading] = useState(true);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<EnrollState>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data?.totp?.find((f) => f.status === "verified");
      setVerifiedFactorId(verified?.id ?? null);
    } catch (e: any) {
      toast.error("Erro ao carregar MFA: " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const startEnroll = async () => {
    setBusy(true);
    try {
      // Clean up any leftover unverified factors first
      const { data: list } = await supabase.auth.mfa.listFactors();
      const unverified = list?.totp?.filter((f) => f.status !== "verified") ?? [];
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `TOTP ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setEnroll({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
      setCode("");
    } catch (e: any) {
      toast.error("Erro ao iniciar MFA: " + (e.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    if (!enroll) return;
    setBusy(true);
    try {
      await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
    } finally {
      setEnroll(null);
      setCode("");
      setBusy(false);
    }
  };

  const verifyEnroll = async () => {
    if (!enroll || code.trim().length !== 6) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: enroll.factorId,
      });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (vErr) throw vErr;
      toast.success("MFA ativado com sucesso!");
      setEnroll(null);
      setCode("");
      await refresh();
    } catch (e: any) {
      toast.error("Código inválido: " + (e.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const disableMfa = async () => {
    if (!verifiedFactorId) return;
    if (!confirm("Tem certeza que deseja desativar a autenticação de dois fatores?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
      if (error) throw error;
      toast.success("MFA desativado.");
      await refresh();
    } catch (e: any) {
      toast.error("Erro ao desativar MFA: " + (e.message || ""));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando segurança...
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div className="flex items-center gap-2">
        {verifiedFactorId ? (
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
        ) : (
          <ShieldAlert className="h-4 w-4 text-amber-600" />
        )}
        <Label className="text-sm font-medium">Segurança · Autenticação em 2 fatores</Label>
      </div>

      {verifiedFactorId && !enroll && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            MFA está <strong>ativo</strong> nesta conta. Você precisará digitar o código do app autenticador a cada login.
          </p>
          <Button variant="outline" size="sm" onClick={disableMfa} disabled={busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
            Desativar MFA
          </Button>
        </div>
      )}

      {!verifiedFactorId && !enroll && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Proteja sua conta exigindo um código de 6 dígitos do Google Authenticator, Authy ou similar a cada login.
          </p>
          <Button variant="outline" size="sm" onClick={startEnroll} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
            Ativar Autenticação de Dois Fatores
          </Button>
        </div>
      )}

      {enroll && (
        <div className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            1. Escaneie o QR Code no seu app autenticador.<br />
            2. Digite o código de 6 dígitos exibido para confirmar.
          </p>
          <div className="flex justify-center">
            <img src={enroll.qr} alt="QR Code MFA" className="h-44 w-44 bg-white p-2 rounded" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ou insira esta chave manualmente:</Label>
            <code className="block text-xs bg-background border border-border rounded px-2 py-1 break-all">
              {enroll.secret}
            </code>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mfa-code" className="text-sm">Código de verificação</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="tracking-widest text-center text-lg"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={cancelEnroll} disabled={busy} className="flex-1">
              Cancelar
            </Button>
            <Button size="sm" onClick={verifyEnroll} disabled={busy || code.length !== 6} className="flex-1">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
              Confirmar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
