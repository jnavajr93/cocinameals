import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, protein, cuisine, cookTimeMax, count = 3 } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const systemPrompt = `You generate recipe metadata as JSON arrays. Each object has: name (string), calories (number 200-800), protein (number 10-50), carbs (number 15-80), fat (number 5-40), cook_time (number 5-60), cuisine (string lowercase), primary_protein (string: Chicken/Beef/Ground Beef/Pork/Lamb/Salmon/Shrimp/Tuna/Fish/Seafood/Duck/Turkey/Eggs/Plant Based), tags (string array from: quick, comfort, spicy, mild, high_protein, low_carb, vegetarian, vegan, seafood, one_pan, grill, kid_friendly, light, asian, mexican, italian, american, mediterranean, french, south_asian, southeast_asian, caribbean, african, latin_american, korean, japanese, chinese, middle_eastern, greek, southern, bbq, filipino), skill_level (beginner/intermediate/confident), spice_level (none/mild/medium/hot). Return ONLY a valid JSON array.`;

    const prompt = `Generate exactly ${count} unique ${category} recipes${protein ? ` featuring ${protein}` : ""}${cuisine ? ` with ${cuisine} cuisine` : ""}${cookTimeMax ? ` that can be made in under ${cookTimeMax} minutes` : ""}.

For each recipe, provide a JSON object. Return ONLY a JSON array, no other text.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit — try again shortly", recipes: [] }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached", recipes: [] }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "[]";
    let recipes: any[] = [];

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      recipes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      recipes = [];
    }

    if (!Array.isArray(recipes) || recipes.length === 0) {
      return new Response(JSON.stringify({ recipes: [], message: "No recipes generated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to DB permanently
    const toInsert = recipes.map(r => ({
      name: r.name,
      category: category || "dinner",
      cuisine: r.cuisine || cuisine || "american",
      primary_protein: r.primary_protein || protein || null,
      is_baby: false,
      calories: r.calories || 400,
      protein: r.protein || 25,
      carbs: r.carbs || 35,
      fat: r.fat || 15,
      cook_time: r.cook_time || 30,
      tags: r.tags || [],
      equipment: [],
      spice_level: r.spice_level || "mild",
      skill_level: r.skill_level || "intermediate",
      ingredients: [],
      recipe_text: null,
    }));

    // Insert, ignoring duplicates
    const savedRecipes: any[] = [];
    for (const recipe of toInsert) {
      const { data: inserted, error } = await supabase
        .from("recipes")
        .insert(recipe)
        .select()
        .single();
      
      if (!error && inserted) {
        savedRecipes.push(inserted);
      } else if (error) {
        console.log(`Skipped duplicate: ${recipe.name}`);
        savedRecipes.push(recipe);
      }
    }

    return new Response(JSON.stringify({ recipes: savedRecipes, saved: savedRecipes.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-and-save error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", recipes: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
