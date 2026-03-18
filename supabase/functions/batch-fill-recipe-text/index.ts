import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { batchSize = 25 } = await req.json().catch(() => ({}));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { data: recipes, error: fetchError } = await supabase
      .from("recipes")
      .select("id, name, category, cuisine, primary_protein, cook_time, calories, protein, carbs, fat, tags, is_baby")
      .is("recipe_text", null)
      .limit(batchSize);

    if (fetchError) throw fetchError;
    if (!recipes || recipes.length === 0) {
      return new Response(JSON.stringify({ processed: 0, failed: 0, remaining: 0, message: "All recipes already have text" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: totalRemaining } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .is("recipe_text", null);

    let processed = 0;
    let failed = 0;

    for (const recipe of recipes) {
      try {
        const tagsArr: string[] = recipe.tags || [];
        const isSpicy = tagsArr.includes("spicy") || tagsArr.includes("hot");
        const spiceNote = isSpicy ? "This dish has bold spice — reflect that in the seasoning steps." : "";
        const babyNote = recipe.is_baby
          ? "\nBABY RECIPE: No honey, no added salt, no added sugar. All pieces fingertip-sized. Soft enough to mash with gums. End with: Storage: refrigerate up to 2 days."
          : "";

        const prompt = `Generate a complete recipe for "${recipe.name}".
Category: ${recipe.category}
Cuisine: ${recipe.cuisine}
Primary protein: ${recipe.primary_protein || "flexible"}
Target cook time: ${recipe.cook_time || 30} minutes
Target: ~${recipe.calories || 450} cal | P:${recipe.protein || 30}g C:${recipe.carbs || 35}g F:${recipe.fat || 18}g
${spiceNote}${babyNote}

Use EXACTLY this format. Plain text only. No markdown. No asterisks. No bold.

INGREDIENT LIST
- [exact amount] [ingredient name]
(list all ingredients, 6-12 items)

PREP FIRST
1. [first prep step — wash, chop, measure before any heat]
2. [continue all prep steps]

COOKING STEPS
Step 1 — [pan/appliance]: [dial number 1-9 for electric stove, or exact °F for oven].
[Full instruction for this step.]
  - Use [exact amount] [ingredient]
  - Done when: [exact visual or smell cue]

Step 2 — [continue all steps until dish is complete]

NEXT LEVEL TIP: [One specific technique that takes this dish from home cooking to restaurant quality.]

ESTIMATED: ${recipe.calories || 450} cal | P:${recipe.protein || 30}g C:${recipe.carbs || 35}g F:${recipe.fat || 18}g
SERVES: 2 people | Cook time: ${recipe.cook_time || 30} min`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "You write clear, practical, restaurant-quality home cooking recipes in plain text. No markdown. No asterisks. No bullet symbols. Follow the exact format given." },
              { role: "user", content: prompt },
            ],
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.error(`AI failed for "${recipe.name}": status=${response.status} body=${errBody}`);
          failed++;
          continue;
        }

        const data = await response.json();
        const recipeText = data.choices?.[0]?.message?.content || "";

        if (recipeText.length < 100) {
          console.error(`Short response for "${recipe.name}": ${recipeText.length} chars`);
          failed++;
          continue;
        }

        const { error: updateError } = await supabase
          .from("recipes")
          .update({ recipe_text: recipeText })
          .eq("id", recipe.id);

        if (updateError) {
          console.error(`Save failed for ${recipe.name}:`, updateError);
          failed++;
        } else {
          processed++;
        }

        await new Promise(r => setTimeout(r, 200));

      } catch (err) {
        console.error(`Error processing ${recipe.name}:`, err);
        failed++;
      }
    }

    const remaining = Math.max(0, (totalRemaining || 0) - processed);

    return new Response(JSON.stringify({ processed, failed, remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("batch-fill-recipe-text error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
