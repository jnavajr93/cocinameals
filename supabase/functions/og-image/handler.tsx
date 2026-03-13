import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  let mealName = "A delicious recipe";
  let sharedBy = "";
  let ingredients: string[] = [];

  if (id) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: recipe } = await supabase
      .from("shared_recipes")
      .select("meal_name, shared_by_name, recipe_text")
      .eq("id", id)
      .single();

    if (recipe) {
      mealName = recipe.meal_name || mealName;
      sharedBy = recipe.shared_by_name ? `Shared by ${recipe.shared_by_name}` : "";
      
      // Extract first few ingredients from recipe text
      const lines = (recipe.recipe_text || "").split("\n");
      let inIngredients = false;
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        const u = t.toUpperCase();
        if (u === "INGREDIENT LIST" || u === "INGREDIENTS") {
          inIngredients = true;
          continue;
        }
        if (inIngredients && (u === "PREP FIRST" || u === "PREP STEPS" || u === "PREPARATION" || u === "COOKING STEPS")) break;
        if (inIngredients) {
          ingredients.push(t.replace(/^[-•]\s*/, ""));
          if (ingredients.length >= 4) break;
        }
      }
    }
  }

  // Truncate meal name if too long
  const displayName = mealName.length > 40 ? mealName.slice(0, 37) + "…" : mealName;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F0E8D5",
          padding: "48px 56px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: "12px" }}>
          <span style={{ fontSize: "40px", fontStyle: "italic", color: "#2D5A3D", fontWeight: "bold" }}>c</span>
          <span style={{ fontSize: "40px", fontStyle: "italic", color: "#C8A951", fontWeight: "bold", marginLeft: "-6px" }}>o</span>
          <span style={{ fontSize: "36px", color: "#3A3A3A", fontWeight: "600" }}>cina</span>
        </div>

        {/* Divider */}
        <div style={{ width: "100%", height: "2px", backgroundColor: "#C8A95140", marginBottom: "24px" }} />

        {/* Recipe Name */}
        <div style={{ fontSize: "36px", fontWeight: "bold", color: "#2A2A2A", lineHeight: "1.2", marginBottom: "20px" }}>
          {displayName}
        </div>

        {/* Ingredients preview */}
        {ingredients.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#2D5A3D", letterSpacing: "0.5px", marginBottom: "4px" }}>
              INGREDIENTS
            </div>
            {ingredients.map((ing, i) => (
              <div key={i} style={{ fontSize: "15px", color: "#3A3A3A", lineHeight: "1.4" }}>
                · {ing.length > 45 ? ing.slice(0, 42) + "…" : ing}
              </div>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Divider */}
        <div style={{ width: "100%", height: "1px", backgroundColor: "#C8A95130", marginBottom: "14px" }} />

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "14px", color: "#8A8070" }}>
            {sharedBy ? `${sharedBy} · ` : ""}Made with cocina · smart meal planning
          </div>
          <div style={{ fontSize: "14px", color: "#C8A951" }}>
            cocinameals.lovable.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
