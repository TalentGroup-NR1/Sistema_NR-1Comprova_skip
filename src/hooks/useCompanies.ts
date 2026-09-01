import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyFormData } from "@/lib/validators/company";
import { toast } from "sonner";

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Company[];
    },
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: CompanyFormData) => {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          name: company.name,
          cnpj: company.cnpj,
          contact_person: company.contact_person || null,
          email: company.email || null,
          status: company.status,
          cep: company.cep || null,
          logradouro: company.logradouro || null,
          numero: company.numero || null,
          complemento: company.complemento || null,
          bairro: company.bairro || null,
          cidade: company.cidade || null,
          estado: company.estado ? company.estado.toUpperCase() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa cadastrada com sucesso!");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate key") || error.message.includes("unique")) {
        toast.error("CNPJ já cadastrado no sistema.");
      } else {
        toast.error("Erro ao cadastrar empresa: " + error.message);
      }
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...company }: CompanyFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("companies")
        .update({
          name: company.name,
          cnpj: company.cnpj,
          contact_person: company.contact_person || null,
          email: company.email || null,
          status: company.status,
          cep: company.cep || null,
          logradouro: company.logradouro || null,
          numero: company.numero || null,
          complemento: company.complemento || null,
          bairro: company.bairro || null,
          cidade: company.cidade || null,
          estado: company.estado ? company.estado.toUpperCase() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa atualizada com sucesso!");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate key") || error.message.includes("unique")) {
        toast.error("CNPJ já cadastrado no sistema.");
      } else {
        toast.error("Erro ao atualizar empresa: " + error.message);
      }
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover empresa: " + error.message);
    },
  });
}

export function useUpdateCompanyColors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      primary_color, 
      secondary_color, 
      accent_color 
    }: { 
      id: string; 
      primary_color: string; 
      secondary_color: string; 
      accent_color: string; 
    }) => {
      const { data, error } = await supabase
        .from("companies")
        .update({
          primary_color,
          secondary_color,
          accent_color,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Cores atualizadas com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar cores: " + error.message);
    },
  });
}

export function useUpdateCompanyBranding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      brand_name,
      brand_logo_url,
      brand_primary_color,
      brand_favicon_url,
    }: {
      id: string;
      brand_name: string | null;
      brand_logo_url: string | null;
      brand_primary_color: string | null;
      brand_favicon_url: string | null;
    }) => {
      const { data, error } = await supabase
        .from("companies")
        .update({
          brand_name,
          brand_logo_url,
          brand_primary_color,
          brand_favicon_url,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Identidade da marca atualizada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar identidade da marca: " + error.message);
    },
  });
}
