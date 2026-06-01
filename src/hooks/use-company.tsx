import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface Company {
  id: string;
  name: string;
}

interface CompanyContextValue {
  companies: Company[];
  activeCompany: Company | null;
  activeCompanyId: string | undefined;
  role: string | null;
  isLoading: boolean;
  switchCompany: (companyId: string) => void;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["user-company-memberships", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("company_id, role, is_active, companies:company_id(id, name)")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        companyId: m.company_id,
        role: m.role,
        company: m.companies as Company,
      }));
    },
  });

  const companies = (memberships ?? []).map((m) => m.company).filter(Boolean);

  const activeMembership = selectedId
    ? memberships?.find((m) => m.companyId === selectedId)
    : memberships?.[0];

  const activeCompany = activeMembership?.company ?? null;
  const role = activeMembership?.role ?? null;

  const switchCompany = useCallback((companyId: string) => {
    setSelectedId(companyId);
  }, []);

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompany,
        activeCompanyId: activeCompany?.id,
        role,
        isLoading,
        switchCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompanyContext must be used within CompanyProvider");
  return ctx;
}

// Backward-compat hook used by pages
export function useActiveCompany() {
  const { activeCompanyId, role, isLoading } = useCompanyContext();
  return {
    data: activeCompanyId ? { company_id: activeCompanyId, role } : null,
    isLoading,
  };
}
