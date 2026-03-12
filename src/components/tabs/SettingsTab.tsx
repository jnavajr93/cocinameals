import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Copy, LogOut, ChevronRight, Lock } from "lucide-react";

export function SettingsTab() {
  const { user, signOut } = useAuth();
  const { householdId, userName } = useHousehold();
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [members, setMembers] = useState<{ user_name: string; last_seen: string | null }[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    
    const load = async () => {
      const { data: household } = await supabase
        .from("households")
        .select("name, invite_code")
        .eq("id", householdId)
        .single();
      
      if (household) {
        setHouseholdName(household.name || "");
        setInviteCode(household.invite_code);
      }

      const { data: memberData } = await supabase
        .from("household_members")
        .select("user_name, last_seen")
        .eq("household_id", householdId);
      
      if (memberData) setMembers(memberData);
    };
    load();
  }, [householdId]);

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success("Copied to clipboard");
  };

  const updateName = async () => {
    if (!householdId) return;
    await supabase.from("households").update({ name: householdName }).eq("id", householdId);
    toast.success("Household name updated");
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "";
    const diff = Date.now() - new Date(lastSeen).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 5) return "Active now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display text-xl font-bold text-foreground mb-4">Settings</h1>
      </div>

      <div className="px-4 flex flex-col gap-6">
        {/* Household */}
        <section>
          <h2 className="font-display text-base font-bold text-foreground mb-3">Household</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="font-body text-sm text-muted-foreground mb-1 block">Household name</label>
              <input
                type="text"
                value={householdName}
                onChange={e => setHouseholdName(e.target.value)}
                onBlur={updateName}
                placeholder="Name your household"
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="font-body text-xs text-muted-foreground mb-1">Invite code</p>
              <button onClick={copyCode} className="flex items-center gap-2">
                <span className="font-body text-lg font-bold tracking-widest text-primary">{inviteCode}</span>
                <Copy size={14} className="text-muted-foreground" />
              </button>
            </div>
            <div>
              <p className="font-body text-xs text-muted-foreground mb-2">Members</p>
              {members.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="font-body text-sm text-foreground">{m.user_name}</span>
                  <span className="font-body text-xs text-muted-foreground">{formatLastSeen(m.last_seen)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section className="border-t border-border pt-4">
          <div className="flex flex-col items-center gap-2">
            <Logo size="sm" />
            <p className="font-body text-xs text-muted-foreground text-center">
              Your household meal planning companion.
            </p>
            <p className="font-body text-xs text-muted-foreground/60">v1.0.0</p>
          </div>
        </section>

        {/* Logout */}
        <section className="border-t border-border pt-4 pb-8">
          {showLogoutConfirm ? (
            <div className="flex flex-col gap-2">
              <p className="font-body text-sm text-foreground">Log out of cocina?</p>
              <div className="flex gap-2">
                <button onClick={handleLogout} className="flex-1 rounded-lg bg-destructive px-4 py-2 font-body text-sm font-medium text-destructive-foreground">
                  Log out
                </button>
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-lg border border-border px-4 py-2 font-body text-sm text-foreground">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <LogOut size={16} />
              <span className="font-body text-sm">Log out</span>
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
