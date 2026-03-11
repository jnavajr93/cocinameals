import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Check, Plus, ChevronDown, ChevronRight } from "lucide-react";
import {
  getPantry,
  savePantry,
  getProfile,
  PantryItem,
  generateId,
} from "@/lib/store";
import { DEFAULT_PANTRY } from "@/data/pantryDefaults";
import { toast } from "sonner";

export function PantryTab() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const profile = getProfile();

  useEffect(() => {
    setItems(getPantry());
  }, []);

  const save = useCallback((updated: PantryItem[]) => {
    setItems(updated);
    savePantry(updated);
  }, []);

  const toggleStock = (id: string) => {
    const updated = items.map((item) =>
      item.id === id
        ? {
            ...item,
            inStock: !item.inStock,
            updatedBy: profile?.memberName || "You",
            updatedAt: new Date().toISOString(),
          }
        : item
    );
    save(updated);
  };

  const categories = useMemo(() => {
    const visible = items.filter((i) => !i.isHidden);
    const cats = [...new Set(visible.map((i) => i.category))];
    return cats;
  }, [items]);

  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    let list = items.filter((i) => !i.isHidden);
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
    if (activeCategory) list = list.filter((i) => i.category === activeCategory);
    return list;
  }, [items, q, activeCategory]);

  const inStockCount = items.filter((i) => i.inStock && !i.isHidden).length;

  // Expiring soon items
  const expiringSoon = useMemo(() => {
    const now = new Date();
    return items
      .filter((i) => i.inStock && !i.isHidden && i.expiresAt)
      .filter((i) => {
        const exp = new Date(i.expiresAt!);
        const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 5;
      })
      .sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime());
  }, [items]);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, PantryItem[]> = {};
    filtered.forEach((i) => {
      if (!map[i.category]) map[i.category] = [];
      map[i.category].push(i);
    });
    // Sort: in-stock first within each category
    Object.keys(map).forEach((cat) => {
      map[cat].sort((a, b) => (b.inStock ? 1 : 0) - (a.inStock ? 1 : 0));
    });
    return map;
  }, [filtered]);

  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const toggleCollapse = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const addItem = (name: string) => {
    // Check if hidden
    const hidden = items.find(
      (i) => i.isHidden && i.name.toLowerCase() === name.toLowerCase()
    );
    if (hidden) {
      save(items.map((i) => (i.id === hidden.id ? { ...i, isHidden: false, inStock: true } : i)));
      toast.success(`${name} added back`);
    } else {
      const newItem: PantryItem = {
        id: generateId(),
        name,
        category: "Custom",
        inStock: true,
        isCustom: true,
        isHidden: false,
        updatedBy: profile?.memberName || "You",
        expiresAt: null,
        updatedAt: new Date().toISOString(),
      };
      save([...items, newItem]);
      toast.success(`${name} added`);
    }
    setAddMode(false);
    setAddSearch("");
  };

  const hideItem = (id: string) => {
    save(items.map((i) => (i.id === id ? { ...i, isHidden: true } : i)));
  };

  const getExpiryBadge = (item: PantryItem) => {
    if (!item.inStock || !item.expiresAt) return null;
    const now = new Date();
    const exp = new Date(item.expiresAt);
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { text: "Expired", color: "bg-destructive/10 text-destructive" };
    if (daysLeft <= 1) return { text: "Expires today", color: "bg-destructive/10 text-destructive" };
    if (daysLeft <= 3) return { text: `${daysLeft}d left`, color: "bg-gold/15 text-gold" };
    if (daysLeft <= 5) return { text: `${daysLeft}d left`, color: "bg-muted text-muted-foreground" };
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              {profile?.householdName || "Pantry"}
            </h1>
            <p className="font-body text-xs text-muted-foreground">
              {inStockCount} items in stock
            </p>
          </div>
          <div className="flex items-center gap-2">
            {profile?.inviteCode && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profile.inviteCode);
                  toast.success("Invite code copied");
                }}
                className="rounded-md border border-border bg-card px-2 py-1 font-body text-xs text-muted-foreground hover:bg-secondary"
              >
                {profile.inviteCode}
              </button>
            )}
            <button
              onClick={() => setAddMode(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pantry..."
            className="w-full rounded-lg border border-border bg-input pl-8 pr-4 py-2 font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full border px-3 py-1 font-body text-xs transition-colors ${
              !activeCategory
                ? "border-gold bg-gold/10 text-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`shrink-0 rounded-full border px-3 py-1 font-body text-xs transition-colors ${
                activeCategory === cat
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border bg-card text-muted-foreground"
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
          {expiringSoon.slice(0, 5).map((item) => {
            const badge = getExpiryBadge(item);
            return (
              <div key={item.id} className="flex items-center justify-between py-1">
                <span className="font-body text-sm text-foreground">{item.name}</span>
                {badge && (
                  <span className={`rounded-full px-2 py-0.5 font-body text-xs ${badge.color}`}>
                    {badge.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className="mb-4">
            <button
              onClick={() => toggleCollapse(cat)}
              className="flex items-center gap-1.5 mb-1.5 w-full"
            >
              {collapsedCats.has(cat) ? (
                <ChevronRight size={14} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={14} className="text-muted-foreground" />
              )}
              <span className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {cat}
              </span>
              <span className="font-body text-xs text-muted-foreground">
                ({catItems.filter((i) => i.inStock).length}/{catItems.length})
              </span>
            </button>
            {!collapsedCats.has(cat) &&
              catItems.map((item) => {
                const badge = getExpiryBadge(item);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                  >
                    <button
                      onClick={() => toggleStock(item.id)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        item.inStock
                          ? "border-gold bg-gold text-gold-foreground"
                          : "border-border"
                      }`}
                    >
                      {item.inStock && <Check size={12} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`font-body text-sm ${
                          item.inStock ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.isCustom && (
                        <span className="ml-1.5 font-body text-xs text-muted-foreground">custom</span>
                      )}
                    </div>
                    {badge && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 font-body text-xs ${badge.color}`}>
                        {badge.text}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>

      {/* Add Item Modal */}
      {addMode && (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/30">
          <div className="w-full rounded-t-2xl bg-background p-6 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-foreground">Add item</h2>
              <button
                onClick={() => {
                  setAddMode(false);
                  setAddSearch("");
                }}
                className="font-body text-sm text-muted-foreground"
              >
                Cancel
              </button>
            </div>
            <input
              type="text"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
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
