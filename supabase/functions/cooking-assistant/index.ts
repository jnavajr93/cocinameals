import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { recipeName, recipeText, equipment, skillLevel, messages } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const systemPrompt = `You are a knowledgeable cooking companion inside Cocina, a meal planning app.
The user is actively cooking or preparing this recipe and needs real-time help.

Recipe: ${recipeName}
Recipe details:
${recipeText}

User equipment: ${(equipment || []).join(", ") || "standard kitchen"}
Skill level: ${skillLevel || "intermediate"}

Answer the user's question concisely and helpfully. Plain text only.
No markdown. No bullet points. No asterisks. No bold. Short answers preferred.
Speak like a confident friend who knows how to cook, not like a manual.

STOVE RULES — always follow:
  Electric stove → dial number 1 through 9. Never say medium heat.
  Gas stove → flame description: low, medium-low, medium, medium-high, high.
  Oven → exact degrees Fahrenheit.

Never say you are an AI. Never use the word generate.
Never mention health conditions under any circumstances.
Never repeat the entire recipe back. Just answer the question asked.`;

    const apiMessages = (messages || []).map((m: any) => ({ role: m.role, content: m.content }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        system: systemPrompt,
        messages: apiMessages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Anthropic API error");
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sorry, I couldn't help with that.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cooking-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
