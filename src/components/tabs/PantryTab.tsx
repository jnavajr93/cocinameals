import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, Check, Plus, ChevronDown, ChevronRight, Copy, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { toast } from "sonner";

interface PantryItem {
  id: string;
  name: string;
  category: string;
  in_stock: boolean;
  is_custom: boolean;
  is_hidden: boolean;
  updated_by: string | null;
  expires_at: string | null;
  updated_at: string | null;
}

export function PantryTab() {
  const { householdId, userName } = useHousehold();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [viewMode, setViewMode] = useState<"pantry" | "shopping">("pantry");
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load pantry items
  useEffect(() => {
    if (!householdId) return;

    const load = async () => {
      const [{ data: pantryData }, { data: household }, { data: members }] = await Promise.all([
        supabase.from("pantry_items").select("*").eq("household_id", householdId),
        supabase.from("households").select("name, invite_code").eq("id", householdId).single(),
        supabase.from("household_members").select("id").eq("household_id", householdId),
      ]);

      if (pantryData) setItems(pantryData);
      if (household) {
        setHouseholdName(household.name || "Pantry");
        setInviteCode(household.invite_code);
      }
      if (members) setMemberCount(members.length);
      setLoading(false);
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel("pantry-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pantry_items", filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as PantryItem;
            setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
            if (updated.updated_by && updated.updated_by !== userName) {
              toast(`Updated by ${updated.updated_by}`, { duration: 3000 });
            }
          } else if (payload.eventType === "INSERT") {
            setItems(prev => [...prev, payload.new as PantryItem]);
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setItems(prev => prev.filter(i => i.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [householdId, userName]);

  const toggleStock = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newStock = !item.in_stock;
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, in_stock: newStock, updated_by: userName } : i));
    await supabase.from("pantry_items").update({
      in_stock: newStock,
      updated_by: userName,
    }).eq("id", id);
  };

  const categories = useMemo(() => {
    const visible = items.filter(i => !i.is_hidden);
    return [...new Set(visible.map(i => i.category))];
  }, [items]);

  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    let list = items.filter(i => !i.is_hidden);
    if (viewMode === "shopping") list = list.filter(i => !i.in_stock);
    if (q) list = list.filter(i => i.name.toLowerCase().includes(q));
    if (activeCategory) list = list.filter(i => i.category === activeCategory);
    return list;
  }, [items, q, activeCategory, viewMode]);

  const inStockCount = items.filter(i => i.in_stock && !i.is_hidden).length;
  const outOfStockCount = items.filter(i => !i.in_stock && !i.is_hidden).length;

  const expiringSoon = useMemo(() => {
    const now = new Date();
    return items
      .filter(i => i.in_stock && !i.is_hidden && i.expires_at)
      .filter(i => {
        const daysLeft = Math.ceil((new Date(i.expires_at!).getTime() - now.getTime()) / 86400000);
        return daysLeft <= 5;
      })
      .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime());
  }, [items]);

  const grouped = useMemo(() => {
    const map: Record<string, PantryItem[]> = {};
    filtered.forEach(i => {
      if (!map[i.category]) map[i.category] = [];
      map[i.category].push(i);
    });
    Object.keys(map).forEach(cat => {
      map[cat].sort((a, b) => (b.in_stock ? 1 : 0) - (a.in_stock ? 1 : 0));
    });
    return map;
  }, [filtered]);

  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const toggleCollapse = (cat: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const addItem = async (name: string) => {
    if (!householdId) return;
    const hidden = items.find(i => i.is_hidden && i.name.toLowerCase() === name.toLowerCase());
    if (hidden) {
      await supabase.from("pantry_items").update({ is_hidden: false, in_stock: true }).eq("id", hidden.id);
      setItems(prev => prev.map(i => i.id === hidden.id ? { ...i, is_hidden: false, in_stock: true } : i));
      toast.success(`${name} added back`);
    } else {
      const { data } = await supabase.from("pantry_items").insert({
        household_id: householdId,
        name,
        category: "Custom",
        in_stock: true,
        is_custom: true,
        updated_by: userName,
      }).select().single();
      if (data) setItems(prev => [...prev, data]);
      toast.success(`${name} added`);
    }
    setAddMode(false);
    setAddSearch("");
  };

  const hideItem = async (id: string) => {
    await supabase.from("pantry_items").update({ is_hidden: true }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_hidden: true } : i));
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !householdId) return;
    
    setScanning(true);
    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach(b => binary += String.fromCharCode(b));
      const imageBase64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { imageBase64 },
      });

      if (error) throw error;
      const scannedItems = data?.items || [];
      
      if (scannedItems.length === 0) {
        toast.error("No grocery items found in this receipt");
        return;
      }

      // Add each scanned item to pantry
      let addedCount = 0;
      for (const item of scannedItems) {
        const existing = items.find(i => i.name.toLowerCase() === item.name.toLowerCase());
        if (existing) {
          if (!existing.in_stock) {
            await supabase.from("pantry_items").update({
              in_stock: true,
              updated_by: userName,
              expires_at: new Date(Date.now() + item.shelfLifeDays * 86400000).toISOString(),
            }).eq("id", existing.id);
            setItems(prev => prev.map(i => i.id === existing.id ? {
              ...i, in_stock: true, updated_by: userName,
              expires_at: new Date(Date.now() + item.shelfLifeDays * 86400000).toISOString(),
            } : i));
            addedCount++;
          }
        } else {
          const { data: newItem } = await supabase.from("pantry_items").insert({
            household_id: householdId,
            name: item.name,
            category: item.category || "Custom",
            in_stock: true,
            is_custom: true,
            updated_by: userName,
            expires_at: new Date(Date.now() + item.shelfLifeDays * 86400000).toISOString(),
          }).select().single();
          if (newItem) {
            setItems(prev => [...prev, newItem]);
            addedCount++;
          }
        }
      }
      toast.success(`${addedCount} item${addedCount !== 1 ? "s" : ""} added from receipt`);
    } catch (err: any) {
      toast.error("Failed to scan receipt");
      console.error(err);
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getExpiryBadge = (item: PantryItem) => {
    if (!item.in_stock || !item.expires_at) return null;
    const daysLeft = Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) return { text: "Expired", color: "bg-destructive/10 text-destructive" };
    if (daysLeft <= 1) return { text: "Expires today", color: "bg-destructive/10 text-destructive" };
    if (daysLeft <= 3) return { text: `${daysLeft}d left`, color: "bg-gold/15 text-gold" };
    if (daysLeft <= 5) return { text: `${daysLeft}d left`, color: "bg-muted text-muted-foreground" };
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse font-body text-muted-foreground">Loading pantry...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">{householdName}</h1>
            <p className="font-body text-xs text-muted-foreground">
              {viewMode === "pantry" ? `${inStockCount} items in stock` : `${outOfStockCount} items to grab`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {inviteCode && (
              <button
                onClick={() => { navigator.clipboard.writeText(inviteCode); toast.success("Invite code copied"); }}
                className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 font-body text-xs text-muted-foreground hover:bg-secondary"
              >
                <span>{inviteCode}</span>
                <Copy size={10} />
              </button>
            )}
            {memberCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-body text-xs text-primary">
                {memberCount}
              </span>
            )}
            <button
              onClick={() => setAddMode(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 mb-3 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setViewMode("pantry")}
            className={`flex-1 rounded-md py-1.5 font-body text-xs font-medium transition-colors ${
              viewMode === "pantry" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Pantry
          </button>
          <button
            onClick={() => setViewMode("shopping")}
            className={`flex-1 rounded-md py-1.5 font-body text-xs font-medium transition-colors ${
              viewMode === "shopping" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Shopping List
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={viewMode === "pantry" ? "Search pantry..." : "Search shopping list..."}
            className="w-full rounded-lg border border-border bg-input pl-8 pr-4 py-2 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full border px-3 py-1 font-body text-xs transition-colors ${
              !activeCategory ? "border-gold bg-gold/10 text-foreground" : "border-border bg-card text-muted-foreground"
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`shrink-0 rounded-full border px-3 py-1 font-body text-xs transition-colors ${
                activeCategory === cat ? "border-gold bg-gold/10 text-foreground" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Use Soon */}
      {viewMode === "pantry" && expiringSoon.length > 0 && !search && !activeCategory && (
        <div className="mx-4 mb-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <h3 className="font-body text-xs font-semibold text-destructive mb-2">USE SOON</h3>
          {expiringSoon.slice(0, 5).map(item => {
            const badge = getExpiryBadge(item);
            return (
              <div key={item.id} className="flex items-center justify-between py-1">
                <span className="font-body text-sm text-foreground">{item.name}</span>
                {badge && <span className={`rounded-full px-2 py-0.5 font-body text-xs ${badge.color}`}>{badge.text}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="font-body text-sm text-muted-foreground">
              {viewMode === "shopping"
                ? "Everything's stocked up. Nothing to grab right now."
                : search
                  ? "No items match your search."
                  : "Your pantry is empty. Check off items you have, or add items manually."}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className="mb-4">
              <button onClick={() => toggleCollapse(cat)} className="flex items-center gap-1.5 mb-1.5 w-full">
                {collapsedCats.has(cat) ? <ChevronRight size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</span>
                <span className="font-body text-xs text-muted-foreground">({catItems.filter(i => i.in_stock).length}/{catItems.length})</span>
              </button>
              {!collapsedCats.has(cat) && catItems.map(item => {
                const badge = getExpiryBadge(item);
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <button
                      onClick={() => toggleStock(item.id)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        item.in_stock ? "border-gold bg-gold text-gold-foreground" : "border-border"
                      }`}
                    >
                      {item.in_stock && <Check size={12} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`font-body text-sm ${item.in_stock ? "text-foreground" : "text-muted-foreground"}`}>
                        {item.name}
                      </span>
                      {item.is_custom && <span className="ml-1.5 font-body text-xs text-muted-foreground">custom</span>}
                    </div>
                    {badge && <span className={`shrink-0 rounded-full px-2 py-0.5 font-body text-xs ${badge.color}`}>{badge.text}</span>}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Add Item Modal */}
      {addMode && (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/30">
          <div className="w-full rounded-t-2xl bg-background p-6 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-foreground">Add item</h2>
              <button onClick={() => { setAddMode(false); setAddSearch(""); }} className="font-body text-sm text-muted-foreground">Cancel</button>
            </div>
            <input
              type="text"
              value={addSearch}
              onChange={e => setAddSearch(e.target.value)}
              placeholder="Search or type new item..."
              className="w-full rounded-lg border border-border bg-input px-4 py-3 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
              autoFocus
            />
            {addSearch.trim() && (
              <button
                onClick={() => addItem(addSearch.trim())}
                className="mt-3 w-full rounded-lg bg-primary px-4 py-3 font-body font-medium text-primary-foreground"
              >
                Add "{addSearch.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
