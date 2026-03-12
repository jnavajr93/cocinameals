import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery type in URL hash
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      navigate("/");
    }
  }, [navigate]);

  const handleReset = async () => {
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      toast.success("Password updated successfully");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-6 animate-fade-in w-full max-w-sm">
        <Logo size="md" />
        <h2 className="font-display text-xl font-bold text-foreground">Set new password</h2>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="w-full rounded-lg border border-border bg-input px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold" autoFocus />
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" className="w-full rounded-lg border border-border bg-input px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
        {error && <p className="font-body text-sm text-destructive">{error}</p>}
        <button onClick={handleReset} disabled={loading} className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40">
          {loading ? "Updating..." : "Update password"}
        </button>
      </div>
    </div>
  );
}
