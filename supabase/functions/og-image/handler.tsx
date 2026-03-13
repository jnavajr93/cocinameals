import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function truncate(value: string, max: number) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  let mealName = "A delicious recipe";
  let sharedByName = "";
  const ingredients: string[] = [];

  if (id) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: recipe } = await supabase
      .from("shared_recipes")
      .select("meal_name, shared_by_name, recipe_text")
      .eq("id", id)
      .single();

    if (recipe) {
      mealName = recipe.meal_name || mealName;
      sharedByName = recipe.shared_by_name || "";

      const lines = (recipe.recipe_text || "").split("\n");
      let inIngredients = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const upper = trimmed.toUpperCase();
        if (upper === "INGREDIENT LIST" || upper === "INGREDIENTS") {
          inIngredients = true;
          continue;
        }

        if (
          inIngredients &&
          (upper === "PREP FIRST" || upper === "PREP STEPS" || upper === "PREPARATION" ||
            upper === "COOKING STEPS" || upper.startsWith("NEXT LEVEL TIP"))
        ) {
          break;
        }

        if (inIngredients) {
          ingredients.push(trimmed.replace(/^[-•]\s*/, ""));
          if (ingredients.length >= 3) break;
        }
      }
    }
  }

  const displayTitle = truncate(mealName, 44);
  const footerText = sharedByName
    ? `Shared by ${sharedByName} · Made with cocina · smart meal planning`
    : "Made with cocina · smart meal planning";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F0E8D5",
          padding: "56px 84px",
          boxSizing: "border-box",
          color: "#222222",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: "22px" }}>
            <span style={{ fontSize: "56px", fontStyle: "italic", color: "#1f4b3f", fontWeight: "700" }}>c</span>
            <span style={{ fontSize: "56px", fontStyle: "italic", color: "#be9a3b", fontWeight: "700", marginLeft: "-8px" }}>o</span>
            <span style={{ fontSize: "52px", color: "#2f2f2f", fontWeight: "600" }}>cina</span>
          </div>

          <div style={{ display: "flex", width: "100%", height: "2px", backgroundColor: "#d8cbb0", marginBottom: "24px" }} />

          <div
            style={{
              display: "flex",
              fontSize: "64px",
              lineHeight: "1.1",
              fontWeight: "700",
              marginBottom: "26px",
              letterSpacing: "-0.5px",
            }}
          >
            {displayTitle}
          </div>

          {ingredients.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: "38px",
                  color: "#1f4b3f",
                  fontWeight: "700",
                  letterSpacing: "0.8px",
                }}
              >
                INGREDIENT LIST
              </div>
              {ingredients.map((ing, i) => {
                const line = `• ${truncate(ing, 58)}`;
                return (
                  <div key={`${ing}-${i}`} style={{ display: "flex", fontSize: "40px", lineHeight: "1.2", color: "#313131" }}>
                    {line}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", width: "100%", height: "2px", backgroundColor: "#d8cbb0", marginBottom: "14px" }} />
          <div style={{ display: "flex", fontSize: "30px", color: "#7f7769", lineHeight: "1.3", marginBottom: "6px" }}>
            {truncate(footerText, 86)}
          </div>
          <div style={{ display: "flex", fontSize: "34px", color: "#be9a3b", fontWeight: "600" }}>
            cocinameals.lovable.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
