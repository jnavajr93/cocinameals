import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sections, section, craving, pantryItems, expiringItems, profile, filters, feedback, childAgeMonths, recentSuggestions } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const inStockOnly = filters?.inStockOnly ?? true;

    const varietyRules = `
VARIETY RULES (apply to every batch of 3):
- CUISINE VARIETY: Each of the 3 suggested meals must represent a different cuisine. No two meals in the same batch of 3 can share the same cuisine tag. If a cuisine override filter is active, still vary the sub-style or dish type as much as possible within that cuisine.
- PROTEIN VARIETY: No 3 meals in the same batch of 3 can share the same primary protein. For example, do not suggest three chicken dishes or three beef dishes in the same batch. EXCEPTION: If the mainProtein filter is explicitly set by the user, all 3 meals may use that protein. The filter overrides this rule.`;

    const recentRule = (recentSuggestions && recentSuggestions.length > 0)
      ? `\n- Never suggest any meal whose name appears in recentSuggestions[]. These meals were recently shown to this user. Suggest something different.`
      : "";

    const baseSystemPrompt = `You are a meal suggestion engine for Cocina, a household meal planning app.
Mission: help people cook restaurant-quality meals at home using what they already have — cutting food waste and the need to eat out.

${!inStockOnly ? 'DISCOVERY MODE: The user wants to explore meals beyond their current pantry. Suggest creative, inspiring meals. For each meal, include "missingIngredients" — a short list (max 6) of key ingredients the user would need to buy that are NOT in their current pantry. Only list important ingredients they likely need to purchase (skip common staples like salt, pepper, oil, water). Keep ingredient names short and grocery-friendly (e.g. "chicken thighs" not "boneless skinless chicken thighs").' : ''}

HARD RULES:
- Only suggest meals the user's equipment can make.
- Never suggest meals that violate diet restrictions.
- Adapt meal complexity to skillLevel: "beginner" → simple comfort food, minimal techniques; "intermediate" → balanced techniques and layered flavors; "confident" → ambitious restaurant-quality dishes with advanced techniques. Higher skill = more rewarding and challenging meals.

DIET RESTRICTION DETAILS:
  "Plant-Based Whole Foods" → STRICT: 100% plant-based (no meat, dairy, eggs, honey). ZERO processed foods — no refined flour, white pasta, white bread, refined sugar, protein powders, fake meats (Beyond/Impossible), vegan cheese, processed oils. Only whole grains (brown rice, quinoa, oats, whole wheat), legumes, nuts, seeds, fruits, vegetables, tofu, tempeh. Minimal added oil — prefer water sauté or oil-free dressings. This is for health-focused longevity eating.
  "Vegan" → No animal products (meat, dairy, eggs, honey). Processed vegan foods are allowed.
  "Vegetarian" → No meat/fish. Dairy and eggs are allowed.
${inStockOnly ? '- If inStockOnly is true: every ingredient must be currently in-stock. Zero exceptions.' : '- Suggest meals freely — they do NOT need to use only in-stock items. Be creative and inspiring.'}
- If mustInclude is set: that ingredient must be central to at least 2 of 3 meals.
- If mainProtein is set: that protein must star in all 3 meals.
- If cookTime filter is set: total time must be under that limit for all 3.
- If calorieRange is set: calories must fall within range for all 3.
- If cuisineOverride is set: all 3 meals must lean toward that cuisine.
- If quickFilterChip is active: all 3 meals must match that tag.
- Never suggest meals from dislikedMeals[].
- Upweight styles matching likedTags[].
- Prioritize expiringItems[] when culinarily appropriate. Never mention to the user that items are expiring.
- For baby sections: soft, age-appropriate foods only. No honey, no added salt, no added sugar, no choking hazards.
${recentRule}
${varietyRules}

HEALTH CONDITION SILENT ADJUSTMENTS (never mention in output):
  High Blood Pressure → reduce sodium-heavy dishes
  Type 2 Diabetes / Pre-Diabetic → favor low glycemic, high fiber
  High Cholesterol → favor lean proteins, omega-3 rich
  Heart Disease → Mediterranean-lean, low saturated fat
  IBS → avoid high-FODMAP dishes
  Gout → avoid red meat, shellfish as primary protein
  PCOS → anti-inflammatory lean, low sugar
  Celiac Disease → strictly zero gluten
  Kidney Disease → avoid potassium-heavy and phosphorus-heavy
  Obesity / Weight Loss → favor high satiety, high protein, lower calorie density

TAGS TO USE: mexican, asian, southeast_asian, south_asian, mediterranean, italian, american, latin_american, caribbean, african, french, seafood, high_protein, low_carb, quick, vegetarian, vegan, kid_friendly, comfort, light, spicy, mild, one_pan, grill, air_fryer, date_night, crowd

Return ONLY valid JSON. No preamble, no markdown.`;

    const mealJsonDesc = `Each meal object: { "name": string, "cal": number, "protein": number, "carbs": number, "fat": number, "cookTime": number, "tags": string[]${!inStockOnly ? ', "missingIngredients": string[]' : ''} }`;

    // BATCH MODE: multiple sections in one call
    if (sections && Array.isArray(sections) && sections.length > 0) {
      const systemPrompt = baseSystemPrompt + `\n\nYou must suggest meals for multiple sections at once. Return a JSON object with one key per section, each containing exactly 3 meal suggestions.\n\n${mealJsonDesc}`;

      const userPrompt = JSON.stringify({
        sections,
        craving: craving || null,
        pantryInStock: (pantryItems || []).slice(0, 100),
        expiringItems: expiringItems || [],
        equipment: profile?.equipment || [],
        cuisineSliders: profile?.cuisineSliders || {},
        skillLevel: profile?.skillLevel || "intermediate",
        spiceTolerance: profile?.spiceTolerance || "medium",
        dietRestrictions: profile?.dietRestrictions || [],
        healthConditions: profile?.healthConditions || [],
        weeknightTime: profile?.weeknightTime || "30min",
        filters: filters || {},
        likedTags: feedback?.likedTags || [],
        dislikedMeals: feedback?.dislikedMeals || [],
        recentSuggestions: recentSuggestions || [],
        childAgeMonths: childAgeMonths || null,
      });

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
          messages: [{ role: "user", content: userPrompt }],
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402 || response.status === 400) {
          const fallbackResults: Record<string, any[]> = {};
          for (const s of sections) fallbackResults[s] = [];
          return new Response(JSON.stringify(fallbackResults), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("Anthropic API error:", response.status, t);
        throw new Error("Anthropic API error");
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || "{}";

      // Parse JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Failed to parse batch response:", content);
        const fallbackResults: Record<string, any[]> = {};
        for (const s of sections) fallbackResults[s] = [];
        return new Response(JSON.stringify(fallbackResults), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // SINGLE SECTION MODE (shuffle, craving, etc.)
    const systemPrompt = baseSystemPrompt + `\n\nSuggest exactly 3 meals. Return ONLY a valid JSON array. No preamble. No markdown.\n\n${mealJsonDesc}`;

    const userPrompt = JSON.stringify({
      section: section || "full_dinner",
      craving: craving || null,
      pantryInStock: (pantryItems || []).slice(0, 100),
      expiringItems: expiringItems || [],
      equipment: profile?.equipment || [],
      cuisineSliders: profile?.cuisineSliders || {},
      skillLevel: profile?.skillLevel || "intermediate",
      spiceTolerance: profile?.spiceTolerance || "medium",
      dietRestrictions: profile?.dietRestrictions || [],
      healthConditions: profile?.healthConditions || [],
      weeknightTime: profile?.weeknightTime || "30min",
      filters: filters || {},
      likedTags: feedback?.likedTags || [],
      dislikedMeals: feedback?.dislikedMeals || [],
      recentSuggestions: recentSuggestions || [],
      childAgeMonths: childAgeMonths || null,
    });

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
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || response.status === 400) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      throw new Error("Anthropic API error");
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "[]";

    // Parse JSON array from response
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse single response:", content);
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("suggest-meals error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
