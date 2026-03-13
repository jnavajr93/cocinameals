import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { RecipeDisplay } from "@/components/RecipeDisplay";
import { Clock, ArrowRight } from "lucide-react";

export default function SharedRecipe() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("shared_recipes")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setRecipe(data);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <Logo size="lg" />
          <p className="text-muted-foreground font-body text-sm">Loading recipe…</p>
        </div>
      </div>
    );
  }

  if (notFound || !recipe) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <Logo size="lg" />
        <h1 className="font-display text-xl font-bold text-foreground">Recipe not found</h1>
        <p className="text-muted-foreground font-body text-sm text-center">
          This recipe link may have expired or doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-body text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try cocina free <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <Logo size="sm" />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-body text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Try cocina <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Recipe content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-foreground mb-4">
          {recipe.meal_name}
        </h1>

        {recipe.shared_by_name && (
          <p className="text-muted-foreground font-body text-xs mb-4">
            Shared by {recipe.shared_by_name}
          </p>
        )}

        {recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(recipe.tags as string[]).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-body text-[10px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="bg-card rounded-xl border border-border/60 p-4">
          <RecipeDisplay recipeText={recipe.recipe_text} />
        </div>

        {/* CTA banner */}
        <div className="mt-8 bg-card-warm rounded-xl p-5 text-center">
          <p className="font-display text-lg font-bold text-foreground mb-1">
            Want meals like this every day?
          </p>
          <p className="text-muted-foreground font-body text-sm mb-4">
            cocina plans meals based on what's in your pantry. Less waste, better meals.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-body text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-6 text-center">
        <Logo size="sm" />
        <p className="text-muted-foreground font-body text-xs mt-2">
          Smart meal planning for real households
        </p>
      </footer>
    </div>
  );
}
