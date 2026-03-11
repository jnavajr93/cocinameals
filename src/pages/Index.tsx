import { useState, useEffect } from "react";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { AppShell } from "@/components/AppShell";
import { isOnboarded } from "@/lib/store";

const Index = () => {
  const [ready, setReady] = useState(isOnboarded());

  return ready ? (
    <AppShell />
  ) : (
    <Onboarding onComplete={() => setReady(true)} />
  );
};

export default Index;
