import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';

export function GestorAlertBanner() {
  const { session } = useAuth();
  const companyId = useEffectiveCompanyId();
  const navigate = useNavigate();

  // Check if user is gestor
  const { data: role } = useQuery({
    queryKey: ['user-role-banner', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_role');
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const isGestor = role === 'gestor_departamento';

  // Fetch drilldown to get cases
  const { data: drilldown } = useQuery({
    queryKey: ['pulse-drilldown', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_cuidar_drilldown', {
        p_company_id: companyId,
      });
      if (error) throw error;
      return data;
    },
    enabled: isGestor && !!companyId,
  });

  if (!isGestor || !drilldown || drilldown.length === 0) {
    return null;
  }

  // Count "novo" and "atrasado" cases
  // Since the RPC filters by responsavel_id for gestor, there is only ONE gestor object in the array for them
  let criticosCount = 0;
  drilldown.forEach((gestor) => {
    gestor.casos?.forEach((caso: any) => {
      if (caso.status === 'novo' || caso.is_atrasado) {
        criticosCount++;
      }
    });
  });

  if (criticosCount === 0) return null;

  const handleNavigate = () => {
    navigate('/cuidar-mais?tab=acompanhamentos');
  };

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-top-2 duration-300 relative z-50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/20 text-destructive relative">
          <AlertCircle className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-destructive-foreground">
            Atenção: Você tem {criticosCount} {criticosCount === 1 ? 'caso crítico aguardando' : 'casos críticos aguardando'} ação no Cuidar+
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="default" 
          size="sm" 
          className="bg-destructive hover:bg-destructive/90 text-white shadow-sm"
          onClick={handleNavigate}
        >
          Ver casos <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
