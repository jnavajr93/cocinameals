import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import Login from "@/pages/Login";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { householdId, loading: householdLoading } = useHousehold();
  const [previewPhase, setPreviewPhase] = useState<"onboarding" | "app" | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("preview") === "onboarding" ? "onboarding" : null;
  });

  if (authLoading || (user && householdLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-xl"><Logo size="sm" /></div>
      </div>
    );
  }

  // Preview mode: walk through onboarding then app+tour without saving
  if (previewPhase === "onboarding" && user) {
    return (
      <Onboarding
        onComplete={() => {
          localStorage.removeItem("cocina_app_tour_seen");
          setPreviewPhase("app");
        }}
        previewMode
      />
    );
  }
  if (previewPhase === "app" && user) {
    return <AppShell forceShowTour />;
  }

  if (!user) return <Login />;
  if (!householdId) return <Onboarding onComplete={() => window.location.reload()} />;
  return <AppShell />;
};

export default Index;
