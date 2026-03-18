import { useState, useEffect, useRef } from "react";
import { clearRecentSuggestions, clearAllMealCaches } from "@/lib/mealCache";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { Logo } from "@/components/Logo";
import { CocinaText } from "@/components/CocinaText";
import { toast } from "sonner";
import { CUISINES, CUISINE_LABELS } from "@/data/cuisines";
import { EQUIPMENT_CATEGORIES } from "@/data/equipment";
import { MEAL_SECTIONS, QUICK_FILTERS, DIET_RESTRICTIONS, DEFAULT_SECTION_TIMES } from "@/data/mealSections";
import { Copy, LogOut, ChevronRight, ChevronDown, Search, Trash2, Plus, GripVertical, Heart, Database } from "lucide-react";

const HEALTH_CONDITIONS = [
  "High Blood Pressure", "Type 2 Diabetes", "Pre-Diabetic", "High Cholesterol",
  "Heart Disease", "IBS / Digestive Issues", "Gout", "PCOS", "Celiac Disease",
  "Kidney Disease", "Obesity / Weight Loss Goals",
];

const SKILL_LEVELS = ["Beginner", "Intermediate", "Confident"];
const SPICE_LEVELS = ["None", "Mild", "Medium", "Hot", "Extra Hot"];
const WEEKNIGHT_TIMES = ["Under 20 min", "30 min", "45 min", "No rush"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
];

