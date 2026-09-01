import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCompanies } from '@/hooks/useCompanies';

const STORAGE_KEY = 'tgmais_selected_company';

interface CompanyContextType {
  selectedCompanyId: string | null; // null = "Todas as Empresas"
  setSelectedCompanyId: (id: string | null) => void;
  selectedCompanyName: string | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

interface CompanyProviderProps {
  children: ReactNode;
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? stored : null;
  });

  const { data: companies } = useCompanies();

  // Validate that selected company still exists
  useEffect(() => {
    if (selectedCompanyId && companies) {
      const companyExists = companies.some(c => c.id === selectedCompanyId);
      if (!companyExists) {
        // Company was deleted, reset to "Todas as Empresas"
        setSelectedCompanyIdState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [selectedCompanyId, companies]);

  const setSelectedCompanyId = (id: string | null) => {
    setSelectedCompanyIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const selectedCompanyName = selectedCompanyId 
    ? companies?.find(c => c.id === selectedCompanyId)?.name ?? null
    : null;

  return (
    <CompanyContext.Provider value={{ selectedCompanyId, setSelectedCompanyId, selectedCompanyName }}>
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
