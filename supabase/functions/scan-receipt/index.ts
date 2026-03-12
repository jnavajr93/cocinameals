import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a grocery receipt scanner for a kitchen pantry app.
Analyze the receipt image and extract grocery/food items purchased.

Return ONLY a valid JSON array of objects. No preamble. No markdown.

Each object: { "name": string, "category": string, "shelfLifeDays": number }

RULES:
- Extract only food/grocery items (skip tax, totals, store info, non-food items like bags, cleaning supplies)
- Normalize names to common pantry names (e.g. "BNLS SKNLS CHKN BRST" → "Chicken Breast")
- Category must be one of: "Produce", "Proteins", "Dairy & Eggs", "Grains & Bread", "Canned & Jarred", "Oils, Vinegars & Sauces", "Spices & Seasonings", "Baking & Sweeteners", "Frozen", "Snacks & Misc", "Beverages"
- shelfLifeDays: estimated days until the item typically expires from purchase date
  - Fresh produce: 3-14 days
  - Fresh meat/poultry: 2-5 days  
  - Dairy: 7-30 days
  - Bread: 5-7 days
  - Canned goods: 730 days
  - Frozen items: 180 days
  - Pantry staples (rice, pasta, etc.): 365 days
- If you cannot read the receipt or it's not a grocery receipt, return an empty array []
- Be generous in interpretation — abbreviations on receipts are common`;

    const res = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all grocery items from this receipt." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "[]";
    
    // Extract JSON from response
    let items;
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      items = [];
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
