import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCompanies } from '@/hooks/useCompanies';
import { useUserCompanies } from '@/hooks/useUserCompanies';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'tgmais_selected_company';

interface CompanyContextType {
  selectedCompanyId: string | null; // null = "Todas as Empresas" (para Super Admin / Admin Master)
  setSelectedCompanyId: (id: string | null) => Promise<void>;
  selectedCompanyName: string | null;
  hasMultipleCompanies: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

interface CompanyProviderProps {
  children: ReactNode;
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const { isAdminMaster, isSuperAdmin, companyId: authCompanyId } = useAuth();
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });

  const { data: allCompanies } = useCompanies();
  const { userCompanies, hasMultipleCompanies, switchCompany } = useUserCompanies();

  // Validação e inicialização de empresa ativa
  useEffect(() => {
    // Se for Super Admin / Admin Master, valida contra lista global de empresas
    if (isAdminMaster || isSuperAdmin) {
      if (selectedCompanyId && allCompanies && allCompanies.length > 0) {
        const exists = allCompanies.some(c => c.id === selectedCompanyId);
        if (!exists) {
          setSelectedCompanyIdState(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      return;
    }

    // Para usuários regulares com vínculos em userCompanies:
    if (userCompanies.length > 0) {
      // Se não há empresa selecionada ainda, define a padrão ou primeira
      if (!selectedCompanyId) {
        const defaultLink = userCompanies.find(u => u.isDefault) || userCompanies[0];
        const initialId = defaultLink?.companyId || authCompanyId || null;
        if (initialId) {
          setSelectedCompanyIdState(initialId);
          localStorage.setItem(STORAGE_KEY, initialId);
        }
      } else {
        // Se há empresa selecionada, valida se o usuário ainda possui vínculo com ela
        const linkStillValid = userCompanies.some(u => u.companyId === selectedCompanyId);
        if (!linkStillValid) {
          const fallbackLink = userCompanies.find(u => u.isDefault) || userCompanies[0];
          const fallbackId = fallbackLink?.companyId || null;
          setSelectedCompanyIdState(fallbackId);
          if (fallbackId) {
            localStorage.setItem(STORAGE_KEY, fallbackId);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
      return;
    }

    // Sem vínculos em user_companies: o conjunto acessível é o das empresas visíveis ao usuário
    // (lista já filtrada por RLS) somado à empresa do profile. Uma seleção persistida fora desse
    // conjunto (ex.: empresa excluída/recadastrada) é obsoleta: descarta e limpa o localStorage.
    if (selectedCompanyId && allCompanies && allCompanies.length > 0) {
      const accessible =
        allCompanies.some(c => c.id === selectedCompanyId) || selectedCompanyId === authCompanyId;
      if (!accessible) {
        setSelectedCompanyIdState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [selectedCompanyId, allCompanies, userCompanies, isAdminMaster, isSuperAdmin, authCompanyId]);

  const setSelectedCompanyId = async (id: string | null) => {
    if (id && id !== selectedCompanyId) {
      // Executa a troca atômica com validação server-side
      const ok = await switchCompany(id);
      if (!ok) {
        return; // Falha na troca: não altera o estado local (fail-closed)
      }
    }

    setSelectedCompanyIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const selectedCompanyName = selectedCompanyId 
    ? (userCompanies.find(u => u.companyId === selectedCompanyId)?.name 
       ?? allCompanies?.find(c => c.id === selectedCompanyId)?.name 
       ?? null)
    : null;

  return (
    <CompanyContext.Provider value={{ 
      selectedCompanyId, 
      setSelectedCompanyId, 
      selectedCompanyName,
      hasMultipleCompanies
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
}