export function SettingsTab() {
  const { user, signOut } = useAuth();
  const { householdId, userName } = useHousehold();
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [householdSize, setHouseholdSize] = useState(2);
  const [members, setMembers] = useState<{ id: string; user_name: string; last_seen: string | null; health_conditions?: string[] }[]>([]);
  const [nonAppMembers, setNonAppMembers] = useState<{ name: string; healthConditions?: string[] }[]>([]);
  const [addingNonAppMember, setAddingNonAppMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Expandable sections
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (s: string) => setExpanded(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

  // Household profile (shared)
  const [equipment, setEquipment] = useState<string[]>([]);
  const [cuisineSliders, setCuisineSliders] = useState<Record<string, number>>({});
  const [mealSections, setMealSections] = useState<{ id: string; name: string; enabled: boolean; order: number; scheduledDays?: string[]; defaultTime?: number; isCustom?: boolean }[]>([]);
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [mealPrepDays, setMealPrepDays] = useState<string[]>([]);

  // User preferences (per-user)
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [spiceTolerance, setSpiceTolerance] = useState("medium");
  const [weeknightTime, setWeeknightTime] = useState("30min");
  const [dietRestrictions, setDietRestrictions] = useState<string[]>([]);
  const [healthConditions, setHealthConditions] = useState<string[]>([]);

  // Children
  const [children, setChildren] = useState<{ id: string; name: string | null; date_of_birth: string; health_conditions?: string[] }[]>([]);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildDob, setNewChildDob] = useState("");

  // Taste profile
  const [likedFeedback, setLikedFeedback] = useState<{ id: string; meal_name: string; created_at: string }[]>([]);
  const [dislikedFeedback, setDislikedFeedback] = useState<{ id: string; meal_name: string; created_at: string }[]>([]);

  // Equipment search
  const [equipSearch, setEquipSearch] = useState("");

  // Add custom meal type
  const [addingCustomMeal, setAddingCustomMeal] = useState(false);
  const [newMealName, setNewMealName] = useState("");
  const [language, setLanguage] = useState("en");

  // Drag reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ processed: number; failed: number; remaining: number } | null>(null);

  const loadSettings = async () => {
    if (!householdId || !user) return;
    const [{ data: household }, { data: memberData }, { data: hProfile }, { data: uPrefs }, { data: childrenData }, { data: feedbackData }] = await Promise.all([
      supabase.from("households").select("name, invite_code, household_size, non_app_members").eq("id", householdId).single(),
      supabase.from("household_members").select("id, user_name, last_seen, health_conditions").eq("household_id", householdId),
      supabase.from("household_profile").select("*").eq("household_id", householdId).maybeSingle(),
      supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("children").select("*").eq("household_id", householdId),
      supabase.from("meal_feedback").select("id, meal_name, feedback, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (household) {
      setHouseholdName(household.name || "");
      setInviteCode(household.invite_code);
      setHouseholdSize((household as any).household_size ?? 2);
      const raw = (household as any).non_app_members || [];
      setNonAppMembers(raw.map((m: any) => typeof m === "string" ? { name: m, healthConditions: [] } : m));
    }
    if (memberData) setMembers(memberData.map(m => ({ ...m, health_conditions: ((m as any).health_conditions as string[]) || [] })));
    if (hProfile) {
      setEquipment((hProfile.equipment as string[]) || []);
      setCuisineSliders((hProfile.cuisine_sliders as Record<string, number>) || {});
      setMealSections((hProfile.meal_sections as any[]) || []);
      setQuickFilters((hProfile.quick_filters as string[]) || []);
      setMealPrepDays((hProfile.meal_prep_days as string[]) || []);
    }
    if (uPrefs) {
      setSkillLevel(uPrefs.skill_level || "intermediate");
      setSpiceTolerance(uPrefs.spice_tolerance || "medium");
      setWeeknightTime(uPrefs.weeknight_time || "30min");
      setDietRestrictions((uPrefs.diet_restrictions as string[]) || []);
      setHealthConditions((uPrefs.health_conditions as string[]) || []);
      if (uPrefs.section_order && (uPrefs.section_order as any[]).length > 0) {
        setMealSections(uPrefs.section_order as any[]);
      }
    }
    if (childrenData) setChildren(childrenData.map(c => ({ ...c, health_conditions: (c.health_conditions as string[]) || [] })));
    if (feedbackData) {
      setLikedFeedback(feedbackData.filter(f => f.feedback === "liked").map(f => ({ id: f.id, meal_name: f.meal_name, created_at: f.created_at || "" })));
      setDislikedFeedback(feedbackData.filter(f => f.feedback === "disliked").map(f => ({ id: f.id, meal_name: f.meal_name, created_at: f.created_at || "" })));
    }
  };

  useEffect(() => {
    if (!householdId || !user) return;
    loadSettings();
  }, [householdId, user]);

  // Realtime sync
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`settings-sync-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_profile', filter: `household_id=eq.${householdId}` }, () => loadSettings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'households', filter: `id=eq.${householdId}` }, () => loadSettings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${householdId}` }, () => loadSettings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children', filter: `household_id=eq.${householdId}` }, () => loadSettings())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [householdId]);

  // Save helpers
  const saveHouseholdProfile = async (patch: Record<string, any>) => {
    if (!householdId) return;
    await supabase.from("household_profile").update(patch).eq("household_id", householdId);
  };

  const saveUserPreferences = async (patch: Record<string, any>) => {
    if (!user) return;
    await supabase.from("user_preferences").update(patch).eq("user_id", user.id);
  };

  const updateHouseholdName = async () => {
    if (!householdId) return;
    await supabase.from("households").update({ name: householdName }).eq("id", householdId);
    toast.success("Household name updated");
  };

  const updateHouseholdSize = async (size: number) => {
    if (!householdId) return;
    setHouseholdSize(size);
    await supabase.from("households").update({ household_size: size } as any).eq("id", householdId);
  };

  const copyCode = () => { navigator.clipboard.writeText(inviteCode); toast.success("Copied to clipboard"); };

  const saveNonAppMembers = async (next: { name: string; healthConditions?: string[] }[]) => {
    if (!householdId) return;
    setNonAppMembers(next);
    await supabase.from("households").update({ non_app_members: next } as any).eq("id", householdId);
  };

  const addNonAppMember = async () => {
    if (!householdId || !newMemberName.trim()) return;
    const next = [...nonAppMembers, { name: newMemberName.trim(), healthConditions: [] }];
    await saveNonAppMembers(next);
    setNewMemberName("");
    setAddingNonAppMember(false);
    toast.success("Member added");
  };

  const removeNonAppMember = async (index: number) => {
    const next = nonAppMembers.filter((_, i) => i !== index);
    await saveNonAppMembers(next);
    toast.success("Member removed");
  };

  const toggleNonAppMemberHealth = async (index: number, condition: string) => {
    const next = nonAppMembers.map((m, i) => {
      if (i !== index) return m;
      const current = m.healthConditions || [];
      return { ...m, healthConditions: current.includes(condition) ? current.filter(c => c !== condition) : [...current, condition] };
    });
    await saveNonAppMembers(next);
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

  const toggleEquipment = (item: string) => {
    const next = equipment.includes(item) ? equipment.filter(e => e !== item) : [...equipment, item];
    setEquipment(next);
    saveHouseholdProfile({ equipment: next });
  };

  const updateCuisineSlider = (cuisine: string, value: number) => {
    const next = { ...cuisineSliders, [cuisine]: value };
    setCuisineSliders(next);
    saveHouseholdProfile({ cuisine_sliders: next });
  };

  const toggleMealSection = (id: string) => {
    const next = mealSections.map(s => s.id === id ? { ...s, enabled: !s.enabled, scheduledDays: !s.enabled ? s.scheduledDays : undefined } : s);
    setMealSections(next);
    saveHouseholdProfile({ meal_sections: next });
    saveUserPreferences({ section_order: next });
  };

  const toggleSectionDay = (sectionId: string, day: string) => {
    const next = mealSections.map(s => {
      if (s.id !== sectionId) return s;
      const current = s.scheduledDays || [];
      return { ...s, scheduledDays: current.includes(day) ? current.filter(d => d !== day) : [...current, day] };
    });
    setMealSections(next);
    saveHouseholdProfile({ meal_sections: next });
    saveUserPreferences({ section_order: next });
  };

  const toggleQuickFilter = (f: string) => {
    let next: string[];
    if (quickFilters.includes(f)) {
      next = quickFilters.filter(q => q !== f);
    } else if (quickFilters.length < 6) {
      next = [...quickFilters, f];
    } else {
      toast("Maximum 6 filters", { duration: 2000 });
      return;
    }
    setQuickFilters(next);
    saveHouseholdProfile({ quick_filters: next });
  };

  const updateSkillLevel = (v: string) => { setSkillLevel(v); saveUserPreferences({ skill_level: v }); };
  const updateSpice = (v: string) => { setSpiceTolerance(v); saveUserPreferences({ spice_tolerance: v }); };
  const updateWeeknight = (v: string) => { setWeeknightTime(v); saveUserPreferences({ weeknight_time: v }); };

  const toggleDiet = (d: string) => {
    const next = dietRestrictions.includes(d) ? dietRestrictions.filter(r => r !== d) : [...dietRestrictions, d];
    setDietRestrictions(next);
    saveUserPreferences({ diet_restrictions: next });
  };

  const toggleHealth = (h: string) => {
    const next = healthConditions.includes(h) ? healthConditions.filter(c => c !== h) : [...healthConditions, h];
    setHealthConditions(next);
    saveUserPreferences({ health_conditions: next });
  };

  const toggleMemberHealth = async (memberId: string, condition: string) => {
    const next = members.map(m => {
      if (m.id !== memberId) return m;
      const current = m.health_conditions || [];
      return { ...m, health_conditions: current.includes(condition) ? current.filter(c => c !== condition) : [...current, condition] };
    });
    setMembers(next);
    const member = next.find(m => m.id === memberId);
    if (member) {
      await supabase.from("household_members").update({ health_conditions: member.health_conditions } as any).eq("id", memberId);
    }
  };

  const toggleChildHealth = async (childId: string, condition: string) => {
    const next = children.map(c => {
      if (c.id !== childId) return c;
      const current = c.health_conditions || [];
      return { ...c, health_conditions: current.includes(condition) ? current.filter(h => h !== condition) : [...current, condition] };
    });
    setChildren(next);
    const child = next.find(c => c.id === childId);
    if (child) {
      await supabase.from("children").update({ health_conditions: child.health_conditions } as any).eq("id", childId);
    }
  };

  const CHILD_SECTION_IDS = ["child_breakfast", "child_lunch", "child_snack", "child_dinner"];

  const setChildSectionsEnabled = (enabled: boolean) => {
    const next = mealSections.map(s => CHILD_SECTION_IDS.includes(s.id) ? { ...s, enabled } : s);
    setMealSections(next);
    saveHouseholdProfile({ meal_sections: next });
    saveUserPreferences({ section_order: next });
  };

  const addChild = async () => {
    if (!householdId || !newChildDob) return;
    const { data } = await supabase.from("children").insert({
      household_id: householdId,
      name: newChildName || null,
      date_of_birth: newChildDob,
    }).select().single();
    if (data) {
      const newChildren = [...children, { ...data, health_conditions: (data.health_conditions as string[]) || [] }];
      setChildren(newChildren);
      if (newChildren.length === 1) setChildSectionsEnabled(true);
    }
    setAddingChild(false);
    setNewChildName("");
    setNewChildDob("");
    toast.success("Child added");
  };

  const removeChild = async (id: string) => {
    await supabase.from("children").delete().eq("id", id);
    const newChildren = children.filter(c => c.id !== id);
    setChildren(newChildren);
    if (newChildren.length === 0) setChildSectionsEnabled(false);
    toast.success("Child removed");
  };

  const removeFeedback = async (id: string) => {
    await supabase.from("meal_feedback").delete().eq("id", id);
    setLikedFeedback(prev => prev.filter(f => f.id !== id));
    setDislikedFeedback(prev => prev.filter(f => f.id !== id));
  };

  const resetTasteProfile = async () => {
    if (!user) return;
    await supabase.from("meal_feedback").delete().eq("user_id", user.id);
    setLikedFeedback([]);
    setDislikedFeedback([]);
    clearRecentSuggestions();
    clearAllMealCaches();
    toast.success("Taste profile reset");
  };

  const [showResetVariety, setShowResetVariety] = useState(false);
  const resetMealVariety = () => {
    clearRecentSuggestions();
    clearAllMealCaches();
    setShowResetVariety(false);
    toast.success("Meal variety reset — you'll see fresh suggestions");
  };

  const getChildAge = (dob: string) => {
    const months = Math.floor((Date.now() - new Date(dob).getTime()) / (30.44 * 86400000));
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}m` : `${years}y`;
  };

  const runRecipeSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("batch-fill-recipe-text", {
        body: { batchSize: 25 },
      });
      if (error) throw error;
      setSeedResult(data);
    } catch (e) {
      toast.error("Seed failed — check console");
      console.error(e);
    }
    setSeeding(false);
  };

  const handleLogout = async () => { await signOut(); };

  const handleDeleteAccount = async () => {
    if (!user || !householdId) return;
    try {
      // Delete user data
      await Promise.all([
        supabase.from("user_preferences").delete().eq("user_id", user.id),
        supabase.from("meal_feedback").delete().eq("user_id", user.id),
        supabase.from("household_members").delete().eq("user_id", user.id),
      ]);
      await signOut();
      toast.success("Account deleted");
    } catch {
      toast.error("Failed to delete account");
    }
  };

  // Add custom meal type
  const addCustomMealType = () => {
    if (!newMealName.trim()) return;
    const id = `custom_${newMealName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    if (mealSections.some(s => s.id === id)) {
      toast.error("A meal schedule with this name already exists");
      return;
    }
    const next = [...mealSections, { id, name: newMealName.trim(), enabled: true, order: mealSections.length, isCustom: true }];
    setMealSections(next);
    saveHouseholdProfile({ meal_sections: next });
    saveUserPreferences({ section_order: next });
    setNewMealName("");
    setAddingCustomMeal(false);
    toast.success(`"${newMealName.trim()}" added — AI will auto-detect its context`);
  };

  const removeCustomMealType = (id: string) => {
    const next = mealSections.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i }));
    setMealSections(next);
    saveHouseholdProfile({ meal_sections: next });
    saveUserPreferences({ section_order: next });
    toast.success("Meal schedule removed");
  };

  // Drag reorder
  const moveSection = (fromIndex: number, direction: "up" | "down") => {
    const sorted = [...mealSections].sort((a, b) => a.order - b.order);
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= sorted.length) return;
    const item = sorted[fromIndex];
    sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, item);
    const next = sorted.map((s, i) => ({ ...s, order: i }));
    setMealSections(next);
    saveHouseholdProfile({ meal_sections: next });
    saveUserPreferences({ section_order: next });
  };

  const SectionHeader = ({ id, title }: { id: string; title: string }) => (
    <button onClick={() => toggle(id)} className="flex items-center justify-between w-full py-3">
      <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
      {expanded.has(id) ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
    </button>
  );
  const updateSectionTime = (sectionId: string, mins: number) => {
    const next = mealSections.map(s => s.id === sectionId ? { ...s, defaultTime: mins } : s);
    setMealSections(next);
    saveHouseholdProfile({ meal_sections: next });
    saveUserPreferences({ section_order: next });
  };

  const sortedSections = [...mealSections].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-foreground">Settings</h1>
        <div className="relative">
          <button
            onClick={() => toggle("language")}
            className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <span className="text-sm">🌐</span>
            <span className="font-body text-[10px]">{LANGUAGES.find(l => l.code === language)?.label || "Language"}</span>
          </button>
          {expanded.has("language") && (
            <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-border bg-background shadow-lg p-2 min-w-[140px]">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); toggle("language"); }}
                  className={`w-full text-left rounded-md px-3 py-1.5 font-body text-sm transition-colors ${
                    language === lang.code ? "bg-gold/10 text-foreground font-medium" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 flex flex-col">
        {/* Household */}
        <section className="border-b border-border">
          <SectionHeader id="household" title="Household" />
          {expanded.has("household") && (
            <div className="flex flex-col gap-3 pb-4">
              <div>
                <label className="font-body text-sm text-muted-foreground mb-1 block">Household name</label>
                <input type="text" value={householdName} onChange={e => setHouseholdName(e.target.value)} onBlur={updateHouseholdName} placeholder="Name your household" className="w-full rounded-lg border border-border bg-input px-4 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="font-body text-xs text-muted-foreground mb-1">Invite code</p>
                <button onClick={copyCode} className="flex items-center gap-2">
                  <span className="font-body text-lg font-bold tracking-widest text-primary">{inviteCode}</span>
                  <Copy size={14} className="text-muted-foreground" />
                </button>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-2">Members (app users)</p>
                {members.map((m) => (
                  <div key={m.id} className="border-b border-border/50 last:border-0">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-sm text-foreground">{m.user_name}</span>
                        <span className="font-body text-xs text-muted-foreground">{formatLastSeen(m.last_seen)}</span>
                      </div>
                      <button onClick={() => toggle(`health-member-${m.id}`)} className="flex items-center gap-1 text-muted-foreground hover:text-gold transition-colors">
                        <Heart size={12} className={(m.health_conditions || []).length > 0 ? "text-gold fill-gold/30" : ""} />
                        {expanded.has(`health-member-${m.id}`) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    </div>
                    {expanded.has(`health-member-${m.id}`) && (
                      <div className="pb-2.5 pl-1">
                        <p className="font-body text-[10px] text-muted-foreground mb-1.5">Health conditions</p>
                        <div className="flex flex-wrap gap-1.5">
                          {HEALTH_CONDITIONS.map(h => (
                            <button key={h} onClick={() => toggleMemberHealth(m.id, h)} className={`rounded-full border px-2.5 py-0.5 font-body text-[11px] transition-colors ${(m.health_conditions || []).includes(h) ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground"}`}>{h}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Non-app household members */}
              <div className="mt-2 border-t border-border pt-3">
                <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Other household members</p>
                <p className="font-body text-xs text-muted-foreground mb-2">People who eat with you but don't use the app.</p>
                {nonAppMembers.map((member, i) => (
                  <div key={i} className="border-b border-border/50 last:border-0">
                    <div className="flex items-center justify-between py-2">
                      <span className="font-body text-sm text-foreground">{member.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggle(`health-nonapp-${i}`)} className="flex items-center gap-1 text-muted-foreground hover:text-gold transition-colors">
                          <Heart size={12} className={(member.healthConditions || []).length > 0 ? "text-gold fill-gold/30" : ""} />
                          {expanded.has(`health-nonapp-${i}`) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        <button onClick={() => removeNonAppMember(i)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {expanded.has(`health-nonapp-${i}`) && (
                      <div className="pb-2.5 pl-1">
                        <p className="font-body text-[10px] text-muted-foreground mb-1.5">Health conditions</p>
                        <div className="flex flex-wrap gap-1.5">
                          {HEALTH_CONDITIONS.map(h => (
                            <button key={h} onClick={() => toggleNonAppMemberHealth(i, h)} className={`rounded-full border px-2.5 py-0.5 font-body text-[11px] transition-colors ${(member.healthConditions || []).includes(h) ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground"}`}>{h}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {addingNonAppMember ? (
                  <div className="flex gap-2 mt-2">
                    <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="Name" className="flex-1 rounded-lg border border-border bg-input px-3 py-2 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold" autoFocus />
                    <button onClick={addNonAppMember} className="rounded-lg bg-primary px-3 py-2 font-body text-sm font-medium text-primary-foreground">Add</button>
                    <button onClick={() => setAddingNonAppMember(false)} className="rounded-lg border border-border px-3 py-2 font-body text-sm text-foreground">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingNonAppMember(true)} className="flex items-center gap-1 mt-2 font-body text-sm text-gold hover:underline">
                    <Plus size={14} />
                    Add member
                  </button>
                )}
              </div>

              {/* Children */}
              <div className="mt-2 border-t border-border pt-3">
                <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Children</p>
                <p className="font-body text-xs text-muted-foreground mb-2">Child meal schedules auto-appear when you add children.</p>
                {children.map(c => (
                  <div key={c.id} className="border-b border-border/50 last:border-0">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-body text-sm text-foreground">{c.name || "Child"}</span>
                        <span className="font-body text-xs text-muted-foreground ml-2">{getChildAge(c.date_of_birth)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggle(`health-child-${c.id}`)} className="flex items-center gap-1 text-muted-foreground hover:text-gold transition-colors">
                          <Heart size={12} className={(c.health_conditions || []).length > 0 ? "text-gold fill-gold/30" : ""} />
                          {expanded.has(`health-child-${c.id}`) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        <button onClick={() => removeChild(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {expanded.has(`health-child-${c.id}`) && (
                      <div className="pb-2.5 pl-1">
                        <p className="font-body text-[10px] text-muted-foreground mb-1.5">Health conditions</p>
                        <div className="flex flex-wrap gap-1.5">
                          {HEALTH_CONDITIONS.map(h => (
                            <button key={h} onClick={() => toggleChildHealth(c.id, h)} className={`rounded-full border px-2.5 py-0.5 font-body text-[11px] transition-colors ${(c.health_conditions || []).includes(h) ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground"}`}>{h}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {addingChild ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <input type="text" value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder="Name (optional)" className="w-full rounded-lg border border-border bg-input px-4 py-2 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
                    <input type="date" value={newChildDob} onChange={e => setNewChildDob(e.target.value)} className="w-full rounded-lg border border-border bg-input px-4 py-2 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
                    <div className="flex gap-2">
                      <button onClick={addChild} className="flex-1 rounded-lg bg-primary py-2 font-body text-sm font-medium text-primary-foreground">Add</button>
                      <button onClick={() => setAddingChild(false)} className="flex-1 rounded-lg border border-border py-2 font-body text-sm text-foreground">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingChild(true)} className="flex items-center gap-1 mt-2 font-body text-sm text-gold hover:underline">
                    <Plus size={14} />
                    Add child
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Cooking Style */}
        <section className="border-b border-border">
          <SectionHeader id="style" title="Cooking Style" />
          {expanded.has("style") && (
            <div className="flex flex-col gap-4 pb-4">
              <div>
                <p className="font-body text-xs text-muted-foreground mb-2">Skill level</p>
                <div className="flex gap-2">
                  {SKILL_LEVELS.map(s => (
                    <button key={s} onClick={() => updateSkillLevel(s.toLowerCase())} className={`flex-1 rounded-lg border py-2 font-body text-xs transition-colors ${skillLevel === s.toLowerCase() ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-2">Spice tolerance</p>
                <div className="flex gap-2 flex-wrap">
                  {SPICE_LEVELS.map(s => (
                    <button key={s} onClick={() => updateSpice(s.toLowerCase())} className={`rounded-lg border px-3 py-2 font-body text-xs transition-colors ${spiceTolerance === s.toLowerCase() ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-2">Weeknight time</p>
                <div className="flex gap-2 flex-wrap">
                  {WEEKNIGHT_TIMES.map(t => {
                    const val = t === "Under 20 min" ? "under20" : t === "30 min" ? "30min" : t === "45 min" ? "45min" : "norush";
                    return (<button key={t} onClick={() => updateWeeknight(val)} className={`rounded-lg border px-3 py-2 font-body text-xs transition-colors ${weeknightTime === val ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground"}`}>{t}</button>);
                  })}
                </div>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-2">Diet restrictions</p>
                <div className="flex flex-wrap gap-2">
                  {(DIET_RESTRICTIONS as readonly string[]).map(d => (
                    <button key={d} onClick={() => toggleDiet(d)} className={`rounded-full border px-3 py-1 font-body text-xs transition-colors ${dietRestrictions.includes(d) ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground"}`}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Kitchen Equipment */}
        <section className="border-b border-border">
          <SectionHeader id="equipment" title="Kitchen Equipment" />
          {expanded.has("equipment") && (
            <div className="pb-4">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={equipSearch} onChange={e => setEquipSearch(e.target.value)} placeholder="Search equipment..." className="w-full rounded-lg border border-border bg-input pl-8 pr-4 py-2 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
              </div>
              {EQUIPMENT_CATEGORIES.map(cat => {
                const items = cat.items.filter(i => !equipSearch || i.toLowerCase().includes(equipSearch.toLowerCase()));
                if (items.length === 0) return null;
                return (
                  <div key={cat.name} className="mb-3">
                    <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{cat.name}</p>
                    {items.map(item => (
                      <button key={item} onClick={() => toggleEquipment(item)} className="flex items-center gap-2 py-1.5 w-full">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${equipment.includes(item) ? "border-gold bg-gold" : "border-border"}`}>
                          {equipment.includes(item) && <span className="text-gold-foreground text-xs">✓</span>}
                        </div>
                        <span className="font-body text-sm text-foreground">{item}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Meal Schedule */}
        <section className="border-b border-border">
          <SectionHeader id="sections" title="Meal Schedule" />
          {expanded.has("sections") && (
            <div className="flex flex-col gap-1 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-body text-xs text-muted-foreground">Toggle schedules on/off, reorder, and optionally schedule to specific days.</p>
                <button
                  onClick={() => {
                    const defaults = MEAL_SECTIONS.map((s, i) => ({ id: s.id, name: s.name, enabled: s.defaultOn, order: i }));
                    setMealSections(defaults);
                    saveHouseholdProfile({ meal_sections: defaults });
                    saveUserPreferences({ section_order: defaults });
                    toast.success("Meal schedule reset to defaults");
                  }}
                  className="shrink-0 font-body text-xs text-gold hover:underline"
                >
                  Reset
                </button>
              </div>
              {sortedSections.map((section, idx) => (
                <div key={section.id} className="rounded-lg border border-border overflow-hidden mb-1">
                  <div className={`flex items-center justify-between w-full px-3 py-2.5 text-left transition-colors ${section.enabled ? "bg-primary/5" : "hover:bg-secondary"}`}>
                    <div className="flex flex-col mr-2 shrink-0">
                      <button onClick={() => moveSection(idx, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"><ChevronRight size={12} className="-rotate-90" /></button>
                      <button onClick={() => moveSection(idx, "down")} disabled={idx === sortedSections.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"><ChevronRight size={12} className="rotate-90" /></button>
                    </div>
                    <button onClick={() => toggleMealSection(section.id)} className="flex items-center justify-between flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-sm font-medium text-foreground">{section.name}</span>
                        {(section as any).isCustom && (<span className="rounded-full bg-gold/10 border border-gold/30 px-1.5 py-0.5 font-body text-[10px] text-gold">Custom</span>)}
                      </div>
                      <div className={`h-5 w-9 rounded-full transition-colors relative shrink-0 ${section.enabled ? "bg-gold" : "bg-muted"}`}>
                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${section.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                    </button>
                    {(section as any).isCustom && (<button onClick={() => removeCustomMealType(section.id)} className="ml-2 text-muted-foreground hover:text-destructive shrink-0"><Trash2 size={14} /></button>)}
                  </div>
                  {section.enabled && (
                    <div className="px-3 pb-2.5 pt-1 bg-secondary/30 space-y-2">
                      <div>
                        <span className="font-body text-xs text-muted-foreground mb-1.5 block">Default cook time</span>
                        <div className="flex gap-1.5">
                          {[10, 15, 20, 25, 30, 45, 60].map(t => {
                            const current = section.defaultTime ?? DEFAULT_SECTION_TIMES[section.id] ?? 30;
                            return (<button key={t} onClick={() => updateSectionTime(section.id, t)} className={`rounded-md border px-2 py-1 font-body text-xs font-medium transition-colors ${current === t ? "border-gold bg-gold/15 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>{t}m</button>);
                          })}
                        </div>
                      </div>
                      <div>
                        <span className="font-body text-xs text-muted-foreground mb-1.5 block">Schedule days (optional)</span>
                        <div className="flex gap-1.5">
                          {DAYS.map(d => {
                            const active = (section.scheduledDays || []).includes(d);
                            return (<button key={d} onClick={() => toggleSectionDay(section.id, d)} className={`flex-1 rounded-md border py-1.5 font-body text-xs font-medium transition-colors ${active ? "border-gold bg-gold/15 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>{d}</button>);
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {addingCustomMeal ? (
                <div className="flex gap-2 mt-2">
                  <input type="text" value={newMealName} onChange={e => setNewMealName(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomMealType()} placeholder='e.g. "Brunch", "Post-Workout", "Lunchbox"' className="flex-1 rounded-lg border border-border bg-input px-3 py-2 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold" autoFocus />
                  <button onClick={addCustomMealType} className="rounded-lg bg-primary px-3 py-2 font-body text-sm font-medium text-primary-foreground">Add</button>
                  <button onClick={() => { setAddingCustomMeal(false); setNewMealName(""); }} className="rounded-lg border border-border px-3 py-2 font-body text-sm text-foreground">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setAddingCustomMeal(true)} className="flex items-center gap-1 mt-2 font-body text-sm text-gold hover:underline"><Plus size={14} />Add custom meal type</button>
              )}
            </div>
          )}
        </section>

        {/* Cuisine Preferences */}
        <section className="border-b border-border">
          <SectionHeader id="cuisine" title="Cuisine Preferences" />
          {expanded.has("cuisine") && (
            <div className="flex flex-col gap-4 pb-4">
              {CUISINES.map(cuisine => (
                <div key={cuisine}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-sm text-foreground">{cuisine}</span>
                    <span className="font-body text-xs text-muted-foreground">{CUISINE_LABELS[cuisineSliders[cuisine] ?? 2]}</span>
                  </div>
                  <input type="range" min={0} max={4} step={1} value={cuisineSliders[cuisine] ?? 2} onChange={e => updateCuisineSlider(cuisine, Number(e.target.value))} className="w-full accent-gold h-1.5" />
                </div>
              ))}
            </div>
          )}
        </section>


        {/* Taste Profile - opens overlay */}
        <section className="border-b border-border">
          <button onClick={() => toggle("tasteOverlay")} className="flex items-center justify-between w-full py-3">
            <h2 className="font-display text-base font-bold text-foreground">My Taste Profile</h2>
            <div className="flex items-center gap-2">
              {(likedFeedback.length > 0 || dislikedFeedback.length > 0) && (
                <span className="font-body text-xs text-muted-foreground">{likedFeedback.length + dislikedFeedback.length} rated</span>
              )}
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </button>
        </section>

        {/* Taste Profile Overlay */}
        {expanded.has("tasteOverlay") && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-display text-lg font-bold text-foreground">My Taste Profile</h2>
              <button onClick={() => toggle("tasteOverlay")} className="rounded-lg border border-border px-3 py-1.5 font-body text-sm text-foreground hover:bg-secondary">Done</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="font-body text-xs text-muted-foreground mb-4"><CocinaText /> learns what you love. Liked and disliked meals shape your suggestions.</p>
              {likedFeedback.length > 0 && (
                <div className="mb-5">
                  <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">👍 Liked</p>
                  {likedFeedback.map(f => (
                    <div key={f.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="font-body text-sm text-foreground">{f.meal_name}</span>
                      <button onClick={() => removeFeedback(f.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              {dislikedFeedback.length > 0 && (
                <div className="mb-5">
                  <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">👎 Disliked</p>
                  {dislikedFeedback.map(f => (
                    <div key={f.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="font-body text-sm text-foreground">{f.meal_name}</span>
                      <button onClick={() => removeFeedback(f.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              {likedFeedback.length === 0 && dislikedFeedback.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="font-body text-sm text-muted-foreground">No feedback yet.</p>
                  <p className="font-body text-xs text-muted-foreground mt-1">Like or dislike meals on the Meals tab to train your profile.</p>
                </div>
              )}
              {(likedFeedback.length > 0 || dislikedFeedback.length > 0) && (
                <>
                  <button onClick={resetTasteProfile} className="mt-4 font-body text-xs text-destructive hover:underline">Reset my taste profile</button>
                  {showResetVariety ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-body text-xs text-muted-foreground">Reset meal variety?</span>
                      <button onClick={resetMealVariety} className="font-body text-xs text-destructive hover:underline">Yes, reset</button>
                      <button onClick={() => setShowResetVariety(false)} className="font-body text-xs text-muted-foreground hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowResetVariety(true)} className="mt-2 font-body text-xs text-muted-foreground hover:text-foreground hover:underline block">Reset meal variety</button>
                  )}
                </>
              )}
            </div>
          </div>
        )}


        {/* Save Settings */}
        <section className="pt-6 pb-4">
          <button
            onClick={async () => {
              try {
                await Promise.all([
                  saveHouseholdProfile({
                    equipment,
                    cuisine_sliders: cuisineSliders,
                    meal_sections: mealSections,
                    quick_filters: quickFilters,
                    meal_prep_days: mealPrepDays,
                  }),
                  saveUserPreferences({
                    skill_level: skillLevel,
                    spice_tolerance: spiceTolerance,
                    weeknight_time: weeknightTime,
                    diet_restrictions: dietRestrictions,
                    health_conditions: healthConditions,
                    section_order: mealSections,
                  }),
                ]);
                toast.success("Settings saved!");
              } catch {
                toast.error("Failed to save. Please try again.");
              }
            }}
            className="w-full rounded-lg bg-primary px-6 py-3.5 font-body font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            Save Settings
          </button>
        </section>


        {/* Kitchen Database */}
        <section className="border-b border-border">
          <button onClick={() => toggle("db")} className="flex items-center justify-between w-full py-3">
            <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <Database size={16} />
              Kitchen Database
            </h2>
            {expanded.has("db") ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
          </button>
          {expanded.has("db") && (
            <div className="flex flex-col gap-3 pb-4">
              <p className="font-body text-xs text-muted-foreground">
                Fill in recipe instructions for meals that don't have them yet. Run this multiple times until remaining reaches 0.
              </p>

              {seedResult && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="font-body text-sm text-foreground">
                    ✓ {seedResult.processed} filled · {seedResult.failed} failed · {seedResult.remaining} remaining
                  </p>
                  {seedResult.remaining > 0 && (
                    <p className="font-body text-xs text-muted-foreground mt-1">
                      ~{Math.ceil(seedResult.remaining / 25)} more taps to finish.
                    </p>
                  )}
                  {seedResult.remaining === 0 && (
                    <p className="font-body text-xs text-gold mt-1">All recipes have instructions.</p>
                  )}
                </div>
              )}

              <button
                onClick={runRecipeSeed}
                disabled={seeding || seedResult?.remaining === 0}
                className="w-full rounded-lg bg-primary px-4 py-2.5 font-body text-sm font-medium text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {seeding
                  ? <><div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> Filling 25 recipes...</>
                  : seedResult?.remaining === 0
                    ? "All done"
                    : "Fill Recipe Instructions"
                }
              </button>
            </div>
          )}
        </section>

        <section className="border-b border-border pt-4 pb-4">
          <div className="flex flex-col items-center gap-2">
            <Logo size="sm" />
            <p className="font-body text-xs text-muted-foreground text-center">Your household meal planning companion.</p>
            <p className="font-body text-xs text-muted-foreground/60">v1.0.0</p>
          </div>
        </section>

        {/* Logout */}
        <section className="pt-4 pb-4">
          {showLogoutConfirm ? (
            <div className="flex flex-col gap-2">
              <p className="font-body text-sm text-foreground">Log out of <CocinaText />?</p>
              <div className="flex gap-2">
                <button onClick={handleLogout} className="flex-1 rounded-lg bg-destructive px-4 py-2 font-body text-sm font-medium text-destructive-foreground">Log out</button>
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-lg border border-border px-4 py-2 font-body text-sm text-foreground">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <LogOut size={16} />
              <span className="font-body text-sm">Log out</span>
            </button>
          )}
        </section>

        {/* Delete Account */}
        <section className="pb-12">
          {showDeleteConfirm ? (
            <div className="flex flex-col gap-2">
              <p className="font-body text-xs text-destructive">This will permanently delete your account and all your data. This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={handleDeleteAccount} className="flex-1 rounded-lg bg-destructive px-4 py-1.5 font-body text-xs font-medium text-destructive-foreground">Delete permanently</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-lg border border-border px-4 py-1.5 font-body text-xs text-foreground">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)} className="font-body text-[11px] text-muted-foreground/50 hover:text-destructive/70 transition-colors">
              Delete account
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
