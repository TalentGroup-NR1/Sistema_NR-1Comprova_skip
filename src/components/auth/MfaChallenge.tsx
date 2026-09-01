import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface MfaChallengeProps {
  onVerified: () => void;
  onCancel: () => void;
}

export function MfaChallenge({ onVerified, onCancel }: MfaChallengeProps) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        const verified = data?.totp?.find((f) => f.status === "verified");
        if (!verified) {
          // Should not happen — let parent proceed
          onVerified();
          return;
        }
        setFactorId(verified.id);
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
          factorId: verified.id,
        });
        if (chErr) throw chErr;
        setChallengeId(ch.id);
      } catch (e: any) {
        toast.error("Erro ao iniciar desafio MFA: " + (e.message || ""));
        onCancel();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const verify = async () => {
    if (!factorId || !challengeId || code.length !== 6) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
      });
      if (error) throw error;
      toast.success("Código verificado!");
      onVerified();
    } catch (e: any) {
      toast.error("Código inválido. Tente novamente.");
      // Re-issue challenge so user can retry
      try {
        const { data: ch } = await supabase.auth.mfa.challenge({ factorId });
        if (ch) setChallengeId(ch.id);
      } catch {}
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    await supabase.auth.signOut();
    onCancel();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Verificação em 2 etapas</h3>
        <p className="text-sm text-muted-foreground">
          Digite o código de 6 dígitos do seu app autenticador.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="mfa-challenge-code">Código</Label>
        <Input
          id="mfa-challenge-code"
          autoFocus
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verify()}
          className="tracking-widest text-center text-xl"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={cancel} disabled={busy} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={verify} disabled={busy || code.length !== 6} className="flex-1">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verificar
        </Button>
      </div>
    </div>
  );
}
