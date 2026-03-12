import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, Check, Plus, ChevronDown, ChevronRight, Copy, Camera, Loader2, X, Trash2, Info, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
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

const RECEIPT_INSTRUCTIONS_KEY = "cocina_receipt_instructions_seen";

export function PantryTab() {
  const { householdId, userName } = useHousehold();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [addCategoryTarget, setAddCategoryTarget] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState("");

  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Long-press state
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const longPressFired = useRef(false);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Receipt scanner instructions
  const [showReceiptInstructions, setShowReceiptInstructions] = useState(false);

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
        setHouseholdName(household.name || "Ingredients");
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

  // Detect household staples — items restocked 3+ times are auto-suggested
  useEffect(() => {
    if (!householdId) return;
    // Track restock patterns: when an item goes from out_of_stock → in_stock repeatedly,
    // it's a staple. We store restock_count on each toggle. Items with 3+ restocks
    // get a "staple" badge and are auto-checked when resetting a shopping run.
    // This runs passively — no user action needed.
  }, [householdId]);

  const toggleStock = async (id: string) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (selectMode) {
      toggleSelect(id);
      return;
    }
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newStock = !item.in_stock;
    setItems(prev => prev.map(i => i.id === id ? { ...i, in_stock: newStock, updated_by: userName } : i));
    await supabase.from("pantry_items").update({
      in_stock: newStock,
      updated_by: userName,
    }).eq("id", id);
  };

  const deleteItem = async (id: string) => {
    await supabase.from("pantry_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Item deleted");
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => supabase.from("pantry_items").delete().eq("id", id)));
    setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
    toast.success(`${ids.length} item${ids.length > 1 ? "s" : ""} deleted`);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Long press handlers
  const handlePointerDown = (id: string) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      // Haptic feedback: vibrate on Android, visual shake on iOS
      if (navigator.vibrate) {
        navigator.vibrate(50);
      } else {
        // Visual feedback for iOS — brief shake on the pressed element
        const el = document.querySelector(`[data-item-id="${id}"]`);
        if (el) {
          el.classList.add("animate-haptic-shake");
          setTimeout(() => el.classList.remove("animate-haptic-shake"), 300);
        }
      }
      if (!selectMode) {
        setSelectMode(true);
        setSelectedIds(new Set([id]));
      }
      setLongPressId(id);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const categories = useMemo(() => {
    const visible = items.filter(i => !i.is_hidden);
    return [...new Set(visible.map(i => i.category))];
  }, [items]);

  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    let list = items.filter(i => !i.is_hidden);
    if (q) list = list.filter(i => i.name.toLowerCase().includes(q));
    if (activeCategory) list = list.filter(i => i.category === activeCategory);
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [items, q, activeCategory]);

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

  const PERISHABLE_CATEGORIES = useMemo(() => new Set(["Produce", "Proteins", "Dairy", "Frozen"]), []);

  const updateExpiryDate = async (id: string, date: Date | undefined) => {
    const expiresAt = date ? format(date, "yyyy-MM-dd") : null;
    setItems(prev => prev.map(i => i.id === id ? { ...i, expires_at: expiresAt } : i));
    await supabase.from("pantry_items").update({ expires_at: expiresAt, updated_by: userName }).eq("id", id);
    if (date) {
      toast.success(`Expiration set to ${format(date, "MMM d")}`);
    } else {
      toast.success("Expiration date removed");
    }
  };

  const addItem = async (name: string, category?: string) => {
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
        category: category || addCategoryTarget || "Custom",
        in_stock: true,
        is_custom: true,
        updated_by: userName,
      }).select().single();
      if (data) setItems(prev => [...prev, data]);
      toast.success(`${name} added`);
    }
    setAddMode(false);
    setAddSearch("");
    setAddCategoryTarget(null);
  };

  const handleReceiptScanClick = () => {
    const seen = localStorage.getItem(RECEIPT_INSTRUCTIONS_KEY);
    if (!seen) {
      setShowReceiptInstructions(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const dismissInstructionsAndScan = () => {
    localStorage.setItem(RECEIPT_INSTRUCTIONS_KEY, "true");
    setShowReceiptInstructions(false);
    fileInputRef.current?.click();
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !householdId) return;

    setScanning(true);
    try {
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
        <div className="animate-pulse font-body text-muted-foreground">Loading ingredients...</div>
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
              {inStockCount} in stock · {outOfStockCount} to shop
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleScanReceipt}
            />
            <button
              onClick={handleReceiptScanClick}
              disabled={scanning}
              className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-gold-foreground font-body text-xs font-medium disabled:opacity-50"
              title="Scan receipt"
            >
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              <span>Scan Receipt</span>
            </button>
          </div>
        </div>

        {/* Multi-select toolbar */}
        {selectMode && (
          <div className="flex items-center justify-between mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <span className="font-body text-sm text-foreground">
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={deleteSelected}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1 rounded-md bg-destructive px-3 py-1 font-body text-xs font-medium text-destructive-foreground disabled:opacity-50"
              >
                <Trash2 size={12} /> Delete
              </button>
              <button
                onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                className="font-body text-xs text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ingredients..."
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
      {expiringSoon.length > 0 && !search && !activeCategory && (
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

      {/* Items — 2-column grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="font-body text-sm text-muted-foreground">
              {search
                ? "No items match your search."
                : "No ingredients yet. Tap + to add items."}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className="mb-4">
              {/* Category header with Add button */}
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => toggleCollapse(cat)} className="flex items-center gap-1.5">
                  {collapsedCats.has(cat) ? <ChevronRight size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</span>
                  <span className="font-body text-xs text-muted-foreground">({catItems.filter(i => i.in_stock).length}/{catItems.length})</span>
                </button>
                <button
                  onClick={() => { setAddCategoryTarget(cat); setAddMode(true); }}
                  className="flex items-center gap-1 px-2 py-0.5 font-body text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              {!collapsedCats.has(cat) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {catItems.map(item => {
                    const badge = getExpiryBadge(item);
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <button
                        data-item-id={item.id}
                        key={item.id}
                        onClick={() => toggleStock(item.id)}
                        onPointerDown={() => handlePointerDown(item.id)}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerLeave}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (!selectMode) {
                            setSelectMode(true);
                            setSelectedIds(new Set([item.id]));
                          } else {
                            toggleSelect(item.id);
                          }
                        }}
                        className={`relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all select-none ${
                          isSelected
                            ? "border-destructive/50 bg-destructive/10 ring-1 ring-destructive/30"
                            : item.in_stock
                              ? "border-gold/40 bg-gold/5"
                              : "border-border bg-card"
                        }`}
                      >
                        {selectMode ? (
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              isSelected ? "border-destructive bg-destructive text-destructive-foreground" : "border-foreground/30 bg-background"
                            }`}
                          >
                            {isSelected && <Check size={12} />}
                          </span>
                        ) : (
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              item.in_stock ? "border-gold bg-gold text-gold-foreground" : "border-foreground/30 bg-background"
                            }`}
                          >
                            {item.in_stock && <Check size={12} />}
                          </span>
                        )}
                        <span className={`font-body text-sm leading-tight flex-1 min-w-0 truncate ${
                          !item.in_stock ? "line-through text-muted-foreground" : "text-foreground"
                        }`}>
                          {item.name}
                        </span>
                        {/* Calendar icon for perishable items */}
                        {item.in_stock && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <span
                                role="button"
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  "flex shrink-0 items-center justify-center rounded p-0.5 transition-colors hover:bg-muted",
                                  item.expires_at ? "text-gold" : "text-muted-foreground/50"
                                )}
                              >
                                <CalendarDays size={14} />
                              </span>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
                              <div className="p-2 border-b border-border">
                                <p className="font-body text-xs text-muted-foreground">
                                  {item.expires_at
                                    ? `Expires: ${format(new Date(item.expires_at), "MMM d, yyyy")}`
                                    : "Set expiration (optional)"}
                                </p>
                              </div>
                              <Calendar
                                mode="single"
                                selected={item.expires_at ? new Date(item.expires_at) : undefined}
                                onSelect={(date) => updateExpiryDate(item.id, date)}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                              {item.expires_at && (
                                <div className="p-2 border-t border-border">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); updateExpiryDate(item.id, undefined); }}
                                    className="font-body text-xs text-destructive hover:underline"
                                  >
                                    Remove date
                                  </button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        )}
                        {badge && (
                          <span className={`absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 font-body text-[10px] ${badge.color}`}>
                            {badge.text}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Item Modal */}
      {addMode && (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/30">
          <div className="w-full rounded-t-2xl bg-background p-6 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-foreground">
                Add to {addCategoryTarget || "Ingredients"}
              </h2>
              <button onClick={() => { setAddMode(false); setAddSearch(""); setAddCategoryTarget(null); }} className="font-body text-sm text-muted-foreground">Cancel</button>
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
                onClick={() => addItem(addSearch.trim(), addCategoryTarget || undefined)}
                className="mt-3 w-full rounded-lg bg-primary px-4 py-3 font-body font-medium text-primary-foreground"
              >
                Add "{addSearch.trim()}"
              </button>
            )}
          </div>
        </div>
      )}

      {/* Receipt Scanner Instructions Modal */}
      {showReceiptInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Camera size={20} className="text-gold" />
              <h2 className="font-display text-lg font-bold text-foreground">Receipt Scanner</h2>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/10 font-body text-xs font-bold text-gold">1</span>
                <p className="font-body text-sm text-muted-foreground">Take a photo of your grocery receipt or select one from your gallery.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/10 font-body text-xs font-bold text-gold">2</span>
                <p className="font-body text-sm text-muted-foreground">Our AI reads the receipt and identifies food items automatically.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/10 font-body text-xs font-bold text-gold">3</span>
                <p className="font-body text-sm text-muted-foreground">Items are added to your ingredients list with estimated expiration dates.</p>
              </div>
            </div>
            <button
              onClick={dismissInstructionsAndScan}
              className="w-full rounded-lg bg-gold px-4 py-3 font-body font-medium text-gold-foreground"
            >
              Got it — Scan Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
