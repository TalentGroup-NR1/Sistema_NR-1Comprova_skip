import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCompanies } from '@/hooks/useCompanies';
import { useUserCompanies } from '@/hooks/useUserCompanies';
import { useAuth } from '@/hooks/useAuth';

export const LEGACY_STORAGE_KEY = 'tgmais_selected_company';

export function getCompanyStorageKey(userId: string | null | undefined): string | null {
  return userId ? `tgmais_selected_company_${userId}` : null;
}

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
  const { user, isAdminMaster, isSuperAdmin, companyId: authCompanyId } = useAuth();
  const userId = user?.id || null;
  const storageKey = getCompanyStorageKey(userId);

  // Limpeza segura e proativa da chave legada compartilhada entre usuários
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(LEGACY_STORAGE_KEY)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      // Ignora erro de acesso a storage (ex: sandbox)
    }
  }, []);

  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return storageKey ? localStorage.getItem(storageKey) || null : null;
  });

  // Quando o usuário muda (login/logout/troca de conta), sincroniza o estado
  useEffect(() => {
    if (!userId) {
      setSelectedCompanyIdState(null);
      return;
    }
    const currentKey = getCompanyStorageKey(userId);
    const persisted = currentKey ? localStorage.getItem(currentKey) : null;
    setSelectedCompanyIdState(persisted || null);
  }, [userId]);

  const { data: allCompanies } = useCompanies();
  const { userCompanies, hasMultipleCompanies, switchCompany } = useUserCompanies();

  // Validação e inicialização de empresa ativa
  useEffect(() => {
    if (!userId || !storageKey) return;

    // Se for Super Admin / Admin Master, valida contra lista global de empresas
    if (isAdminMaster || isSuperAdmin) {
      if (selectedCompanyId && allCompanies && allCompanies.length > 0) {
        const company = allCompanies.find(c => c.id === selectedCompanyId);
        // Admin Master só pode ter empresa selecionada se for interna / sandbox (is_internal === true).
        // Se a empresa não existir ou for de cliente (!is_internal), limpa imediatamente.
        if (!company || company.is_internal !== true) {
          setSelectedCompanyIdState(null);
          localStorage.removeItem(storageKey);
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
          localStorage.setItem(storageKey, initialId);
        }
      } else {
        // Se há empresa selecionada, valida se o usuário ainda possui vínculo com ela
        const linkStillValid = userCompanies.some(u => u.companyId === selectedCompanyId);
        if (!linkStillValid) {
          const fallbackLink = userCompanies.find(u => u.isDefault) || userCompanies[0];
          const fallbackId = fallbackLink?.companyId || null;
          setSelectedCompanyIdState(fallbackId);
          if (fallbackId) {
            localStorage.setItem(storageKey, fallbackId);
          } else {
            localStorage.removeItem(storageKey);
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
        localStorage.removeItem(storageKey);
      }
    }
  }, [selectedCompanyId, allCompanies, userCompanies, isAdminMaster, isSuperAdmin, authCompanyId, userId, storageKey]);

  const setSelectedCompanyId = async (id: string | null) => {
    if (id && id !== selectedCompanyId) {
      if (isAdminMaster || isSuperAdmin) {
        if (allCompanies && allCompanies.length > 0) {
          const comp = allCompanies.find(c => c.id === id);
          if (comp && comp.is_internal !== true) {
            console.warn('[CompanyContext] Admin Master só pode selecionar empresas internas como sandbox.');
            return;
          }
        }
      } else {
        // Executa a troca atômica com validação server-side
        const ok = await switchCompany(id);
        if (!ok) {
          return; // Falha na troca: não altera o estado local (fail-closed)
        }
      }
    }

    setSelectedCompanyIdState(id);
    if (!storageKey) return;

    if (id) {
      localStorage.setItem(storageKey, id);
    } else {
      localStorage.removeItem(storageKey);
    }
  };

  const isMaster = Boolean(isAdminMaster || isSuperAdmin);

  // Para Admin Master, se a empresa selecionada não for verificada como interna (sandbox), expõe null (fail-closed imediato)
  const safeSelectedCompanyId = isMaster
    ? (selectedCompanyId && allCompanies && allCompanies.length > 0
        ? (allCompanies.find(c => c.id === selectedCompanyId && c.is_internal === true)?.id ?? null)
        : null)
    : selectedCompanyId;

  const selectedCompanyName = safeSelectedCompanyId 
    ? (userCompanies.find(u => u.companyId === safeSelectedCompanyId)?.name 
       ?? allCompanies?.find(c => c.id === safeSelectedCompanyId)?.name 
       ?? null)
    : null;

  return (
    <CompanyContext.Provider value={{ 
      selectedCompanyId: safeSelectedCompanyId, 
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
