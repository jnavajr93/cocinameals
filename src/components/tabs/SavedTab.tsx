import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, BookOpen, Star, ArrowLeft } from "lucide-react";
import { RecipeDisplay } from "@/components/RecipeDisplay";
import { toast } from "sonner";

interface SavedRecipe {
  id: string;
  meal_name: string;
  recipe_text: string;
  saved_by: string | null;
  created_at: string | null;
}

interface SavedMeal {
  id: string;
  meal_name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  cook_time: number | null;
  tags: string[];
  saved_by: string | null;
  created_at: string | null;
}

export function SavedTab() {
  const { householdId, userName } = useHousehold();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"recipes" | "meals">("recipes");
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [viewingRecipe, setViewingRecipe] = useState<SavedRecipe | null>(null);
  const [generatingRecipe, setGeneratingRecipe] = useState<{ mealName: string; text: string; loading: boolean } | null>(null);

  useEffect(() => {
    if (!householdId) return;
    const load = async () => {
      const [{ data: recipeData }, { data: mealData }] = await Promise.all([
        supabase.from("saved_recipes").select("*").eq("household_id", householdId).order("created_at", { ascending: false }),
        supabase.from("saved_meals").select("*").eq("household_id", householdId).order("created_at", { ascending: false }),
      ]);
      if (recipeData) setRecipes(recipeData);
      if (mealData) setMeals(mealData.map(m => ({ ...m, tags: (m.tags as string[]) || [] })));
    };
    load();
  }, [householdId]);

  const removeRecipe = async (id: string) => {
    await supabase.from("saved_recipes").delete().eq("id", id);
    setRecipes(prev => prev.filter(r => r.id !== id));
    toast.success("Recipe removed");
  };

  const removeMeal = async (id: string) => {
    await supabase.from("saved_meals").delete().eq("id", id);
    setMeals(prev => prev.filter(m => m.id !== id));
    toast.success("Meal removed");
  };

  const generateRecipeForMeal = async (meal: SavedMeal) => {
    setGeneratingRecipe({ mealName: meal.meal_name, text: "", loading: true });
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recipe`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ mealName: meal.meal_name, pantryItems: [], expiringItems: [], profile: {}, isBaby: false }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setGeneratingRecipe(prev => prev ? { ...prev, text: fullText } : null);
            }
          } catch {}
        }
      }
      setGeneratingRecipe(prev => prev ? { ...prev, loading: false } : null);
    } catch {
      toast.error("Could not generate recipe");
      setGeneratingRecipe(null);
    }
  };

  const saveGeneratedRecipe = async () => {
    if (!generatingRecipe || !householdId) return;
    await supabase.from("saved_recipes").insert({
      household_id: householdId,
      meal_name: generatingRecipe.mealName,
      recipe_text: generatingRecipe.text,
      saved_by: userName,
    });
    toast.success("Recipe saved");
    setGeneratingRecipe(null);
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
          <pre className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-2">
            {viewingRecipe.recipe_text}
          </pre>
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

  // Generated recipe view
  if (generatingRecipe) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => setGeneratingRecipe(null)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground flex-1">{generatingRecipe.mealName}</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {generatingRecipe.loading && !generatingRecipe.text ? (
            <div className="space-y-3 mt-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
              ))}
            </div>
          ) : (
            <pre className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-2">
              {generatingRecipe.text}
              {generatingRecipe.loading && <span className="animate-pulse text-gold">|</span>}
            </pre>
          )}
        </div>
        {!generatingRecipe.loading && generatingRecipe.text && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 flex justify-center pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button onClick={saveGeneratedRecipe} className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-body text-sm font-medium text-primary-foreground">
              <Star size={16} />
              Save Recipe
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display text-xl font-bold text-foreground mb-3">Saved</h1>
        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setActiveView("recipes")}
            className={`flex-1 rounded-md py-1.5 font-body text-xs font-medium transition-colors ${
              activeView === "recipes" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Saved Recipes
          </button>
          <button
            onClick={() => setActiveView("meals")}
            className={`flex-1 rounded-md py-1.5 font-body text-xs font-medium transition-colors ${
              activeView === "meals" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Saved Meals
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {activeView === "recipes" ? (
          recipes.length === 0 ? (
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
          )
        ) : (
          meals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Star size={32} className="text-muted-foreground mb-3" />
              <p className="font-body text-sm text-muted-foreground">No saved meals yet.</p>
              <p className="font-body text-xs text-muted-foreground mt-1">Star meals from the Meals tab to save them here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              {meals.map(meal => (
                <div key={meal.id} className="rounded-lg border border-border bg-card p-3 flex items-start justify-between">
                  <button onClick={() => generateRecipeForMeal(meal)} className="flex-1 min-w-0 text-left">
                    <p className="font-body text-sm font-medium text-foreground">{meal.meal_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {meal.calories && <span className="font-body text-xs text-muted-foreground">{meal.calories} cal</span>}
                      {meal.protein && <span className="font-body text-xs text-muted-foreground">P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g</span>}
                      {meal.cook_time && <span className="font-body text-xs text-muted-foreground">{meal.cook_time} min</span>}
                    </div>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                      Saved by {meal.saved_by} on {formatDate(meal.created_at)}
                    </p>
                  </button>
                  <button onClick={() => removeMeal(meal.id)} className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
