import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface HouseholdContextType {
  householdId: string | null;
  userName: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType>({
  householdId: null,
  userName: null,
  loading: true,
  refresh: async () => {},
});

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setHouseholdId(null);
      setUserName(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("household_members")
      .select("household_id, user_name")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (data) {
      setHouseholdId(data.household_id);
      setUserName(data.user_name);
      // Update last_seen
      await supabase
        .from("household_members")
        .update({ last_seen: new Date().toISOString() })
        .eq("user_id", user.id);
    } else {
      setHouseholdId(null);
      setUserName(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <HouseholdContext.Provider value={{ householdId, userName, loading, refresh }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export const useHousehold = () => useContext(HouseholdContext);
