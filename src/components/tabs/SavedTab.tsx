import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, BookOpen, ArrowLeft } from "lucide-react";
import { RecipeDisplay } from "@/components/RecipeDisplay";
import { toast } from "sonner";

interface SavedRecipe {
  id: string;
  meal_name: string;
  recipe_text: string;
  saved_by: string | null;
  created_at: string | null;
}

export function SavedTab() {
  const { householdId, userName } = useHousehold();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [viewingRecipe, setViewingRecipe] = useState<SavedRecipe | null>(null);

  useEffect(() => {
    if (!householdId) return;
    const load = async () => {
      const { data } = await supabase
        .from("saved_recipes")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });
      if (data) setRecipes(data);
    };
    load();
  }, [householdId]);

  const removeRecipe = async (id: string) => {
    await supabase.from("saved_recipes").delete().eq("id", id);
    setRecipes(prev => prev.filter(r => r.id !== id));
    toast.success("Recipe removed");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Recipe detail view
  if (viewingRecipe) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => setViewingRecipe(null)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground flex-1">{viewingRecipe.meal_name}</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          <RecipeDisplay text={viewingRecipe.recipe_text} />
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 flex justify-center pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => { removeRecipe(viewingRecipe.id); setViewingRecipe(null); }}
            className="flex items-center gap-2 rounded-lg border border-border px-6 py-2.5 font-body text-sm text-muted-foreground"
          >
            <Trash2 size={14} />
            Unsave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display text-xl font-bold text-foreground mb-3">Saved Recipes</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <BookOpen size={32} className="text-muted-foreground mb-3" />
            <p className="font-body text-sm text-muted-foreground">No saved recipes yet.</p>
            <p className="font-body text-xs text-muted-foreground mt-1">Star a recipe from the Meals tab to save it here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {recipes.map(recipe => (
              <div key={recipe.id} className="rounded-lg border border-border bg-card p-3 flex items-start justify-between">
                <button onClick={() => setViewingRecipe(recipe)} className="flex-1 min-w-0 text-left">
                  <p className="font-body text-sm font-medium text-foreground">{recipe.meal_name}</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    Saved by {recipe.saved_by} on {formatDate(recipe.created_at)}
                  </p>
                </button>
                <button onClick={() => removeRecipe(recipe.id)} className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
