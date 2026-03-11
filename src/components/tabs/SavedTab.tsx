import { useState, useEffect } from "react";
import { getSavedRecipes, saveSavedRecipes } from "@/lib/store";
import { Trash2, BookOpen } from "lucide-react";

export function SavedTab() {
  const [recipes, setRecipes] = useState(getSavedRecipes());

  useEffect(() => {
    setRecipes(getSavedRecipes());
  }, []);

  const remove = (id: string) => {
    const updated = recipes.filter((r) => r.id !== id);
    saveSavedRecipes(updated);
    setRecipes(updated);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display text-xl font-bold text-foreground mb-1">Saved Recipes</h1>
        <p className="font-body text-xs text-muted-foreground">{recipes.length} recipes saved</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BookOpen size={32} className="text-muted-foreground mb-3" />
            <p className="font-body text-sm text-muted-foreground">No saved recipes yet.</p>
            <p className="font-body text-xs text-muted-foreground mt-1">
              Star a meal to save it here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="rounded-lg border border-border bg-card p-3 flex items-start justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-medium text-foreground">{recipe.mealName}</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    Saved by {recipe.savedBy}
                  </p>
                </div>
                <button
                  onClick={() => remove(recipe.id)}
                  className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                >
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
