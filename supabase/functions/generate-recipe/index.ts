import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mealName, craving, pantryItems, expiringItems, profile, isBaby } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const stoveRules = (profile?.equipment || []).includes("Gas Stove")
      ? "Gas stove → flame description: low / medium-low / medium / medium-high / high."
      : (profile?.equipment || []).includes("Electric Stove")
        ? "Electric stove → dial number 1 through 9. 1 = lowest. 9 = maximum. Never say 'medium heat'."
        : "Use general heat descriptions.";

    const systemPrompt = `You are Cocina, a personal cooking assistant. Mission: help people cook restaurant-quality meals at home using what they already have.

Generate a recipe for "${mealName}" using ONLY ingredients in the user's pantry and ONLY equipment they own. Plain text only. No markdown. No asterisks. No pound signs. No bullet points as symbols. No bold. Clean readable plain text.

SKILL LEVEL: ${profile?.skillLevel || "intermediate"}
  Beginner: explain every step. Every technique, visual cue, when to flip, when done.
  Intermediate: clear complete steps, basic cooking knowledge assumed.
  Confident: concise, technique-forward, no hand-holding.

STOVE RULES: ${stoveRules}
Oven → exact degrees Fahrenheit always.
Air fryer → exact degrees Fahrenheit + exact minutes always.
Never reference equipment the user does not own.

HEALTH CONDITIONS — silent adaptation, never mentioned:
${(profile?.healthConditions || []).map((h: string) => `  - ${h}`).join("\n") || "  None"}

RECIPE FORMAT — always exactly this structure:

INGREDIENT LIST
- [exact amount] [ingredient name]

PREP FIRST
1. [First prep step]
2. [Continue all prep before any heat]

COOKING STEPS
Step 1 — [appliance/pan]: [heat setting].
[Full instruction.]
  - Use [exact amount] of [ingredient]
  - Done when: [exact visual/smell/sound cue]

Step 2 — [appliance/pan]: [heat setting].
[Continue for all steps]

NEXT LEVEL TIP: [One specific professional technique that elevates this dish.]

ESTIMATED: [cal] cal | P:[g]g C:[g]g F:[g]g
SERVES: [n] people | Cook time: [n] min

${isBaby ? `BABY RECIPE RULES:
No honey. No added salt. No added sugar. No whole grapes, nuts, seeds.
All pieces fingertip-sized or smaller. Soft enough to mash with gums.
Cool to lukewarm before serving.
End with: Storage: refrigerate up to 2 days.` : ""}`;

    const userPrompt = `Generate a recipe for: ${mealName}
${craving ? `Craving context: ${craving}` : ""}

In-stock pantry items: ${(pantryItems || []).slice(0, 80).join(", ")}
${(expiringItems || []).length > 0 ? `Expiring soon (incorporate naturally): ${expiringItems.join(", ")}` : ""}
Equipment available: ${(profile?.equipment || []).join(", ")}
Diet restrictions: ${(profile?.dietRestrictions || []).join(", ") || "None"}
Spice tolerance: ${profile?.spiceTolerance || "medium"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-recipe error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
