import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { applyThemeToRoot } from "@/lib/colorUtils";

export function useUserPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateThemeColor = useMutation({
    mutationFn: async (themeColor: string | null) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_preferences")
          .update({ theme_color: themeColor, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_preferences")
          .insert({ user_id: user.id, theme_color: themeColor });
        if (error) throw error;
      }
      return themeColor;
    },
    onSuccess: (themeColor) => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["company-branding"] });

      // Determina a cor a aplicar imediatamente
      let effectiveColor = themeColor;
      if (!effectiveColor && typeof window !== "undefined") {
        try {
          const lastData = localStorage.getItem("nr1_branding_data_last");
          if (lastData) {
            const parsed = JSON.parse(lastData);
            if (parsed?.primaryColor) effectiveColor = parsed.primaryColor;
          }
        } catch {
          // ignora falha de parse
        }
      }

      applyThemeToRoot(effectiveColor || "#C8102E");

      // Atualiza o cache do usuário no localStorage para persistência e anti-FOUC
      if (typeof window !== "undefined" && user?.id) {
        try {
          if (themeColor) {
            localStorage.setItem(`nr1_branding_${user.id}`, themeColor);
            const userCache = localStorage.getItem(`nr1_branding_data_${user.id}`);
            if (userCache) {
              const parsed = JSON.parse(userCache);
              parsed.primaryColor = themeColor;
              parsed.isCustom = true;
              localStorage.setItem(`nr1_branding_data_${user.id}`, JSON.stringify(parsed));
            }
          } else {
            localStorage.removeItem(`nr1_branding_${user.id}`);
            if (effectiveColor) {
              const userCache = localStorage.getItem(`nr1_branding_data_${user.id}`);
              if (userCache) {
                const parsed = JSON.parse(userCache);
                parsed.primaryColor = effectiveColor;
                parsed.isCustom = false;
                localStorage.setItem(`nr1_branding_data_${user.id}`, JSON.stringify(parsed));
              }
            }
          }
        } catch {
          // ignora
        }
      }

      toast({ title: "Preferências salvas", description: "Sua cor de tema foi atualizada." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar suas preferências." });
    },
  });

  return {
    themeColor: preferences?.theme_color ?? null,
    isLoading,
    updateThemeColor,
  };
}
