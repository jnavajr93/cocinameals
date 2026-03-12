import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { Trash2, BookOpen, Star } from "lucide-react";
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
  const { householdId } = useHousehold();
  const [activeView, setActiveView] = useState<"recipes" | "meals">("recipes");
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [meals, setMeals] = useState<SavedMeal[]>([]);

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

  const formatDate = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

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
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-foreground">{recipe.meal_name}</p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                      Saved by {recipe.saved_by} on {formatDate(recipe.created_at)}
                    </p>
                  </div>
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
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-foreground">{meal.meal_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {meal.calories && <span className="font-body text-xs text-muted-foreground">{meal.calories} cal</span>}
                      {meal.protein && <span className="font-body text-xs text-muted-foreground">P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g</span>}
                    </div>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                      Saved by {meal.saved_by} on {formatDate(meal.created_at)}
                    </p>
                  </div>
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
