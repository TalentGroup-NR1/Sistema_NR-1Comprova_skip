import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { MfaSection } from "@/components/profile/MfaSection";

interface PerfilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function PerfilDialog({ open, onOpenChange }: PerfilDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Fetch colaborador info (read-only fields)
  const { data: colaborador } = useQuery({
    queryKey: ["my-colaborador-info", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("colaboradores")
        .select("full_name, job_title, department, company_id, companies(name)")
        .eq("user_id", user.id)
        .eq("status", "ATIVO")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  useEffect(() => {
    if (open && profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAvatarPreview(profile.avatar_url || null);
      setAvatarFile(null);
    }
  }, [open, profile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Formato não suportado. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user?.id) return avatarPreview;

    const ext = avatarFile.name.split(".").pop() || "jpg";
    const safeName = sanitizeFileName(`${Date.now()}.${ext}`);
    const path = `${user.id}/${safeName}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { cacheControl: "3600", upsert: false });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      setUploading(true);

      let newAvatarUrl = profile?.avatar_url || null;
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar();
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Perfil atualizado com sucesso!");
      setUploading(false);
      onOpenChange(false);
    },
    onError: (err: any) => {
      setUploading(false);
      toast.error("Erro ao salvar perfil: " + (err.message || "Tente novamente"));
    },
  });

  const userInitials = (fullName || user?.email || "??").substring(0, 2).toUpperCase();
  const companyName = (colaborador as any)?.companies?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
          <DialogDescription>Visualize e edite suas informações pessoais.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={avatarPreview || undefined} alt="Avatar" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-background" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              Alterar foto
            </button>
          </div>

          {/* Editable fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name" className="text-sm">Nome completo</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-phone" className="text-sm">Telefone</Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* Read-only fields */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">E-mail</Label>
              <p className="text-sm">{user?.email || "—"}</p>
            </div>
            {colaborador && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cargo</Label>
                  <p className="text-sm">{(colaborador as any).job_title || "—"}</p>
                </div>
                {companyName && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Empresa</Label>
                    <p className="text-sm">{companyName}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Change password */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 w-full"
            onClick={() => {
              onOpenChange(false);
              navigate("/alterar-senha");
            }}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Alterar senha
          </Button>

          {/* MFA / Two-factor authentication */}
          <MfaSection />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending || uploading}>
            {saveProfile.isPending || uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
