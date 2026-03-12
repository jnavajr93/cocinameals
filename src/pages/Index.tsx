import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { AppShell } from "@/components/AppShell";
import Login from "@/pages/Login";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { householdId, loading: householdLoading } = useHousehold();

  if (authLoading || (user && householdLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse font-display text-xl text-primary">cocina</div>
      </div>
    );
  }

  if (!user) return <Login />;
  if (!householdId) return <Onboarding onComplete={() => window.location.reload()} />;
  return <AppShell />;
};

export default Index;
